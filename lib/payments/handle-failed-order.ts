// Server-only module: imports the service-role Supabase client (which reads
// SUPABASE_SERVICE_ROLE_KEY, not exposed in client bundles) so a stray import
// from a 'use client' file would throw at runtime. The 'server-only' npm
// package would surface that as a build error instead, but it isn't a current
// dependency and adding one for this single file isn't worth it.
import type Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Recovers from the "Stripe charged the customer but submitOrder failed"
 * window. Issues a refund, records the event, and alerts the venue if the
 * refund itself fails (money stuck — operator must intervene).
 *
 * Idempotency:
 *   - Stripe refund call uses session.id as the idempotency_key, so retries
 *     return the original Refund object (or the original error) instead of
 *     creating a second refund.
 *   - The payment_failures table has stripe_session_id as PRIMARY KEY, so a
 *     concurrent second invocation hits a unique-violation and the caller
 *     reads the existing row instead.
 *
 * Returns a status that the page can render against. The plaintext Stripe
 * key never leaves this function — it's expected to already live inside the
 * caller-supplied Stripe SDK instance.
 */
export type FailedOrderOutcome =
  | { status: 'refunded'; refundId: string }
  | { status: 'refund_failed'; reason: string }
  | { status: 'already_handled'; row: PaymentFailureRow }

type PaymentFailureRow = {
  stripe_session_id: string
  payment_intent_id: string | null
  venue_id: string
  charged_amount_cents: number | null
  currency: string | null
  failure_reason: string
  refund_id: string | null
  refund_status: 'succeeded' | 'pending' | 'failed'
  refund_failure_reason: string | null
  created_at: string
  updated_at: string
}

export async function lookupPaymentFailure(
  sessionId: string,
): Promise<PaymentFailureRow | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('payment_failures')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .maybeSingle()
  return (data ?? null) as PaymentFailureRow | null
}

type HandleFailedOrderInput = {
  stripe: Stripe
  session: Stripe.Checkout.Session
  venueId: string
  /** Slack channel for "money stuck" alerts when the refund itself fails. */
  alertSlackChannel: string | null
  /** Short failure reason captured from submitOrder's error string. */
  failureReason: string
}

export async function handleFailedOrder(
  input: HandleFailedOrderInput,
): Promise<FailedOrderOutcome> {
  const { stripe, session, venueId, alertSlackChannel, failureReason } = input

  // Pre-check: if a prior page-load already recorded this failure, return
  // its outcome instead of re-running. The DB PK is the ultimate guard but
  // this saves a Stripe round-trip on the common case of a refresh.
  const prior = await lookupPaymentFailure(session.id)
  if (prior) return { status: 'already_handled', row: prior }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null)

  if (!paymentIntentId) {
    // No payment intent means there's nothing to refund. Still record so the
    // page renders consistent UI on refresh and we have a paper trail.
    await persistFailure({
      stripe_session_id: session.id,
      payment_intent_id: null,
      venue_id: venueId,
      charged_amount_cents: session.amount_total ?? null,
      currency: session.currency ?? null,
      failure_reason: failureReason,
      refund_id: null,
      refund_status: 'failed',
      refund_failure_reason: 'No payment_intent on the Stripe session.',
    })
    await alertVenue({
      channel: alertSlackChannel,
      sessionId: session.id,
      venueId,
      reason:
        'No payment_intent on session — refund could not be issued. Manual review required.',
    })
    return {
      status: 'refund_failed',
      reason: 'no_payment_intent',
    }
  }

  // Attempt the refund. Idempotency_key keyed to the session id so refresh
  // / parallel tab / retried request all converge on the same Refund object.
  let refund: Stripe.Refund
  try {
    refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer',
        metadata: {
          venue_id: venueId,
          stripe_session_id: session.id,
          order_failure_reason: failureReason.slice(0, 400),
        },
      },
      {
        idempotencyKey: `pf_${session.id}`,
      },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Stripe error'
    // Audit trail: who tried to refund what, why it failed.
    console.error(
      '[handleFailedOrder] refund FAILED — money stuck',
      JSON.stringify({
        venueId,
        sessionId: session.id,
        paymentIntentId,
        amount: session.amount_total,
        currency: session.currency,
        orderFailureReason: failureReason,
        refundError: message,
      }),
    )
    await persistFailure({
      stripe_session_id: session.id,
      payment_intent_id: paymentIntentId,
      venue_id: venueId,
      charged_amount_cents: session.amount_total ?? null,
      currency: session.currency ?? null,
      failure_reason: failureReason,
      refund_id: null,
      refund_status: 'failed',
      refund_failure_reason: message,
    })
    await alertVenue({
      channel: alertSlackChannel,
      sessionId: session.id,
      venueId,
      reason: `Refund FAILED — money stuck. Stripe: ${message.slice(0, 300)}`,
    })
    return { status: 'refund_failed', reason: message }
  }

  // Refund accepted by Stripe. 'pending' status is normal for some payment
  // methods (e.g. ACH) — record the actual Stripe status, not always
  // 'succeeded'.
  const dbStatus =
    refund.status === 'succeeded'
      ? 'succeeded'
      : refund.status === 'failed'
        ? 'failed'
        : 'pending'

  console.error(
    '[handleFailedOrder] refund issued',
    JSON.stringify({
      venueId,
      sessionId: session.id,
      paymentIntentId,
      refundId: refund.id,
      refundStatus: refund.status,
      amount: session.amount_total,
      currency: session.currency,
      orderFailureReason: failureReason,
    }),
  )

  await persistFailure({
    stripe_session_id: session.id,
    payment_intent_id: paymentIntentId,
    venue_id: venueId,
    charged_amount_cents: session.amount_total ?? null,
    currency: session.currency ?? null,
    failure_reason: failureReason,
    refund_id: refund.id,
    refund_status: dbStatus,
    refund_failure_reason: dbStatus === 'failed' ? (refund.failure_reason ?? null) : null,
  })

  if (dbStatus === 'failed') {
    await alertVenue({
      channel: alertSlackChannel,
      sessionId: session.id,
      venueId,
      reason: `Stripe refund object returned status='failed' (${refund.failure_reason ?? 'no reason'}). Money stuck.`,
    })
    return { status: 'refund_failed', reason: refund.failure_reason ?? 'failed' }
  }

  return { status: 'refunded', refundId: refund.id }
}

// ── DB write ─────────────────────────────────────────────────

type FailureRowInsert = Omit<PaymentFailureRow, 'created_at' | 'updated_at'>

async function persistFailure(row: FailureRowInsert) {
  const supabase = createServiceClient()
  // ON CONFLICT DO NOTHING semantics via upsert with ignoreDuplicates: a
  // racing concurrent invocation that already wrote the row would otherwise
  // throw a unique-violation here. We swallow that intentionally — the
  // already-written row is the source of truth.
  const { error } = await supabase
    .from('payment_failures')
    .upsert(row, { onConflict: 'stripe_session_id', ignoreDuplicates: true })
  if (error) {
    console.error(
      '[handleFailedOrder] failed to persist payment_failures row',
      JSON.stringify({ sessionId: row.stripe_session_id, error: error.message }),
    )
  }
}

// ── Slack alert ──────────────────────────────────────────────

type AlertInput = {
  channel: string | null
  sessionId: string
  venueId: string
  reason: string
}

/**
 * Defang Slack mrkdwn mention syntax (<!channel>, <!here>, <!everyone>,
 * <@USERID>, <#CHANID>) inside untrusted text so an attacker-influenced
 * `reason` string can't trigger a workspace-wide notification storm via
 * `<!channel>` or impersonate-mention a user. The replacement breaks
 * Slack's parser by inserting whitespace after the leading `<`; the rest
 * of the text reads as plain content. Both chat.postMessage (mrkdwn
 * default true) and incoming webhooks (always mrkdwn) honor this.
 */
function sanitizeForSlack(s: string): string {
  return s.replace(/<([!@#])/g, '< $1')
}

async function alertVenue({ channel, sessionId, venueId, reason }: AlertInput) {
  const botToken = process.env.SLACK_BOT_TOKEN
  const webhookUrl = process.env.SLACK_WEBHOOK_DEFAULT

  // Compose a single-line, no-PII alert. Customer name / order details are
  // intentionally omitted — staff can look up by stripe_session_id.
  // venueId and sessionId are platform/Stripe-controlled identifiers (UUIDs
  // and 'cs_*' tokens, no special chars); reason is the only field that can
  // carry attacker-influenced content via Stripe error strings, so it gets
  // sanitized.
  const safeReason = sanitizeForSlack(reason)
  const text =
    `:rotating_light: *Promptly: refund failed — manual review required*\n` +
    `Venue: \`${venueId}\`\nStripe session: \`${sessionId}\`\nReason: ${safeReason}`

  try {
    if (channel && botToken) {
      const channelName = channel.replace(/^#/, '')
      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${botToken}`,
        },
        body: JSON.stringify({ channel: channelName, text }),
      })
      return
    }
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
    }
  } catch (err) {
    // Slack failure isn't fatal — the DB row is the durable record. Log and
    // keep going so the customer page can still render an honest message.
    console.error(
      '[handleFailedOrder] slack alert failed',
      err instanceof Error ? err.message : 'unknown',
    )
  }
}
