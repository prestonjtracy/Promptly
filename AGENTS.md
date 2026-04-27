<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:branching-workflow -->
# Branching workflow

Do not create git worktrees for this project. When starting work that warrants a branch, use `git checkout -b <branch>` directly in the main project folder. The owner is a solo developer and tests branches locally — extra worktrees in `.claude/worktrees/` add friction without benefit.
<!-- END:branching-workflow -->

<!-- BEGIN:branch-and-review-workflow -->
# Branch and review workflow

Each fix or feature gets its own branch. Run the security and bug review routine on every push. Merges to main are fast-forward only after review is clean. This is a solo project — there are no formal pull requests with human reviewers, but the security review routine acts as the quality gate before merge.
<!-- END:branch-and-review-workflow -->

<!-- BEGIN:docs-only-changes -->
# Docs-only changes

For changes that touch only markdown files, configuration comments, or other non-code documentation, commit directly to main without creating a branch. The security review routine doesn't add value on docs-only changes and the branch dance adds friction.
<!-- END:docs-only-changes -->

<!-- BEGIN:scope-discipline -->
# Scope discipline

When a fix or feature surfaces additional related issues (e.g., the same bug pattern in another file), do not auto-fix them. Flag them in the report back to the owner so they can decide whether to address now, defer, or document as a follow-up. Adding scope mid-task is how cleanups never finish.
<!-- END:scope-discipline -->

<!-- BEGIN:pricing -->
# Pricing

Do not propose pricing numbers or tier prices anywhere — UI copy, plans, comments, or docs. Promptly's pricing is intentionally undefined and is the owner's call. If a feature design requires assuming a price for the design to make sense, flag the assumption back to the owner instead of baking a value in.
<!-- END:pricing -->

<!-- BEGIN:tech-stack-boundary -->
# Tech stack boundary

The stack is Next.js 16, Supabase, Slack webhooks, Stripe (per-venue), and Vercel. Do not add new infrastructure (Redis, separate auth providers, queue systems, search engines, alternative databases) without flagging the proposal first and getting the owner's sign-off. Solving within the existing primitives is preferred unless they genuinely don't fit.
<!-- END:tech-stack-boundary -->
