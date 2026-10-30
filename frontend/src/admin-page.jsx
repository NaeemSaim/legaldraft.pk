// ---------------------------------------------------------------------------
// Admin: review payment submissions.
//
// Reached at #/admin. The admin token is entered once and kept only in this
// browser tab's memory — it is never written to storage, so closing the tab
// signs you out. Approving a submission grants the credits in the same step.
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react'
import { API_BASE, adminListPayments, adminApprovePayment, adminRejectPayment } from './auth-client.js'

function money(n) {
  return typeof n === 'number' ? n.toLocaleString() : '—'
}

function ProofImage({ claimId, token }) {
  const [src, setSrc] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let url = ''
    let cancelled = false
    fetch(`${API_BASE}/api/admin/payments/${claimId}/file`, { headers: { 'x-admin-token': token } })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('no file'))))
      .then((b) => {
        if (cancelled) return
        url = URL.createObjectURL(b)
        setSrc(url)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [claimId, token])

  if (failed) return <div className="admin-noimg">Screenshot unavailable</div>
  if (!src) return <div className="admin-noimg">Loading screenshot&hellip;</div>
  return (
    <a href={src} target="_blank" rel="noreferrer" className="admin-proof-link">
      <img className="admin-proof" src={src} alt="Payment screenshot" />
    </a>
  )
}

export function Admin() {
  const [token, setToken] = useState('')
  const [entered, setEntered] = useState(false)
  const [status, setStatus] = useState('pending')
  const [claims, setClaims] = useState([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  async function load(tok = token, st = status) {
    setError('')
    try {
      setClaims(await adminListPayments(tok, st))
      setEntered(true)
    } catch (err) {
      setError(err.message)
      setEntered(false)
    }
  }

  async function approve(claim) {
    const input = window.prompt(
      `Credits to grant to ${claim.accountEmail}?`,
      String(claim.credits || 1)
    )
    if (input === null) return
    const n = Number(input)
    if (!n || n <= 0) return
    setBusyId(claim.id)
    try {
      const r = await adminApprovePayment(token, claim.id, n)
      window.alert(`Granted ${r.granted} credits to ${r.email}. New balance: ${r.balance}.`)
      await load()
    } catch (err) {
      window.alert(err.message)
    } finally {
      setBusyId('')
    }
  }

  async function reject(claim) {
    const reason = window.prompt('Reason (shown to the customer):', 'Payment could not be verified')
    if (reason === null) return
    setBusyId(claim.id)
    try {
      await adminRejectPayment(token, claim.id, reason)
      await load()
    } catch (err) {
      window.alert(err.message)
    } finally {
      setBusyId('')
    }
  }

  if (!entered) {
    return (
      <div className="site-container auth-wrap">
        <div className="auth-card">
          <h1 className="auth-title">Admin</h1>
          <p className="auth-sub">Enter your admin token to review payment submissions.</p>
          <label className="field-label" htmlFor="ad-token">Admin token</label>
          <input
            id="ad-token"
            type="password"
            className="field-input auth-input"
            value={token}
            onChange={(e) => { setToken(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && load(token, status)}
          />
          {error ? <p className="error-msg">{error}</p> : null}
          <button className="btn btn-primary auth-btn" type="button" onClick={() => load(token, status)}>
            Open queue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="site-container page page-wide">
      <header className="page-header">
        <div className="eyebrow">Admin</div>
        <h1>Payment submissions</h1>
      </header>

      <div className="admin-tabs">
        {['pending', 'approved', 'rejected'].map((s) => (
          <button
            key={s}
            type="button"
            className={`lang-btn ${status === s ? 'active' : ''}`}
            onClick={() => { setStatus(s); load(token, s) }}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
        <button type="button" className="linklike" onClick={() => load()}>Refresh</button>
      </div>

      {error ? <p className="error-msg">{error}</p> : null}

      {claims.length === 0 ? (
        <div className="empty-state"><p>Nothing here.</p></div>
      ) : (
        <div className="admin-list">
          {claims.map((c) => (
            <div key={c.id} className="admin-card">
              <div className="admin-card-body">
                <div className="admin-row">
                  <span className="admin-amount">PKR {money(c.amountPkr)}</span>
                  <span className={`proof-status is-${c.status}`}>{c.status}</span>
                </div>
                <div className="admin-meta">
                  <strong>{c.accountName || 'No name'}</strong> · {c.accountEmail}
                </div>
                <div className="admin-meta">
                  {c.method || 'unknown method'} · ref <strong>{c.reference || '—'}</strong>
                </div>
                <div className="admin-meta">
                  Claiming <strong>{c.credits || '?'}</strong> credits · balance now {c.accountBalance}
                </div>
                <div className="admin-meta admin-date">{new Date(c.at).toLocaleString()}</div>
                {c.note ? <div className="admin-note">“{c.note}”</div> : null}

                {c.status === 'pending' ? (
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => approve(c)}
                      disabled={busyId === c.id}
                    >
                      Approve &amp; grant credits
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => reject(c)}
                      disabled={busyId === c.id}
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="admin-card-proof">
                <ProofImage claimId={c.id} token={token} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
