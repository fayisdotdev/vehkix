import { useState, type FormEvent } from 'react'
import type { AuthFeedback, AuthMode, AuthValues } from '../types/auth'
import '../styles/forms.css'
import './AuthPanel.css'

export type { AuthFeedback, AuthMode, AuthValues } from '../types/auth'

interface AuthPanelProps {
  onSubmit: (mode: AuthMode, values: AuthValues) => Promise<AuthFeedback>
}

function AuthPanel({ onSubmit }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const isSignUp = mode === 'sign-up'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setFeedback(null)
    try {
      setFeedback(await onSubmit(mode, { username: username.trim(), email: email.trim(), password }))
    } catch {
      setFeedback({ kind: 'error', message: 'Could not connect to the account service. Try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setFeedback(null)
  }

  return (
    <section className="auth-panel" aria-labelledby="auth-title">
      <div className="auth-intro">
        <p className="eyebrow">MEMBER ACCESS</p>
        <h2 id="auth-title">{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
        <p>{isSignUp ? 'Keep your vehicles in a private garage.' : 'Sign in to view and manage your vehicles.'}</p>
      </div>
      <div className="auth-form-area">
        <div className="mode-switch" aria-label="Account access mode">
          <button type="button" aria-pressed={!isSignUp} onClick={() => changeMode('sign-in')}>
            Log in
          </button>
          <button type="button" aria-pressed={isSignUp} onClick={() => changeMode('sign-up')}>
            Sign up
          </button>
        </div>
        <form className="stacked-form" onSubmit={handleSubmit}>
          {isSignUp && (
            <label className="form-field">
              <span>Username</span>
              <input
                autoComplete="username"
                minLength={3}
                maxLength={32}
                pattern="[A-Za-z0-9_]{3,32}"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="e.g. fayis_dev"
              />
              <small>3–32 letters, numbers, or underscores</small>
            </label>
          )}
          <label className="form-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={isSignUp ? 8 : undefined}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isSignUp ? 'At least 8 characters' : 'Your password'}
            />
          </label>
          <button className="primary-action" type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : isSignUp ? 'Create account' : 'Log in'}
          </button>
          {feedback && (
            <p className={`form-feedback ${feedback.kind}`} role="status">
              {feedback.message}
            </p>
          )}
        </form>
      </div>
    </section>
  )
}

export default AuthPanel