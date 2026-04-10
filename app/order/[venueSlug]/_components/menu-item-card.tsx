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
      className={`rounded-xl border-2 p-4 transition-all ${
        isSelected
          ? 'border-[var(--venue-accent)] bg-[var(--venue-accent)]/5'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
            {item.price !== null && (
              <span className="text-sm text-gray-500 shrink-0">
                ${item.price.toFixed(2)}
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasModifiers ? (
            // Items with modifiers: always show "Add" button that opens modal
            <div className="flex items-center gap-2">
              {isSelected && (
                <span className="w-7 h-7 rounded-full bg-[var(--venue-accent)] flex items-center justify-center text-xs font-bold text-white">
                  {totalQuantity}
                </span>
              )}
              <button
                type="button"
                onClick={onAddWithModifiers}
                className="px-4 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors active:scale-95"
              >
                {isSelected ? '+' : 'Add'}
              </button>
            </div>
          ) : isSelected ? (
            // Items without modifiers: show +/- stepper
            <>
              <button
                type="button"
                onClick={onRemove}
                className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-700 hover:bg-gray-300 transition-colors active:scale-95"
                aria-label={`Decrease ${item.name} quantity`}
              >
                −
              </button>
              <span className="w-6 text-center font-semibold text-gray-900">
                {totalQuantity}
              </span>
              <button
                type="button"
                onClick={onAdd}
                className="w-9 h-9 rounded-full bg-[var(--venue-accent)] flex items-center justify-center text-lg font-bold text-white hover:opacity-90 transition-opacity active:scale-95"
                aria-label={`Increase ${item.name} quantity`}
              >
                +
              </button>
            </>
          ) : (
            // Items without modifiers: initial "Add" button
            <button
              type="button"
              onClick={onAdd}
              className="px-4 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors active:scale-95"
            >
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
