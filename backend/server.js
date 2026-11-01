// LegalDraft.pk backend — Milestone 4
// (party grouping + بذریعہ "through" + toggleable grounds + AI-added grounds + plural petitioners)

require('dotenv').config()

const express = require('express')
const cors = require('cors')
const Anthropic = require('@anthropic-ai/sdk')
const { TEMPLATES } = require('./templates')
const accounts = require('./accounts.js')
const { sendVerificationEmail, sendPasswordResetEmail, smtpConfigured, emailDevMode } = require('./mailer.js')
const multer = require('multer')
const fsp = require('fs')
const pathMod = require('path')

// ---------------------------------------------------------------------------
// Payment screenshots
// ---------------------------------------------------------------------------
// Uploads are written to backend/uploads/ and are NEVER served publicly — only
// the admin endpoint can read them back, because they are financial records
// belonging to a customer.
// ---------------------------------------------------------------------------

// Uploads must live on the SAME persistent disk as the account data, or they
// are lost on redeploy. See DATA_DIR in accounts.js.
const UPLOAD_DIR = pathMod.join(process.env.DATA_DIR || __dirname, 'uploads')
if (!fsp.existsSync(UPLOAD_DIR)) fsp.mkdirSync(UPLOAD_DIR, { recursive: true })

const IMAGE_EXTENSIONS = {
  'image/png': '.png',
  'image/jpg': '.jpg',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      // Never trust the uploaded filename — build our own, with an image
      // extension, so an upload can never be served back as a web page.
      const ext = IMAGE_EXTENSIONS[String(file.mimetype).toLowerCase()]
      cb(null, Date.now() + '_' + Math.random().toString(16).slice(2, 10) + ext)
    },
  }),
  limits: { fileSize: 6 * 1024 * 1024, files: 1 },   // 6 MB, one file
  fileFilter: (req, file, cb) => {
    if (IMAGE_EXTENSIONS[String(file.mimetype).toLowerCase()]) return cb(null, true)
    cb(new Error('Please upload an image file (PNG, JPG or WEBP).'))
  },
})

const app = express()

// How many proxies sit in front of this server. Express uses it to find the
// real client address (req.ip); the rate limits below depend on it. Left at 0,
// a client's own X-Forwarded-For header is ignored — but behind a proxy every
// customer would then share one address, and one rate limit.
const TRUST_PROXY_HOPS = Number(process.env.TRUST_PROXY_HOPS) || 0
app.set('trust proxy', TRUST_PROXY_HOPS)
if (process.env.NODE_ENV === 'production' && !TRUST_PROXY_HOPS) {
  console.warn('⚠️  TRUST_PROXY_HOPS is not set. Behind a proxy, all customers will share one rate limit.')
}

// Only allow the front end's own origin(s). Set ALLOWED_ORIGINS in .env as a
// comma-separated list, e.g. https://legaldraft.pk,https://www.legaldraft.pk
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, cb) {
      // No list configured (local development) — allow everything.
      if (ALLOWED_ORIGINS.length === 0) return cb(null, true)
      // Same-origin/server-to-server requests have no Origin header.
      if (!origin) return cb(null, true)
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
      cb(new Error('Not allowed by CORS'))
    },
  })
)
app.use(express.json())

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const DOCUMENT_NAMES = {
  'pre-arrest-bail': { en: 'Pre-Arrest Bail Application', ur: 'درخواست ضمانت قبل از گرفتاری' },
  'post-arrest-bail': { en: 'Post-Arrest Bail Application', ur: 'درخواست ضمانت بعد از گرفتاری' },
  '22a-22b': { en: 'Application under Section 22A/22B Cr.P.C.', ur: 'درخواست زیر دفعہ 22A/22B ضابطہ فوجداری' },
  '491': { en: 'Application under Section 491 Cr.P.C.', ur: 'درخواست زیر دفعہ 491 ضابطہ فوجداری' },
  'harassment': { en: 'Harassment Application', ur: 'درخواست حراسمنٹ' },
  'civil-appeal': { en: 'Civil Appeal', ur: 'دیوانی اپیل' },
  'criminal-appeal': { en: 'Criminal Appeal', ur: 'فوجداری اپیل' },
  'family-appeal': { en: 'Family Appeal', ur: 'فیملی اپیل' },
  'rent-appeal': { en: 'Rent Appeal', ur: 'رینٹ اپیل' },
  'civil-revision': { en: 'Civil Revision', ur: 'نگرانی دیوانی' },
  'criminal-revision': { en: 'Criminal Revision', ur: 'نگرانی فوجداری' },
  'order-37': { en: 'Civil Suit under Order 37 CPC (Pronote / Cheque)', ur: 'دعویٰ زیر آرڈر 37 ض د' },
}

const STATE_WORDS = ['سرکار', 'ریاست', 'the state', 'state']

function isStateParty(name) {
  return STATE_WORDS.includes((name || '').trim().toLowerCase())
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function partyName(p) {
  return (p && p.name ? p.name : '').trim()
}

// True when there is more than one named applicant (petitioner) -> use plural Urdu forms.
function isPluralPetitioners(data) {
  const named = (data.applicants || []).map((a) => (a.name || '').trim()).filter(Boolean)
  return named.length > 1
}

// Strip a leading "بذریعہ" / "through" the user may have typed, to avoid doubling.
function cleanThrough(s) {
  return (s || '')
    .trim()
    .replace(/^بذریعہ\s*/, '')
    .replace(/^through\s+/i, '')
    .trim()
}

// Build the party block.
// - Groups consecutive "sameAsPrev" parties under one address (ساکن / ساکنائے).
// - A party with a بذریعہ ("through") value is its own standalone entry.
// - Numbering runs continuously across the whole section (1-, 2-, 3-, ...).
function formatPartiesForTemplate(parties, lang) {
  const list = (parties || []).filter((p) => partyName(p))
  if (list.length === 0) return '__________'

  const isUrdu = lang === 'ur'
  const between = '، '
  const number = (i) => `${i + 1}- `

  // Step 1: form groups.
  const groups = []
  let prevHadThrough = false
  list.forEach((p, i) => {
    const hasThrough = cleanThrough(p.through) !== ''
    const startNew = i === 0 || !p.sameAsPrev || hasThrough || prevHadThrough
    if (startNew) {
      groups.push({
        members: [],
        address: (p.address || '').trim(),
        through: hasThrough ? cleanThrough(p.through) : '',
      })
    }
    groups[groups.length - 1].members.push(p)
    prevHadThrough = hasThrough
  })

  // Step 2: render each group with continuous numbering.
  let running = 0
  const single = list.length === 1

  const rendered = groups.map((g) => {
    const memberText = g.members
      .map((p) => (single ? partyName(p) : `${number(running++)}${partyName(p)}`))
      .join(between)

    // "Through" entry: name بذریعہ through [+ ساکن address if given]
    if (g.through) {
      if (isUrdu) {
        let s = `${memberText} بذریعہ ${g.through}`
        if (g.address) s += ` ساکن ${g.address}`
        return s
      } else {
        let s = `${memberText} through ${g.through}`
        if (g.address) s += `, ${g.address}`
        return s
      }
    }

    // Normal entry / shared-address group.
    if (!g.address) return memberText
    if (isUrdu) {
      const prefix = g.members.length > 1 ? 'ساکنائے' : 'ساکن'
      return `${memberText} ${prefix} ${g.address}`
    }
    return `${memberText}, ${g.address}`
  })

  return rendered.join(between)
}

// --- Bidi safety (RTL rendering) ---
// In a right-to-left line, a mixed run like "22-A/22-B", "26/165", "497(2)" or "21.04.2026"
// gets visually reordered by the bidi algorithm (e.g. shown as "A/22-B-22"). Wrapping each
// such run in Unicode isolates (LRI ... PDI) forces it to render left-to-right as one unit.
// The isolate characters are invisible and survive copy-to-Word and printing.
const LRI = '\u2066' // LEFT-TO-RIGHT ISOLATE
const PDI = '\u2069' // POP DIRECTIONAL ISOLATE

// Matches only genuinely mixed runs:
//   - alphanumeric groups joined by - / .   e.g. 22-A/22-B, 26/165, 21.04.2026
//   - an alphanumeric group with a bracketed part  e.g. 497(2)
// Plain words (FIR), plain numbers (2) and list markers like "(vi)" are left untouched.
const MIXED_RUN = /[A-Za-z0-9]+(?:[-/.][A-Za-z0-9]+)+|[A-Za-z0-9]+\([A-Za-z0-9]+\)/g

function isolateMixedRuns(text) {
  return String(text == null ? '' : text).replace(MIXED_RUN, (run) => {
    if (run.indexOf(LRI) !== -1) return run // already isolated
    return LRI + run + PDI
  })
}

// Apply the isolation to the finished document's TEXT only — never inside HTML tags,
// so class names and attributes are untouched.
function applyBidiIsolation(html) {
  return String(html == null ? '' : html)
    .split(/(<[^>]*>)/)
    .map((segment) => (segment.startsWith('<') ? segment : isolateMixedRuns(segment)))
    .join('')
}

// --- Grounds (toggleable + AI-added + plural-aware) ---

const ROMAN = [
  'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x',
  'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx',
  'xxi', 'xxii', 'xxiii', 'xxiv', 'xxv',
]

function romanNumeral(n) {
  return ROMAN[n - 1] || String(n)
}

// Applies to EVERY templated document with a grounds list. A template may override it
// by defining its own `extraGroundsInstruction`, but by default this is the standard.
const DEFAULT_EXTRA_GROUNDS_INSTRUCTION = `You are adding EXTRA legal grounds to a court document being drafted for the Pakistani District Judiciary. Match the EXACT style of the standard grounds shown to you: each ground is ONE formal court-Urdu sentence beginning with «یہ کہ» and ending with «۔». Add a ground ONLY when the user's stated facts clearly support a point that the standard grounds do NOT already cover — for example: an alibi, medical grounds, the accused is a juvenile/minor, the sole breadwinner, a co-accused already granted bail, the matter is civil in nature, a related prior compromise or acquittal, a cheque/document that is time-barred or expired, or any other case-specific point evident from the facts. Never repeat or rephrase a standard ground. Never invent facts the user did not provide. If nothing extra is warranted, add nothing.`

// Choose a ground's text: plural variant when there are multiple applicants and one exists.
function groundText(g, plural) {
  return plural && g.textPlural ? g.textPlural : g.text
}

// Decide which STANDARD grounds go into this draft.
// - optional:false  -> always included.
// - optional:true   -> included only if the frontend selected its id.
//   If the frontend sends no selection at all, fall back to each optional
//   ground's `default` (default !== false means "on").
function selectedGroundsList(entry, data) {
  const all = entry.grounds || []
  const hasSelection = Array.isArray(data.selectedGrounds)
  return all.filter((g) => {
    if (!g.optional) return true
    if (hasSelection) return data.selectedGrounds.includes(g.id)
    return g.default !== false
  })
}

// Render the final numbered grounds list.
// Order: standard "head" grounds -> AI-added grounds -> standard "tail" grounds
// (tail = closing grounds like "ready to furnish surety" and "copy of FIR attached").
// Numbering (i, ii, iii...) is rebuilt across the whole list, so there are never gaps.
function buildGroundsHtml(entry, data, extraTexts, plural) {
  const chosen = selectedGroundsList(entry, data)
  const head = chosen.filter((g) => !g.tail)
  const tail = chosen.filter((g) => g.tail)

  const items = []
  head.forEach((g) => items.push(groundText(g, plural))) // trusted (may hold {{POLICE_STATION}})
  ;(extraTexts || []).forEach((tx) => items.push(escapeHtml(tx))) // AI text -> escape for safety
  tail.forEach((g) => items.push(groundText(g, plural)))

  if (items.length === 0) return ''
  return items
    .map((text, i) => `<div class="doc-ground">(${romanNumeral(i + 1)}) ${text}</div>`)
    .join('\n')
}

function namedOpposingContext(data) {
  const namedRespondents = (data.respondents || [])
    .map((r) => (r.name || '').trim())
    .filter((n) => n && !isStateParty(n))

  return namedRespondents.length
    ? `The complainant / opposing party is: ${namedRespondents.join('، ')}. When referring to the opposing party or complainant, use their ACTUAL NAME. Do NOT use generic placeholders like «فریق دوئم» or "the second party". Note: «سرکار» (the State) is a formal party, not the human complainant.`
    : `If a complainant must be referred to and no name is given, use «مستغیث» (the complainant) — never a generic «فریق دوئم».`
}

// Note added to the AI prompts when there is more than one applicant.
function pluralNote(plural) {
  return plural
    ? '\nNOTE: There is MORE THAN ONE applicant/accused. Refer to them in the PLURAL in Urdu (سائیلان, ملزمان) with correct plural verb agreement (e.g. «بے گناہ ہیں», «تیار ہیں»).'
    : ''
}

// A per-document instruction fixing the complainant's term (e.g. مستغیث for bails), so the
// AI never uses the civil-suit words مدعی / مدعا علیہ in a criminal matter.
function complainantRule(entry) {
  return entry && entry.complainantTerm
    ? `\nIMPORTANT: This is a criminal bail matter. Refer to the complainant ONLY as «${entry.complainantTerm}». NEVER use «مدعی» or «مدعا علیہ» — those are civil-suit words and are incorrect here.`
    : ''
}

// For documents whose petitioner is gendered (e.g. 491): tell the AI which forms to use.
function genderNote(entry, data) {
  if (!entry || !entry.usesGender) return ''
  return (data.gender === 'female')
    ? '\nNOTE: The petitioner is FEMALE — use feminine Urdu forms throughout (سائلہ, من سائلہ, and feminine verb agreement like «کرتی ہوں», «گئی», «ہوئی»).'
    : '\nNOTE: The petitioner is MALE — use masculine Urdu forms (سائل, من سائل, masculine verb agreement).'
}

// The word before a confined person's name: نابالغ/نابالغہ for a minor (age < 18 or unknown),
// محبوس/محبوسہ for an adult — the ہ ending marks feminine.
function detaineeWord(gender, age) {
  const n = parseInt(String(age || '').replace(/[^0-9]/g, ''), 10)
  const adult = Number.isFinite(n) && n >= 18
  if (adult) return gender === 'female' ? 'محبوسہ' : 'محبوس'
  return gender === 'female' ? 'نابالغہ' : 'نابالغ'
}

// Build the confined-persons phrase, e.g. "نابالغ محمد احسن عمر 2 سال و نابالغہ سدرہ بی بی عمر 4 سال".
function formatDetainees(detainees) {
  const list = (detainees || []).filter((d) => (d.name || '').trim())
  if (list.length === 0) return ''
  const items = list.map((d) => {
    const name = (d.name || '').trim()
    const ageNum = String(d.age || '').replace(/[^0-9]/g, '')
    let s = `${detaineeWord(d.gender, d.age)} ${name}`
    if (ageNum) s += ` عمر ${ageNum} سال`
    return s
  })
  if (items.length === 1) return items[0]
  return items.slice(0, -1).join(' و ') + ' اور ' + items[items.length - 1]
}

// Give the AI the confined persons' names so the narrative refers to them correctly.
function detaineesNote(data) {
  const list = (data.detainees || []).filter((d) => (d.name || '').trim())
  if (!list.length) return ''
  const desc = list
    .map((d) => {
      const age = String(d.age || '').replace(/[^0-9]/g, '')
      const g = d.gender === 'female' ? 'female' : 'male'
      return `${(d.name || '').trim()} (${g}${age ? ', age ' + age : ''})`
    })
    .join('; ')
  return `\nThe confined person(s) to be recovered (محبوسان) are: ${desc}. Refer to them by these exact names.`
}

// Universal drafting discipline, applied to EVERY document. The standard grounds in each
// template are a menu, not a checklist: a ground that the user's facts don't support must be
// left out. This is what stops an appeal against a 249-A acquittal (no evidence recorded)
// from carrying evidence-appraisal grounds, or a draft asserting witnesses that don't exist.
function groundingRule() {
  return `

CONTENT AWARENESS — MANDATORY, overrides the examples above:
- Draft STRICTLY from the facts supplied. The standard grounds listed above are a MENU, not a checklist: include a ground ONLY if the supplied facts support it. Silently omit every ground the facts do not support or contradict.
- NEVER assert a fact the user did not supply — no invented witnesses, recoveries, medical reports, dates, amounts, hearings or documents.
- NEVER contradict the user's facts.
- If the facts show the case ended at a PRELIMINARY stage — e.g. acquittal u/s 249-A or 265-K Cr.P.C., dismissal on a preliminary objection or point of law, rejection of plaint, dismissal for non-prosecution, ex-parte proceedings, or any decision before evidence was recorded — then OMIT ENTIRELY every reference to recording, appraisal, mis-reading, non-reading or contradictions of evidence, to witnesses, cross-examination, medical or documentary evidence, and to the standard of proof at trial. Ground the challenge instead on the illegality of deciding at that stage without affording the party a proper opportunity, and on the court's misapplication of the law.
- Match the relief to who is aggrieved: never plead for a remedy the appellant/petitioner does not want.
- If the facts are too thin to support a ground, leave it out rather than padding with boilerplate.`
}

// Give the AI the parties with their addresses, so clauses that depend on residence — e.g. a
// plaint's territorial-jurisdiction paragraph — can be written from real data, not guesswork.
function partiesNote(data) {
  const fmt = (rows) =>
    (rows || [])
      .map((r) => {
        const name = (r.name || '').trim()
        if (!name) return ''
        const addr = (r.address || '').trim()
        const via = (r.through || '').trim()
        return name + (via ? ` (بذریعہ ${via})` : '') + (addr ? ` — ${addr}` : '')
      })
      .filter(Boolean)
  const a = fmt(data.applicants)
  const b = fmt(data.respondents)
  if (!a.length && !b.length) return ''
  let out = '\n\nPARTIES AS ENTERED (use these names and addresses; do not invent others):'
  if (a.length) out += `\nApplicant/petitioner side: ${a.join(' | ')}`
  if (b.length) out += `\nOpposing side: ${b.join(' | ')}`
  return out
}

// Documents heard on the CIVIL side (District Judge). Everything else is criminal side
// (Sessions Judge). A template can override this by declaring `side: 'civil' | 'criminal'`.
const CIVIL_SIDE_DOCS = new Set(['civil-appeal', 'family-appeal', 'rent-appeal', 'civil-revision', 'order-37', 'order-37-suit'])

// Build the court heading from whatever the user typed, without duplicating words.
//   "بعدالت جناب محمد آصف صاحب، ایڈیشنل سیشن جج"  -> unchanged (already complete)
//   "جناب محمد آصف صاحب، ایڈیشنل سیشن جج"         -> "بعدالت " prefixed (جناب not doubled)
//   "محمد آصف صاحب، ایڈیشنل سیشن جج"              -> "بعدالت جناب " prefixed
//   blank -> the default bench for this side. ONLY the default mentions ایڈیشنل; whatever the
//   user types is kept verbatim, so a Sessions/District Judge bench is never overwritten.
function buildCourtLine(entry, data) {
  const side = (entry && entry.side) || (CIVIL_SIDE_DOCS.has(data.documentType) ? 'civil' : 'criminal')
  const raw = String(data.courtName == null ? '' : data.courtName).trim()

  if (!raw) {
    return side === 'civil'
      ? 'بعدالت جناب ایڈیشنل ڈسٹرکٹ جج صاحب'
      : 'بعدالت جناب ایڈیشنل سیشن جج صاحب'
  }
  if (/^بعدالت/.test(raw)) return raw           // already has the full opening
  if (/^عدالت/.test(raw)) return 'ب' + raw      // "عدالت جناب ..." -> "بعدالت جناب ..."
  if (/^جناب/.test(raw)) return 'بعدالت ' + raw // don't write جناب twice
  return 'بعدالت جناب ' + raw
}

// Append the advocate designation only when the user hasn't already written one.
function normalizeAdvocateName(name, language) {
  const s = String(name == null ? '' : name).trim()
  if (!s) return '__________'
  if (/ایڈووکیٹ|ایڈو\s*وکیٹ|ایڈوکیٹ|advocate/i.test(s)) return s // already designated
  return language === 'en' ? s + ', Advocate' : s + ' ایڈووکیٹ'
}

// Only templates that declare `impugnedTerm` get the note — a criminal court passes a
// judgment and sentence, not a decree, so it must never be told to write «پرچہ ڈگری».
function impugnedNote(entry, data) {
  const term = entry && entry.impugnedTerm
  const d = (data.judgmentDate || '').trim()
  if (!term || !d) return ''
  return `\nWhen referring to the impugned decision, ALWAYS cite it as «${term} مورخہ ${d}» (by this date). NEVER refer to it merely as «ہذا».`
}

// Deterministic safety net for the AI-written text. Applies (a) the bail complainant fix
// (civil «مدعی» -> the template's مستغیث) and (b) any per-template `termFixes` pairs
// (e.g. 491: «رٹ پٹیشن» -> «درخواست»). Runs only on AI output, never on trusted template text.
function enforceTerminology(text, entry) {
  let out = String(text == null ? '' : text)
  if (!entry) return out

  if (entry.complainantTerm) {
    const term = entry.complainantTerm
    out = out
      .split('مدعیان').join(term) // plural
      .split('مدعیہ').join(term)  // feminine
      .split('مدعی').join(term)   // base (run last: it is a prefix of the forms above)
  }

  if (Array.isArray(entry.termFixes)) {
    for (const pair of entry.termFixes) {
      if (Array.isArray(pair) && pair.length === 2) {
        out = out.split(pair[0]).join(pair[1])
      }
    }
  }

  return out
}

async function generateFactsClause(entry, data) {
  const langName = data.language === 'ur' ? 'Urdu' : 'English'
  const plural = isPluralPetitioners(data)

  const applicantNames = (data.applicants || [])
    .map((a) => (a.name || '').trim())
    .filter(Boolean)
    .join('، ')

  const prompt = `${entry.factsInstruction}

Applicant / accused: ${applicantNames || '(not specified)'}
${entry.factsContext || namedOpposingContext(data)}${complainantRule(entry)}${genderNote(entry, data)}${detaineesNote(data)}${impugnedNote(entry, data)}${pluralNote(plural)}${partiesNote(data)}${groundingRule()}

The user described the facts as follows:
"""
${(data.facts || '').trim()}
"""

Write the required clause in ${langName}. Output ONLY that clause — no quotation marks, no labels, no preamble, no explanation.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: entry.factsMaxTokens || 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim()
}

// Best-effort: ask Claude for ADDITIONAL grounds the facts support but the standard
// grounds don't cover. Always returns an array of strings; returns [] on any problem,
// so a failure here never breaks the main draft.
async function generateExtraGrounds(entry, data) {
  if (!Array.isArray(entry.grounds)) return []

  const instruction = entry.extraGroundsInstruction || DEFAULT_EXTRA_GROUNDS_INSTRUCTION
  const langName = data.language === 'ur' ? 'Urdu' : 'English'
  const plural = isPluralPetitioners(data)
  const standardList = selectedGroundsList(entry, data)
    .map((g) => `- ${groundText(g, plural)}`)
    .join('\n')

  const prompt = `${instruction}

Applicant / accused: ${(data.applicants || []).map((a) => (a.name || '').trim()).filter(Boolean).join('، ') || '(not specified)'}
${namedOpposingContext(data)}${complainantRule(entry)}${pluralNote(plural)}

The STANDARD grounds already included in this application are:
${standardList}

The user described the facts of the case as follows:
"""
${(data.facts || '').trim()}
"""

Based ONLY on these facts, list any ADDITIONAL grounds that are clearly supported but are NOT already covered above. Each ground must be one formal ${langName} sentence in the same style (beginning with «یہ کہ» and ending with «۔»).

Respond with ONLY a JSON array of strings, e.g. ["یہ کہ ...","یہ کہ ..."]. If no additional ground is warranted, respond with exactly [].`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim()

    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((x) => typeof x === 'string' && x.trim() !== '')
      .map((x) => x.trim())
      .slice(0, 5) // safety cap
  } catch (err) {
    console.error('Extra grounds skipped (non-fatal):', err.message)
    return []
  }
}

// For narrative documents (e.g. 22A/22B): ask Claude for the account as an ARRAY of separate
// «یہ کہ …» statements, so each can be rendered as its own numbered point. Always returns a
// non-empty array (falls back to splitting on «یہ کہ», or the whole text as one point).
async function generateFactsList(entry, data) {
  const langName = data.language === 'ur' ? 'Urdu' : 'English'
  const plural = isPluralPetitioners(data)

  const applicantNames = (data.applicants || [])
    .map((a) => (a.name || '').trim())
    .filter(Boolean)
    .join('، ')

  const prompt = `${entry.factsInstruction}

Applicant / accused: ${applicantNames || '(not specified)'}
${entry.factsContext || namedOpposingContext(data)}${complainantRule(entry)}${genderNote(entry, data)}${detaineesNote(data)}${impugnedNote(entry, data)}${pluralNote(plural)}${partiesNote(data)}${groundingRule()}

The user described the facts as follows:
"""
${(data.facts || '').trim()}
"""

Respond with ONLY a JSON array of ${langName} strings, each ONE «یہ کہ …» point, e.g. ["یہ کہ ...","یہ کہ ..."]. No preamble, no markdown.`

  let raw = ''
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: entry.factsMaxTokens || 2048,
      messages: [{ role: 'user', content: prompt }],
    })
    raw = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim()
  } catch (err) {
    console.error('Facts-list generation failed:', err.message)
    return ['__________']
  }

  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) {
      const items = parsed.filter((x) => typeof x === 'string' && x.trim() !== '').map((x) => x.trim())
      if (items.length) return items
    }
  } catch (err) {
    // fall through to text splitting
  }

  // Fallback: split the raw text at each «یہ کہ» boundary.
  const parts = cleaned.split(/(?=یہ کہ)/).map((s) => s.trim()).filter(Boolean)
  return parts.length ? parts : [cleaned || '__________']
}

// Render a roman-numbered list: AI-written points first (escaped), then any fixed tail points
// (trusted template text, which may contain tokens like {{POLICE_STATION}}).
function buildNarrativeHtml(points, tail) {
  const items = []
  ;(points || []).forEach((p) => items.push(escapeHtml(p)))
  ;(tail || []).forEach((t) => items.push(t))
  if (items.length === 0) return ''
  return items
    .map((text, i) => `<div class="doc-ground">(${romanNumeral(i + 1)}) ${text}</div>`)
    .join('\n')
}

// A template may define alternative POSTURES (e.g. a criminal appeal against a conviction vs
// one against an acquittal). Each variant supplies only the fields that differ — template,
// prayer wording, instruction, role words — and those override the base entry.
function resolveVariant(entry, data) {
  if (!entry || !entry.variants) return entry
  const key = (data.variant || '').trim() || entry.defaultVariant
  const chosen = entry.variants[key] || entry.variants[entry.defaultVariant]
  return chosen ? Object.assign({}, entry, chosen) : entry
}

async function generateFromTemplate(entry, data) {
  // Pick the posture first, so every downstream step (AI instruction, tokens, fixed text)
  // uses the variant's wording rather than the base document's.
  entry = resolveVariant(entry, data)
  const plural = isPluralPetitioners(data)

  let doc = entry.template
  let factsClause = ''

  if (entry.factsAsList) {
    // Narrative documents (e.g. 22A/22B): the body is a roman-numbered list of «یہ کہ» points
    // — the AI's account followed by any fixed tail points (e.g. the "approached police" line).
    const rawPoints = await generateFactsList(entry, data)
    const points = rawPoints.map((p) => enforceTerminology(p, entry))
    doc = doc.split('{{NARRATIVE}}').join(buildNarrativeHtml(points, entry.narrativeTail || []))
  } else {
    // Structured documents (e.g. bails): short allegation clause + numbered grounds.
    // Run both Claude calls in parallel so the extra-grounds step adds no waiting time.
    const [rawFactsClause, rawExtraTexts] = await Promise.all([
      generateFactsClause(entry, data),
      generateExtraGrounds(entry, data),
    ])
    // Safety net: fix any stray civil terminology in the AI-written parts (e.g. مدعی -> مستغیث).
    factsClause = enforceTerminology(rawFactsClause, entry)
    const extraTexts = (rawExtraTexts || []).map((tx) => enforceTerminology(tx, entry))
    doc = doc.split('{{GROUNDS}}').join(entry.grounds ? buildGroundsHtml(entry, data, extraTexts, plural) : '')
  }

  // Insert the singular/plural building blocks (trusted HTML). These may themselves
  // contain tokens like {{FACTS}} or {{POLICE_STATION}}, which the token loop fills below.
  if (entry.titleWord) {
    doc = doc.split('{{PET_TITLE}}').join(plural ? entry.titleWord.plural : entry.titleWord.singular)
  }
  if (entry.opening) {
    doc = doc.split('{{OPENING}}').join(plural ? entry.opening.plural : entry.opening.singular)
  }
  if (entry.prayer) {
    doc = doc.split('{{PRAYER}}').join(plural ? entry.prayer.plural : entry.prayer.singular)
  }
  // Headnote/subject line (may itself contain tokens like {{AMOUNT}}), so insert it before
  // the token loop below.
  if (entry.headnote) {
    doc = doc.split('{{HEADNOTE}}').join(entry.headnote)
  }

  // Optional mobile-number line (only rendered when a number was entered). The line is
  // trusted HTML with the user's number escaped inside, so it goes in before the token loop.
  const mobile = (data.mobile || '').trim()
  const mobileLine = mobile ? `<div class="doc-center">موبائل نمبر ${escapeHtml(mobile)}</div>` : ''
  doc = doc.split('{{MOBILE_LINE}}').join(mobileLine)

  // The proposed accused = respondents AFTER No. 1 (No. 1 is the official the order targets).
  const accusedList = (data.respondents || [])
    .map((r) => (r.name || '').trim())
    .filter(Boolean)
    .slice(1)
  const accusedNames = accusedList.join('، ')
  // Word must agree in number: one accused -> مسئول علیہ, more than one -> مسئول علیہان.
  const accusedWord = accusedList.length === 1 ? 'مسئول علیہ' : 'مسئول علیہان'

  // Gendered petitioner role (سائل / سائلہ) for documents that use it (e.g. 491).
  const petRole = entry.usesGender && data.gender === 'female' ? 'سائلہ' : 'سائل'
  // Respondent role label agrees in number: one -> مسئول علیہ, more than one -> مسئول علیہم.
  const namedRespCount = (data.respondents || []).map((r) => (r.name || '').trim()).filter(Boolean).length
  const namedApplicantCount = (data.applicants || []).map((a) => (a.name || '').trim()).filter(Boolean).length
  const respRole = namedRespCount > 1 ? 'مسئول علیہم' : 'مسئول علیہ'
  // The detaining respondents = everyone after No. 1 (the SHO). One detainer -> "مسئول علیہ نمبر 2";
  // more than one -> "مسئول علیہان".
  const detainerCount = Math.max(namedRespCount - 1, 0)
  const detainerRef = detainerCount > 1 ? 'مسئول علیہان' : 'مسئول علیہ نمبر 2'
  // Harassment: an extra sentence naming the private respondents behind the harassment.
  // Empty when the only respondent is the police official, so the prayer still reads cleanly.
  const instigationClause = detainerCount > 0
    ? ` نیز ${detainerRef} کو بھی پابند کیا جائے کہ وہ پولیس کو ${petRole} کے خلاف ہرگز استعمال نہ کریں۔`
    : ''

  const rawTokens = {
    COURT_LINE: buildCourtLine(entry, data),
    COURT_NAME: (data.courtName || '').trim() || '__________',
    APPLICANTS: formatPartiesForTemplate(data.applicants, data.language),
    RESPONDENTS: formatPartiesForTemplate(data.respondents, data.language),
    CASE_NUMBER: (data.caseNumber || '').trim() || '__________',
    FIR_DATE: (data.firDate || '').trim() || '__________',
    OFFENCE_SECTIONS: (data.offenceSections || '').trim() || '__________',
    POLICE_STATION: (data.policeStation || '').trim() || '__________',
    ADVOCATE_NAME: normalizeAdvocateName(data.advocateName, data.language),
    ACCUSED_NAMES: accusedNames,
    ACCUSED_WORD: accusedWord,
    PET_ROLE: petRole,
    RESP_ROLE: respRole,
    DETAINER_REF: detainerRef,
    INSTIGATION_CLAUSE: instigationClause,
    APPELLANT_ROLE: (entry.roleWords && (namedApplicantCount > 1 ? entry.roleWords.appellantPlural : entry.roleWords.appellantSingular))
      || (namedApplicantCount > 1 ? 'ایپیلانٹس' : 'ایپیلانٹ'),
    RESPONDENT_ROLE: (entry.roleWords && (namedRespCount > 1 ? entry.roleWords.respondentPlural : entry.roleWords.respondentSingular))
      || (namedRespCount > 1 ? 'ریسپانڈنٹس' : 'ریسپانڈنٹ'),
    LOWER_COURT: (data.lowerCourt || '').trim() || '__________',
    JUDGMENT_DATE: (data.judgmentDate || '').trim() || '__________',
    SUIT_DESC: (data.suitDescription || '').trim(),
    OUTCOME: (data.outcome || '').trim() || entry.outcomeDefault || 'خارج فرمایا',
    AMOUNT: (data.amount || '').trim() || '__________',
    INSTRUMENT: (data.instrument || '').trim() || '__________',
    COURT_FEE: (data.courtFee || '').trim() || '__________',
    VERIFY_PLACE: (data.verificationPlace || '').trim() || '__________',
    IMPUGNED: (entry.impugnedTerm || 'حکم و پرچہ ڈگری') + ' مورخہ ' + ((data.judgmentDate || '').trim() || '__________'),
    DETAINEES: formatDetainees(data.detainees),
    FACTS: factsClause || '__________',
  }

  for (const [key, value] of Object.entries(rawTokens)) {
    doc = doc.split(`{{${key}}}`).join(escapeHtml(value))
  }

  // Urdu documents are RTL: protect mixed runs (22-A/22-B, 26/165, 497(2), dates) from
  // being visually reordered. English drafts are already LTR and need no isolation.
  return data.language === 'ur' ? applyBidiIsolation(doc) : doc
}

// --- Fallback for not-yet-templated documents (plain text) ---

function formatParties(parties) {
  if (!parties || parties.length === 0) return 'Not provided'
  return parties
    .map((p, i) => {
      const name = (p.name || '').trim()
      const address = (p.address || '').trim()
      const through = cleanThrough(p.through)
      const namePart = through ? `${name} through ${through}` : name
      return address ? `${i + 1}. ${namePart} (Address: ${address})` : `${i + 1}. ${namePart}`
    })
    .join('\n')
}

function buildFallbackPrompt(data) {
  const docName = DOCUMENT_NAMES[data.documentType]
    ? DOCUMENT_NAMES[data.documentType][data.language] || DOCUMENT_NAMES[data.documentType].en
    : data.documentType

  const languageInstruction =
    data.language === 'ur'
      ? 'Write the ENTIRE document in formal legal Urdu, as customary in Pakistani District Courts.'
      : 'Write the ENTIRE document in formal legal English, as customary in Pakistani District Courts.'

  return `You are an expert legal draftsman for the Pakistani District Judiciary. Draft a professional, court-ready document from the details below.

DOCUMENT TYPE: ${docName}
COURT: ${(data.courtName || '').trim()}

APPLICANT(S):
${formatParties(data.applicants)}

RESPONDENT(S):
${formatParties(data.respondents)}

CASE / FIR NUMBER: ${(data.caseNumber || '').trim() || 'Not provided'}
FIR DATE: ${(data.firDate || '').trim() || 'Not provided'}
OFFENCE SECTIONS: ${(data.offenceSections || '').trim() || 'Not provided'}
POLICE STATION: ${(data.policeStation || '').trim() || 'Not applicable'}
ADVOCATE: ${(data.advocateName || '').trim() || 'Not provided'}

FACTS / GROUNDS:
${(data.facts || '').trim()}

INSTRUCTIONS:
- ${languageInstruction}
- Follow the standard structure for this document type in Pakistani courts.
- Use only the facts provided; use "__________" for any missing routine detail.
- CONTENT AWARENESS: include only grounds and prayers the supplied facts actually support. If the matter ended at a preliminary stage (e.g. acquittal u/s 249-A or 265-K Cr.P.C., dismissal on a point of law, rejection of plaint, ex-parte order) with no evidence recorded, omit every reference to evidence, witnesses, cross-examination and appraisal of evidence. Never assert a fact the user did not give, and never plead for relief the party does not want.
- List ONLY the parties actually given above. Never invent an extra party line, never add a blank numbered party, and never write placeholders like "__________ (Complainant), if any". If only one party is given on a side, that side has exactly one entry.
- In the signature block, use EXACTLY the advocate name given, followed only by "Advocate". Do NOT add any designation such as "Advocate High Court" or "Advocate Supreme Court" unless the given name already contains it.
- Output ONLY the finished document text, with no explanation or commentary.`
}

// Remove placeholder party lines the AI sometimes pads a draft with, e.g.
// "2. __________ (Complainant), if any" or "3. ____ (Respondent)". A line is only dropped
// when it is essentially a blank party entry — real lines with a missing detail, such as
// "Case No. __________", are kept.
function removePlaceholderPartyLines(text) {
  const blankNumberedParty = /^\s*\(?\d+\)?\s*[.)\-–۔]?\s*_{2,}\s*(\([^)]*\))?\s*(,?\s*if any\.?)?\s*$/i
  const anyIfAnyPlaceholder = /_{2,}[^\n]*\bif any\b/i

  return String(text == null ? '' : text)
    .split('\n')
    .filter((line) => !blankNumberedParty.test(line) && !anyIfAnyPlaceholder.test(line))
    .join('\n')
}

// Claude tends to sign drafts "Advocate High Court" even when no such designation was given.
// Strip any invented designation — but only when the user's own advocate name doesn't
// contain it, so a genuine "Advocate High Court" the user typed is preserved.
function stripInventedAdvocateTitles(text, advocateName) {
  const given = (advocateName || '').toLowerCase()
  let out = String(text == null ? '' : text)
  const designations = [
    /Advocate\s+High\s+Court(?:\s+of\s+[A-Za-z ]+)?/gi,
    /Advocate\s+Supreme\s+Court(?:\s+of\s+[A-Za-z ]+)?/gi,
    /ایڈووکیٹ\s+ہائی\s*کورٹ/g,
    /ایڈووکیٹ\s+سپریم\s*کورٹ/g,
  ]
  for (const re of designations) {
    const sample = (out.match(re) || [])[0]
    if (!sample) continue
    if (given && given.includes(sample.toLowerCase())) continue // the user really typed it
    out = out.replace(re, /[A-Za-z]/.test(sample) ? 'Advocate' : 'ایڈووکیٹ')
  }
  return out
}

async function generateFallback(data) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildFallbackPrompt(data) }],
  })
  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()
  return stripInventedAdvocateTitles(removePlaceholderPartyLines(text), data.advocateName)
}

// --- Routes ---

app.get('/', (req, res) => {
  res.send('LegalDraft.pk backend is running ✅')
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is alive and ready' })
})

// ---------------------------------------------------------------------------
// Simple in-memory rate limiting, so signup and login can't be hammered.
// ---------------------------------------------------------------------------
const attempts = new Map()
function rateLimit(key, max, windowMs) {
  const now = Date.now()
  const rec = attempts.get(key) || { count: 0, reset: now + windowMs }
  if (now > rec.reset) {
    rec.count = 0
    rec.reset = now + windowMs
  }
  rec.count += 1
  attempts.set(key, rec)
  return rec.count <= max
}
const clientIp = (req) => req.ip || 'unknown'

// Resolves the logged-in account from the Authorization header.
function currentAccount(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  return accounts.accountFromSession(token)
}

function adminOk(req) {
  return process.env.ADMIN_TOKEN && req.headers['x-admin-token'] === process.env.ADMIN_TOKEN
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

// Sign up. Creates an UNVERIFIED account and emails the verification code.
// No credits are granted until that code is entered.
app.post('/api/signup', async (req, res) => {
  if (!rateLimit('signup:' + clientIp(req), 5, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many signup attempts. Please try again later.' })
  }

  const { email, password, name } = req.body || {}

  const check = await accounts.validateEmail(email)
  if (!check.ok) return res.status(400).json({ error: check.error })

  const created = accounts.createAccount(check.email, password, name)
  if (!created.ok) return res.status(400).json({ error: created.error })

  const sent = await sendVerificationEmail(
    check.email,
    created.verifyCode,
    accounts.FREE_TRIAL_CREDITS,
    accounts.VERIFY_CODE_MINUTES
  )

  res.json({
    ok: true,
    email: check.email,
    // The account exists either way, so the screen offers a resend instead.
    emailFailed: !sent.ok || undefined,
    // Only with EMAIL_DEV_MODE (no SMTP) is the code returned so you can enter it.
    devCode: sent.delivered ? undefined : sent.code,
    message: 'Please check your inbox and enter the verification code to activate your account.',
  })
})

// Checks the emailed code. On success the customer is signed in straight away.
app.post('/api/verify', (req, res) => {
  if (!rateLimit('verify:' + clientIp(req), 30, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many attempts. Please try again in a few minutes.' })
  }
  const { email, code } = req.body || {}
  const result = accounts.verifyEmail(email, code)
  if (!result.ok) return res.status(400).json({ error: result.error, expired: result.expired })
  // No code is needed to reach the alreadyVerified answer, so it carries no account details.
  if (result.alreadyVerified) return res.json({ ok: true, alreadyVerified: true })
  res.json({
    ok: true,
    alreadyVerified: false,
    email: result.account.email,
    credits: result.account.balance,
    token: result.sessionToken,
  })
})

// Resend the verification code.
app.post('/api/resend-verification', async (req, res) => {
  if (!rateLimit('resend:' + clientIp(req), 5, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' })
  }
  const { email } = req.body || {}
  const result = accounts.refreshVerifyCode(email)
  if (!result.ok) {
    return res.status(result.retryAfter ? 429 : 400).json({ error: result.error, retryAfter: result.retryAfter })
  }

  const sent = await sendVerificationEmail(
    result.account.email,
    result.verifyCode,
    accounts.FREE_TRIAL_CREDITS,
    accounts.VERIFY_CODE_MINUTES
  )
  if (!sent.ok) return res.status(502).json({ error: sent.error })
  res.json({ ok: true, devCode: sent.delivered ? undefined : sent.code })
})

app.post('/api/forgot-password', async (req, res) => {
  if (!rateLimit('forgot:' + clientIp(req), 5, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' })
  }
  const { email } = req.body || {}
  const result = accounts.createResetToken(email)

  let devLink
  if (result.account && result.token) {
    // An unverified account's name is unproven: its owner may not own this inbox.
    const name = result.account.verified ? result.account.name : null
    const sent = await sendPasswordResetEmail(result.account.email, result.token, name)
    if (!sent.delivered) devLink = sent.link
  }

  // Always the same answer, so this cannot be used to discover which
  // addresses have accounts.
  res.json({
    ok: true,
    message: 'If an account exists for that address, a reset link has been sent to it.',
    devLink,
  })
})

app.post('/api/reset-password', (req, res) => {
  const { token, password } = req.body || {}
  const result = accounts.resetPassword(token, password)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json({ ok: true, email: result.account.email })
})

app.post('/api/login', (req, res) => {
  if (!rateLimit('login:' + clientIp(req), 10, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many login attempts. Please try again in a few minutes.' })
  }
  const { email, password } = req.body || {}
  const result = accounts.login(email, password)
  if (!result.ok) {
    return res.status(401).json({ error: result.error, unverified: result.unverified, email: result.email })
  }
  res.json({ ok: true, token: result.sessionToken, account: accounts.publicView(result.account) })
})

app.post('/api/logout', (req, res) => {
  const header = req.headers.authorization || ''
  accounts.logout(header.startsWith('Bearer ') ? header.slice(7) : '')
  res.json({ ok: true })
})

// Who am I? Used on page load to restore the session.
app.get('/api/me', (req, res) => {
  const acct = currentAccount(req)
  if (!acct) return res.status(401).json({ error: 'Not signed in' })
  res.json(accounts.publicView(acct))
})

app.get('/api/pricing', (req, res) => {
  res.json({
    pricePerCreditPkr: accounts.PRICE_PER_CREDIT_PKR,
    freeTrialCredits: accounts.FREE_TRIAL_CREDITS,
    packages: accounts.PACKAGES,
  })
})

// ---------------------------------------------------------------------------
// Drafting — requires a verified, signed-in account with at least one credit.
// ---------------------------------------------------------------------------

app.post('/api/generate', async (req, res) => {
  const data = req.body

  // NOTE: courtName is deliberately NOT required — a blank court field
  // produces the correct default bench for the document's side.
  if (!data || !data.documentType || !data.facts || !data.applicants || data.applicants.length === 0) {
    return res.status(400).json({ error: 'Missing required details. Please fill in the form completely.' })
  }

  // Admin test mode — lets the hidden admin panel generate drafts to verify
  // the templates and AI prompts are working, without a customer account,
  // without spending a credit, and without saving the draft anywhere.
  // Reached ONLY with the correct x-admin-token header; a normal customer
  // request never carries it, so the account/credit flow below is completely
  // unaffected.
  if (adminOk(req)) {
    try {
      const entry = TEMPLATES[data.documentType] && TEMPLATES[data.documentType][data.language]
      let draft
      let isHtml
      if (entry) {
        draft = await generateFromTemplate(entry, data)
        isHtml = true
      } else {
        draft = await generateFallback(data)
        isHtml = false
      }
      return res.json({ draft, isHtml, adminTest: true })
    } catch (err) {
      console.error('Claude API error (admin test draft):', err)
      return res.status(500).json({
        error: 'The drafting service could not complete your request. Please try again in a moment.',
      })
    }
  }

  const account = currentAccount(req)
  if (!account) {
    return res.status(401).json({ error: 'Please sign in to draft a document.', code: 'NOT_SIGNED_IN' })
  }
  if (!account.verified) {
    return res.status(403).json({
      error: 'Please verify your email address before drafting.',
      code: 'NOT_VERIFIED',
    })
  }
  // Every draft is a paid API call, so cap how fast one account can make them.
  if (!rateLimit('generate:' + account.id, 30, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many drafts in a short time. Please try again later.' })
  }

  // Charge BEFORE the slow API call, so simultaneous requests cannot all pass
  // on the same credit. A failed draft is refunded below.
  const spend = accounts.spendCredit(account.id, data.documentType)
  if (!spend.ok) {
    return res.status(402).json({
      error: 'You have no credits left. Please top up to draft another document.',
      code: 'NO_CREDITS',
      balance: 0,
    })
  }

  try {
    const entry = TEMPLATES[data.documentType] && TEMPLATES[data.documentType][data.language]

    let draft
    let isHtml
    if (entry) {
      draft = await generateFromTemplate(entry, data)
      isHtml = true
    } else {
      draft = await generateFallback(data)
      isHtml = false
    }

    // Draft succeeded — keep a copy, so the customer can reopen it later rather
    // than losing what they paid for.
    let saved = null
    try {
      const stored = accounts.saveDraft(account.id, {
        documentType: data.documentType,
        language: data.language,
        isHtml,
        title: (data.applicants && data.applicants[0] && data.applicants[0].name) || '',
        content: draft,
      })
      if (stored.ok) saved = stored.draft.id
    } catch (e) {
      console.error('Could not save draft copy:', e.message)
    }

    res.json({
      draft,
      isHtml,
      balance: spend.balance,
      draftId: saved,
    })
  } catch (err) {
    console.error('Claude API error:', err)
    accounts.refundCredit(account.id, 'Draft failed — automatic refund')
    res.status(500).json({
      error: 'The drafting service could not complete your request. Please try again in a moment.',
    })
  }
})

// ---------------------------------------------------------------------------
// Saved drafts — a credit is spent on each one, so they must be recoverable.
// ---------------------------------------------------------------------------

app.get('/api/drafts', (req, res) => {
  const account = currentAccount(req)
  if (!account) return res.status(401).json({ error: 'Please sign in.' })
  res.json({ drafts: accounts.listDrafts(account.id) })
})

app.get('/api/drafts/:id', (req, res) => {
  const account = currentAccount(req)
  if (!account) return res.status(401).json({ error: 'Please sign in.' })
  const draft = accounts.getDraft(account.id, req.params.id)
  if (!draft) return res.status(404).json({ error: 'Draft not found' })
  res.json(draft)
})

app.delete('/api/drafts/:id', (req, res) => {
  const account = currentAccount(req)
  if (!account) return res.status(401).json({ error: 'Please sign in.' })
  const result = accounts.deleteDraft(account.id, req.params.id)
  if (!result.ok) return res.status(404).json({ error: 'Draft not found' })
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Payment proof — customer submits a screenshot of the transfer
// ---------------------------------------------------------------------------

app.post('/api/payment-proof', (req, res) => {
  upload.single('screenshot')(req, res, (uploadErr) => {
    if (uploadErr) {
      const msg =
        uploadErr.code === 'LIMIT_FILE_SIZE'
          ? 'That image is too large. Please upload a file under 6 MB.'
          : uploadErr.message || 'Could not accept that file.'
      return res.status(400).json({ error: msg })
    }

    const account = currentAccount(req)
    if (!account) {
      if (req.file) fsp.unlink(pathMod.join(UPLOAD_DIR, req.file.filename), () => {})
      return res.status(401).json({ error: 'Please sign in to submit a payment.' })
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Please attach a screenshot of the transaction.' })
    }

    const { packageId, credits, amountPkr, method, reference, note } = req.body || {}

    if (!reference || !String(reference).trim()) {
      fsp.unlink(pathMod.join(UPLOAD_DIR, req.file.filename), () => {})
      return res.status(400).json({ error: 'Please enter the transaction reference number.' })
    }

    const result = accounts.addPaymentClaim(account.id, {
      packageId,
      credits,
      amountPkr,
      method,
      reference,
      note,
      file: req.file.filename,
      originalName: req.file.originalname,
    })

    if (!result.ok) {
      fsp.unlink(pathMod.join(UPLOAD_DIR, req.file.filename), () => {})
      return res.status(400).json({ error: result.error })
    }

    res.json({
      ok: true,
      message:
        'Payment submitted. Your credits will be added once the transfer has been verified, usually within a few working hours.',
      claim: result.claim,
    })
  })
})

// ---------------------------------------------------------------------------
// ADMIN — review payment submissions
// ---------------------------------------------------------------------------

app.get('/api/admin/payments', (req, res) => {
  if (!adminOk(req)) return res.status(403).json({ error: 'Not authorised' })
  res.json({ claims: accounts.listPaymentClaims(req.query.status || 'pending') })
})

// Serve a screenshot to the admin only.
app.get('/api/admin/payments/:id/file', (req, res) => {
  if (!adminOk(req)) return res.status(403).json({ error: 'Not authorised' })
  const found = accounts.findPaymentClaim(req.params.id)
  if (!found || !found.claim.file) return res.status(404).json({ error: 'Not found' })
  res.sendFile(pathMod.join(UPLOAD_DIR, found.claim.file))
})

app.post('/api/admin/payments/:id/approve', (req, res) => {
  if (!adminOk(req)) return res.status(403).json({ error: 'Not authorised' })
  const { credits, note } = req.body || {}
  const result = accounts.approvePaymentClaim(req.params.id, credits, note)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json({
    ok: true,
    email: result.account.email,
    balance: result.account.balance,
    granted: result.claim.grantedCredits,
  })
})

app.post('/api/admin/payments/:id/reject', (req, res) => {
  if (!adminOk(req)) return res.status(403).json({ error: 'Not authorised' })
  const result = accounts.rejectPaymentClaim(req.params.id, (req.body || {}).reason)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
// ADMIN — add credits after confirming a payment.
// Protected by ADMIN_TOKEN in .env, sent as the x-admin-token header.
// ---------------------------------------------------------------------------

app.post('/api/admin/grant', (req, res) => {
  if (!adminOk(req)) return res.status(403).json({ error: 'Not authorised' })
  const { accountId, email, credits: n, reference, note } = req.body || {}

  // Accept either the account id or the customer's email.
  let id = accountId
  if (!id && email) {
    const found = accounts.findByEmail(email)
    if (!found) return res.status(404).json({ error: 'No account with that email' })
    id = found.id
  }

  const result = accounts.grantCredits(id, n, reference, note)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json(accounts.publicView(result.account))
})

app.post('/api/admin/refund', (req, res) => {
  if (!adminOk(req)) return res.status(403).json({ error: 'Not authorised' })
  const { accountId, email, reason } = req.body || {}
  let id = accountId
  if (!id && email) {
    const found = accounts.findByEmail(email)
    if (!found) return res.status(404).json({ error: 'No account with that email' })
    id = found.id
  }
  const result = accounts.refundCredit(id, reason)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json({ ok: true, balance: result.balance })
})

// ---------------------------------------------------------------------------
// ADMIN — account management (list / view / adjust credits / disable / delete)
// All behind the same ADMIN_TOKEN (x-admin-token header) as the routes above.
// These power the hidden #/admin panel's Accounts tab. No visible link anywhere.
// ---------------------------------------------------------------------------

// List every account (safe summaries), optionally filtered by ?search=
app.get('/api/admin/accounts', (req, res) => {
  if (!adminOk(req)) return res.status(403).json({ error: 'Not authorised' })
  res.json({ accounts: accounts.adminListAccounts(req.query.search || '') })
})

// One account in full: profile + complete ledger + payment history.
app.get('/api/admin/accounts/:id', (req, res) => {
  if (!adminOk(req)) return res.status(403).json({ error: 'Not authorised' })
  const acct = accounts.adminGetAccount(req.params.id)
  if (!acct) return res.status(404).json({ error: 'Account not found' })
  res.json(acct)
})

// Add OR subtract credits by hand (delta may be negative). Writes an audit
// ledger entry. Balance can never go below zero (accounts.js enforces this).
app.post('/api/admin/accounts/:id/adjust', (req, res) => {
  if (!adminOk(req)) return res.status(403).json({ error: 'Not authorised' })
  const { delta, note } = req.body || {}
  const result = accounts.adminAdjustBalance(req.params.id, delta, note)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json({ ok: true, balance: result.balance, account: accounts.adminGetAccount(req.params.id) })
})

// Disable (suspend): blocks login and kills live sessions, keeps all records.
app.post('/api/admin/accounts/:id/disable', (req, res) => {
  if (!adminOk(req)) return res.status(403).json({ error: 'Not authorised' })
  const result = accounts.disableAccount(req.params.id, (req.body || {}).reason)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json({ ok: true, account: accounts.adminGetAccount(req.params.id) })
})

// Re-enable a disabled account.
app.post('/api/admin/accounts/:id/enable', (req, res) => {
  if (!adminOk(req)) return res.status(403).json({ error: 'Not authorised' })
  const result = accounts.enableAccount(req.params.id)
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json({ ok: true, account: accounts.adminGetAccount(req.params.id) })
})

// Hard delete: remove the account AND its screenshot files from disk.
// Irreversible. accounts.deleteAccount returns the stored filenames so we can
// unlink them from UPLOAD_DIR here (the data layer never touches the disk).
app.delete('/api/admin/accounts/:id', (req, res) => {
  if (!adminOk(req)) return res.status(403).json({ error: 'Not authorised' })
  const result = accounts.deleteAccount(req.params.id)
  if (!result.ok) return res.status(400).json({ error: result.error })

  // Best-effort cleanup of the payment screenshots that belonged to this account.
  for (const filename of result.files || []) {
    if (filename) fsp.unlink(pathMod.join(UPLOAD_DIR, filename), () => {})
  }
  res.json({ ok: true, removedFiles: (result.files || []).length })
})

// Anything unhandled, such as an unreadable accounts file: log it, and never
// send internal details to the browser.
app.use((err, req, res, next) => {
  console.error(err)
  if (res.headersSent) return next(err)
  res.status(500).json({ error: 'Something went wrong on our side. Please try again shortly.' })
})

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`✅ LegalDraft.pk backend running on http://localhost:${PORT}`)
  if (!smtpConfigured() && !emailDevMode()) {
    console.warn('⚠️  SMTP is not configured. Verification codes and password reset links cannot be sent.')
  }
})