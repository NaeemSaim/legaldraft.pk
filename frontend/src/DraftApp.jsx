import { useState, useRef } from 'react'
import { useAuth } from './auth-context.jsx'
import { authHeaders, API_BASE } from './auth-client.js'

const DOCUMENT_GROUPS = [
  {
    group: { en: 'Bail Applications', ur: 'ضمانت کی درخواستیں' },
    options: [
      { value: 'pre-arrest-bail', en: 'Pre-Arrest Bail Application', ur: 'درخواست ضمانت قبل از گرفتاری' },
      { value: 'post-arrest-bail', en: 'Post-Arrest Bail Application', ur: 'درخواست ضمانت بعد از گرفتاری' },
    ],
  },
  {
    group: { en: 'Applications', ur: 'درخواستیں' },
    options: [
      { value: '22a-22b', en: 'Application u/s 22A/22B Cr.P.C.', ur: 'درخواست زیر دفعہ 22A/22B ضابطہ فوجداری' },
      { value: '491', en: 'Application u/s 491 Cr.P.C.', ur: 'درخواست زیر دفعہ 491 ضابطہ فوجداری' },
      { value: 'harassment', en: 'Harassment Application', ur: 'درخواست حراسمنٹ' },
    ],
  },
  {
    group: { en: 'Appeals', ur: 'اپیلیں' },
    options: [
      { value: 'civil-appeal', en: 'Civil Appeal', ur: 'دیوانی اپیل' },
      { value: 'criminal-appeal', en: 'Criminal Appeal', ur: 'فوجداری اپیل' },
      { value: 'family-appeal', en: 'Family Appeal', ur: 'فیملی اپیل' },
      { value: 'rent-appeal', en: 'Rent Appeal', ur: 'رینٹ اپیل' },
    ],
  },
  {
    group: { en: 'Revisions', ur: 'نگرانی' },
    options: [
      { value: 'civil-revision', en: 'Civil Revision', ur: 'نگرانی دیوانی' },
      { value: 'criminal-revision', en: 'Criminal Revision', ur: 'نگرانی فوجداری' },
    ],
  },
  {
    group: { en: 'Suits', ur: 'دعوے' },
    options: [
      { value: 'order-37', en: 'Civil Suit under Order 37 (Pronote / Cheque)', ur: 'دعویٰ زیر آرڈر 37 ض د' },
    ],
  },
]

const LABELS = {
  en: {
    subtitle: 'AI-powered legal drafting for Pakistani courts',
    languageLabel: 'Document language',
    docTypeLabel: 'Select document type',
    docTypePlaceholder: '— Choose a document —',
    genderLabel: 'Petitioner',
    genderMale: 'Male (سائل)',
    genderFemale: 'Female (سائلہ)',
    detaineesHeading: 'Confined persons (محبوسان)',
    detaineeSingular: 'Person',
    addDetainee: '+ Add another person',
    detaineeName: 'Name',
    detaineeGender: 'Gender',
    detaineeAge: 'Age (years)',
    maleOpt: 'Male',
    femaleOpt: 'Female',
    applicantsHeading: 'Applicants / Petitioners',
    applicantSingular: 'Applicant',
    addApplicant: '+ Add another applicant',
    respondentsHeading: 'Respondents / Opposing parties',
    respondentSingular: 'Respondent',
    addRespondent: '+ Add another respondent',
    partyName: 'Name, Father/Husband name and caste',
    partyAddress: 'Address',
    remove: 'Remove',
    sameAsPrevious: 'Same address as previous party',
    throughLabel: 'Through / بذریعہ (optional)',
    throughPlaceholder: 'e.g. SHO Police Station Noorpur (without writing بذریعہ)',
    courtName: 'Court name',
    caseNumber: 'Case / FIR number',
    firDate: 'FIR date',
    offenceSections: 'Offence sections u/s',
    policeStation: 'Police station',
    advocateName: 'Advocate / counsel name',
    mobile: 'Mobile number',
    lowerCourt: 'Lower court / judge (impugned judgment)',
    judgmentDate: 'Date of impugned order / decree',
    suitDescription: 'Nature of the suit / claim',
    outcome: 'Outcome in the lower court',
    amount: 'Amount claimed',
    instrument: 'Instrument (pronote / cheque with date, number, bank)',
    courtFee: 'Court fee payable',
    verificationPlace: 'Place of verification (تصدیق)',
    optionalTag: 'optional',
    facts: 'Facts / grounds of the case',
    factsPlaceholder: 'Describe what happened, in plain language...',
    generate: 'Generate Draft',
    generating: 'Generating your draft…',
    required: 'Please fill in the highlighted fields before generating.',
    draftTitle: 'Generated draft',
    reviewNotice: 'This draft is AI-assisted and may contain errors. Check every fact, name, date and legal ground before filing.',
    copy: 'Copy',
    copied: 'Copied ✓',
    print: 'Print / Save as PDF',
    editHint: '✎ You can click into the draft to fix typos before printing or copying.',
    errorPrefix: 'Error: ',
  },
  ur: {
    subtitle: 'پاکستانی عدالتوں کے لیے مصنوعی ذہانت سے قانونی مسودہ سازی',
    languageLabel: 'دستاویز کی زبان',
    docTypeLabel: 'دستاویز کی قسم منتخب کریں',
    docTypePlaceholder: '— دستاویز منتخب کریں —',
    genderLabel: 'سائل / سائلہ',
    genderMale: 'مرد (سائل)',
    genderFemale: 'عورت (سائلہ)',
    detaineesHeading: 'محبوسان (بازیابی طلب)',
    detaineeSingular: 'فرد',
    addDetainee: '+ مزید فرد شامل کریں',
    detaineeName: 'نام',
    detaineeGender: 'جنس',
    detaineeAge: 'عمر (سال)',
    maleOpt: 'مرد',
    femaleOpt: 'عورت',
    applicantsHeading: 'درخواست گزار / سائل',
    applicantSingular: 'درخواست گزار',
    addApplicant: '+ مزید درخواست گزار شامل کریں',
    respondentsHeading: 'مدعا علیہ / مخالف فریق',
    respondentSingular: 'مدعا علیہ',
    addRespondent: '+ مزید مدعا علیہ شامل کریں',
    partyName: 'نام، ولدیت/زوجیت و ذات',
    partyAddress: 'پتہ',
    remove: 'حذف کریں',
    sameAsPrevious: 'پچھلے فریق والا پتہ',
    throughLabel: 'بذریعہ (اختیاری)',
    throughPlaceholder: 'مثلاً ایس ایچ او تھانہ نورپور (لفظ بذریعہ لکھے بغیر)',
    courtName: 'عدالت کا نام',
    caseNumber: 'مقدمہ / ایف آئی آر نمبر',
    firDate: 'تاریخ مقدمہ / مورخہ',
    offenceSections: 'دفعات جرم / بجرم',
    policeStation: 'تھانہ',
    advocateName: 'وکیل / کونسل کا نام',
    mobile: 'موبائل نمبر',
    lowerCourt: 'ماتحت عدالت / جج (فیصلہ زیرِ اپیل)',
    judgmentDate: 'تاریخِ فیصلہ عدالت تحت',
    suitDescription: 'دعویٰ کی نوعیت',
    outcome: 'نتیجہ عدالتِ تحت',
    amount: 'رقم واجب الادا',
    instrument: 'دستاویز (پرونوٹ / چیک — تاریخ، نمبر، بینک)',
    courtFee: 'قابلِ ادائیگی کورٹ فیس',
    verificationPlace: 'مقامِ تصدیق',
    optionalTag: 'اختیاری',
    facts: 'مقدمہ کے حقائق / وجوہات',
    factsPlaceholder: 'جو کچھ ہوا، سادہ الفاظ میں بیان کریں...',
    generate: 'مسودہ تیار کریں',
    generating: 'آپ کا مسودہ تیار ہو رہا ہے…',
    required: 'مسودہ تیار کرنے سے پہلے براہِ کرم نمایاں خانے پُر کریں۔',
    draftTitle: 'تیار شدہ مسودہ',
    reviewNotice: 'یہ مسودہ مصنوعی ذہانت کی مدد سے تیار ہوا ہے اور اس میں غلطیاں ہو سکتی ہیں۔ دائر کرنے سے پہلے ہر حقیقت، نام، تاریخ اور قانونی بنیاد کی جانچ کر لیں۔',
    copy: 'کاپی کریں',
    copied: 'کاپی ہو گیا ✓',
    print: 'پرنٹ / پی ڈی ایف',
    editHint: '✎ پرنٹ یا کاپی سے پہلے آپ مسودے میں کلک کر کے ترامیم کر سکتے ہیں۔',
    errorPrefix: 'خرابی: ',
  },
}

const PARTY_CONFIG = [
  { key: 'applicants', headingKey: 'applicantsHeading', singularKey: 'applicantSingular', addKey: 'addApplicant' },
  { key: 'respondents', headingKey: 'respondentsHeading', singularKey: 'respondentSingular', addKey: 'addRespondent' },
]

// Party labels are chosen per document type. Bails and the 22A/22B petition both use
// سائل (petitioner) and مسئول علیہ (respondents) — NOT the civil terms مدعی / مدعا علیہ.
// In a bail the petitioner is the accused; in 22A/22B the petitioner is the complainant
// and the accused are among the respondents (Respondent 1 being the SHO). مستغیث is not a
// form party — there is one complainant, named inside the document text itself.
const BAIL_PARTY_LABELS = {
  en: {
    applicantsHeading: 'Petitioner / Accused',
    applicantSingular: 'Petitioner',
    addApplicant: '+ Add another petitioner',
    respondentsHeading: 'Respondents / Opposing parties',
    respondentSingular: 'Respondent',
    addRespondent: '+ Add another respondent',
  },
  ur: {
    applicantsHeading: 'سائل / درخواست گزار',
    applicantSingular: 'سائل',
    addApplicant: '+ مزید سائل شامل کریں',
    respondentsHeading: 'مسئول علیہ / مخالف فریق',
    respondentSingular: 'مسئول علیہ',
    addRespondent: '+ مزید مسئول علیہ شامل کریں',
  },
}

const PETITION_22A_LABELS = {
  en: {
    applicantsHeading: 'Petitioner / Complainant',
    applicantSingular: 'Petitioner',
    addApplicant: '+ Add another petitioner',
    respondentsHeading: 'Respondents (No. 1: the official directed; rest: accused)',
    respondentSingular: 'Respondent',
    addRespondent: '+ Add another respondent',
  },
  ur: {
    applicantsHeading: 'سائل / درخواست گزار',
    applicantSingular: 'سائل',
    addApplicant: '+ مزید سائل شامل کریں',
    respondentsHeading: 'مسئول علیہان (نمبر 1: متعلقہ افسر، باقی: ملزمان)',
    respondentSingular: 'مسئول علیہ',
    addRespondent: '+ مزید مسئول علیہ شامل کریں',
  },
}

const CIVIL_APPEAL_LABELS = {
  en: {
    applicantsHeading: 'Appellant',
    applicantsHeadingPlural: 'Appellants',
    applicantSingular: 'Appellant',
    addApplicant: '+ Add another appellant',
    respondentsHeading: 'Respondent',
    respondentsHeadingPlural: 'Respondents',
    respondentSingular: 'Respondent',
    addRespondent: '+ Add another respondent',
    throughPlaceholder: 'Name, parentage & address of the special attorney (مختار خاص)',
  },
  ur: {
    applicantsHeading: 'ایپیلانٹ',
    applicantsHeadingPlural: 'ایپیلانٹس',
    applicantSingular: 'ایپیلانٹ',
    addApplicant: '+ مزید ایپیلانٹ شامل کریں',
    respondentsHeading: 'ریسپانڈنٹ',
    respondentsHeadingPlural: 'ریسپانڈنٹس',
    respondentSingular: 'ریسپانڈنٹ',
    addRespondent: '+ مزید ریسپانڈنٹ شامل کریں',
    throughPlaceholder: 'نام، ولدیت و پتہ مختارِ خاص',
  },
}

const FAMILY_APPEAL_LABELS = {
  en: {
    applicantsHeading: 'Appellant',
    applicantsHeadingPlural: 'Appellants',
    applicantSingular: 'Appellant',
    addApplicant: '+ Add another appellant',
    respondentsHeading: 'Respondent',
    respondentsHeadingPlural: 'Respondents',
    respondentSingular: 'Respondent',
    addRespondent: '+ Add another respondent',
    throughPlaceholder: 'Name, parentage & address of the special attorney (مختار خاص)',
  },
  ur: {
    applicantsHeading: 'اپیلانٹ',
    applicantsHeadingPlural: 'اپیلانٹس',
    applicantSingular: 'اپیلانٹ',
    addApplicant: '+ مزید اپیلانٹ شامل کریں',
    respondentsHeading: 'ریسپانڈنٹ',
    respondentsHeadingPlural: 'ریسپانڈنٹس',
    respondentSingular: 'ریسپانڈنٹ',
    addRespondent: '+ مزید ریسپانڈنٹ شامل کریں',
    throughPlaceholder: 'نام، ولدیت و پتہ مختارِ خاص',
  },
}

const CRIMINAL_APPEAL_LABELS = {
  en: {
    applicantsHeading: 'Appellant (convict)',
    applicantsHeadingPlural: 'Appellants (convicts)',
    applicantSingular: 'Appellant',
    addApplicant: '+ Add another appellant',
    respondentsHeading: 'Respondent (the State / complainant)',
    respondentsHeadingPlural: 'Respondents (the State / complainant)',
    respondentSingular: 'Respondent',
    addRespondent: '+ Add another respondent',
    throughPlaceholder: 'e.g. District Public Prosecutor (without writing بذریعہ)',
  },
  ur: {
    applicantsHeading: 'اپیلانٹ (مجرم)',
    applicantsHeadingPlural: 'اپیلانٹس (مجرمان)',
    applicantSingular: 'اپیلانٹ',
    addApplicant: '+ مزید اپیلانٹ شامل کریں',
    respondentsHeading: 'ریسپانڈنٹ (سرکار / مستغیث)',
    respondentsHeadingPlural: 'ریسپانڈنٹس (سرکار / مستغیث)',
    respondentSingular: 'ریسپانڈنٹ',
    addRespondent: '+ مزید ریسپانڈنٹ شامل کریں',
    throughPlaceholder: 'مثلاً ڈسٹرکٹ پبلک پراسیکیوٹر (لفظ بذریعہ لکھے بغیر)',
  },
}

const RENT_APPEAL_LABELS = {
  en: {
    applicantsHeading: 'Appellant',
    applicantsHeadingPlural: 'Appellants',
    applicantSingular: 'Appellant',
    addApplicant: '+ Add another appellant',
    respondentsHeading: 'Respondent',
    respondentsHeadingPlural: 'Respondents',
    respondentSingular: 'Respondent',
    addRespondent: '+ Add another respondent',
    throughPlaceholder: 'Name, parentage & address of the special attorney (مختار خاص)',
  },
  ur: {
    applicantsHeading: 'اپیلانٹ',
    applicantsHeadingPlural: 'اپیلانٹس',
    applicantSingular: 'اپیلانٹ',
    addApplicant: '+ مزید اپیلانٹ شامل کریں',
    respondentsHeading: 'ریسپانڈنٹ',
    respondentsHeadingPlural: 'ریسپانڈنٹس',
    respondentSingular: 'ریسپانڈنٹ',
    addRespondent: '+ مزید ریسپانڈنٹ شامل کریں',
    throughPlaceholder: 'نام، ولدیت و پتہ مختارِ خاص',
  },
}

const REVISION_LABELS = {
  en: {
    applicantsHeading: 'Petitioner',
    applicantsHeadingPlural: 'Petitioners',
    applicantSingular: 'Petitioner',
    addApplicant: '+ Add another petitioner',
    respondentsHeading: 'Respondent',
    respondentsHeadingPlural: 'Respondents',
    respondentSingular: 'Respondent',
    addRespondent: '+ Add another respondent',
    throughPlaceholder: 'Name, parentage & address of the special attorney (مختار خاص)',
  },
  ur: {
    applicantsHeading: 'پٹیشنر',
    applicantsHeadingPlural: 'پٹیشنرز',
    applicantSingular: 'پٹیشنر',
    addApplicant: '+ مزید پٹیشنر شامل کریں',
    respondentsHeading: 'ریسپانڈنٹ',
    respondentsHeadingPlural: 'ریسپانڈنٹس',
    respondentSingular: 'ریسپانڈنٹ',
    addRespondent: '+ مزید ریسپانڈنٹ شامل کریں',
    throughPlaceholder: 'نام، ولدیت و پتہ مختارِ خاص',
  },
}

const SUIT_LABELS = {
  en: {
    applicantsHeading: 'Plaintiff',
    applicantsHeadingPlural: 'Plaintiffs',
    applicantSingular: 'Plaintiff',
    addApplicant: '+ Add another plaintiff',
    respondentsHeading: 'Defendant',
    respondentsHeadingPlural: 'Defendants',
    respondentSingular: 'Defendant',
    addRespondent: '+ Add another defendant',
    throughPlaceholder: 'Name, parentage & address of the special attorney (مختار خاص)',
  },
  ur: {
    applicantsHeading: 'مدعی',
    applicantsHeadingPlural: 'مدعیان',
    applicantSingular: 'مدعی',
    addApplicant: '+ مزید مدعی شامل کریں',
    respondentsHeading: 'مدعاعلیہ',
    respondentsHeadingPlural: 'مدعاعلیہان',
    respondentSingular: 'مدعاعلیہ',
    addRespondent: '+ مزید مدعاعلیہ شامل کریں',
    throughPlaceholder: 'نام، ولدیت و پتہ مختارِ خاص',
  },
}

// Which label set each document uses. Documents not listed here keep the generic labels.
const PARTY_LABELS_BY_DOC = {
  'pre-arrest-bail': BAIL_PARTY_LABELS,
  'post-arrest-bail': BAIL_PARTY_LABELS,
  '22a-22b': PETITION_22A_LABELS,
  '491': PETITION_22A_LABELS,
  'harassment': PETITION_22A_LABELS,
  'civil-appeal': CIVIL_APPEAL_LABELS,
  'family-appeal': FAMILY_APPEAL_LABELS,
  'criminal-appeal': CRIMINAL_APPEAL_LABELS,
  'rent-appeal': RENT_APPEAL_LABELS,
  'civil-revision': REVISION_LABELS,
  'criminal-revision': REVISION_LABELS,
  'order-37': SUIT_LABELS,
}

// Which single-line fields each document shows. Documents not listed use DEFAULT_FIELDS.
// 22A/22B has no FIR yet, so the FIR number/date/offence fields are hidden; it adds a
// mobile-number field instead.
const DEFAULT_FIELDS = ['courtName', 'caseNumber', 'firDate', 'offenceSections', 'policeStation', 'advocateName']
const DOC_FIELD_SETS = {
  'pre-arrest-bail': DEFAULT_FIELDS,
  'post-arrest-bail': DEFAULT_FIELDS,
  '22a-22b': ['courtName', 'policeStation', 'mobile', 'advocateName'],
  '491': ['courtName', 'policeStation', 'advocateName'],
  'harassment': ['courtName', 'policeStation', 'mobile', 'advocateName'],
  'civil-appeal': ['courtName', 'lowerCourt', 'judgmentDate', 'suitDescription', 'outcome', 'advocateName'],
  'family-appeal': ['courtName', 'lowerCourt', 'judgmentDate', 'suitDescription', 'outcome', 'advocateName'],
  'criminal-appeal': ['courtName', 'lowerCourt', 'judgmentDate', 'caseNumber', 'firDate', 'offenceSections', 'policeStation', 'outcome', 'advocateName'],
  'rent-appeal': ['courtName', 'lowerCourt', 'judgmentDate', 'suitDescription', 'outcome', 'advocateName'],
  'civil-revision': ['courtName', 'lowerCourt', 'judgmentDate', 'outcome', 'advocateName'],
  'criminal-revision': ['courtName', 'lowerCourt', 'judgmentDate', 'caseNumber', 'firDate', 'offenceSections', 'policeStation', 'outcome', 'advocateName'],
  'order-37': ['courtName', 'amount', 'instrument', 'courtFee', 'verificationPlace', 'advocateName'],
}

// Which single-line fields are MANDATORY per document. Anything shown but not listed here
// is optional (and its label gets an "(optional)" tag). courtName is always required.
const REQUIRED_SINGLE_FIELDS = {
  'pre-arrest-bail': ['caseNumber', 'firDate', 'offenceSections', 'policeStation'],
  'post-arrest-bail': ['caseNumber', 'firDate', 'offenceSections', 'policeStation'],
  '22a-22b': ['policeStation'],
  '491': ['policeStation'],
  'harassment': ['policeStation'],
  'civil-appeal': ['lowerCourt', 'judgmentDate'],
  'family-appeal': ['lowerCourt', 'judgmentDate'],
  'criminal-appeal': ['lowerCourt', 'judgmentDate', 'caseNumber', 'offenceSections', 'policeStation'],
  'rent-appeal': ['lowerCourt', 'judgmentDate'],
  'civil-revision': ['lowerCourt', 'judgmentDate'],
  'criminal-revision': ['lowerCourt', 'judgmentDate'],
  'order-37': ['amount', 'instrument'],
}
const DEFAULT_REQUIRED = []

// Documents whose petitioner is gendered — these show the Male/Female toggle.
const GENDER_DOCS = ['491', 'harassment']

// Documents that recover confined persons — these show the محبوسان (detainees) section.
const DETAINEE_DOCS = ['491']

// Documents with more than one posture. The chosen posture changes the fixed wording AND the
// grounds the AI is allowed to plead (e.g. an appeal against acquittal never asks for acquittal).
const DOC_VARIANTS = {
  'criminal-appeal': {
    default: 'conviction',
    labelEn: 'Appeal is',
    labelUr: 'اپیل بابت',
    options: [
      { value: 'conviction', en: 'Against conviction', ur: 'بر خلاف سزا' },
      { value: 'acquittal', en: 'Against acquittal', ur: 'بر خلاف بریت' },
    ],
  },
  'rent-appeal': {
    default: 'landlord',
    labelEn: 'Appeal filed by',
    labelUr: 'اپیل دائر کردہ',
    options: [
      { value: 'landlord', en: 'Landlord (seeking ejectment)', ur: 'مالکِ مکان (بےدخلی کے لیے)' },
      { value: 'tenant', en: 'Tenant (against ejectment)', ur: 'کرایہ دار (بر خلاف بےدخلی)' },
    ],
  },
  'order-37': {
    default: 'pronote',
    labelEn: 'Recovery on',
    labelUr: 'بنیادِ دعویٰ',
    options: [
      { value: 'pronote', en: 'Promissory note', ur: 'پرونوٹ' },
      { value: 'cheque', en: 'Dishonoured cheque', ur: 'چیک (عدم ادائیگی)' },
    ],
  },
}

let partyIdCounter = 0
// Escape a plain-text (non-HTML) draft so it can be shown inside an editable div while
// still displaying literally. Newlines are preserved by the draft-body's white-space CSS.
function escapeForEditable(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// through = optional "بذریعہ ..." text, used on respondents (e.g. State through SHO).
function newParty() {
  partyIdCounter += 1
  return { id: partyIdCounter, name: '', address: '', sameAsPrev: false, through: '' }
}

let detaineeIdCounter = 0
// A confined person to be recovered (محبوسان) — 491 only. Gender drives نابالغ / نابالغہ.
function newDetainee() {
  detaineeIdCounter += 1
  return { id: detaineeIdCounter, name: '', gender: 'male', age: '' }
}

function DraftApp() {
  // Billing: one credit per generated document.
  const { account, setBalance } = useAuth()
  const [lang, setLang] = useState('en')
  const [docType, setDocType] = useState('')
  const [formData, setFormData] = useState(() => ({
    applicants: [newParty()],
    respondents: [newParty()],
    detainees: [newDetainee()],
    courtName: '',
    caseNumber: '',
    firDate: '',
    offenceSections: '',
    policeStation: '',
    advocateName: '',
    mobile: '',
    lowerCourt: '',
    judgmentDate: '',
    suitDescription: '',
    outcome: '',
    amount: '',
    instrument: '',
    courtFee: '',
    verificationPlace: '',
    variant: '',
    gender: 'male',
    facts: '',
  }))
  const [showErrors, setShowErrors] = useState(false)
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [isHtml, setIsHtml] = useState(false)
  const [apiError, setApiError] = useState('')
  const [copied, setCopied] = useState(false)
  const [outOfCredits, setOutOfCredits] = useState(false)

  const draftRef = useRef(null)

  const t = LABELS[lang]
  const isUrdu = lang === 'ur'

  // Party labels per document type; documents not in the map keep the generic labels.
  const partyOverride = PARTY_LABELS_BY_DOC[docType]
  const partyT = partyOverride ? { ...t, ...partyOverride[lang] } : t

  // Which single-line fields to show for the selected document.
  const visibleFields = DOC_FIELD_SETS[docType] || DEFAULT_FIELDS
  // The selected document's posture (variant), falling back to its default.
  const variantCfg = DOC_VARIANTS[docType]
  const variant = variantCfg
    ? (variantCfg.options.some((o) => o.value === formData.variant) ? formData.variant : variantCfg.default)
    : ''

  // Which of them are mandatory for the selected document.
  const requiredFields = REQUIRED_SINGLE_FIELDS[docType] || DEFAULT_REQUIRED

  function updateField(name, value) {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  function updateParty(partyType, index, field, value) {
    setFormData((prev) => {
      const updatedRows = prev[partyType].map((party, i) =>
        i === index ? { ...party, [field]: value } : party
      )
      return { ...prev, [partyType]: updatedRows }
    })
  }

  function toggleSameAsPrev(partyType, index) {
    setFormData((prev) => {
      const updatedRows = prev[partyType].map((party, i) =>
        i === index ? { ...party, sameAsPrev: !party.sameAsPrev } : party
      )
      return { ...prev, [partyType]: updatedRows }
    })
  }

  function addParty(partyType) {
    setFormData((prev) => ({ ...prev, [partyType]: [...prev[partyType], newParty()] }))
  }

  function updateDetainee(index, field, value) {
    setFormData((prev) => ({
      ...prev,
      detainees: prev.detainees.map((d, i) => (i === index ? { ...d, [field]: value } : d)),
    }))
  }

  function addDetainee() {
    setFormData((prev) => ({ ...prev, detainees: [...prev.detainees, newDetainee()] }))
  }

  function removeDetainee(index) {
    setFormData((prev) => ({ ...prev, detainees: prev.detainees.filter((_, i) => i !== index) }))
  }

  function removeParty(partyType, index) {
    setFormData((prev) => {
      let rows = prev[partyType].filter((_, i) => i !== index)
      if (rows.length > 0) {
        rows = rows.map((p, i) => (i === 0 ? { ...p, sameAsPrev: false } : p))
      }
      return { ...prev, [partyType]: rows }
    })
  }

  function cleanParties(rows) {
    return rows
      .filter(
        (party, i) =>
          i === 0 ||
          party.name.trim() !== '' ||
          party.address.trim() !== '' ||
          (party.through || '').trim() !== ''
      )
      .map(({ name, address, sameAsPrev, through }) => ({
        name: name.trim(),
        address: address.trim(),
        sameAsPrev: Boolean(sameAsPrev),
        through: (through || '').trim(),
      }))
  }

  function cleanDetainees(rows) {
    return rows
      .filter((d) => (d.name || '').trim() !== '')
      .map(({ name, gender, age }) => ({
        name: name.trim(),
        gender: gender || 'male',
        age: (age || '').trim(),
      }))
  }

  async function handleGenerate() {
    const missingDoc = docType.trim() === ''
    const missingFirstApplicant = formData.applicants[0].name.trim() === ''
    const missingFirstRespondent = formData.respondents[0].name.trim() === ''
    const missingFacts = formData.facts.trim() === ''
    // Every mandatory single-line field for this document must be filled.
    const missingRequired = requiredFields.some((f) => (formData[f] || '').trim() === '')

    if (missingDoc || missingFirstApplicant || missingFirstRespondent || missingFacts || missingRequired) {
      setShowErrors(true)
      setDraft('')
      setApiError('')
      return
    }

    setShowErrors(false)
    setApiError('')
    setDraft('')
    setCopied(false)
    setOutOfCredits(false)
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          documentType: docType,
          language: lang,
          applicants: cleanParties(formData.applicants),
          respondents: cleanParties(formData.respondents),
          detainees: cleanDetainees(formData.detainees),
          courtName: formData.courtName.trim(),
          caseNumber: formData.caseNumber.trim(),
          firDate: formData.firDate.trim(),
          offenceSections: formData.offenceSections.trim(),
          policeStation: formData.policeStation.trim(),
          advocateName: formData.advocateName.trim(),
          mobile: formData.mobile.trim(),
          lowerCourt: formData.lowerCourt.trim(),
          judgmentDate: formData.judgmentDate.trim(),
          suitDescription: formData.suitDescription.trim(),
          outcome: formData.outcome.trim(),
          amount: formData.amount.trim(),
          instrument: formData.instrument.trim(),
          courtFee: formData.courtFee.trim(),
          verificationPlace: formData.verificationPlace.trim(),
          variant: variant,
          gender: formData.gender,
          facts: formData.facts.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.code === 'NO_CREDITS') {
          // Out of credits — send them to the top-up page rather than showing
          // a bare error.
          setOutOfCredits(true)
          setBalance(0)
        } else {
          setApiError(data.error || 'Something went wrong. Please try again.')
        }
      } else {
        setDraft(data.draft)
        setIsHtml(Boolean(data.isHtml))
        // The server returns the new balance after charging the credit.
        if (typeof data.balance === 'number') setBalance(data.balance)
      }
    } catch {
      setApiError('Could not reach the server. Please make sure the backend is running on port 3001.')
    } finally {
      setLoading(false)
    }
  }

  async function copyDraft() {
    const node = draftRef.current
    if (!node) return

    const html = node.innerHTML
    const text = node.innerText

    try {
      if (isHtml && window.ClipboardItem && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new window.ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' }),
          }),
        ])
      } else {
        await navigator.clipboard.writeText(text)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Clipboard blocked; nothing more to do.
      }
    }
  }

  // Open a clean print copy on an 8.5 x 13 inch court page, then print / Save as PDF.
  function handlePrint() {
    const node = draftRef.current
    if (!node) return

    const contentHtml = node.innerHTML
    const dir = isUrdu ? 'rtl' : 'ltr'

    // ===== COURT PAGE MARGINS — adjust to match your court =====
    const marginTopIn = 1
    const marginBottomIn = 1
    const marginRightIn = isUrdu ? 1.4 : 0.9   // Urdu: wider RIGHT (binding); English: wider LEFT
    const marginLeftIn = isUrdu ? 0.9 : 1.4
    // Institution-stamp area reserved at the top-right of the first-page body (from جناب عالی).
    // Kept short on purpose so it can never push a stamped line onto the second page.
    const stampWidthIn = 2.5
    const stampHeightIn = 2
    // ===========================================================

    const pageMargin =
      'margin: ' + marginTopIn + 'in ' + marginRightIn + 'in ' + marginBottomIn + 'in ' + marginLeftIn + 'in;'

    const bodyFont = isUrdu
      ? "'Noto Nastaliq Urdu', serif"
      : "'Georgia', 'Times New Roman', serif"
    const fontSize = isUrdu ? '15pt' : '13pt'
    const lineHeight = isUrdu ? '2.2' : '1.6'
    const whiteSpace = isHtml ? 'normal' : 'pre-wrap'

    const printHtml =
      '<!DOCTYPE html>' +
      '<html dir="' + dir + '" lang="' + (isUrdu ? 'ur' : 'en') + '">' +
      '<head><meta charset="utf-8" />' +
      '<style>' +
      "@import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;700&display=swap');" +
      '@page { size: 8.5in 13in; ' + pageMargin + ' }' +
      '* { box-sizing: border-box; }' +
      'html, body { margin: 0; padding: 0; }' +
      'body { font-family: ' + bodyFont + '; font-size: ' + fontSize + '; line-height: ' + lineHeight + '; color: #000; background: #fff; }' +
      '.print-doc { white-space: ' + whiteSpace + '; }' +
      '.print-doc > div { margin-bottom: 10px; }' +
      '.doc-center { text-align: center; }' +
      '.doc-bold { font-weight: 700; }' +
      '.doc-underline { text-decoration: underline; text-underline-offset: 4px; }' +
      '.doc-court { font-size: 1.1em; margin-bottom: 14px; }' +
      '.doc-title { margin: 16px 0; }' +
      '.doc-para { margin-bottom: 12px; text-align: justify; text-justify: inter-word; }' +
      '.doc-ground { margin-bottom: 8px; text-align: justify; text-justify: inter-word; }' +
      '.doc-sep { text-align: center; }' +
      '.print-doc > .doc-sep { margin: 0; line-height: 1; }' +
      '.doc-sign { break-inside: avoid; page-break-inside: avoid; }' +
      '.doc-sign > div { margin-bottom: 8px; }' +
      '.stamp-spacer { float: right; width: ' + stampWidthIn + 'in; height: ' + stampHeightIn + 'in; }' +
      '</style></head>' +
      '<body><div class="print-doc" dir="' + dir + '">' + contentHtml + '</div></body>' +
      '</html>'

    // Print in a hidden frame; before printing, reserve the stamp box at the جناب عالی line.
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'

    iframe.onload = () => {
      const win = iframe.contentWindow

      // Reserve the stamp box at the start of the BODY — the first body paragraph — on every
      // document. That is جناب عالی on the petitions and اپیل زیر دفعہ on the civil appeal. The
      // بعدالت جناب cause title, parties and title above it are centered heading lines (never
      // .doc-para), so they are left untouched.
      const reserveStampStrip = () => {
        try {
          const idoc = win.document
          const printDoc = idoc.querySelector('.print-doc')
          if (!printDoc) return
          const spacer = idoc.createElement('div')
          spacer.className = 'stamp-spacer'
          spacer.style.margin = '0'
          const firstPara = printDoc.querySelector('.doc-para')
          if (firstPara && firstPara.parentNode) {
            firstPara.parentNode.insertBefore(spacer, firstPara)
          } else {
            printDoc.insertBefore(spacer, printDoc.firstChild)
          }
        } catch {
          // couldn't place the stamp box — just print normally
        }
      }

      // Keep the signature block (the لstandard closing: عرضی نیاز / العارض, the party names,
      // بذریعہ کونسل, and the advocate) on one page — never let the advocate name break onto a
      // separate page from the block it belongs to. The signature is everything after the LAST
      // separator, so we wrap that run in a keep-together container.
      const keepSignatureTogether = () => {
        try {
          const idoc = win.document
          const printDoc = idoc.querySelector('.print-doc')
          if (!printDoc) return
          const children = Array.from(printDoc.children)
          let lastSep = -1
          children.forEach((el, i) => {
            if (el.classList && el.classList.contains('doc-sep')) lastSep = i
          })
          if (lastSep === -1 || lastSep >= children.length - 1) return
          const wrapper = idoc.createElement('div')
          wrapper.className = 'doc-sign'
          const toMove = children.slice(lastSep)
          printDoc.insertBefore(wrapper, toMove[0])
          toMove.forEach((el) => wrapper.appendChild(el))
        } catch {
          // couldn't group the signature — just print normally
        }
      }

      const doPrint = () => {
        reserveStampStrip()
        keepSignatureTogether()
        try {
          win.focus()
          win.print()
        } catch {
          // printing blocked; nothing more to do
        }
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
        }, 1000)
      }

      if (win.document.fonts && win.document.fonts.ready) {
        win.document.fonts.ready.then(() => setTimeout(doPrint, 300))
      } else {
        setTimeout(doPrint, 600)
      }
    }

    iframe.srcdoc = printHtml
    document.body.appendChild(iframe)
  }

  return (
    <div className={`app ${isUrdu ? 'rtl' : 'ltr'}`} dir={isUrdu ? 'rtl' : 'ltr'}>
      <main className="card">
        <div className="lang-toggle" dir="ltr">
          <span className="lang-toggle-label">{t.languageLabel}:</span>
          <div className="lang-buttons">
            <button
              type="button"
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
            >
              English
            </button>
            <button
              type="button"
              className={`lang-btn ${lang === 'ur' ? 'active' : ''}`}
              onClick={() => setLang('ur')}
            >
              اردو
            </button>
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="docType">
            {t.docTypeLabel}
          </label>
          <select
            id="docType"
            className={`field-input ${showErrors && docType.trim() === '' ? 'field-error' : ''}`}
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          >
            <option value="">{t.docTypePlaceholder}</option>
            {DOCUMENT_GROUPS.map((grp) => (
              <optgroup key={grp.group.en} label={grp.group[lang]}>
                {grp.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt[lang]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {variantCfg && (
          <div className="lang-toggle" dir={isUrdu ? 'rtl' : 'ltr'}>
            <span className="lang-toggle-label">{isUrdu ? variantCfg.labelUr : variantCfg.labelEn}:</span>
            <div className="lang-buttons">
              {variantCfg.options.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  className={`lang-btn ${variant === opt.value ? 'active' : ''}`}
                  onClick={() => updateField('variant', opt.value)}
                >
                  {isUrdu ? opt.ur : opt.en}
                </button>
              ))}
            </div>
          </div>
        )}

        {GENDER_DOCS.includes(docType) && (
          <div className="lang-toggle" dir={isUrdu ? 'rtl' : 'ltr'}>
            <span className="lang-toggle-label">{t.genderLabel}:</span>
            <div className="lang-buttons">
              <button
                type="button"
                className={`lang-btn ${formData.gender === 'male' ? 'active' : ''}`}
                onClick={() => updateField('gender', 'male')}
              >
                {t.genderMale}
              </button>
              <button
                type="button"
                className={`lang-btn ${formData.gender === 'female' ? 'active' : ''}`}
                onClick={() => updateField('gender', 'female')}
              >
                {t.genderFemale}
              </button>
            </div>
          </div>
        )}

        {PARTY_CONFIG.map((cfg) => (
          <div className="party-section" key={cfg.key}>
            <div className="party-heading">
              {(() => {
                const filled = formData[cfg.key].filter((p) => (p.name || '').trim() !== '').length
                const pluralKey = cfg.headingKey + 'Plural'
                return filled > 1 && partyT[pluralKey] ? partyT[pluralKey] : partyT[cfg.headingKey]
              })()}
            </div>

            {formData[cfg.key].map((party, index) => (
              <div className="party-row" key={party.id}>
                <div className="party-row-header">
                  <span className="party-index">
                    {partyT[cfg.singularKey]} {index + 1}
                  </span>
                  {formData[cfg.key].length > 1 && (
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeParty(cfg.key, index)}
                    >
                      {t.remove}
                    </button>
                  )}
                </div>

                {index > 0 && (
                  <div className="share-toggle">
                    <input
                      type="checkbox"
                      id={`${cfg.key}-${party.id}-same`}
                      checked={party.sameAsPrev}
                      onChange={() => toggleSameAsPrev(cfg.key, index)}
                    />
                    <label htmlFor={`${cfg.key}-${party.id}-same`}>{t.sameAsPrevious}</label>
                  </div>
                )}

                <div className={`party-fields ${index > 0 && party.sameAsPrev ? 'party-fields-single' : ''}`}>
                  <div>
                    <label className="field-label">{t.partyName}</label>
                    <input
                      type="text"
                      lang={lang}
                      dir={isUrdu ? 'rtl' : 'ltr'}
                      className={`field-input ${
                        showErrors && index === 0 && party.name.trim() === '' ? 'field-error' : ''
                      }`}
                      value={party.name}
                      onChange={(e) => updateParty(cfg.key, index, 'name', e.target.value)}
                    />
                  </div>
                  {!(index > 0 && party.sameAsPrev) && (
                    <div>
                      <label className="field-label">{t.partyAddress}</label>
                      <input
                        type="text"
                        lang={lang}
                        dir={isUrdu ? 'rtl' : 'ltr'}
                        className="field-input"
                        value={party.address}
                        onChange={(e) => updateParty(cfg.key, index, 'address', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* "Through / بذریعہ" — respondents only, optional */}
                {cfg.key === 'respondents' && (
                  <div className="field">
                    <label className="field-label">{t.throughLabel}</label>
                    <input
                      type="text"
                      lang={lang}
                      dir={isUrdu ? 'rtl' : 'ltr'}
                      className="field-input"
                      value={party.through || ''}
                      placeholder={partyT.throughPlaceholder}
                      onChange={(e) => updateParty(cfg.key, index, 'through', e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}

            <button type="button" className="add-btn" onClick={() => addParty(cfg.key)}>
              {partyT[cfg.addKey]}
            </button>
          </div>
        ))}

        {DETAINEE_DOCS.includes(docType) && (
          <div className="party-section">
            <div className="party-heading">{t.detaineesHeading}</div>
            {formData.detainees.map((d, index) => (
              <div className="party-row" key={d.id}>
                <div className="party-row-header">
                  <span className="party-index">
                    {t.detaineeSingular} {index + 1}
                  </span>
                  {formData.detainees.length > 1 && (
                    <button type="button" className="remove-btn" onClick={() => removeDetainee(index)}>
                      {t.remove}
                    </button>
                  )}
                </div>
                <div className="party-fields">
                  <div>
                    <label className="field-label">{t.detaineeName}</label>
                    <input
                      type="text"
                      lang={lang}
                      dir={isUrdu ? 'rtl' : 'ltr'}
                      className="field-input"
                      value={d.name}
                      onChange={(e) => updateDetainee(index, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">{t.detaineeGender}</label>
                    <select
                      className="field-input"
                      value={d.gender}
                      onChange={(e) => updateDetainee(index, 'gender', e.target.value)}
                    >
                      <option value="male">{t.maleOpt}</option>
                      <option value="female">{t.femaleOpt}</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">{t.detaineeAge}</label>
                    <input
                      type="text"
                      lang={lang}
                      dir={isUrdu ? 'rtl' : 'ltr'}
                      className="field-input"
                      value={d.age}
                      onChange={(e) => updateDetainee(index, 'age', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" className="add-btn" onClick={addDetainee}>
              {t.addDetainee}
            </button>
          </div>
        )}

        <div className="field-grid">
          {visibleFields.map((name) => (
            <div className="field" key={name}>
              <label className="field-label" htmlFor={name}>
                {t[name]}
                {requiredFields.includes(name) ? '' : ` (${t.optionalTag})`}
              </label>
              <input
                id={name}
                type="text"
                lang={lang}
                dir={isUrdu ? 'rtl' : 'ltr'}
                className={`field-input ${
                  showErrors && requiredFields.includes(name) && (formData[name] || '').trim() === '' ? 'field-error' : ''
                }`}
                value={formData[name]}
                onChange={(e) => updateField(name, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="facts">
            {t.facts}
          </label>
          <textarea
            id="facts"
            rows={6}
            lang={lang}
            dir={isUrdu ? 'rtl' : 'ltr'}
            className={`field-input textarea ${
              showErrors && formData.facts.trim() === '' ? 'field-error' : ''
            }`}
            placeholder={t.factsPlaceholder}
            value={formData.facts}
            onChange={(e) => updateField('facts', e.target.value)}
          />
        </div>

        {showErrors && <p className="error-msg">{t.required}</p>}

        <button
          type="button"
          className="generate-btn"
          onClick={handleGenerate}
          disabled={loading || outOfCredits}
        >
          {loading ? t.generating : t.generate}
        </button>

        {/* Cost reminder — one credit per generated document. */}
        {account && !outOfCredits && (
          <p className="credit-note">
            {isUrdu
              ? `اس مسودے پر 1 کریڈٹ خرچ ہوگا۔ آپ کے پاس ${account.balance} کریڈٹ باقی ہیں۔`
              : `This draft uses 1 credit. You have ${account.balance} remaining.`}
          </p>
        )}
      </main>

      {outOfCredits && (
        <div className="card credit-empty">
          <h3>{isUrdu ? 'کریڈٹ ختم ہو گئے ہیں' : 'You are out of credits'}</h3>
          <p>
            {isUrdu
              ? 'ہر مسودے پر 1 کریڈٹ خرچ ہوتا ہے۔ مزید مسودے تیار کرنے کے لیے کریڈٹ خریدیں۔ آپ کا بھرا ہوا فارم محفوظ ہے۔'
              : 'Each draft costs 1 credit. Top up to continue — the details you have entered are safe and will still be here.'}
          </p>
          <a className="btn btn-primary" href="#/pricing">
            {isUrdu ? 'کریڈٹ خریدیں' : 'Buy credits'}
          </a>
        </div>
      )}

      {apiError && (
        <div className="card api-error">
          {t.errorPrefix}
          {apiError}
        </div>
      )}

      {draft && (
        <section className="card">
          <div className="draft-header">
            <h2 className="preview-title">{t.draftTitle}</h2>
            <div className="draft-actions">
              <button type="button" className="print-btn" onClick={handlePrint}>
                {t.print}
              </button>
              <button type="button" className="copy-btn" onClick={copyDraft}>
                {copied ? t.copied : t.copy}
              </button>
            </div>
          </div>
          <style>{`.draft-body .doc-para, .draft-body .doc-ground { text-align: justify; text-justify: inter-word; }`}</style>
          <p className="api-error" role="note">{t.reviewNotice}</p>
          <p className="edit-hint" style={{ fontSize: '0.85rem', opacity: 0.7, margin: '0 0 10px' }}>
            {t.editHint}
          </p>
          {isHtml ? (
            <div
              ref={draftRef}
              className={`draft-body doc ${isUrdu ? 'rtl' : 'ltr'}`}
              dir={isUrdu ? 'rtl' : 'ltr'}
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              style={{ cursor: 'text' }}
              dangerouslySetInnerHTML={{ __html: draft }}
            />
          ) : (
            <div
              ref={draftRef}
              className={`draft-body ${isUrdu ? 'rtl' : 'ltr'}`}
              dir={isUrdu ? 'rtl' : 'ltr'}
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              style={{ cursor: 'text' }}
              dangerouslySetInnerHTML={{ __html: escapeForEditable(draft) }}
            />
          )}
        </section>
      )}

    </div>
  )
}

export default DraftApp