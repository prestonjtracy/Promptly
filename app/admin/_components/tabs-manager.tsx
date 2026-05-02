'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
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
import type { VenueTab, InfoTabConfig } from '@/lib/supabase/types'
import { createTab, updateTab, deleteTab, reorderTabs } from '@/app/actions/admin'

const subscribeMounted = () => () => {}
const getMountedSnapshot = () => true
const getServerMountedSnapshot = () => false

type TabsManagerProps = {
  venueId: string
  tabs: VenueTab[]
}

const TYPE_LABELS: Record<VenueTab['type'], string> = {
  requests: 'Requests',
  info: 'Info',
  internal: 'Internal',
  form: 'Form',
}

function SortableTabRow({
  tab,
  editingId,
  isPending,
  editName,
  editBody,
  setEditName,
  setEditBody,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: {
  tab: VenueTab
  editingId: string | null
  isPending: boolean
  editName: string
  editBody: string
  setEditName: (v: string) => void
  setEditBody: (v: string) => void
  onStartEdit: (t: VenueTab) => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tab.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  if (editingId === tab.id) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-white border-2 border-gray-900 rounded-xl p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900 text-sm">
            Edit Tab ({TYPE_LABELS[tab.type]})
          </h3>
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
          placeholder="Tab name *"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
        />
        {tab.type === 'info' && (
          <div className="space-y-1">
            <label className="block text-xs text-gray-500">Body text</label>
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              placeholder="Shown to customers on this tab."
              rows={5}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none resize-none"
            />
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={onSaveEdit}
            disabled={isPending || !editName.trim()}
            className="hover-btn px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => onDelete(tab.id)}
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
      className="hover-card flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3"
    >
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
      <button
        type="button"
        onClick={() => onStartEdit(tab)}
        className="flex-1 min-w-0 text-left flex items-center gap-2"
      >
        <span className="font-medium text-gray-900 truncate">{tab.name}</span>
        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded uppercase tracking-wide shrink-0">
          {TYPE_LABELS[tab.type]}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onStartEdit(tab)}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        aria-label={`Edit ${tab.name}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
        </svg>
      </button>
    </div>
  )
}

export function TabsManager({ venueId, tabs }: TabsManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editBody, setEditBody] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'requests' | 'info'>('requests')

  // DnD sensors need to mount client-side to avoid hydration mismatch.
  const mounted = useSyncExternalStore(
    subscribeMounted,
    getMountedSnapshot,
    getServerMountedSnapshot,
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const startEditing = (t: VenueTab) => {
    setEditingId(t.id)
    setEditName(t.name)
    setEditBody(
      t.type === 'info' ? ((t.config as InfoTabConfig)?.body ?? '') : '',
    )
    setShowAdd(false)
  }

  const cancelEditing = () => setEditingId(null)

  const handleSave = () => {
    if (!editingId || !editName.trim()) return
    const tab = tabs.find((t) => t.id === editingId)
    if (!tab) return

    setError(null)
    startTransition(async () => {
      const result = await updateTab(editingId, venueId, {
        name: editName.trim(),
        config: tab.type === 'info' ? { body: editBody } : undefined,
      })
      if (result.error) setError(result.error)
      else {
        setEditingId(null)
        router.refresh()
      }
    })
  }

  const handleCreate = () => {
    if (!newName.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await createTab(venueId, {
        name: newName.trim(),
        type: newType,
      })
      if (result.error) setError(result.error)
      else {
        setNewName('')
        setNewType('requests')
        setShowAdd(false)
        router.refresh()
      }
    })
  }

  const handleDelete = (id: string) => {
    setError(null)
    startTransition(async () => {
      const result = await deleteTab(id, venueId)
      if (result.error) setError(result.error)
      else {
        if (editingId === id) setEditingId(null)
        router.refresh()
      }
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tabs.findIndex((t) => t.id === active.id)
    const newIndex = tabs.findIndex((t) => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = [...tabs]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    setError(null)
    startTransition(async () => {
      const result = await reorderTabs(
        venueId,
        reordered.map((t) => t.id),
      )
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  const list = (
    <div className="space-y-2">
      {tabs.map((tab) => (
        <SortableTabRow
          key={tab.id}
          tab={tab}
          editingId={editingId}
          isPending={isPending}
          editName={editName}
          editBody={editBody}
          setEditName={setEditName}
          setEditBody={setEditBody}
          onStartEdit={startEditing}
          onCancelEdit={cancelEditing}
          onSaveEdit={handleSave}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-gray-900">Custom Tabs</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Build the tab layout your customers see. Drag to reorder, tap to edit.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAdd(!showAdd)
            setEditingId(null)
          }}
          className="shrink-0 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          {showAdd ? 'Cancel' : '+ Add Tab'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showAdd && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tab name *"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none bg-white"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNewType('requests')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                newType === 'requests'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              Requests
            </button>
            <button
              type="button"
              onClick={() => setNewType('info')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                newType === 'info'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              Info
            </button>
          </div>
          <button
            onClick={handleCreate}
            disabled={isPending || !newName.trim()}
            className="hover-btn w-full px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {isPending ? 'Creating...' : 'Create Tab'}
          </button>
        </div>
      )}

      {tabs.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          No tabs yet. Add one above.
        </p>
      ) : mounted ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tabs.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {list}
          </SortableContext>
        </DndContext>
      ) : (
        list
      )}
    </div>
  )
}
