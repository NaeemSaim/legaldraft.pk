// ---------------------------------------------------------------------------
// Signed-in account state, shared across the whole site.
//
// Lives in its own file so App.jsx and DraftApp.jsx never have to import each
// other (which would be a circular import).
// ---------------------------------------------------------------------------

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { fetchMe, login as apiLogin, logout as apiLogout, setToken } from './auth-client.js'

const AuthContext = createContext({
  account: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  reload: async () => {},
  setBalance: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchMe().then((acct) => {
      if (cancelled) return
      setAccount(acct)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (email, password) => {
    const data = await apiLogin(email, password)
    setAccount(data.account)
    return data.account
  }, [])

  const signOut = useCallback(async () => {
    await apiLogout()
    setAccount(null)
    setToken('')
    window.location.hash = '#/'
  }, [])

  const reload = useCallback(async () => {
    const fresh = await fetchMe()
    setAccount(fresh)
  }, [])

  // Lets the drafting page show the new balance immediately after a draft.
  const setBalance = useCallback((balance) => {
    setAccount((prev) => (prev ? { ...prev, balance } : prev))
  }, [])

  return (
    <AuthContext.Provider value={{ account, loading, signIn, signOut, reload, setBalance }}>
      {children}
    </AuthContext.Provider>
  )
}
