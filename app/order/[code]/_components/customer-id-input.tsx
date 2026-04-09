'use client'

type CustomerIdInputProps = {
  label: string
  required: boolean
  value: string
  onChange: (value: string) => void
}

export function CustomerIdInput({
  label,
  required,
  value,
  onChange,
}: CustomerIdInputProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor="customer-id"
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id="customer-id"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter your ${label.toLowerCase()}`}
        required={required}
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-[var(--venue-accent)] focus:outline-none transition-colors"
      />
    </div>
  )
}
