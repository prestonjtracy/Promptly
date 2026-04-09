'use client'

import { useState } from 'react'
import type { MenuItemWithModifiers, SelectedModifier } from '@/lib/supabase/types'

type ModifierModalProps = {
  item: MenuItemWithModifiers
  onConfirm: (selectedModifiers: SelectedModifier[]) => void
  onClose: () => void
}

export function ModifierModal({ item, onConfirm, onClose }: ModifierModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (optionId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(optionId)) {
        next.delete(optionId)
      } else {
        next.add(optionId)
      }
      return next
    })
  }

  const modifierTotal = item.modifier_groups.reduce((sum, group) => {
    return (
      sum +
      group.options
        .filter((o) => selected.has(o.id))
        .reduce((s, o) => s + o.price_adjustment, 0)
    )
  }, 0)

  const totalPrice =
    item.price !== null ? item.price + modifierTotal : null

  const handleConfirm = () => {
    const selectedModifiers: SelectedModifier[] = []
    for (const group of item.modifier_groups) {
      for (const option of group.options) {
        if (selected.has(option.id)) {
          selectedModifiers.push({
            option_id: option.id,
            group_name: group.name,
            option_name: option.name,
            modifier_type: option.modifier_type,
            price_adjustment: option.price_adjustment,
          })
        }
      }
    }
    onConfirm(selectedModifiers)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{item.name}</h2>
            {item.price !== null && (
              <p className="text-sm text-gray-500">
                ${item.price.toFixed(2)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modifier groups */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {item.modifier_groups.map((group) => (
            <div key={group.id} className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                {group.name}
              </h3>
              <div className="space-y-1.5">
                {group.options.map((option) => {
                  const isSelected = selected.has(option.id)
                  const isRemove = option.modifier_type === 'remove'

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggle(option.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                        isSelected
                          ? isRemove
                            ? 'border-red-300 bg-red-50'
                            : 'border-[var(--venue-accent)] bg-[var(--venue-accent)]/5'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? isRemove
                                ? 'border-red-400 bg-red-400'
                                : 'border-[var(--venue-accent)] bg-[var(--venue-accent)]'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={3}
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4.5 12.75l6 6 9-13.5"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {isRemove ? '− ' : '+ '}
                          {option.name}
                        </span>
                      </div>
                      {!isRemove && option.price_adjustment > 0 ? (
                        <span className="text-sm text-gray-500">
                          +${option.price_adjustment.toFixed(2)}
                        </span>
                      ) : isRemove ? (
                        <span className="text-xs text-gray-400">Free</span>
                      ) : (
                        <span className="text-xs text-gray-400">Free</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200">
          <button
            onClick={handleConfirm}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-base transition-opacity"
            style={{ backgroundColor: 'var(--venue-accent)' }}
          >
            Add to Order
            {totalPrice !== null && ` — $${totalPrice.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
