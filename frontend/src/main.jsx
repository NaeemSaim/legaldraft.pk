import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// NOTE: there is no index.css any more — the whole stylesheet lives in
// App.css, which App.jsx imports itself. Keeping a second stylesheet around
// only invites the two of them to fight over the same elements.

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
