import { LoginForm } from '../_components/login-form'

export const metadata = {
  title: 'Admin Login — Promptly',
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Promptly Admin</h1>
          <p className="text-gray-500 mt-1">Enter your venue slug and passcode</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
