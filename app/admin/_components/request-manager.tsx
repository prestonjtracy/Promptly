'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Venue, MenuItemWithModifiers, MenuCategory } from '@/lib/supabase/types'
import { ModifierGroupEditor } from './modifier-group-editor'
import {
  createRequest,
  updateRequest,
  deleteRequest,
  reorderRequests,
  addCategory,
} from '@/app/actions/admin'

// ── Sortable item wrapper ────────────────────────────────────

function SortableItem({
  item,
  venueId,
  editingId,
  isPending,
  categories,
  editName,
  editDescription,
  editPrice,
  editCategoryId,
  setEditName,
  setEditDescription,
  setEditPrice,
  setEditCategoryId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  formatPrice,
}: {
  item: MenuItemWithModifiers
  venueId: string
  editingId: string | null
  isPending: boolean
  categories: MenuCategory[]
  editName: string
  editDescription: string
  editPrice: string
  editCategoryId: string
  setEditName: (v: string) => void
  setEditDescription: (v: string) => void
  setEditPrice: (v: string) => void
  setEditCategoryId: (v: string) => void
  onStartEdit: (item: MenuItemWithModifiers) => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onDelete: (id: string) => void
  formatPrice: (price: number | null) => string | null
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  if (editingId === item.id) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-white border-2 border-gray-900 rounded-xl p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900 text-sm">Edit Item</h3>
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Item name *"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
        />
        <input
          type="text"
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
        />
        <input
          type="number"
          value={editPrice}
          onChange={(e) => setEditPrice(e.target.value)}
          placeholder="Price (optional)"
          step="0.01"
          min="0"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
        />
        <select
          value={editCategoryId}
          onChange={(e) => setEditCategoryId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
        >
          <option value="">No category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Modifier groups */}
        <div className="border-t border-gray-200 pt-3">
          <ModifierGroupEditor
            menuItemId={item.id}
            venueId={venueId}
            modifierGroups={item.modifier_groups ?? []}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onSaveEdit}
            disabled={isPending || !editName.trim()}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => onDelete(item.id)}
            disabled={isPending}
            className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3"
    >
      {/* Drag handle */}
      <button
        type="button"
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Item info — tap to edit */}
      <button
        type="button"
        onClick={() => onStartEdit(item)}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-gray-900 truncate">{item.name}</span>
          {item.price !== null && (
            <span className="text-sm text-gray-500 shrink-0">{formatPrice(item.price)}</span>
          )}
        </div>
        {item.description && (
          <p className="text-sm text-gray-500 truncate">{item.description}</p>
        )}
      </button>

      {/* Edit pencil icon */}
      <button
        type="button"
        onClick={() => onStartEdit(item)}
        disabled={isPending}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-50"
        aria-label={`Edit ${item.name}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
        </svg>
      </button>
    </div>
  )
}

// ── Sortable section (one per category or uncategorized) ─────

function SortableSection({
  title,
  items,
  onDragEnd,
  venueId,
  editingId,
  isPending,
  categories,
  editName,
  editDescription,
  editPrice,
  editCategoryId,
  setEditName,
  setEditDescription,
  setEditPrice,
  setEditCategoryId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  formatPrice,
}: {
  title: string
  items: MenuItemWithModifiers[]
  onDragEnd: (event: DragEndEvent, sectionItems: MenuItemWithModifiers[]) => void
  venueId: string
  editingId: string | null
  isPending: boolean
  categories: MenuCategory[]
  editName: string
  editDescription: string
  editPrice: string
  editCategoryId: string
  setEditName: (v: string) => void
  setEditDescription: (v: string) => void
  setEditPrice: (v: string) => void
  setEditCategoryId: (v: string) => void
  onStartEdit: (item: MenuItemWithModifiers) => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onDelete: (id: string) => void
  formatPrice: (price: number | null) => string | null
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (!mounted) {
    // Render without DndContext on the server to avoid hydration mismatch
    return (
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {title}
        </h2>
        <div className="space-y-2">
          {items.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              venueId={venueId}
              editingId={editingId}
              isPending={isPending}
              categories={categories}
              editName={editName}
              editDescription={editDescription}
              editPrice={editPrice}
              editCategoryId={editCategoryId}
              setEditName={setEditName}
              setEditDescription={setEditDescription}
              setEditPrice={setEditPrice}
              setEditCategoryId={setEditCategoryId}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onSaveEdit={onSaveEdit}
              onDelete={onDelete}
              formatPrice={formatPrice}
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {title}
      </h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e) => onDragEnd(e, items)}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                venueId={venueId}
                editingId={editingId}
                isPending={isPending}
                categories={categories}
                editName={editName}
                editDescription={editDescription}
                editPrice={editPrice}
                editCategoryId={editCategoryId}
                setEditName={setEditName}
                setEditDescription={setEditDescription}
                setEditPrice={setEditPrice}
                setEditCategoryId={setEditCategoryId}
                onStartEdit={onStartEdit}
                onCancelEdit={onCancelEdit}
                onSaveEdit={onSaveEdit}
                onDelete={onDelete}
                formatPrice={formatPrice}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  )
}

// ── Main component ───────────────────────────────────────────

type RequestManagerProps = {
  venue: Venue
  requests: MenuItemWithModifiers[]
  categories: MenuCategory[]
}

export function RequestManager({ venue, requests, categories }: RequestManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Add item form state
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newCategoryId, setNewCategoryId] = useState<string>('')

  // Edit item form state
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editCategoryId, setEditCategoryId] = useState<string>('')

  // Add category state
  const [newCategoryName, setNewCategoryName] = useState('')

  const startEditing = (item: MenuItemWithModifiers) => {
    setEditingId(item.id)
    setEditName(item.name)
    setEditDescription(item.description ?? '')
    setEditPrice(item.price !== null ? item.price.toString() : '')
    setEditCategoryId(item.category_id ?? '')
    setShowAddForm(false)
    setShowAddCategory(false)
  }

  const cancelEditing = () => {
    setEditingId(null)
  }

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return

    setError(null)
    startTransition(async () => {
      const result = await updateRequest(editingId, venue.id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        price: editPrice.trim() ? parseFloat(editPrice.trim()) : null,
        category_id: editCategoryId || null,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setEditingId(null)
        router.refresh()
      }
    })
  }

  const handleCreateRequest = () => {
    if (!newName.trim()) return

    setError(null)
    startTransition(async () => {
      const maxOrder = requests.length > 0
        ? Math.max(...requests.map((i) => i.sort_order))
        : -1

      const result = await createRequest({
        venue_id: venue.id,
        name: newName.trim(),
        description: newDescription.trim() || null,
        price: newPrice.trim() ? parseFloat(newPrice.trim()) : null,
        category_id: newCategoryId || null,
        sort_order: maxOrder + 1,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setNewName('')
        setNewDescription('')
        setNewPrice('')
        setNewCategoryId('')
        setShowAddForm(false)
        router.refresh()
      }
    })
  }

  const handleDelete = (itemId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await deleteRequest(itemId, venue.id)
      if (result.error) {
        setError(result.error)
      } else {
        if (editingId === itemId) setEditingId(null)
        router.refresh()
      }
    })
  }

  const handleDragEnd = (event: DragEndEvent, sectionItems: MenuItemWithModifiers[]) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sectionItems.findIndex((i) => i.id === active.id)
    const newIndex = sectionItems.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    // Build new sort_order assignments for all items in this section
    const reordered = [...sectionItems]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    const updates = reordered.map((item, i) => ({
      id: item.id,
      sort_order: i,
    }))

    setError(null)
    startTransition(async () => {
      const result = await reorderRequests(venue.id, updates)
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return

    setError(null)
    startTransition(async () => {
      const result = await addCategory(venue.id, newCategoryName.trim())
      if (result.error) {
        setError(result.error)
      } else {
        setNewCategoryName('')
        setShowAddCategory(false)
        router.refresh()
      }
    })
  }

  // Group items by category
  const uncategorized = requests.filter((i) => !i.category)
  const grouped = new Map<string, { category: MenuCategory; items: MenuItemWithModifiers[] }>()

  for (const item of requests) {
    if (item.category) {
      const existing = grouped.get(item.category.id)
      if (existing) {
        existing.items.push(item)
      } else {
        grouped.set(item.category.id, { category: item.category, items: [item] })
      }
    }
  }

  const sortedGroups = Array.from(grouped.values()).sort(
    (a, b) => a.category.sort_order - b.category.sort_order
  )

  const formatPrice = (price: number | null) => {
    if (price === null) return null
    return `$${price.toFixed(2)}`
  }

  const sharedProps = {
    venueId: venue.id,
    editingId,
    isPending,
    categories,
    editName,
    editDescription,
    editPrice,
    editCategoryId,
    setEditName,
    setEditDescription,
    setEditPrice,
    setEditCategoryId,
    onStartEdit: startEditing,
    onCancelEdit: cancelEditing,
    onSaveEdit: handleSaveEdit,
    onDelete: handleDelete,
    formatPrice,
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => { setShowAddForm(!showAddForm); setShowAddCategory(false); setEditingId(null) }}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          {showAddForm ? 'Cancel' : '+ Create Request'}
        </button>
        <button
          onClick={() => { setShowAddCategory(!showAddCategory); setShowAddForm(false); setEditingId(null) }}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          {showAddCategory ? 'Cancel' : '+ Add Category'}
        </button>
      </div>

      {/* Add category form */}
      {showAddCategory && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 className="font-medium text-gray-900">New Category</h3>
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Category name"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
          />
          <button
            onClick={handleAddCategory}
            disabled={isPending || !newCategoryName.trim()}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Adding...' : 'Add Category'}
          </button>
        </div>
      )}

      {/* Add item form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 className="font-medium text-gray-900">New Request</h3>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Item name *"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
          />
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
          />
          <input
            type="number"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            placeholder="Price (optional)"
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
          />
          <select
            value={newCategoryId}
            onChange={(e) => setNewCategoryId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreateRequest}
            disabled={isPending || !newName.trim()}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Creating...' : 'Create Request'}
          </button>
        </div>
      )}

      {/* Item list */}
      {requests.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No requests yet. Create your first one above.
        </div>
      ) : (
        <div className="space-y-6">
          {uncategorized.length > 0 && (
            <SortableSection
              title="Uncategorized"
              items={uncategorized}
              onDragEnd={handleDragEnd}
              {...sharedProps}
            />
          )}

          {sortedGroups.map(({ category, items }) => (
            <SortableSection
              key={category.id}
              title={category.name}
              items={items}
              onDragEnd={handleDragEnd}
              {...sharedProps}
            />
          ))}
        </div>
      )}
    </div>
  )
}
