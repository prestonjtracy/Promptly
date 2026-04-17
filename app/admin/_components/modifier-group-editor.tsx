'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ModifierGroupWithOptions, ModifierOptionType } from '@/lib/supabase/types'
import {
  addModifierGroup,
  deleteModifierGroup,
  addModifierOption,
  updateModifierOption,
  deleteModifierOption,
} from '@/app/actions/admin'

type ModifierGroupEditorProps = {
  menuItemId: string
  venueId: string
  modifierGroups: ModifierGroupWithOptions[]
}

export function ModifierGroupEditor({
  menuItemId,
  venueId,
  modifierGroups,
}: ModifierGroupEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Add group state
  const [newGroupName, setNewGroupName] = useState('')
  const [showAddGroup, setShowAddGroup] = useState(false)

  // Add option state
  const [addingOptionForGroupId, setAddingOptionForGroupId] = useState<string | null>(null)
  const [newOptionName, setNewOptionName] = useState('')
  const [newOptionType, setNewOptionType] = useState<ModifierOptionType>('add')
  const [newOptionPrice, setNewOptionPrice] = useState('')

  // Edit option state
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null)
  const [editOptionName, setEditOptionName] = useState('')
  const [editOptionType, setEditOptionType] = useState<ModifierOptionType>('add')
  const [editOptionPrice, setEditOptionPrice] = useState('')

  const startEditingOption = (option: {
    id: string
    name: string
    modifier_type: ModifierOptionType
    price_adjustment: number
  }) => {
    setEditingOptionId(option.id)
    setEditOptionName(option.name)
    setEditOptionType(option.modifier_type)
    setEditOptionPrice(
      option.modifier_type === 'add' && option.price_adjustment > 0
        ? option.price_adjustment.toString()
        : ''
    )
    setAddingOptionForGroupId(null)
  }

  const handleSaveOption = () => {
    if (!editingOptionId || !editOptionName.trim()) return

    setError(null)
    startTransition(async () => {
      const result = await updateModifierOption(editingOptionId, venueId, {
        name: editOptionName.trim(),
        modifier_type: editOptionType,
        price_adjustment:
          editOptionType === 'remove'
            ? 0
            : editOptionPrice.trim()
              ? parseFloat(editOptionPrice.trim())
              : 0,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setEditingOptionId(null)
        router.refresh()
      }
    })
  }

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return

    setError(null)
    startTransition(async () => {
      const result = await addModifierGroup(menuItemId, venueId, newGroupName.trim())
      if (result.error) {
        setError(result.error)
      } else {
        setNewGroupName('')
        setShowAddGroup(false)
        router.refresh()
      }
    })
  }

  const handleDeleteGroup = (groupId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await deleteModifierGroup(groupId, venueId)
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  const handleAddOption = (groupId: string) => {
    if (!newOptionName.trim()) return

    setError(null)
    startTransition(async () => {
      const result = await addModifierOption(groupId, venueId, {
        name: newOptionName.trim(),
        modifier_type: newOptionType,
        price_adjustment:
          newOptionType === 'remove'
            ? 0
            : newOptionPrice.trim()
              ? parseFloat(newOptionPrice.trim())
              : 0,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setNewOptionName('')
        setNewOptionType('add')
        setNewOptionPrice('')
        setAddingOptionForGroupId(null)
        router.refresh()
      }
    })
  }

  const handleDeleteOption = (optionId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await deleteModifierOption(optionId, venueId)
      if (result.error) {
        setError(result.error)
      } else {
        if (editingOptionId === optionId) setEditingOptionId(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Options & Customizations
        </h4>
        <button
          type="button"
          onClick={() => {
            setShowAddGroup(!showAddGroup)
            setAddingOptionForGroupId(null)
            setEditingOptionId(null)
          }}
          className="text-xs text-gray-500 hover:text-gray-700 font-medium"
        >
          {showAddGroup ? 'Cancel' : '+ Add Group'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Add group form */}
      {showAddGroup && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Group name (e.g. Customize)"
            className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
          />
          <button
            onClick={handleAddGroup}
            disabled={isPending || !newGroupName.trim()}
            className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {/* Existing groups */}
      {modifierGroups.length === 0 && !showAddGroup && (
        <p className="text-xs text-gray-400">No modifier groups yet.</p>
      )}

      {modifierGroups.map((group) => (
        <div key={group.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-800">
              {group.name}
            </span>
            <button
              type="button"
              onClick={() => handleDeleteGroup(group.id)}
              disabled={isPending}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          </div>

          {/* Options list */}
          {group.options.length > 0 && (
            <ul className="space-y-1 ml-2">
              {group.options
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((option) => {
                  // Editing this option
                  if (editingOptionId === option.id) {
                    return (
                      <li key={option.id} className="bg-white border border-gray-300 rounded-lg p-2 space-y-2">
                        {/* Type toggle */}
                        <div className="grid grid-cols-2 gap-1 bg-gray-200 p-0.5 rounded-lg">
                          <button
                            type="button"
                            onClick={() => {
                              setEditOptionType('add')
                            }}
                            className={`py-1.5 rounded-md text-xs font-semibold transition-all ${
                              editOptionType === 'add'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500'
                            }`}
                          >
                            + Add-on
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditOptionType('remove')
                              setEditOptionPrice('')
                            }}
                            className={`py-1.5 rounded-md text-xs font-semibold transition-all ${
                              editOptionType === 'remove'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500'
                            }`}
                          >
                            − Removal
                          </button>
                        </div>
                        <div className="flex gap-2 items-end">
                          <input
                            type="text"
                            value={editOptionName}
                            onChange={(e) => setEditOptionName(e.target.value)}
                            placeholder="Option name"
                            className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
                          />
                          {editOptionType === 'add' && (
                            <input
                              type="number"
                              value={editOptionPrice}
                              onChange={(e) => setEditOptionPrice(e.target.value)}
                              placeholder="$0.00"
                              step="0.01"
                              min="0"
                              className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
                            />
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveOption}
                            disabled={isPending || !editOptionName.trim()}
                            className="px-2 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50"
                          >
                            {isPending ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => handleDeleteOption(option.id)}
                            disabled={isPending}
                            className="px-2 py-1.5 border border-red-300 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setEditingOptionId(null)}
                            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5"
                          >
                            Cancel
                          </button>
                        </div>
                      </li>
                    )
                  }

                  // Display mode — tap to edit
                  return (
                    <li
                      key={option.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <button
                        type="button"
                        onClick={() => startEditingOption(option)}
                        className="text-left text-gray-600 hover:text-gray-900"
                      >
                        <span
                          className={
                            option.modifier_type === 'remove'
                              ? 'text-red-500'
                              : 'text-green-600'
                          }
                        >
                          {option.modifier_type === 'remove' ? '−' : '+'}
                        </span>{' '}
                        {option.name}
                        {option.modifier_type === 'add' &&
                          option.price_adjustment > 0 && (
                            <span className="text-gray-400 ml-1">
                              ${option.price_adjustment.toFixed(2)}
                            </span>
                          )}
                        {option.modifier_type === 'remove' && (
                          <span className="text-gray-400 ml-1">Free</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditingOption(option)}
                        disabled={isPending}
                        className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        Edit
                      </button>
                    </li>
                  )
                })}
            </ul>
          )}

          {/* Add option form */}
          {addingOptionForGroupId === group.id ? (
            <div className="space-y-2">
              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-1 bg-gray-200 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setNewOptionType('add')}
                  className={`py-1.5 rounded-md text-xs font-semibold transition-all ${
                    newOptionType === 'add'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500'
                  }`}
                >
                  + Add-on
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewOptionType('remove')
                    setNewOptionPrice('')
                  }}
                  className={`py-1.5 rounded-md text-xs font-semibold transition-all ${
                    newOptionType === 'remove'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500'
                  }`}
                >
                  − Removal
                </button>
              </div>

              <div className="flex gap-2 items-end">
                <input
                  type="text"
                  value={newOptionName}
                  onChange={(e) => setNewOptionName(e.target.value)}
                  placeholder={
                    newOptionType === 'add' ? 'e.g. Bacon' : 'e.g. No Lettuce'
                  }
                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
                />
                {newOptionType === 'add' && (
                  <input
                    type="number"
                    value={newOptionPrice}
                    onChange={(e) => setNewOptionPrice(e.target.value)}
                    placeholder="$0.00"
                    step="0.01"
                    min="0"
                    className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
                  />
                )}
                <button
                  onClick={() => handleAddOption(group.id)}
                  disabled={isPending || !newOptionName.trim()}
                  className="px-2 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setAddingOptionForGroupId(null)
                    setNewOptionName('')
                    setNewOptionType('add')
                    setNewOptionPrice('')
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAddingOptionForGroupId(group.id)
                setEditingOptionId(null)
                setNewOptionName('')
                setNewOptionType('add')
                setNewOptionPrice('')
              }}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium"
            >
              + Add Option
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
