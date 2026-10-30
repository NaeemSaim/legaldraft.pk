// ---------------------------------------------------------------------------
// Static site pages: landing, about, contact and the legal policies.
//
// BEFORE YOU GO LIVE, edit the BUSINESS constant below — every page reads its
// company name, email, phone, address and effective date from this one place.
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { useAuth } from './auth-context.jsx'
import { submitPaymentProof } from './auth-client.js'

export const BUSINESS = {
  name: 'LegalDraft.pk',
  legalName: 'LegalDraft.pk',           // registered business name, if different
  email: 'support@legaldraft.pk',           // general support & account help
  refundEmail: 'refund@legaldraft.pk',      // refund requests
  feedbackEmail: 'feedback@legaldraft.pk',  // template corrections & suggestions
  privacyEmail: 'privacy@legaldraft.pk',    // privacy & data requests
  phone: '+92 300 0000000',
  address: 'Sargodha, Punjab, Pakistan',
  effectiveDate: '1 August 2026',

  // --- Pricing -------------------------------------------------------------
  // One credit = one generated document.
  pricePerCredit: 100,          // PKR
  currency: 'PKR',
  freeTrialCredits: 2,          // must match FREE_TRIAL_CREDITS in accounts.js
  refundWindowDays: 7,          // for UNUSED credits only

  // Where customers send money. Fill these in before going live.
  payment: {
    easypaisa: '0300-0000000',
    jazzcash: '0300-0000000',
    bankName: 'Your Bank',
    bankTitle: 'LegalDraft.pk',
    bankAccount: 'PK00XXXX0000000000000000',
  },
}

// Credit bundles. `bonus` credits are free extras — keep these in step with
// PACKAGES in accounts.js on the server.
export const PACKAGES = [
  { id: 'single', credits: 1, bonus: 0, label: 'Single document' },
  { id: 'small', credits: 5, bonus: 0, label: 'Occasional' },
  { id: 'medium', credits: 10, bonus: 1, label: 'Regular', popular: true },
  { id: 'large', credits: 25, bonus: 4, label: 'Busy practice' },
  { id: 'bulk', credits: 50, bonus: 10, label: 'Chamber' },
]

// --- small building blocks -------------------------------------------------

function PageHeader({ eyebrow, title, intro }) {
  return (
    <header className="page-header">
      {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
      <h1>{title}</h1>
      {intro ? <p className="page-intro">{intro}</p> : null}
    </header>
  )
}

function Prose({ children }) {
  return <div className="prose">{children}</div>
}

// --- landing ---------------------------------------------------------------

const DOC_LIST = [
  { ur: 'ضمانت قبل از گرفتاری', en: 'Pre-arrest bail' },
  { ur: 'ضمانت بعد از گرفتاری', en: 'Post-arrest bail' },
  { ur: 'درخواست 22A/22B', en: 'FIR registration (22A/22B)' },
  { ur: 'درخواست زیر دفعہ 491', en: 'Habeas corpus (491)' },
  { ur: 'درخواست عدم ہراسانی', en: 'Harassment (22-A)' },
  { ur: 'دیوانی اپیل', en: 'Civil appeal' },
  { ur: 'فوجداری اپیل', en: 'Criminal appeal' },
  { ur: 'فیملی اپیل', en: 'Family appeal' },
  { ur: 'رینٹ اپیل', en: 'Rent appeal' },
  { ur: 'نگرانی دیوانی', en: 'Civil revision' },
  { ur: 'نگرانی فوجداری', en: 'Criminal revision' },
  { ur: 'دعویٰ زیر آرڈر 37', en: 'Suit under Order 37' },
]

export function Landing() {
  return (
    <>
      <section className="hero">
        <div className="site-container hero-inner">
          <div className="hero-copy">
            <div className="eyebrow">For advocates and litigants in Pakistan</div>
            <h1 className="hero-title">
              Legal drafting for the <span className="hero-accent">district courts</span>
            </h1>
            <p className="hero-sub">
              Bail applications, petitions, appeals, revisions and suits, prepared in formal court
              Urdu and structured to the formats district courts accept. Enter the particulars and
              the facts; the draft returns complete, numbered and ready to file.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary btn-lg" href="#/signup">
                Create an account
              </a>
              <a className="btn btn-ghost btn-lg" href="#/pricing">
                View pricing
              </a>
            </div>
            <p className="hero-note">
              {BUSINESS.freeTrialCredits} free drafts when you verify your email &middot; then{' '}
              {BUSINESS.currency} {BUSINESS.pricePerCredit} per document &middot; no subscription
            </p>
          </div>

          <div className="hero-panel">
            <div className="hero-paper" dir="rtl" lang="ur" aria-label="Sample draft">
              <div className="doc-center doc-bold hero-paper-court">
                بعدالت جناب ایڈیشنل سیشن جج صاحب
              </div>
              <div className="doc-center">محمد اسلم ولد محمد یوسف قوم اعوان</div>
              <div className="doc-center hero-paper-role">(سائل)</div>
              <div className="doc-center">بنام</div>
              <div className="doc-center">سرکار بذریعہ ایس ایچ او تھانہ صدر</div>
              <div className="doc-center hero-paper-role">(مسئول علیہ)</div>
              <div className="doc-center doc-underline hero-paper-title">
                درخواست ضمانت قبل از گرفتاری سائل
              </div>
              <div className="doc-center hero-paper-fir">
                مقدمہ نمبر 165/26 مورخہ 21.04.2026 بجرم 489-F ت پ
              </div>
              <div className="doc-para">جناب عالی! گزارش سائل حسبِ ذیل ہے:-</div>
              <div className="doc-ground">
                (i) یہ کہ سائل بے گناہ ہے اور اسے محض رنجش کی بنا پر مقدمہ ہذا میں ملوث کیا گیا ہے۔
              </div>
              <div className="doc-ground">
                (ii) یہ کہ اندراجِ مقدمہ میں غیر معمولی تاخیر ہے جس کی کوئی معقول وجہ بیان نہیں کی گئی۔
              </div>
              <div className="doc-ground">
                (iii) یہ کہ گواہانِ استغاثہ مستغیث کے قریبی رشتہ دار ہیں۔
              </div>
            </div>
            <span className="hero-paper-tag">Output example</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="site-container">
          <div className="section-head">
            <h2>Drafting modelled on real filings</h2>
            <p>
              We specialise in documents that mirror what is actually presented and accepted in the
              district courts, down to the wording, the numbering and the order of pleading.
            </p>
          </div>

          <div className="feature-grid">
            <article className="feature">
              <div className="feature-icon">1</div>
              <h3>Formal court language</h3>
              <p>
                Each document follows the register and terminology proper to its jurisdiction, with
                number and gender agreement applied consistently across parties, roles and prayers.
              </p>
            </article>

            <article className="feature">
              <div className="feature-icon">2</div>
              <h3>Grounded in your facts</h3>
              <p>
                Grounds and relief are selected against the facts of the matter. Where a stage of
                proceedings does not arise, the pleadings that depend on it are left out.
              </p>
            </article>

            <article className="feature">
              <div className="feature-icon">3</div>
              <h3>Filing-ready formatting</h3>
              <p>
                Legal-size pages, justified text, court margins and reserved space on the first page
                for the institution stamp.
              </p>
            </article>

            <article className="feature">
              <div className="feature-icon">4</div>
              <h3>Yours to revise</h3>
              <p>
                Every draft is editable in place. Amend a ground, correct a figure or remove a
                paragraph, then print it or carry it into your own file.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="site-container">
          <div className="section-head">
            <h2>How it works</h2>
          </div>
          <ol className="steps">
            <li>
              <span className="step-num">1</span>
              <h3>Select the document</h3>
              <p>Twelve document types across criminal, civil, family and rent jurisdictions.</p>
            </li>
            <li>
              <span className="step-num">2</span>
              <h3>Enter the particulars</h3>
              <p>
                Parties, court details and the facts of the matter, stated in plain language.
              </p>
            </li>
            <li>
              <span className="step-num">3</span>
              <h3>Review and file</h3>
              <p>
                Settle the draft, make any revisions inline, then print it on legal size or export
                it to your own file.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="site-container">
          <div className="section-head">
            <h2>Documents covered</h2>
            <p>
              These are the twelve document types available today, for matters before the District
              and Sessions Courts. Each template is modelled on a real filing and checked against
              current court practice, and further document types are being added.
            </p>
          </div>
          <ul className="doc-chips">
            {DOC_LIST.map((d) => (
              <li key={d.en} className="doc-chip">
                <span className="doc-chip-ur">{d.ur}</span>
                <span className="doc-chip-en">{d.en}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section-alt">
        <div className="site-container">
          <div className="section-head">
            <h2>Pay only for what you draft</h2>
            <p>
              No monthly fee, no plan to cancel. One credit drafts one document, and credits never
              expire.
            </p>
          </div>
          <div className="price-highlight">
            <div className="price-highlight-main">
              <span className="price-cur">{BUSINESS.currency}</span>
              <span className="price-value">{BUSINESS.pricePerCredit}</span>
              <span className="price-per">per document</span>
            </div>
            <ul className="price-points">
              <li>{BUSINESS.freeTrialCredits} free drafts when you start</li>
              <li>Charged only when a draft is produced</li>
              <li>Editing and printing are free</li>
              <li>Bundles available for regular use</li>
            </ul>
            <a className="btn btn-ghost" href="#/pricing">See bundles</a>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="site-container cta-inner">
          <h2>Begin with your first matter</h2>
          <p>
            Verify your email and {BUSINESS.freeTrialCredits} credits are added to your account, at
            no cost.
          </p>
          <a className="btn btn-primary btn-lg" href="#/signup">
            Create an account
          </a>
        </div>
      </section>
    </>
  )
}


// --- pricing ---------------------------------------------------------------

// Lets a customer attach the transaction screenshot after transferring money.
// The submission sits against their account until it is verified.
function PaymentProofForm({ onSubmitted }) {
  const [pkgId, setPkgId] = useState('medium')
  const [method, setMethod] = useState('EasyPaisa')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const pkg = PACKAGES.find((p) => p.id === pkgId) || PACKAGES[0]
  const amount = pkg.credits * BUSINESS.pricePerCredit
  const totalCredits = pkg.credits + pkg.bonus

  function pickFile(e) {
    const f = e.target.files && e.target.files[0]
    setError('')
    if (!f) {
      setFile(null)
      return
    }
    if (!/^image\//.test(f.type)) {
      setError('Please attach an image of the transaction (PNG, JPG or WEBP).')
      setFile(null)
      return
    }
    if (f.size > 6 * 1024 * 1024) {
      setError('That image is larger than 6 MB. Please attach a smaller file.')
      setFile(null)
      return
    }
    setFile(f)
  }

  async function submit() {
    if (!file) {
      setError('Please attach a screenshot of the transaction.')
      return
    }
    if (!reference.trim()) {
      setError('Please enter the transaction reference number.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await submitPaymentProof({
        file,
        packageId: pkg.id,
        credits: totalCredits,
        amountPkr: amount,
        method,
        reference: reference.trim(),
        note: note.trim(),
      })
      setDone(true)
      if (onSubmitted) onSubmitted()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="callout">
        <strong>Payment submitted for verification.</strong>
        <p style={{ marginBottom: 0 }}>
          Your credits will be added once the transfer has been confirmed, ordinarily within a few
          working hours. You can track the status below.
        </p>
      </div>
    )
  }

  return (
    <div className="proof-form">
      <div className="proof-row">
        <div className="proof-field">
          <label className="field-label" htmlFor="pp-pkg">Bundle purchased</label>
          <select
            id="pp-pkg"
            className="field-input"
            value={pkgId}
            onChange={(e) => setPkgId(e.target.value)}
          >
            {PACKAGES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} — {BUSINESS.currency} {(p.credits * BUSINESS.pricePerCredit).toLocaleString()}{' '}
                ({p.credits + p.bonus} documents)
              </option>
            ))}
          </select>
        </div>

        <div className="proof-field">
          <label className="field-label" htmlFor="pp-method">Paid by</label>
          <select
            id="pp-method"
            className="field-input"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option>EasyPaisa</option>
            <option>JazzCash</option>
            <option>Bank transfer</option>
          </select>
        </div>
      </div>

      <label className="field-label" htmlFor="pp-ref">Transaction reference number</label>
      <input
        id="pp-ref"
        className="field-input"
        value={reference}
        onChange={(e) => { setReference(e.target.value); setError('') }}
        placeholder="As shown on your transfer receipt"
      />

      <label className="field-label proof-file-label" htmlFor="pp-file">
        Screenshot of the transaction
      </label>
      <label className={`proof-drop ${file ? 'has-file' : ''}`} htmlFor="pp-file">
        <input id="pp-file" type="file" accept="image/*" onChange={pickFile} hidden />
        {file ? (
          <span className="proof-file-name">{file.name}</span>
        ) : (
          <span className="proof-drop-hint">
            Tap to attach an image — PNG, JPG or WEBP, up to 6 MB
          </span>
        )}
      </label>

      <label className="field-label" htmlFor="pp-note">Note (optional)</label>
      <input
        id="pp-note"
        className="field-input"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything we should know about this payment"
      />

      <div className="proof-summary">
        Submitting <strong>{BUSINESS.currency} {amount.toLocaleString()}</strong> for{' '}
        <strong>{totalCredits} documents</strong>
      </div>

      {error ? <p className="error-msg">{error}</p> : null}

      <button className="btn btn-primary proof-submit" type="button" onClick={submit} disabled={busy}>
        {busy ? 'Submitting…' : 'Submit payment for verification'}
      </button>
    </div>
  )
}

// Status of the customer's own submissions.
function PaymentHistory({ payments }) {
  if (!payments || payments.length === 0) return null
  const label = { pending: 'Awaiting verification', approved: 'Approved', rejected: 'Not verified' }
  return (
    <div className="proof-history">
      {payments.map((p) => (
        <div key={p.id} className="proof-item">
          <div className="proof-item-main">
            <span className="proof-item-amount">
              {BUSINESS.currency} {(p.amountPkr || 0).toLocaleString()}
            </span>
            <span className="proof-item-meta">
              {p.method ? p.method + ' · ' : ''}
              {p.reference || 'no reference'} · {new Date(p.at).toLocaleDateString()}
            </span>
            {p.reviewNote ? <span className="proof-item-note">{p.reviewNote}</span> : null}
          </div>
          <span className={`proof-status is-${p.status}`}>
            {label[p.status] || p.status}
            {p.status === 'approved' && p.grantedCredits ? ` · ${p.grantedCredits} credits` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

export function Pricing() {
  const { account, reload } = useAuth()
  const p = BUSINESS.payment

  return (
    <div className="site-container page page-wide">
      <PageHeader
        eyebrow="Pricing"
        title="Pay only for what you draft"
        intro={`One credit drafts one document at ${BUSINESS.currency} ${BUSINESS.pricePerCredit}. There is no subscription, and credits do not expire.`}
      />

      {account ? (
        <div className="balance-banner">
          <div>
            <span className="balance-num">{account.balance}</span>
            <span className="balance-label">
              {account.balance === 1 ? 'credit remaining' : 'credits remaining'}
            </span>
          </div>
          <a className="btn btn-ghost" href="#/draft">Go to drafting</a>
        </div>
      ) : null}

      <div className="price-grid">
        {PACKAGES.map((pkg) => {
          const total = pkg.credits + pkg.bonus
          const cost = pkg.credits * BUSINESS.pricePerCredit
          return (
            <div key={pkg.id} className={`price-card ${pkg.popular ? 'is-popular' : ''}`}>
              {pkg.popular ? <div className="price-badge">Most popular</div> : null}
              <h3>{pkg.label}</h3>
              <div className="price-amount">
                <span className="price-cur">{BUSINESS.currency}</span>
                <span className="price-value">{cost.toLocaleString()}</span>
              </div>
              <div className="price-credits">
                {total} {total === 1 ? 'document' : 'documents'}
                {pkg.bonus ? <span className="price-bonus">+{pkg.bonus} free</span> : null}
              </div>
              <div className="price-unit">
                {BUSINESS.currency} {Math.round(cost / total)} per document
              </div>
            </div>
          )
        })}
      </div>

      <Prose>
        <h2>How to buy credits</h2>
        <ol>
          <li>Transfer the amount for the bundle you require to one of the accounts below.</li>
          <li>
            Attach the transaction screenshot in the <a href="#account">Submit your payment</a>{' '}
            form further down this page. It is filed against your account as proof, so there is
            nothing to email.
          </li>
          <li>
            Your credits are added once the transfer has been verified, ordinarily within a few
            working hours. The status of every submission is shown on this page.
          </li>
        </ol>

        <div className="pay-grid">
          <div className="pay-card">
            <h4>EasyPaisa</h4>
            <p>{p.easypaisa}</p>
          </div>
          <div className="pay-card">
            <h4>JazzCash</h4>
            <p>{p.jazzcash}</p>
          </div>
          <div className="pay-card">
            <h4>Bank transfer</h4>
            <p>
              {p.bankName}
              <br />
              {p.bankTitle}
              <br />
              <span className="mono">{p.bankAccount}</span>
            </p>
          </div>
        </div>

        <h2 id="account">Your account</h2>
        {account ? (
          <>
            <p>
              Signed in as <strong>{account.email}</strong>. Credits are held against this account,
              so anything you submit below is matched to it automatically.
            </p>
            <p>
              Your current balance is <strong>{account.balance}</strong>{' '}
              {account.balance === 1 ? 'credit' : 'credits'}.
            </p>

            <h2>Submit your payment</h2>
            <p>
              Once the transfer is done, attach the screenshot below. It stays on your account as
              proof, and your credits are added as soon as the payment is verified.
            </p>
            <PaymentProofForm onSubmitted={reload} />

            {account.payments && account.payments.length ? (
              <>
                <h2>Your submissions</h2>
                <PaymentHistory payments={account.payments} />
              </>
            ) : null}
          </>
        ) : (
          <p>
            <a href="#/login">Sign in</a> or <a href="#/signup">create an account</a> to buy credits.
          </p>
        )}

        <h2>Common questions</h2>
        <h3>Do credits expire?</h3>
        <p>No. Credits stay on your account until you use them.</p>

        <h3>What if a draft is unusable?</h3>
        <p>
          Send us the document type and the defect and the credit is returned. See the{' '}
          <a href="#/refund">Refund Policy</a>.
        </p>

        <h3>Does revising or reprinting cost another credit?</h3>
        <p>
          No. A credit is charged once, when the draft is produced. Revising, printing and exporting
          it carry no further charge.
        </p>

        <h3>What if drafting fails?</h3>
        <p>
          Nothing is charged. A credit is deducted only after a draft has been produced.
        </p>
      </Prose>
    </div>
  )
}

// --- about -----------------------------------------------------------------

export function About() {
  return (
    <div className="site-container page">
      <PageHeader
        eyebrow="About"
        title="Legal drafting, done properly"
        intro="We specialise in preparing court documents for Pakistan's district judiciary: drafts that follow the form, language and structure of what is actually filed."
      />
      <Prose>
        <h2>Our approach</h2>
        <p>
          Most drafting tools work from generic samples. Ours are modelled on filings as they are
          presented and accepted in the district courts: the cause title, the reference line, the
          order of pleading, the terminology proper to each jurisdiction, and the formatting a
          registry expects to see.
        </p>
        <p>
          Twelve document types are covered across criminal, civil, family and rent matters, from
          bail applications and habeas corpus petitions to appeals, revisions and summary suits.
          These cover matters before the District and Sessions Courts, and further document types
          are being added. Each is reviewed against current practice and refined as practitioners
          report back.
        </p>

        <h2>What the service does</h2>
        <p>
          You select a document type, enter the parties and court particulars, and set out the facts
          in plain language. The service assembles the cause title, the reference line, the numbered
          body, the prayer and the signature block, drafting the case-specific portions from the
          facts you provide. The result is a complete draft you can revise in place, print on legal
          size, or carry into your own word processor.
        </p>

        <h2>What it does not do</h2>
        <p>
          It does not determine strategy, verify facts, or substitute for professional judgement. A
          draft is a starting point: it must be read, corrected and settled by a qualified advocate
          before it is filed. Facts, dates, figures and case law remain the responsibility of the
          person filing.
        </p>

        <h2>Accuracy</h2>
        <p>
          Legal drafting is exacting, and automated systems make mistakes. Templates are checked
          against real filings, and the drafting rules keep the output tied to the facts supplied
          rather than padding it with boilerplate. Where something is wrong we want to hear about
          it: corrections from practitioners are what keep the templates sound.
        </p>

        <h2>Contact</h2>
        <p>
          General questions are welcome at{' '}
          <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>. Corrections and suggestions to a
          template are best sent to{' '}
          <a href={`mailto:${BUSINESS.feedbackEmail}`}>{BUSINESS.feedbackEmail}</a>.
        </p>
      </Prose>
    </div>
  )
}

// --- contact ---------------------------------------------------------------

export function Contact() {
  return (
    <div className="site-container page">
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        intro="For support, corrections to a template, billing questions or anything else."
      />
      <div className="contact-grid">
        <a className="contact-card" href={`mailto:${BUSINESS.email}`}>
          <h3>Email</h3>
          <p>{BUSINESS.email}</p>
          <span className="contact-hint">Usually answered within two working days</span>
        </a>
        <div className="contact-card">
          <h3>Phone / WhatsApp</h3>
          <p>{BUSINESS.phone}</p>
          <span className="contact-hint">Working hours, Monday to Saturday</span>
        </div>
        <div className="contact-card">
          <h3>Address</h3>
          <p>{BUSINESS.address}</p>
          <span className="contact-hint">Correspondence by appointment</span>
        </div>
      </div>
      <Prose>
        <h2>Reporting a problem with a draft</h2>
        <p>
          If a template produces wording a court would not accept, please email{' '}
          <a href={`mailto:${BUSINESS.feedbackEmail}`}>{BUSINESS.feedbackEmail}</a> with the document
          type, what the draft said, and what it ought to have said. Reports of this kind are acted on
          quickly and benefit every user of that template.
        </p>
      </Prose>
    </div>
  )
}

// --- privacy ---------------------------------------------------------------

export function Privacy() {
  return (
    <div className="site-container page">
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        intro={`Effective ${BUSINESS.effectiveDate}. This policy sets out what ${BUSINESS.name} collects, the purpose for which it is held, and how case particulars are handled.`}
      />
      <Prose>
        <div className="callout callout-warn">
          <strong>Please read this first.</strong> The particulars you enter are transmitted to a
          third-party processor so that the draft can be prepared. Enter no more personal information
          about a client or an opposing party than the document itself requires, and do not enter
          identifiers such as CNIC or bank details that the document does not call for.
        </div>

        <h2>1. Information we collect</h2>
        <p>We collect only what is needed to produce and support your drafts:</p>
        <ul>
          <li>
            <strong>Draft inputs.</strong> The party names, addresses, court details, case
            particulars and facts you type into the form.
          </li>
          <li>
            <strong>Registration information.</strong> Your email address, your name if you give one,
            and a securely hashed form of your password. We never store your password itself and
            cannot see it. Your email is verified at signup, which means we also record when
            verification took place.
          </li>
          <li>
            <strong>Billing information.</strong> The credits granted and spent on your account, and
            the payment reference you send us. Payments are made directly to our bank or
            mobile-wallet accounts &mdash; we never see or store your card, wallet PIN or banking
            credentials.
          </li>
          <li>
            <strong>Technical information</strong> such as browser type, device type and approximate
            region, collected to keep the service working and secure.
          </li>
        </ul>

        <h2>2. How your draft inputs are used</h2>
        <p>
          To generate a draft, the facts and particulars you enter are transmitted to our AI provider
          for processing and returned as drafted text. This transmission is necessary for the service
          to function. We do not sell your inputs, and we do not use them to advertise to you.
        </p>

        <h2>3. Your credit record</h2>
        <p>
          For each account we keep a ledger of credits purchased and credits spent, including the
          document type drafted and the time. This is needed to show you an accurate balance, to
          resolve billing questions, and to meet accounting obligations. The ledger records{' '}
          <em>that</em> a document of a given type was drafted &mdash; it is not a copy of its
          contents.
        </p>

        <h2>4. Retention</h2>
        <p>
          Draft content is processed to produce your document. Where drafts are stored so that you can
          return to them, they are kept in your account until you delete them or close your account.
          Billing records are retained for as long as tax and accounting rules require.
        </p>

        <h2>5. Confidentiality</h2>
        <p>
          We understand that case material may be privileged or otherwise confidential. We do not
          disclose your inputs to any third party except (a) our AI and hosting providers, strictly to
          operate the service, and (b) where we are required to do so by law or by an order of a
          competent court or authority.
        </p>

        <h2>6. Security</h2>
        <p>
          Data is transmitted over encrypted connections and access to our systems is restricted. No
          online service can promise perfect security, and you should not use this service for
          material whose disclosure would cause irreparable harm.
        </p>

        <h2>7. Your choices</h2>
        <ul>
          <li>You may request a copy of the personal information we hold about you.</li>
          <li>You may ask us to correct information that is inaccurate.</li>
          <li>You may ask us to delete your account and its stored drafts.</li>
          <li>
            You may ask us to delete your account entirely. Note that deleting an account also
            removes any unused credits on it, which are not transferable.
          </li>
        </ul>
        <p>
          Write to <a href={`mailto:${BUSINESS.privacyEmail}`}>{BUSINESS.privacyEmail}</a> and we will
          respond within a reasonable period.
        </p>

        <h2>8. Cookies</h2>
        <p>
          We use only the storage necessary to operate the service. When you sign in, a session
          token is stored in your browser&rsquo;s local storage so you stay signed in between
          visits, along with basic preferences such as your language. Signing out removes it. We do
          not use advertising cookies and we do not track you across other websites.
        </p>

        <h2>9. Children</h2>
        <p>
          The service is intended for legal professionals and adult litigants and is not directed at
          children.
        </p>

        <h2>10. Changes</h2>
        <p>
          If this policy changes materially, we will post the updated version here with a new
          effective date.
        </p>

        <h2>11. Contact</h2>
        <p>
          {BUSINESS.legalName}, {BUSINESS.address} &mdash;{' '}
          <a href={`mailto:${BUSINESS.privacyEmail}`}>{BUSINESS.privacyEmail}</a>
        </p>
      </Prose>
    </div>
  )
}

// --- terms -----------------------------------------------------------------

export function Terms() {
  return (
    <div className="site-container page">
      <PageHeader
        eyebrow="Legal"
        title="Terms of Service"
        intro={`Effective ${BUSINESS.effectiveDate}. By using ${BUSINESS.name} you agree to these terms.`}
      />
      <Prose>
        <div className="callout callout-warn">
          <strong>No legal advice, no advocate&ndash;client relationship.</strong> {BUSINESS.name} is
          a drafting tool. It does not provide legal advice, does not represent you, and does not
          exercise professional judgement about your case. Every draft must be reviewed and settled by
          a qualified advocate before filing.
        </div>

        <h2>1. What the service is</h2>
        <p>
          {BUSINESS.name} generates draft legal documents from templates and from the facts you
          supply. Drafts are starting points for a professional to review — not finished filings.
        </p>

        <h2>2. Accounts</h2>
        <ul>
          <li>
            You must register with a genuine, permanent email address and confirm it before you can
            use the service. Temporary and disposable addresses are refused.
          </li>
          <li>
            One account per person. Creating multiple accounts to obtain repeated free credits is a
            breach of these terms and may result in suspension and forfeiture of unused credits.
          </li>
          <li>
            You are responsible for keeping your password secure and for everything done through
            your account.
          </li>
          <li>
            You must give accurate registration details and keep your email address current, since it
            is how we identify your account and your credits.
          </li>
        </ul>

        <h2>3. Your responsibilities</h2>
        <ul>
          <li>
            You are responsible for the accuracy of the facts, dates, figures and party details you
            enter.
          </li>
          <li>
            You are responsible for reviewing every draft — including its legal provisions, grounds
            and prayer — before filing or acting on it.
          </li>
          <li>
            You must have the right to use any information you enter, and must comply with your
            professional obligations of confidentiality.
          </li>
          <li>
            You must not use the service to prepare anything false, fraudulent, or intended to
            mislead a court.
          </li>
        </ul>

        <h2>4. Accuracy</h2>
        <p>
          Drafts are produced with the assistance of automated language models. They may contain
          errors, omissions, outdated provisions or inapplicable grounds. We make no warranty that a
          draft is correct, complete, or suitable for your matter, and no warranty as to outcome.
        </p>

        <h2>5. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, {BUSINESS.legalName} is not liable for any loss
          arising from the use of a draft — including dismissal, delay, limitation being missed, costs
          imposed, or any indirect or consequential loss. Where liability cannot be excluded, it is
          limited to the value of the credits you spent on the draft complained of.
        </p>

        <h2>6. Credits and payment</h2>
        <p>
          {BUSINESS.name} is pay-as-you-go. You buy credits, and one credit generates one document.
          A credit costs {BUSINESS.currency} {BUSINESS.pricePerCredit}. There is no subscription and
          no recurring charge.
        </p>
        <ul>
          <li>
            A credit is deducted only after a draft has been generated successfully. If generation
            fails, you are not charged.
          </li>
          <li>
            Editing, printing or copying a draft you have already generated does not cost a further
            credit.
          </li>
          <li>Credits do not expire.</li>
          <li>
            Credits are for use on your own matters and your clients&rsquo; matters. They may not be
            resold, transferred or shared with another practice.
          </li>
          <li>
            Credits are held against your registered account, so your balance follows you on any
            device once you sign in.
          </li>
          <li>
            Refunds are governed by our <a href="#/refund">Refund Policy</a>.
          </li>
        </ul>
        <p>
          You are responsible for keeping your account identifier secure. We may suspend accounts
          used in breach of these terms, and where we do so for abuse or fraud, unused credits may
          be forfeited.
        </p>

        <h2>7. Intellectual property</h2>
        <p>
          The site, its templates and its software remain our property. The drafts you generate are
          yours to use for your own matters and your clients&rsquo; matters. You may not resell,
          redistribute or republish the templates themselves as a competing product.
        </p>

        <h2>8. Availability</h2>
        <p>
          We aim to keep the service available but do not guarantee uninterrupted access. Features may
          change or be withdrawn.
        </p>

        <h2>9. Governing law</h2>
        <p>
          These terms are governed by the laws of the Islamic Republic of Pakistan, and the courts at{' '}
          {BUSINESS.address} shall have jurisdiction.
        </p>

        <h2>10. Contact</h2>
        <p>
          <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
        </p>
      </Prose>
    </div>
  )
}

// --- refund ----------------------------------------------------------------

export function Refund() {
  return (
    <div className="site-container page">
      <PageHeader
        eyebrow="Legal"
        title="Refund Policy"
        intro={`Effective ${BUSINESS.effectiveDate}. Credits are purchased in advance and drawn down as documents are drafted. There is no subscription and no recurring charge to cancel.`}
      />
      <Prose>
        <div className="callout">
          Unused credits are refundable within {BUSINESS.refundWindowDays} days of purchase. A credit
          spent on a draft that failed, or that proved unusable through a fault on our side, is
          returned to your account.
        </div>

        <h2>1. Try before you pay</h2>
        <p>
          Every verified account receives {BUSINESS.freeTrialCredits} credits at no cost, so the
          output can be assessed before any payment is made.
        </p>

        <h2>2. Unused credits</h2>
        <p>
          If you change your mind, email us within <strong>{BUSINESS.refundWindowDays} days</strong>{' '}
          of your payment and we will refund the credits you have not used, in full. Credits already
          spent on generated drafts are not refundable under this clause, because the work has been
          delivered.
        </p>

        <h2>3. Failed generations</h2>
        <p>
          A credit is only charged after a draft is produced. If generation fails, you are not
          charged. If you were charged for a draft you never received, tell us and we will restore
          the credit.
        </p>

        <h2>4. Faulty drafts</h2>
        <p>
          If a draft is unusable because of a defect in a template, such as an incorrect statutory
          provision or grounds inconsistent with the facts entered, send us the document type and the
          defect. The credit is returned and the template corrected.
        </p>

        <h2>5. What is not refunded</h2>
        <ul>
          <li>
            Credits spent on drafts that were delivered as described, where you simply decided not
            to use them.
          </li>
          <li>
            Dissatisfaction with the outcome of a case. The service produces drafts; it does not
            conduct your matter.
          </li>
          <li>
            Errors in a filed document that you did not review before filing. Reviewing every draft
            is your responsibility under our <a href="#/terms">Terms of Service</a>.
          </li>
          <li>Credits transferred, sold or shared with another person.</li>
        </ul>

        <h2>6. Credits do not expire</h2>
        <p>
          Your credits remain on your account until you use them. There is no monthly fee and
          nothing lapses.
        </p>

        <h2>7. How to request a refund</h2>
        <p>
          Email <a href={`mailto:${BUSINESS.refundEmail}`}>{BUSINESS.refundEmail}</a> from the address
          on your account, quoting your account ID, the date and amount of the payment, and the
          payment reference. Approved refunds are returned by the original method &mdash; usually
          within seven to ten working days, depending on your bank or wallet provider.
        </p>
      </Prose>
    </div>
  )
}
