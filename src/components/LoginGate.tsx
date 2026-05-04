import { useState } from 'react'
import { setPassword } from '../lib/auth'
import { verifyPassword } from '../lib/familyData'

interface Props {
  onUnlock: () => void
}

export function LoginGate({ onUnlock }: Props) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || !value) return
    setSubmitting(true)
    setError(null)
    try {
      const ok = await verifyPassword(value)
      if (!ok) {
        setError('Wrong password.')
        setValue('')
        return
      }
      setPassword(value)
      onUnlock()
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Lui + Shum Family Tree</h1>
        <p className="muted">Family password required.</p>
        <input
          type="password"
          autoFocus
          placeholder="Password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          disabled={submitting}
          autoComplete="current-password"
        />
        {error && <div className="login-error">{error}</div>}
        <button type="submit" className="primary" disabled={submitting || !value}>
          {submitting ? 'Checking…' : 'Enter'}
        </button>
      </form>
    </div>
  )
}
