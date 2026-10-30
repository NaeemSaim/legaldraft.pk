// ---------------------------------------------------------------------------
// Sign up, log in, and email verification screens.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef } from 'react'
import { useAuth } from './auth-context.jsx'
import { signup, verifyEmail, resendVerification, forgotPassword, resetPassword } from './auth-client.js'
import { BUSINESS } from './pages.jsx'

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="site-container auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">{title}</h1>
        {subtitle ? <p className="auth-sub">{subtitle}</p> : null}
        {children}
      </div>
      {footer ? <p className="auth-footer">{footer}</p> : null}
    </div>
  )
}

// --- sign up ---------------------------------------------------------------

export function SignUp() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(null)

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setError('')
  }

  async function submit() {
    if (!form.name.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!form.email.trim() || !form.password) {
      setError('Please enter your email and choose a password.')
      return
    }
    if (form.password.length < 8) {
      setError('Please choose a password of at least 8 characters.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await signup(form.email.trim(), form.password, form.name.trim())
      setSent(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle={`We have sent a verification link to ${sent.email}. Click it to activate your account and receive your ${BUSINESS.freeTrialCredits} free credits.`}
      >
        <div className="callout">
          <p style={{ margin: 0 }}>
            The link expires in 48 hours. If it does not arrive within a few minutes, check your spam
            folder, or <a href="#/resend">request a new link</a>.
          </p>
        </div>

        {/* Shown only while email sending is not configured, so you can test. */}
        {sent.devLink ? (
          <div className="callout callout-warn">
            <strong>Email sending is not configured.</strong>
            <p style={{ marginBottom: 0 }}>
              Use this link to verify (visible because SMTP is not set up):{' '}
              <a href={sent.devLink}>{sent.devLink}</a>
            </p>
          </div>
        ) : null}

        <a className="btn btn-ghost auth-btn" href="#/login">
          Go to sign in
        </a>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle={`Verify your email and get ${BUSINESS.freeTrialCredits} free credits — enough to draft ${BUSINESS.freeTrialCredits} documents.`}
      footer={
        <>
          Already have an account? <a href="#/login">Sign in</a>
        </>
      }
    >
      <label className="field-label" htmlFor="su-name">Full name</label>
      <input
        id="su-name"
        className="field-input auth-input"
        value={form.name}
        onChange={set('name')}
        placeholder="As it should appear on correspondence"
      />

      <label className="field-label" htmlFor="su-email">Email address</label>
      <input
        id="su-email"
        type="email"
        className="field-input auth-input"
        value={form.email}
        onChange={set('email')}
        placeholder="you@example.com"
      />

      <label className="field-label" htmlFor="su-pass">Password</label>
      <input
        id="su-pass"
        type="password"
        className="field-input auth-input"
        value={form.password}
        onChange={set('password')}
        placeholder="At least 8 characters"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />

      {error ? <p className="error-msg">{error}</p> : null}

      <button className="btn btn-primary auth-btn" type="button" onClick={submit} disabled={busy}>
        {busy ? 'Creating account…' : 'Create account'}
      </button>

      <p className="auth-fine">
        Temporary and disposable email addresses are not accepted. By creating an account you agree
        to our <a href="#/terms">Terms of Service</a> and <a href="#/privacy">Privacy Policy</a>.
      </p>
    </AuthShell>
  )
}

// --- log in ----------------------------------------------------------------

export function LogIn() {
  const { signIn } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [unverified, setUnverified] = useState('')

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setError('')
    setUnverified('')
  }

  async function submit() {
    setBusy(true)
    setError('')
    try {
      await signIn(form.email.trim(), form.password)
      window.location.hash = '#/draft'
    } catch (err) {
      if (err.data && err.data.unverified) setUnverified(err.data.email || form.email.trim())
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back."
      footer={
        <>
          Don&rsquo;t have an account? <a href="#/signup">Create one</a>
        </>
      }
    >
      <label className="field-label" htmlFor="li-email">Email address</label>
      <input
        id="li-email"
        type="email"
        className="field-input auth-input"
        value={form.email}
        onChange={set('email')}
      />

      <label className="field-label" htmlFor="li-pass">Password</label>
      <input
        id="li-pass"
        type="password"
        className="field-input auth-input"
        value={form.password}
        onChange={set('password')}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />

      {error ? <p className="error-msg">{error}</p> : null}
      {unverified ? (
        <p className="auth-fine">
          <a href="#/resend">Resend the verification link</a>
        </p>
      ) : null}
      <p className="auth-fine">
        <a href="#/forgot">Forgotten your password?</a>
      </p>

      <button className="btn btn-primary auth-btn" type="button" onClick={submit} disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </AuthShell>
  )
}

// --- verify (the link target) ----------------------------------------------

export function Verify() {
  const [state, setState] = useState({ status: 'working' })
  const requested = useRef(false)

  useEffect(() => {
    // Only once: a second call would report "already verified" on a first click.
    if (requested.current) return
    requested.current = true

    // The token arrives as #/verify?token=xxxx
    const hash = window.location.hash
    const q = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
    const token = new URLSearchParams(q).get('token') || ''

    if (!token) {
      setState({ status: 'error', message: 'This verification link is incomplete.' })
      return
    }

    verifyEmail(token)
      .then((res) => setState({ status: 'done', ...res }))
      .catch((err) => setState({ status: 'error', message: err.message }))
  }, [])

  if (state.status === 'working') {
    return <AuthShell title="Verifying your email…" subtitle="One moment please." />
  }

  if (state.status === 'error') {
    return (
      <AuthShell title="We could not verify that link" subtitle={state.message}>
        <a className="btn btn-primary auth-btn" href="#/resend">Request a new link</a>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={state.alreadyVerified ? 'Already verified' : 'Email verified'}
      subtitle={
        state.alreadyVerified
          ? 'This email was already confirmed. You can sign in.'
          : `Your account is active and ${state.credits} free credits have been added.`
      }
    >
      <a className="btn btn-primary auth-btn" href="#/login">Sign in to start drafting</a>
    </AuthShell>
  )
}

// --- resend verification ---------------------------------------------------

export function ResendVerification() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  async function submit() {
    if (!email.trim()) return
    setBusy(true)
    setError('')
    try {
      const res = await resendVerification(email.trim())
      setDone(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <AuthShell title="Link sent" subtitle="Please check your inbox for the new verification link.">
        {done.devLink ? (
          <div className="callout callout-warn">
            <strong>Email sending is not configured.</strong>
            <p style={{ marginBottom: 0 }}>
              <a href={done.devLink}>{done.devLink}</a>
            </p>
          </div>
        ) : null}
        <a className="btn btn-ghost auth-btn" href="#/login">Back to sign in</a>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Resend verification link" subtitle="Enter the email you signed up with.">
      <label className="field-label" htmlFor="rs-email">Email address</label>
      <input
        id="rs-email"
        type="email"
        className="field-input auth-input"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setError('') }}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      {error ? <p className="error-msg">{error}</p> : null}
      <button className="btn btn-primary auth-btn" type="button" onClick={submit} disabled={busy}>
        {busy ? 'Sending…' : 'Send new link'}
      </button>
    </AuthShell>
  )
}

// --- gate: wraps any page that requires a signed-in, verified account -------

export function RequireAuth({ children }) {
  const { account, loading } = useAuth()

  if (loading) {
    return <AuthShell title="Loading…" />
  }

  if (!account) {
    return (
      <AuthShell
        title="Sign in to draft"
        subtitle="Drafting requires a verified account. Creating one takes a minute and includes free credits."
        footer={
          <>
            New here? <a href="#/signup">Create an account</a>
          </>
        }
      >
        <a className="btn btn-primary auth-btn" href="#/login">Sign in</a>
        <a className="btn btn-ghost auth-btn" href="#/signup">Create an account</a>
      </AuthShell>
    )
  }

  if (!account.verified) {
    return (
      <AuthShell
        title="Please verify your email"
        subtitle={`We sent a verification link to ${account.email}. Click it to activate your account.`}
      >
        <a className="btn btn-primary auth-btn" href="#/resend">Resend the link</a>
      </AuthShell>
    )
  }

  return children
}

// --- forgotten password ----------------------------------------------------

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  async function submit() {
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    setBusy(true)
    setError('')
    try {
      setDone(await forgotPassword(email.trim()))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle="If an account exists for that address, a reset link has been sent to it. The link is valid for two hours."
      >
        {done.devLink ? (
          <div className="callout callout-warn">
            <strong>Email sending is not configured.</strong>
            <p style={{ marginBottom: 0 }}>
              <a href={done.devLink}>{done.devLink}</a>
            </p>
          </div>
        ) : null}
        <a className="btn btn-ghost auth-btn" href="#/login">Back to sign in</a>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email address on your account and we will send you a link."
      footer={<><a href="#/login">Back to sign in</a></>}
    >
      <label className="field-label" htmlFor="fp-email">Email address</label>
      <input
        id="fp-email"
        type="email"
        className="field-input auth-input"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setError('') }}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      {error ? <p className="error-msg">{error}</p> : null}
      <button className="btn btn-primary auth-btn" type="button" onClick={submit} disabled={busy}>
        {busy ? 'Sending…' : 'Send reset link'}
      </button>
    </AuthShell>
  )
}

// --- set a new password (the reset link target) ----------------------------

export function ResetPassword() {
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    const q = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
    setToken(new URLSearchParams(q).get('token') || '')
  }, [])

  async function submit() {
    if (password.length < 8) {
      setError('Please choose a password of at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <AuthShell title="Password changed" subtitle="You can now sign in with your new password.">
        <a className="btn btn-primary auth-btn" href="#/login">Sign in</a>
      </AuthShell>
    )
  }

  if (!token) {
    return (
      <AuthShell title="This reset link is incomplete" subtitle="Please request a new one.">
        <a className="btn btn-primary auth-btn" href="#/forgot">Request a new link</a>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Your other sessions will be signed out.">
      <label className="field-label" htmlFor="rp-pass">New password</label>
      <input
        id="rp-pass"
        type="password"
        className="field-input auth-input"
        value={password}
        onChange={(e) => { setPassword(e.target.value); setError('') }}
        placeholder="At least 8 characters"
      />
      <label className="field-label" htmlFor="rp-conf">Confirm new password</label>
      <input
        id="rp-conf"
        type="password"
        className="field-input auth-input"
        value={confirm}
        onChange={(e) => { setConfirm(e.target.value); setError('') }}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      {error ? <p className="error-msg">{error}</p> : null}
      <button className="btn btn-primary auth-btn" type="button" onClick={submit} disabled={busy}>
        {busy ? 'Saving…' : 'Set new password'}
      </button>
    </AuthShell>
  )
}
