'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { KeyRound, CheckCircle2 } from 'lucide-react'

function Field({
  id, label, type = 'text', value, onChange, placeholder, error, autoComplete,
}: {
  id: string; label: string; type?: string; value: string
  onChange: (v: string) => void; placeholder?: string; error?: string; autoComplete?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-stone-700">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
          error ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-stone-300 bg-white'
        }`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function validate() {
    const e: Record<string, string> = {}
    if (!email) e.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address.'
    if (!password) e.password = 'Password is required.'
    else if (password.length < 8) e.password = 'Password must be at least 8 characters.'
    if (!confirm) e.confirm = 'Please confirm your password.'
    else if (password && confirm && password !== confirm) e.confirm = 'Passwords do not match.'
    return e
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    const fieldErrors = validate()
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({ email, password })
    console.log('Signup result:', { data, error })

    if (error) {
      setFormError(error.message)
      setLoading(false)
    } else {
      setLoading(false)
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500 mx-auto mb-4">
            <CheckCircle2 className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">Account created!</h2>
          <p className="text-stone-500 text-sm mb-6">
            Your account for <strong>{email}</strong> is ready.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-amber-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-amber-700 transition-colors"
          >
            Sign in now
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600 mb-3">
            <KeyRound className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Keystone</h1>
          <p className="text-sm text-stone-500 mt-1">Create your account</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
          <form onSubmit={handleSignup} noValidate className="flex flex-col gap-4">
            <Field id="email" label="Email" type="email" value={email} onChange={v => { setEmail(v); setErrors(p => ({ ...p, email: '' })) }}
              placeholder="you@example.com" error={errors.email} autoComplete="email" />
            <Field id="password" label="Password" type="password" value={password} onChange={v => { setPassword(v); setErrors(p => ({ ...p, password: '' })) }}
              placeholder="Min. 8 characters" error={errors.password} autoComplete="new-password" />
            <Field id="confirm" label="Confirm password" type="password" value={confirm} onChange={v => { setConfirm(v); setErrors(p => ({ ...p, confirm: '' })) }}
              placeholder="Re-enter your password" error={errors.confirm} autoComplete="new-password" />

            {formError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700 font-medium">
                {formError}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full mt-1">
              Create account
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-stone-500">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-amber-600 hover:text-amber-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
