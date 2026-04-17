'use client'

import type { RequestWithModifiers } from '@/lib/supabase/types'

type MenuItemCardProps = {
  item: RequestWithModifiers
  totalQuantity: number
  hasModifiers: boolean
  onAdd: () => void
  onAddWithModifiers: () => void
  onRemove: () => void
}

export function MenuItemCard({
  item,
  totalQuantity,
  hasModifiers,
  onAdd,
  onAddWithModifiers,
  onRemove,
}: MenuItemCardProps) {
  const isSelected = totalQuantity > 0

  return (
    <div
      className={`hover-card rounded-xl border bg-white p-5 shadow-sm ${
        isSelected
          ? 'border-[var(--venue-accent)] ring-1 ring-[var(--venue-accent)]/20'
          : 'border-gray-100'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {item.icon_url && (
          <img
            src={item.icon_url}
            alt={item.name}
            className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-sm"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-gray-900 tracking-tight">{item.name}</h3>
          {item.description && (
            <p className="text-[13px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
          {item.price !== null && (
            <p className="text-sm font-semibold text-gray-900 mt-2 tabular-nums">
              ${item.price.toFixed(2)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          {hasModifiers ? (
            <div className="flex items-center gap-2">
              {isSelected && (
                <span className="w-7 h-7 rounded-full bg-[var(--venue-accent)] flex items-center justify-center text-xs font-bold text-white shadow-sm">
                  {totalQuantity}
                </span>
              )}
              <button
                type="button"
                onClick={onAddWithModifiers}
                className="hover-btn h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm"
              >
                {isSelected ? '+' : 'Add'}
              </button>
            </div>
          ) : isSelected ? (
            <div className="flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
              <button
                type="button"
                onClick={onRemove}
                className="hover-btn w-9 h-9 flex items-center justify-center text-lg font-bold text-gray-500 rounded-l-lg"
                aria-label={`Decrease ${item.name} quantity`}
              >
                −
              </button>
              <span className="w-7 text-center text-sm font-bold text-gray-900 tabular-nums">
                {totalQuantity}
              </span>
              <button
                type="button"
                onClick={onAdd}
                className="hover-btn w-9 h-9 flex items-center justify-center text-lg font-bold text-white rounded-r-lg"
                style={{ backgroundColor: 'var(--venue-accent)' }}
                aria-label={`Increase ${item.name} quantity`}
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              className="hover-btn h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm"
            >
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
