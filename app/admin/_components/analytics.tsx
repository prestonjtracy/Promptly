'use client'

import { useState } from 'react'

type DateRange = '7d' | '30d' | 'all'

export type AnalyticsData = {
  totalRequests: number
  requestsByType: { name: string; count: number }[]
  requestsByDay: { date: string; count: number }[]
  requestsByHour: { hour: number; count: number }[]
  fulfillmentBreakdown: { type: string; count: number }[]
}

type AnalyticsProps = {
  data: Record<DateRange, AnalyticsData>
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
    </div>
  )
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700 w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gray-900 rounded-full transition-all"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-900 w-8 text-right tabular-nums">{value}</span>
    </div>
  )
}

function formatHour(h: number): string {
  if (h === 0) return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

export function Analytics({ data }: AnalyticsProps) {
  const [range, setRange] = useState<DateRange>('7d')
  const stats = data[range]

  const topRequests = stats.requestsByType.slice(0, 5)
  const maxTypeCount = Math.max(...topRequests.map((r) => r.count), 1)
  const maxDayCount = Math.max(...stats.requestsByDay.map((d) => d.count), 1)
  const maxHourCount = Math.max(...stats.requestsByHour.map((h) => h.count), 1)

  return (
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="flex gap-2">
        {([
          ['7d', 'Last 7 days'],
          ['30d', 'Last 30 days'],
          ['all', 'All time'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRange(key)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              range === key
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Requests" value={stats.totalRequests} />
        <StatCard
          label="Avg / Day"
          value={
            stats.requestsByDay.length > 0
              ? (stats.totalRequests / stats.requestsByDay.length).toFixed(1)
              : '0'
          }
        />
      </div>

      {/* Fulfillment breakdown */}
      {stats.fulfillmentBreakdown.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fulfillment</h3>
          <div className="flex gap-4">
            {stats.fulfillmentBreakdown.map((f) => (
              <div key={f.type} className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-gray-900 tabular-nums">{f.count}</span>
                <span className="text-sm text-gray-500 capitalize">{f.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top requests */}
      {topRequests.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Top Requests</h3>
          <div className="space-y-2">
            {topRequests.map((r) => (
              <BarRow key={r.name} label={r.name} value={r.count} max={maxTypeCount} />
            ))}
          </div>
        </div>
      )}

      {/* Requests by day */}
      {stats.requestsByDay.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Requests by Day</h3>
          <div className="space-y-1.5">
            {stats.requestsByDay.map((d) => (
              <BarRow key={d.date} label={d.date} value={d.count} max={maxDayCount} />
            ))}
          </div>
        </div>
      )}

      {/* Requests by hour */}
      {stats.requestsByHour.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Busiest Hours</h3>
          <div className="space-y-1.5">
            {stats.requestsByHour
              .filter((h) => h.count > 0)
              .sort((a, b) => b.count - a.count)
              .slice(0, 8)
              .map((h) => (
                <BarRow key={h.hour} label={formatHour(h.hour)} value={h.count} max={maxHourCount} />
              ))}
          </div>
        </div>
      )}

      {stats.totalRequests === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          No request data for this time period.
        </div>
      )}
    </div>
  )
}
