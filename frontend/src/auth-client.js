// ---------------------------------------------------------------------------
// Talking to the account endpoints.
//
// The session token is kept in localStorage and sent as a Bearer token on
// every request that needs a signed-in user.
// ---------------------------------------------------------------------------

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

const TOKEN_KEY = 'legaldraft_session'

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token)
    else window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private browsing */
  }
}

// Adds the Authorization header when signed in.
export function authHeaders(extra) {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  }
}

async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body || {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong. Please try again.')
    err.data = data
    err.status = res.status
    throw err
  }
  return data
}

export function signup(email, password, name) {
  return post('/api/signup', { email, password, name })
}

export function verifyEmail(token) {
  return post('/api/verify', { token })
}

export function resendVerification(email) {
  return post('/api/resend-verification', { email })
}

export async function login(email, password) {
  const data = await post('/api/login', { email, password })
  if (data.token) setToken(data.token)
  return data
}

export async function logout() {
  try {
    await post('/api/logout', {})
  } catch {
    /* ignore — clear locally regardless */
  }
  setToken('')
}

// Restores the signed-in account on page load. Returns null when not signed in.
export async function fetchMe() {
  if (!getToken()) return null
  try {
    const res = await fetch(`${API_BASE}/api/me`, { headers: authHeaders() })
    if (!res.ok) {
      if (res.status === 401) setToken('') // expired session
      return null
    }
    return await res.json()
  } catch {
    return null
  }
}

// --- payment proof ---------------------------------------------------------

// Submits a transfer screenshot with its details. Sent as multipart form data,
// so the Content-Type header is left for the browser to set.
export async function submitPaymentProof({ file, packageId, credits, amountPkr, method, reference, note }) {
  const token = getToken()
  const body = new FormData()
  body.append('screenshot', file)
  if (packageId) body.append('packageId', packageId)
  if (credits) body.append('credits', String(credits))
  if (amountPkr) body.append('amountPkr', String(amountPkr))
  if (method) body.append('method', method)
  body.append('reference', reference || '')
  if (note) body.append('note', note)

  const res = await fetch(`${API_BASE}/api/payment-proof`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not submit your payment.')
  return data
}

// --- password reset --------------------------------------------------------

export function forgotPassword(email) {
  return post('/api/forgot-password', { email })
}

export function resetPassword(token, password) {
  return post('/api/reset-password', { token, password })
}

// --- saved drafts ----------------------------------------------------------

export async function listDrafts() {
  const res = await fetch(`${API_BASE}/api/drafts`, { headers: authHeaders() })
  if (!res.ok) return []
  const data = await res.json()
  return data.drafts || []
}

export async function getDraft(id) {
  const res = await fetch(`${API_BASE}/api/drafts/${id}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Could not open that draft.')
  return await res.json()
}

export async function deleteDraft(id) {
  const res = await fetch(`${API_BASE}/api/drafts/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return res.ok
}

// --- admin -----------------------------------------------------------------

function adminHeaders(token) {
  return { 'Content-Type': 'application/json', 'x-admin-token': token }
}

export async function adminListPayments(adminToken, status = 'pending') {
  const res = await fetch(`${API_BASE}/api/admin/payments?status=${status}`, {
    headers: adminHeaders(adminToken),
  })
  if (!res.ok) throw new Error(res.status === 403 ? 'Admin token is not valid.' : 'Could not load submissions.')
  const data = await res.json()
  return data.claims || []
}

export function adminFileUrl(id, adminToken) {
  // The image endpoint needs the header too, so it is fetched as a blob.
  return { url: `${API_BASE}/api/admin/payments/${id}/file`, headers: adminHeaders(adminToken) }
}

export async function adminApprovePayment(adminToken, id, credits, note) {
  const res = await fetch(`${API_BASE}/api/admin/payments/${id}/approve`, {
    method: 'POST',
    headers: adminHeaders(adminToken),
    body: JSON.stringify({ credits, note }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not approve.')
  return data
}

export async function adminRejectPayment(adminToken, id, reason) {
  const res = await fetch(`${API_BASE}/api/admin/payments/${id}/reject`, {
    method: 'POST',
    headers: adminHeaders(adminToken),
    body: JSON.stringify({ reason }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not reject.')
  return data
}