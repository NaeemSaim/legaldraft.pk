// ---------------------------------------------------------------------------
// Saved drafts.
//
// A credit is spent on every document, so the customer must be able to get it
// back. Each generated draft is stored against the account and can be
// reopened, printed, copied or deleted here.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef } from 'react'
import { listDrafts, getDraft, deleteDraft } from './auth-client.js'

const DOC_LABELS = {
  'pre-arrest-bail': 'Pre-arrest bail',
  'post-arrest-bail': 'Post-arrest bail',
  '22a-22b': 'Petition u/s 22A/22B',
  '491': 'Petition u/s 491 Cr.P.C.',
  harassment: 'Harassment petition',
  'civil-appeal': 'Civil appeal',
  'criminal-appeal': 'Criminal appeal',
  'family-appeal': 'Family appeal',
  'rent-appeal': 'Rent appeal',
  'civil-revision': 'Civil revision',
  'criminal-revision': 'Criminal revision',
  'order-37': 'Suit under Order 37',
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function MyDrafts() {
  const [drafts, setDrafts] = useState(null)
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const bodyRef = useRef(null)

  useEffect(() => {
    listDrafts().then(setDrafts)
  }, [])

  async function openDraft(id) {
    setBusy(true)
    try {
      setOpen(await getDraft(id))
      window.scrollTo(0, 0)
    } catch {
      /* ignore */
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this draft permanently? This cannot be undone.')) return
    await deleteDraft(id)
    setDrafts((d) => d.filter((x) => x.id !== id))
    if (open && open.id === id) setOpen(null)
  }

  function copyDraft() {
    const text = bodyRef.current ? bodyRef.current.innerText : ''
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function printDraft() {
    // Reuse the same print styling as the drafting page.
    const isUrdu = open.language === 'ur'
    const html = bodyRef.current ? bodyRef.current.innerHTML : ''
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html dir="${isUrdu ? 'rtl' : 'ltr'}"><head><meta charset="utf-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
        @page { size: 8.5in 13in; margin: 1in ${isUrdu ? '1.4in' : '0.9in'} 1in ${isUrdu ? '0.9in' : '1.4in'}; }
        body { font-family: ${isUrdu ? "'Noto Nastaliq Urdu', serif" : 'Georgia, serif'};
               font-size: ${isUrdu ? '15pt' : '13pt'}; line-height: ${isUrdu ? '2.2' : '1.6'}; }
        .doc-center { text-align:center } .doc-bold { font-weight:700 }
        .doc-underline { text-decoration:underline; text-underline-offset:4px }
        .doc-para, .doc-ground { text-align:justify; margin-bottom:12px }
        .stamp-spacer { float:right; width:2.5in; height:2in }
      </style></head><body>${html}</body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 600)
  }

  if (open) {
    return (
      <div className="site-container page page-wide">
        <button type="button" className="linklike back-link" onClick={() => setOpen(null)}>
          &larr; Back to all drafts
        </button>

        <div className="draft-header">
          <div>
            <h1 className="drafts-title">{DOC_LABELS[open.documentType] || 'Draft'}</h1>
            <p className="drafts-meta">{formatDate(open.at)}</p>
          </div>
          <div className="draft-actions">
            <button type="button" className="copy-btn" onClick={copyDraft}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button type="button" className="print-btn" onClick={printDraft}>Print</button>
          </div>
        </div>

        {open.isHtml ? (
          <div
            ref={bodyRef}
            className={`draft-body doc ${open.language === 'ur' ? 'rtl' : 'ltr'}`}
            dir={open.language === 'ur' ? 'rtl' : 'ltr'}
            dangerouslySetInnerHTML={{ __html: open.content }}
          />
        ) : (
          <div
            ref={bodyRef}
            className={`draft-body ${open.language === 'ur' ? 'rtl' : 'ltr'}`}
            dir={open.language === 'ur' ? 'rtl' : 'ltr'}
          >
            {open.content}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="site-container page page-wide">
      <header className="page-header">
        <div className="eyebrow">Your account</div>
        <h1>Saved drafts</h1>
        <p className="page-intro">
          Every document you generate is kept here, so you can reopen, print or copy it at any time
          without spending another credit.
        </p>
      </header>

      {drafts === null ? (
        <p>Loading&hellip;</p>
      ) : drafts.length === 0 ? (
        <div className="empty-state">
          <p>You have not generated any documents yet.</p>
          <a className="btn btn-primary" href="#/draft">Draft your first document</a>
        </div>
      ) : (
        <div className="drafts-list">
          {drafts.map((d) => (
            <div key={d.id} className="draft-item">
              <div className="draft-item-main">
                <span className="draft-item-type">{DOC_LABELS[d.documentType] || d.documentType}</span>
                <span className="draft-item-meta">
                  {d.title ? d.title + ' · ' : ''}
                  {formatDate(d.at)} · {d.language === 'ur' ? 'اردو' : 'English'}
                </span>
              </div>
              <div className="draft-item-actions">
                <button type="button" className="copy-btn" onClick={() => openDraft(d.id)} disabled={busy}>
                  Open
                </button>
                <button type="button" className="remove-btn" onClick={() => remove(d.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
