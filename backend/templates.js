// LegalDraft.pk — legal templates
//
// Templates are HTML so we can center, bold, and underline.
// Formatting classes: doc-center, doc-bold, doc-underline (defined in the frontend CSS).
// Simple {{TOKENS}} are filled by code (exact). {{FACTS}} is filled by Claude.
//
// SINGULAR vs PLURAL PETITIONERS
// When there is more than one applicant, the document switches to plural forms
// (سائیلان / ملزمان) with correct verb agreement. To support that, a template entry can
// provide singular/plural pairs, chosen automatically by the server based on applicant count:
//   - titleWord: { singular, plural }  -> the "سائل/ملزم" vs "سائیلان/ملزمان" in the title  ({{PET_TITLE}})
//   - opening:   { singular, plural }  -> the intro + paragraph 1 block                     ({{OPENING}})
//   - prayer:    { singular, plural }  -> the closing استدعا line                            ({{PRAYER}})
//   - each ground may have `textPlural` (used only when there are multiple applicants;
//     grounds with no petitioner reference simply omit it and reuse `text`).
//
// GROUNDS ARE DATA (not hard-coded in the template).
// Each ground: { id, optional, default, tail, label, text, textPlural }
//   - optional: false  -> ALWAYS included (fixed boilerplate ground)
//   - optional: true   -> shown as a checkbox in the form; user can turn it off
//   - default: (optional grounds only) true = pre-ticked / on by default
//   - tail: true       -> stays at the very end (after any AI-added grounds),
//                         e.g. "ready to furnish surety" and "copy of FIR attached"
//   - label: { en, ur } -> short text shown next to the checkbox
//   - text / textPlural -> the Urdu clause (NO "(i)" prefix, NO <div> — the code adds those)
//
// The template contains {{OPENING}}, {{GROUNDS}} and {{PRAYER}} tokens. The server rebuilds
// the grounds numbering (i, ii, iii...) automatically, so there are never gaps.
//
// AI-added grounds are STANDARD for every document that has a grounds list: Claude may ADD
// case-specific grounds drawn from the user's brief facts, in the same style, only when the
// facts support a point the standard grounds don't already cover. That instruction lives in
// the server (DEFAULT_EXTRA_GROUNDS_INSTRUCTION). A template may override it with its own
// `extraGroundsInstruction`, but it never needs to.

const TEMPLATES = {
  'pre-arrest-bail': {
    ur: {
      complainantTerm: 'مستغیث',
      factsInstruction: `You are drafting the allegation clause for a pre-arrest bail application in a Pakistani Sessions Court. Write ONLY the short clause describing what the applicant/accused is alleged to have done. It will be inserted into the blank of this Urdu sentence: «سائل پر الزام ہے کہ ______ جو الزام سراسر غلط اور بے بنیاد ہے». It must read grammatically as the middle of that sentence, in formal court Urdu, and should usually be a single sentence.`,

      titleWord: { singular: 'سائل/ملزم', plural: 'سائیلان/ملزمان' },

      opening: {
        singular: `<div class="doc-para">جناب عالی! گزارش سائل حسب ذیل ہے:-</div>
<div class="doc-para">1۔ یہ کہ سائل مقدمہ عنوان بالا میں ملزم بیان ہوا ہے، سائل پر الزام ہے کہ {{FACTS}} جو الزام سراسر غلط اور بے بنیاد ہے اور وجوہات ضمانت سائل درج ذیل ہیں:-</div>`,
        plural: `<div class="doc-para">جناب عالی! گزارش سائیلان حسب ذیل ہے:-</div>
<div class="doc-para">1۔ یہ کہ سائیلان مقدمہ عنوان بالا میں ملزمان بیان ہوئے ہیں، سائیلان پر الزام ہے کہ {{FACTS}} جو الزام سراسر غلط اور بے بنیاد ہے اور وجوہاتِ ضمانت سائیلان درج ذیل ہیں:-</div>`,
      },

      prayer: {
        singular: `<div class="doc-para">اندریں حالات استدعا ہے کہ درخواست ضمانت قبل از گرفتاری سائل منظور فرمائی جاوے۔</div>`,
        plural: `<div class="doc-para">اندریں حالات استدعا ہے کہ درخواست ضمانت قبل از گرفتاری سائیلان منظور فرمائی جاوے۔</div>`,
      },

      grounds: [
        {
          id: 'innocent',
          optional: false,
          text: 'یہ کہ سائل مقدمہ عنوان بالا میں بے گناہ ہے۔',
          textPlural: 'یہ کہ سائیلان مقدمہ عنوان بالا میں بے گناہ ہیں۔',
        },
        {
          id: 'fir_delay',
          optional: true,
          default: true,
          label: { en: 'Delay in FIR registration', ur: 'FIR کے اندراج میں تاخیر' },
          text: 'یہ کہ FIR تاخیر سے درج کروائی گئی ہے جو تاخیر استغاثہ کی کہانی کو مشکوک اور After Thought بناتی ہے۔',
        },
        {
          id: 'story_concocted',
          optional: false,
          text: 'یہ کہ FIR کی کہانی سے جرم متذکرہ بالا کا نہ ہوناپایا جاتا ہے اور استغاثہ کی کہانی فرضی اور من گھڑت بنائی گئی ہے، سائل کا بیان کردہ وقوعہ سے کسی قسم کا کوئی تعلق واسطہ نہ ہے۔',
          textPlural: 'یہ کہ FIR کی کہانی سے جرم متذکرہ بالا کا نہ ہوناپایا جاتا ہے اور استغاثہ کی کہانی فرضی اور من گھڑت بنائی گئی ہے، سائیلان کا بیان کردہ وقوعہ سے کسی قسم کا کوئی تعلق واسطہ نہ ہے۔',
        },
        {
          id: 'witnesses_related',
          optional: true,
          default: true,
          label: { en: 'Witnesses are relatives of the complainant', ur: 'گواہان مستغیث کے رشتہ دار ہیں' },
          text: 'یہ کہ گواہان بیان کردہ استغاثہ مستغیث مقدمہ کے قریبی رشتہ دار ہیں اور مستغیث مقدمہ نے ہمراہ ملی بھگت گواہان من سائل کو بے بنیاد مقدمہ میں ملوث کیا ہے جس کا حقیقت سے کوئی تعلق و واسطہ نہ ہے۔',
          textPlural: 'یہ کہ گواہان بیان کردہ استغاثہ مستغیث مقدمہ کے قریبی رشتہ دار ہیں اور مستغیث مقدمہ نے ہمراہ ملی بھگت گواہان من سائیلان کو بے بنیاد مقدمہ میں ملوث کیا ہے جس کا حقیقت سے کوئی تعلق و واسطہ نہ ہے۔',
        },
        {
          id: 'personal_enmity',
          optional: true,
          default: true,
          label: { en: 'False implication due to personal enmity', ur: 'ذاتی مخالفت کی بنا پر جھوٹا ملوث کرنا' },
          text: 'یہ کہ سائل مقدمہ عنوان بالا میں بے گناہ ہے اور سائل کو محض ذاتی مخالفت کی بنیاد پر مقدمہ عنوان بالا میں ملوث کیا گیا ہے جس کا سائل سے کوئی تعلق و واسطہ نہ ہے۔',
          textPlural: 'یہ کہ سائیلان مقدمہ عنوان بالا میں بے گناہ ہیں اور سائیلان کو محض ذاتی مخالفت کی بنیاد پر مقدمہ عنوان بالا میں ملوث کیا گیا ہے جس کا سائیلان سے کوئی تعلق و واسطہ نہ ہے۔',
        },
        {
          id: 'further_inquiry_497',
          optional: false,
          text: 'یہ کہ سائل کے خلاف مقدمہ ہر لحاظ سے مزید انکوائری کا متقاضی ہے اور دفعہ 497 ض ف کی ممنوعہ کلاز میں نہ آتا ہے۔',
          textPlural: 'یہ کہ سائیلان کے خلاف مقدمہ ہر لحاظ سے مزید انکوائری کا متقاضی ہے اور دفعہ 497 ض ف کی ممنوعہ کلاز میں نہ آتا ہے۔',
        },
        {
          id: 'police_arrest_intent',
          optional: false,
          text: 'یہ کہ پولیس تھانہ {{POLICE_STATION}} ہمراہ ملی بھگت مستغیث سائل کو بے بنیاد مقدمہ میں گرفتار کرنے کے درپے ہے اس لیے درخواست ضمانت قبل از گرفتاری گزاری جا رہی ہے۔',
          textPlural: 'یہ کہ پولیس تھانہ {{POLICE_STATION}} ہمراہ ملی بھگت مستغیث سائیلان کو بے بنیاد مقدمہ میں گرفتار کرنے کے درپے ہے اس لیے درخواست ضمانت قبل از گرفتاری گزاری جا رہی ہے۔',
        },
        {
          id: 'no_conviction',
          optional: false,
          text: 'یہ کہ سائل عدم سزا یافتہ اور عدم ریکارڈ یافتہ ہے اور اعلیٰ عدالتوں کے فیصلہ کی روشنی میں قانونی اور واقعاتی ہر لحاظ سے ضمانت کا حقدار ہے۔',
          textPlural: 'یہ کہ سائیلان عدم سزا یافتہ اور عدم ریکارڈ یافتہ ہیں اور اعلیٰ عدالتوں کے فیصلہ کی روشنی میں قانونی اور واقعاتی ہر لحاظ سے ضمانت کے حقدار ہیں۔',
        },
        {
          id: 'attachments',
          optional: false,
          tail: true,
          text: 'یہ کہ عکسی نقل FIR و بیان حلفی لف ہے۔',
        },
      ],

      template: `<div class="doc-center doc-bold doc-court">{{COURT_LINE}}</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">بنام</div>
<div class="doc-center">{{RESPONDENTS}}</div>
<div class="doc-center">مقدمہ نمبر {{CASE_NUMBER}} مورخہ {{FIR_DATE}} بجرم {{OFFENCE_SECTIONS}} ت پ تھانہ {{POLICE_STATION}}</div>
<div class="doc-center doc-underline doc-title">درخواست ضمانت قبل از گرفتاری {{PET_TITLE}}</div>
{{OPENING}}
{{GROUNDS}}
{{PRAYER}}
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">بذریعہ کونسل</div>
<div class="doc-center doc-bold">{{ADVOCATE_NAME}}</div>`,
    },
  },

  'post-arrest-bail': {
    ur: {
      complainantTerm: 'مستغیث',
      factsInstruction: `You are drafting the allegation clause for a POST-arrest bail application (under Section 497 Cr.P.C.) in a Pakistani Sessions Court. The accused/applicant is already under arrest. Write ONLY the short clause describing what the applicant/accused is alleged to have done. It will be inserted into the blank of this Urdu sentence: «سائل پر الزام ہے کہ ______ جو الزام سراسر غلط اور بے بنیاد ہے». It must read grammatically as the middle of that sentence, in formal court Urdu, and should usually be a single sentence.`,

      titleWord: { singular: 'سائل/ملزم', plural: 'سائیلان/ملزمان' },

      opening: {
        singular: `<div class="doc-para">جناب عالی! گزارش سائل حسب ذیل ہے:-</div>
<div class="doc-para">1۔ یہ کہ سائل مقدمہ عنوان بالا میں ملزم بیان ہوا ہے جس میں سائل پر الزام ہے کہ {{FACTS}} جو الزام سراسر غلط اور بے بنیاد ہے اور وجوہات ضمانت سائل درج ذیل ہیں:-</div>`,
        plural: `<div class="doc-para">جناب عالی! گزارش سائیلان حسب ذیل ہے:-</div>
<div class="doc-para">1۔ یہ کہ سائیلان مقدمہ عنوان بالا میں ملزمان بیان ہوئے ہیں جن پر الزام ہے کہ {{FACTS}} جو الزام سراسر غلط اور بے بنیاد ہے اور وجوہاتِ ضمانت سائیلان درج ذیل ہیں:-</div>`,
      },

      prayer: {
        singular: `<div class="doc-para">اندریں حالات استدعا ہے کہ درخواست ضمانت سائل منظور فرمائی جاوے۔</div>`,
        plural: `<div class="doc-para">اندریں حالات استدعا ہے کہ درخواست ضمانت سائیلان منظور فرمائی جاوے۔</div>`,
      },

      grounds: [
        {
          id: 'innocent',
          optional: false,
          text: 'یہ کہ سائل بے گناہ ہے، سائل نے بیان کردہ جرم کا ارتکاب ہرگز نہ کیا ہے۔',
          textPlural: 'یہ کہ سائیلان بے گناہ ہیں، سائیلان نے بیان کردہ جرم کا ارتکاب ہرگز نہ کیا ہے۔',
        },
        {
          id: 'further_inquiry',
          optional: false,
          text: 'یہ کہ مقدمہ مندرجہ بالا ہر لحاظ سے مزید انکوائری کا متقاضی ہے۔',
        },
        {
          id: 'mala_fide',
          optional: true,
          default: true,
          label: { en: 'Mala fide — false FIR in connivance with police', ur: 'بدنیتی — پولیس سے ملی بھگت پر جھوٹا اندراج' },
          text: 'یہ کہ مقدمہ ھٰذا بدنیتی کی بنا پر مستغیث نے مقامی پولیس سے ملی بھگت کرتے ہوئے جھوٹا درج کرایا ہے۔',
        },
        {
          id: 'witnesses_related',
          optional: true,
          default: false,
          label: { en: 'Witnesses are relatives of the complainant', ur: 'گواہان مستغیث کے رشتہ دار ہیں' },
          text: 'یہ کہ گواہان بیان کردہ استغاثہ مستغیث مقدمہ کے قریبی رشتہ دار و ذی مفاد ہیں اور مستغیث مقدمہ نے ہمراہ ملی بھگت گواہان من سائل کو بے بنیاد مقدمہ میں ملوث کیا ہے۔',
          textPlural: 'یہ کہ گواہان بیان کردہ استغاثہ مستغیث مقدمہ کے قریبی رشتہ دار و ذی مفاد ہیں اور مستغیث مقدمہ نے ہمراہ ملی بھگت گواہان من سائیلان کو بے بنیاد مقدمہ میں ملوث کیا ہے۔',
        },
        {
          id: 'no_conviction',
          optional: false,
          text: 'یہ کہ سائل عدم سزا یافتہ/عدم ریکارڈ یافتہ ہے۔',
          textPlural: 'یہ کہ سائیلان عدم سزا یافتہ/عدم ریکارڈ یافتہ ہیں۔',
        },
        {
          id: 'not_prohibitory',
          optional: true,
          default: true,
          label: { en: 'Offence does not fall in the prohibitory clause', ur: 'جرم ممنوعہ کلاز میں نہیں آتا' },
          text: 'یہ کہ مقدمہ مندرجہ بالا کسی طرح بھی ممنوعہ کلاز میں Fall نہ کرتا ہے۔',
        },
        {
          id: 'fir_delay',
          optional: true,
          default: true,
          label: { en: 'Unexplained delay in FIR', ur: 'FIR کے اندراج میں غیر واضح تاخیر' },
          text: 'یہ کہ اندراج FIR میں unexplained delay ہے۔',
        },
        {
          id: 'no_recovery',
          optional: true,
          default: true,
          label: { en: 'No recovery from the accused', ur: 'سائل سے کوئی برآمدگی نہیں ہوئی' },
          text: 'یہ کہ سائل سے ہرگز کوئی برآمدگی نہ ہوئی ہے، اگر کوئی برآمدگی ظاہر کی گئی ہے تو فرضی ہے۔',
          textPlural: 'یہ کہ سائیلان سے ہرگز کوئی برآمدگی نہ ہوئی ہے، اگر کوئی برآمدگی ظاہر کی گئی ہے تو فرضی ہے۔',
        },
        {
          id: 'ready_surety',
          optional: false,
          tail: true,
          text: 'یہ کہ سائل حسب الحکم عدالت حضور ضمانت نامہ دینے کو تیار ہے اور ہرگز abscond نہیں کرے گا۔',
          textPlural: 'یہ کہ سائیلان حسب الحکم عدالت حضور ضمانت نامہ دینے کو تیار ہیں اور ہرگز abscond نہیں کریں گے۔',
        },
        {
          id: 'attachments',
          optional: false,
          tail: true,
          text: 'یہ کہ عکسی نقل FIR لف ہے۔',
        },
      ],

      template: `<div class="doc-center doc-bold doc-court">{{COURT_LINE}}</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">بنام</div>
<div class="doc-center">{{RESPONDENTS}}</div>
<div class="doc-center">مقدمہ نمبر {{CASE_NUMBER}} مورخہ {{FIR_DATE}} بجرم {{OFFENCE_SECTIONS}} ت پ تھانہ {{POLICE_STATION}}</div>
<div class="doc-center doc-underline doc-title">درخواست ضمانت بعد از گرفتاری {{PET_TITLE}}</div>
{{OPENING}}
{{GROUNDS}}
{{PRAYER}}
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">بذریعہ کونسل</div>
<div class="doc-center doc-bold">{{ADVOCATE_NAME}}</div>`,
    },
  },

  '22a-22b': {
    ur: {
      // 22A/22B is narrative-driven, but the body reads as NUMBERED «یہ کہ» points (like the
      // bail grounds), not one running paragraph. The AI returns the account as a list of points;
      // the engine numbers them (i, ii, iii...) and appends the fixed tail point(s) below.
      factsAsList: true,
      factsMaxTokens: 3072,

      // Fixed point(s) appended AFTER the AI-written points, numbered together with them.
      narrativeTail: ['یہ کہ ایک درخواست من سائل نے تھانہ {{POLICE_STATION}} میں گزاری مگر اس پر شنوائی نہ ہو سکی۔'],

      // Correct party framing for this document (overrides the bail-flavoured default).
      factsContext: `This is a petition u/s 22A/22B Cr.P.C. before the Ex-Officio Justice of Peace. Respondent No. 1 is the official the order is directed to (SHO/DPO/etc.), NOT an accused. The proposed accused (the persons the FIR should be registered against — «ملزمان») are the OTHER respondents; refer to them by the exact names given in the facts. The applicant («سائل») is the complainant/aggrieved person speaking in the first person.`,

      factsInstruction: `You are drafting the numbered factual grounds (متنِ درخواست) of a petition under Section 22A/22B Cr.P.C. before the Ex-Officio Justice of Peace (Sessions Court) in Pakistan, seeking a direction to register an FIR. Produce the account as a SEQUENCE OF SEPARATE POINTS — each ONE formal court-Urdu statement beginning with «یہ کہ» and ending with «۔», written in the FIRST PERSON as the applicant (سائل / «میں»), in the style of a real 22A/22B petition. Based ONLY on the facts provided, narrate in chronological order across the points: what happened, who is responsible (name the proposed accused «ملزمان» exactly as given), how the cognizable offence was committed, any eyewitnesses, and that a cognizable offence is clearly made out warranting registration of a case and a fair investigation. Do NOT include the cause-title, the «جنابِ عالی!» opening, the "approached the police" point, or the formal prayer — those are added separately.`,

      template: `<div class="doc-center doc-bold doc-court">{{COURT_LINE}}</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">بنام</div>
<div class="doc-center">{{RESPONDENTS}}</div>
<div class="doc-center doc-underline doc-title">درخواست زیر دفعہ 22A/22B ض ف بابت صدورِ حکم بنام مسئول علیہ نمبر 1 برائے اندراجِ مقدمہ بخلاف {{ACCUSED_WORD}} {{ACCUSED_NAMES}}</div>
{{MOBILE_LINE}}
<div class="doc-para">جنابِ عالی! گزارش سائل حسبِ ذیل ہے:-</div>
{{NARRATIVE}}
<div class="doc-para">بحالاتِ بالا استدعا ہے کہ من سائل کی درخواست زیر دفعہ 22A/22B ض ف منظور فرماتے ہوئے مسئول علیہ نمبر 1 کو {{ACCUSED_WORD}} کے خلاف اندراجِ مقدمہ کا حکم صادر فرمایا جائے۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-center doc-bold">العارض</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">بذریعہ کونسل</div>
<div class="doc-center doc-bold">{{ADVOCATE_NAME}}</div>`,
    },
  },

  '491': {
    ur: {
      // Narrative body (numbered «یہ کہ» points), like 22A. Petitioner role is GENDERED
      // (سائل / سائلہ) via {{PET_ROLE}}, driven by the Male/Female toggle in the form.
      factsAsList: true,
      factsMaxTokens: 3072,
      usesGender: true,

      // 491 is a Sessions-Court petition, NOT a writ petition (Article 199, High Court).
      // Belt-and-suspenders: convert any stray "رٹ پٹیشن" the AI writes into "درخواست".
      termFixes: [['رٹ پٹیشن', 'درخواست'], ['writ petition', 'petition']],

      factsContext: `This is a petition u/s 491 Cr.P.C. (habeas corpus) before the Sessions Court. Respondent No. 1 is the SHO — the official directed to recover the confined person(s) — NOT a detainer. The detainers (those illegally confining someone — «مسئول علیہان» / «الزام علیہان») are the OTHER respondents; refer to them by the names given. The confined person(s) to be recovered are the «محبوسان» (e.g. the minor children). The applicant is the petitioner (سائل / سائلہ) speaking in the first person. Refer to this filing as «درخواست ہذا» or «درخواست زیر دفعہ 491 ض ف» — it is NOT a «رٹ پٹیشن» (writ petition), which is a separate High Court remedy.`,

      factsInstruction: `You are drafting the numbered grounds (متنِ درخواست) of a petition under Section 491 Cr.P.C. (habeas corpus) before the Sessions Court in Pakistan, to recover person(s) held in illegal confinement (حبسِ بے جا) and hand them to the petitioner. Produce the account as a SEQUENCE OF SEPARATE POINTS — each ONE formal court-Urdu statement beginning with «یہ کہ» and ending with «۔», in the FIRST PERSON as the petitioner («من سائل / من سائلہ»). Refer to this filing only as «درخواست ہذا» or «درخواست زیر دفعہ 491 ض ف» — NEVER call it a «رٹ پٹیشن» (writ petition). Based ONLY on the facts provided, narrate: the petitioner's relationship to the confined person(s) («محبوسان»); how, when and by whom they were taken or detained (name the detainers exactly as given); that they are being held in illegal confinement with serious risk to their life and health; where they are being held; and that immediate recovery is warranted. Do NOT include the cause-title, the «جناب عالی!» opening, the "affidavit attached" point, or the prayer — those are added separately.`,

      narrativeTail: ['یہ کہ بیانِ حلفی لف ہے۔'],

      template: `<div class="doc-center doc-bold doc-court">{{COURT_LINE}}</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">({{PET_ROLE}})</div>
<div class="doc-center">بنام</div>
<div class="doc-center">{{RESPONDENTS}}</div>
<div class="doc-center">({{RESP_ROLE}})</div>
<div class="doc-center doc-underline doc-title">درخواست زیر دفعہ 491 ض ف بمراد بازیابی محبوسان {{DETAINEES}} ازاں حبسِ بے جا {{DETAINER_REF}} و حوالگیٔ {{PET_ROLE}} بوجوہاتِ ذیل۔</div>
<div class="doc-sep">،،،،،،،،،،،،،،،،،،،،،،،،،،،،،،،</div>
<div class="doc-para">جناب عالی! استدعا {{PET_ROLE}} حسبِ ذیل ہے:-</div>
{{NARRATIVE}}
<div class="doc-para">اندریں حالات استدعا ہے کہ مسئول علیہ نمبر 1 (ایس ایچ او تھانہ {{POLICE_STATION}}) کو حکم صادر فرمایا جائے کہ وہ محبوسان کو {{DETAINER_REF}} کی ناجائز تحویل سے بازیاب کر کے حوالہ {{PET_ROLE}} کرے۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-center doc-bold">عرضی نیاز</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">بذریعہ کونسل</div>
<div class="doc-center doc-bold">{{ADVOCATE_NAME}}</div>`,
    },
  },
  'harassment': {
    ur: {
      // Same forum/skeleton as 22A/22B, but the relief is RESTRAINT from illegal police
      // harassment, not registration of an FIR. Respondent No. 1 is the police official
      // (SHO/DPO/SDPO/IO); any further respondents are the private persons behind it.
      factsAsList: true,
      factsMaxTokens: 3072,
      usesGender: true,

      factsContext: `This is a petition u/s 22-A/22-B Cr.P.C. before the Ex-Officio Justice of Peace, seeking a direction that the police STOP harassing the petitioner — it does NOT seek registration of an FIR. Respondent No. 1 is the police official complained against (SHO / DPO / SDPO / Investigating Officer). Any FURTHER respondents are the private persons at whose instigation the police are acting; refer to them by the exact names given. The applicant is the petitioner (سائل / سائلہ) speaking in the first person. Refer to this filing as «درخواست ہذا» — never as a «رٹ پٹیشن».`,

      factsInstruction: `You are drafting the numbered grounds (متنِ درخواست) of a petition under Section 22-A/22-B Cr.P.C. before the Ex-Officio Justice of Peace (Sessions Court) in Pakistan, seeking a direction restraining the police from illegally harassing the petitioner. Produce the account as a SEQUENCE OF SEPARATE POINTS — each ONE formal court-Urdu statement beginning with «یہ کہ» and ending with «۔», in the FIRST PERSON as the petitioner («من سائل / من سائلہ»). Based ONLY on the facts provided, narrate: who the petitioner is and that they are a peaceful, law-abiding citizen; the acts of harassment complained of (illegal interference, threats of implication in a false case, raids on the house, being summoned to the police station without lawful cause); at whose instigation the police are acting, naming any private respondents; that no case is registered against the petitioner and the police have no lawful authority for this conduct; and that the harassment is causing serious apprehension to the petitioner's liberty, honour and reputation. Do NOT include the cause-title, the «جناب عالی!» opening, the "affidavit attached" point, or the prayer — those are added separately.`,

      narrativeTail: ['یہ کہ بیانِ حلفی لف ہے۔'],

      template: `<div class="doc-center doc-bold doc-court">{{COURT_LINE}}</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">({{PET_ROLE}})</div>
<div class="doc-center">بنام</div>
<div class="doc-center">{{RESPONDENTS}}</div>
<div class="doc-center">({{RESP_ROLE}})</div>
<div class="doc-center doc-underline doc-title">درخواست زیر دفعہ 22-A/22-B ض ف بابت صدورِ حکم بنام مسئول علیہ نمبر 1 بغرضِ عدم ہراسانی {{PET_ROLE}} بوجوہاتِ ذیل۔</div>
{{MOBILE_LINE}}
<div class="doc-para">جناب عالی! گزارش {{PET_ROLE}} حسبِ ذیل ہے:-</div>
{{NARRATIVE}}
<div class="doc-para">اندریں حالات استدعا ہے کہ درخواست ہذا منظور فرماتے ہوئے مسئول علیہ نمبر 1 کو حکم صادر فرمایا جائے کہ وہ {{PET_ROLE}} کو ناجائز طور پر ہراساں نہ کرے، بلاجوازِ قانونی تنگ نہ کرے اور نہ ہی کسی جھوٹے مقدمہ میں ملوث کرے۔{{INSTIGATION_CLAUSE}}</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-center doc-bold">العارض</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">بذریعہ کونسل</div>
<div class="doc-center doc-bold">{{ADVOCATE_NAME}}</div>`,
    },
  },
  'civil-appeal': {
    ur: {
      // First appeal against a judgment & decree, u/s 96 r/w Order 41 CPC. Parties are
      // appellants (ایپیلانٹس) vs respondents (ریسپانڈنٹس). The reference line names the
      // lower court and the decree date; the body is the numbered grounds of appeal.
      factsAsList: true,
      factsMaxTokens: 3072,

      // Guard: if the AI writes "فیصلہ و ڈگری", convert it to the correct "حکم و پرچہ ڈگری".
      impugnedTerm: 'حکم و پرچہ ڈگری',
      termFixes: [['فیصلہ و ڈگری', 'حکم و پرچہ ڈگری']],

      factsContext: `This is a civil appeal u/s 96 r/w Order 41 CPC before the District / Additional District Court, against the judgment and decree of a lower civil court. The parties are the appellants (ایپیلانٹس) and the respondents (ریسپانڈنٹس). Refer to this filing as «اپیل ہذا».`,

      factsInstruction: `You are drafting the numbered grounds of a CIVIL APPEAL under Section 96 r/w Order 41 CPC before the District / Additional District Court in Pakistan, against the decision of a lower civil court. Refer to the impugned decision throughout as «حکم و پرچہ ڈگری مورخہ [the date given]» — cite it by its date, NEVER as «فیصلہ و ڈگری ہذا» or merely «ہذا». Produce the body as a SEQUENCE OF SEPARATE POINTS — each ONE formal court-Urdu statement beginning with «یہ کہ» and ending with «۔», in the appellants' voice. Based ONLY on the facts provided: FIRST state briefly what the appellants' suit was and that the lower court dismissed/decided it by the impugned decision; THEN give the GROUNDS OF APPEAL — the standard appellate grounds phrased for this case, for example: the decision is against the law, facts and record (خلافِ قانون و واقعات، خلافِ ریکارڈ); the evidence of the parties was mis-read and non-read (mis-reading / non-reading); the lower court failed to properly appraise the evidence under the Qanun-e-Shahadat Order 1984; the findings on the issues are the result of mis-appreciation of evidence; documentary/revenue-record evidence was wrongly subordinated to oral evidence; the binding principles laid down by the Supreme Court and High Courts were disregarded; and any case-specific defect evident from the facts. Do NOT include the cause-title, the impugned-decision reference line, the «جنابِ عالی!» opening, the "within time" point, the "copies attached" point, or the final prayer — those are added separately.`,

      narrativeTail: [
        'یہ کہ اپیل ہذا ہر لحاظ سے اندرِ معیاد ہے۔',
        'یہ کہ نقلِ {{IMPUGNED}} لفِ اپیل ہذا ہیں۔',
      ],

      template: `<div class="doc-center doc-bold doc-court">{{COURT_LINE}}</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">({{APPELLANT_ROLE}})</div>
<div class="doc-center">بنام</div>
<div class="doc-center">{{RESPONDENTS}}</div>
<div class="doc-center">({{RESPONDENT_ROLE}})</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-para">اپیل زیر دفعہ 96 r/w آرڈر 41 ضابطہ دیوانی بر خلاف {{IMPUGNED}} مصدرہ بعدالت {{LOWER_COURT}}۔ جس کی رُو سے صاحب موصوف نے دعویٰ {{APPELLANT_ROLE}} {{SUIT_DESC}} بر خلاف ریسپانڈنٹس {{OUTCOME}} جو {{IMPUGNED}} فاضل عدالتِ تحت صریحاً غلط، خلافِ قانون و واقعات، خلافِ ریکارڈ اور شہادتِ فریقین کی non-reading اور mis-reading پر مبنی ہونے کے باعث قابلِ منسوخی ہے۔ فاضل عدالتِ تحت نہ صرف قانونِ شہادت آرڈر 1984 کے آرٹیکلز کے تابع شہادتِ فریقین کی درست appraisal میں ناکام رہی ہے بلکہ فیصلہ آنریبل سپریم کورٹ آف پاکستان اور ہائی کورٹس کے متعین کردہ اصولوں اور guidelines سے متصادم، برعکس اور منافی ہے، نیز قانون کی واضح provisions کی misconception پر مبنی ہونے کی وجہ سے ہرگز قابلِ بحالی نہ ہے بلکہ قابلِ منسوخی ہے۔</div>
<div class="doc-para">استدعا ہے کہ بحکمِ منظوریٔ اپیل، منسوخیٔ {{IMPUGNED}} و ڈگری فرمائے جانے دعویٰ {{APPELLANT_ROLE}} ہو، بوجوہاتِ ذیل۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-para">جنابِ عالی! استدعا {{APPELLANT_ROLE}} حسبِ ذیل ہے:-</div>
{{NARRATIVE}}
<div class="doc-para">اندریں حالات استدعا ہے کہ اپیل ہذا منظور فرما کر {{IMPUGNED}} منسوخ فرمایا جائے اور دعویٰ {{APPELLANT_ROLE}} ڈگری فرمایا جائے۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-center doc-bold">عرضی نیاز</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">بذریعہ کونسل</div>
<div class="doc-center doc-bold">{{ADVOCATE_NAME}}</div>`,
    },
  },
  'family-appeal': {
    ur: {
      // Appeal u/s 14 of the (West Pakistan) Family Courts Act 1964 against a Family Court
      // decision (maintenance, dower, dowry, custody, dissolution). This specimen spells the
      // roles اپیلانٹ / ریسپانڈنٹ (the civil appeal uses ایپیلانٹس), so the words are set here.
      factsAsList: true,
      factsMaxTokens: 3072,

      roleWords: {
        appellantSingular: 'اپیلانٹ',
        appellantPlural: 'اپیلانٹس',
        respondentSingular: 'ریسپانڈنٹ',
        respondentPlural: 'ریسپانڈنٹس',
      },

      // A family court passes a judgment and decree — this specimen's wording.
      impugnedTerm: 'فیصلہ و ڈگری',

      factsContext: `This is a family appeal u/s 14 of the Family Courts Act 1964 before the District / Additional District Court, against the judgment and decree of a Family Court. The parties are the appellant (اپیلانٹ) and the respondent (ریسپانڈنٹ). The subject is a family claim — maintenance (نان و نفقہ), dower (حق مہر), dowry articles (جہیز), custody (حضانت) or dissolution of marriage. Refer to this filing as «اپیل ہذا».`,

      factsInstruction: `You are drafting the numbered grounds of a FAMILY APPEAL under Section 14 of the Family Courts Act 1964 before the District / Additional District Court in Pakistan, against the judgment and decree of a Family Court. Produce the body as a SEQUENCE OF SEPARATE POINTS — each ONE formal court-Urdu statement beginning with «یہ کہ» and ending with «۔», referring to the appellant in the third person as «اپیلانٹ». Based ONLY on the facts provided: FIRST state briefly what the appellant's claim was, that it remained pending before the lower court, and what the impugned judgment & decree did with it; THEN give the GROUNDS OF APPEAL phrased for this case, for example: the judgment & decree is plainly wrong, against the law, facts, procedure and family law (خلافِ قانون و واقعات، خلافِ ضابطہ و خلافِ فیملی لاء); the lower court's findings are wrong and based on mere conjecture and surmises (قیاس آرائی و مفروضہ جات); the appellant's stance on record was ignored; the respondent's evidence was inconsistent, contradictory and self-destructive but was not properly appreciated, amounting to mis-reading and non-reading of evidence; the court decided the case in a slipshod manner; and any case-specific defect evident from the facts. Do NOT include the cause-title, the reference line, the «جناب عالی!» opening, the "within time" point, the "copy attached" point, or the final prayer — those are added separately.`,

      narrativeTail: [
        'یہ کہ اپیل ہذا اندر میعاد ہے۔',
        'یہ کہ نقلِ فیصلہ و ڈگری لفِ اپیل ہذا ہے۔',
      ],

      template: `<div class="doc-center doc-bold doc-court">{{COURT_LINE}}</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">({{APPELLANT_ROLE}})</div>
<div class="doc-center">بنام</div>
<div class="doc-center">{{RESPONDENTS}}</div>
<div class="doc-center">({{RESPONDENT_ROLE}})</div>
<div class="doc-para">اپیل زیر دفعہ 14 فیملی کورٹ ایکٹ 1964 بر خلاف فیصلہ و ڈگری مورخہ {{JUDGMENT_DATE}} مصدرہ بعدالت {{LOWER_COURT}} جس کی رُو سے صاحب موصوف نے {{APPELLANT_ROLE}} کا دعویٰ {{SUIT_DESC}} {{OUTCOME}}، جو فیصلہ و ڈگری فاضل عدالتِ تحت صریحاً خلافِ قانون، خلافِ واقعات، خلافِ ضابطہ اور خلافِ ریکارڈ اور شہادتِ فریقین کی mis-reading اور non-reading پر مبنی ہے اور قانون و انصاف کے مروج قواعد اور مسلمہ ضوابط کی رُو سے فیصلہ زیرِ اپیل محض قیاس آرائی و مفروضہ جات پر مبنی اور slipshod انداز میں صادر ہونے کے باعث ہرگز قابلِ بحالی نہ ہے بلکہ قابلِ منسوخی ہے۔</div>
<div class="doc-para">استدعا: بمعہ منظوریٔ اپیل و منسوخیٔ فیصلہ و ڈگری زیرِ اپیل و ڈگری فرمائے جانے دعویٰ {{SUIT_DESC}} بر خلاف {{RESPONDENT_ROLE}} معہ دیگر دادرسی قرینِ انصاف عدالت جناب۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-para">جناب عالی! {{APPELLANT_ROLE}} حسبِ ذیل مستدعی ہے:-</div>
{{NARRATIVE}}
<div class="doc-para">اندریں حالات استدعا ہے کہ اپیل ہذا منظور فرما کر فیصلہ و ڈگری زیرِ اپیل منسوخ فرمایا جائے اور {{APPELLANT_ROLE}} کا دعویٰ {{SUIT_DESC}} ڈگری فرمایا جائے، معہ دیگر دادرسی قرینِ انصاف عدالت جناب۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-center doc-bold">عرضی نیاز</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">بذریعہ کونسل</div>
<div class="doc-center doc-bold">{{ADVOCATE_NAME}}</div>`,
    },
  },
  'criminal-appeal': {
    ur: {
      // Appeal to the Court of Session against a conviction and sentence passed by a
      // Magistrate. Unlike the civil/family appeals, the reference line carries the FIR
      // particulars, and the prayer seeks ACQUITTAL (with a fallback of sentence reduction).
      factsAsList: true,
      factsMaxTokens: 3072,

      roleWords: {
        appellantSingular: 'اپیلانٹ',
        appellantPlural: 'اپیلانٹس',
        respondentSingular: 'ریسپانڈنٹ',
        respondentPlural: 'ریسپانڈنٹس',
      },

      // Criminal appeals are against a conviction, so the default reads as a sentence.
      outcomeDefault: 'مجرم قرار دے کر سزا سنائی',

      // Two postures. 'conviction' (the default) uses the base template below — the convict
      // appeals and asks for acquittal. 'acquittal' is the mirror image: the complainant
      // appeals u/s 417(2A) and asks for the acquittal to be SET ASIDE, never for anyone's
      // acquittal. Where the acquittal was passed u/s 249-A / 265-K before evidence, the
      // content-awareness rule strips every evidence-based ground automatically.
      defaultVariant: 'conviction',
      variants: {
        conviction: {},
        acquittal: {
          outcomeDefault: 'بری قرار دیا',
          impugnedTerm: 'حکمِ بریت',
          termFixes: [['حکم و پرچہ ڈگری', 'حکمِ بریت'], ['پرچہ ڈگری', 'حکمِ بریت'], ['فیصلہ و ڈگری', 'حکمِ بریت']],
          factsContext: `This is a criminal appeal AGAINST AN ACQUITTAL, filed by the aggrieved complainant before the Court of Session u/s 417(2A) Cr.P.C. The appellant (اپیلانٹ) is the complainant («مستغیث»); the respondents are the ACQUITTED ACCUSED, with the State normally arrayed as well. The appellant seeks to have the acquittal SET ASIDE — never plead for the acquittal of anyone. Use criminal terminology: مستغیث for the complainant, never مدعی / مدعا علیہ.`,
          factsInstruction: `You are drafting the numbered grounds of a criminal appeal AGAINST AN ORDER OF ACQUITTAL before the Court of Session in Pakistan (s.417(2A) Cr.P.C.), filed by the aggrieved complainant. Produce the body as a SEQUENCE OF SEPARATE POINTS — each ONE formal court-Urdu statement beginning with «یہ کہ» and ending with «۔», referring to the appellant in the third person as «اپیلانٹ». Based ONLY on the facts provided: FIRST state the case (FIR and offence), the proceedings before the lower court, and that the impugned order acquitted the respondent(s); THEN give grounds appropriate to WHAT ACTUALLY HAPPENED. If the acquittal was passed at a PRELIMINARY stage — u/s 249-A or 265-K Cr.P.C., before the prosecution evidence was recorded — the grounds must rest on: that the acquittal was premature and passed without affording the prosecution any opportunity to lead its evidence; that the power u/s 249-A / 265-K may be exercised only where the charge is groundless and there is no probability of conviction, not to short-circuit a triable case; that the lower court resolved disputed questions of fact which could only be decided after recording evidence; and that the order is against the law and the record. In that situation you must NOT plead mis-reading or non-reading of evidence, contradictions between witnesses, medical evidence, or appreciation of evidence — no evidence existed. If instead the acquittal followed a full trial, plead the usual grounds: mis-reading and non-reading of the prosecution evidence, findings against the record, and failure to appreciate the evidence in its true perspective. Do NOT include the cause-title, the reference line, the «جناب عالی!» opening, the "within time" point, the "copy attached" point, or the final prayer — those are added separately.`,
          template: `<div class="doc-center doc-bold doc-court">{{COURT_LINE}}</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">({{APPELLANT_ROLE}})</div>
<div class="doc-center">بنام</div>
<div class="doc-center">{{RESPONDENTS}}</div>
<div class="doc-center">({{RESPONDENT_ROLE}})</div>
<div class="doc-para">اپیل زیر دفعہ 417(2A) ض ف بر خلاف حکمِ بریت مورخہ {{JUDGMENT_DATE}} مصدرہ بعدالت {{LOWER_COURT}}، در مقدمہ نمبر {{CASE_NUMBER}} مورخہ {{FIR_DATE}} بجرم {{OFFENCE_SECTIONS}} تھانہ {{POLICE_STATION}}، جس کی رُو سے صاحب موصوف نے {{RESPONDENT_ROLE}} کو {{OUTCOME}}، جو حکمِ بریت فاضل عدالتِ تحت صریحاً غلط، خلافِ قانون و واقعات اور خلافِ ریکارڈ ہونے کے باعث قابلِ منسوخی ہے۔</div>
<div class="doc-para">استدعا: بمعہ منظوریٔ اپیل و منسوخیٔ حکمِ بریت زیرِ اپیل، مقدمہ ہذا کی قانون کے مطابق سماعت و فیصلہ فرمائے جانے، معہ دیگر دادرسی قرینِ انصاف عدالت جناب۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-para">جناب عالی! {{APPELLANT_ROLE}} حسبِ ذیل مستدعی ہے:-</div>
{{NARRATIVE}}
<div class="doc-para">اندریں حالات استدعا ہے کہ اپیل ہذا منظور فرما کر حکمِ بریت زیرِ اپیل منسوخ فرمایا جائے اور مقدمہ ہذا کی قانون کے مطابق سماعت کے لیے فاضل عدالتِ تحت کو ریمانڈ فرمایا جائے، معہ دیگر دادرسی قرینِ انصاف عدالت جناب۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-center doc-bold">عرضی نیاز</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">بذریعہ کونسل</div>
<div class="doc-center doc-bold">{{ADVOCATE_NAME}}</div>`,
        },
      },

      // A criminal court passes a JUDGMENT and SENTENCE — there is no decree/decree-sheet.
      impugnedTerm: 'فیصلہ',
      termFixes: [['حکم و پرچہ ڈگری', 'فیصلہ'], ['فیصلہ و پرچہ ڈگری', 'فیصلہ'], ['پرچہ ڈگری', 'فیصلہ'], ['فیصلہ و ڈگری', 'فیصلہ']],

      factsContext: `This is a criminal appeal to the Court of Session against a conviction and sentence recorded by a Magistrate. The appellant (اپیلانٹ) is the convict; the respondent is normally the State (سرکار), often through the District Public Prosecutor, with the complainant (مستغیث) arrayed as a further respondent. Refer to this filing as «اپیل ہذا». Use criminal terminology: مستغیث for the complainant — never the civil words مدعی / مدعا علیہ.`,

      complainantTerm: 'مستغیث',

      factsInstruction: `You are drafting the numbered grounds of a CRIMINAL APPEAL to the Court of Session in Pakistan, against the conviction and sentence recorded by a Magistrate. Produce the body as a SEQUENCE OF SEPARATE POINTS — each ONE formal court-Urdu statement beginning with «یہ کہ» and ending with «۔», referring to the appellant in the third person as «اپیلانٹ». Based ONLY on the facts provided: FIRST state briefly the case (FIR and offence), that the trial was held before the lower court, and what the impugned judgment did — convicting the appellant and awarding the sentence; THEN give the GROUNDS OF APPEAL phrased for this case, drawing on the standard criminal appellate grounds: the prosecution wholly failed to prove its case beyond reasonable doubt; the judgment is against the law, facts and record; the evidence was mis-read and non-read (mis-reading / non-reading); material contradictions and discrepancies in the prosecution witnesses were ignored; the witnesses are interested, related and inimical («مفاد پرست، رشتہ دار و مخالف») and remained unsupported by any independent witness; unexplained delay in lodging the FIR and in recording statements u/s 161 Cr.P.C.; the recovery is planted and not supported by independent witnesses; the medical evidence is inconsistent with the ocular account; motive was alleged but not proved; the defence plea and defence evidence were not considered; the benefit of every reasonable doubt must go to the accused as a matter of right, not grace; and any case-specific defect evident from the facts. Where the facts suggest it, also plead in the alternative that the sentence is harsh and excessive and merits reduction. Do NOT include the cause-title, the reference line, the «جناب عالی!» opening, the "within time" point, the "copy attached" point, or the final prayer — those are added separately.`,

      narrativeTail: [
        'یہ کہ اپیل ہذا اندرِ معیاد ہے۔',
        'یہ کہ نقلِ فیصلہ زیرِ اپیل لفِ اپیل ہذا ہے۔',
      ],

      template: `<div class="doc-center doc-bold doc-court">{{COURT_LINE}}</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">({{APPELLANT_ROLE}})</div>
<div class="doc-center">بنام</div>
<div class="doc-center">{{RESPONDENTS}}</div>
<div class="doc-center">({{RESPONDENT_ROLE}})</div>
<div class="doc-para">اپیل زیر دفعہ 410 ض ف بر خلاف فیصلہ مورخہ {{JUDGMENT_DATE}} مصدرہ بعدالت {{LOWER_COURT}}، در مقدمہ نمبر {{CASE_NUMBER}} مورخہ {{FIR_DATE}} بجرم {{OFFENCE_SECTIONS}} تھانہ {{POLICE_STATION}}، جس کی رُو سے صاحب موصوف نے {{APPELLANT_ROLE}} کو {{OUTCOME}}، جو فیصلہ فاضل عدالتِ تحت صریحاً غلط، خلافِ قانون و واقعات اور خلافِ ریکارڈ ہونے کے باعث قابلِ منسوخی ہے۔</div>
<div class="doc-para">استدعا: بمعہ منظوریٔ اپیل و منسوخیٔ فیصلہ و سزا زیرِ اپیل، {{APPELLANT_ROLE}} کو بری فرمائے جانے، معہ دیگر دادرسی قرینِ انصاف عدالت جناب۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-para">جناب عالی! {{APPELLANT_ROLE}} حسبِ ذیل مستدعی ہے:-</div>
{{NARRATIVE}}
<div class="doc-para">اندریں حالات استدعا ہے کہ اپیل ہذا منظور فرما کر فیصلہ و سزا زیرِ اپیل منسوخ فرمایا جائے اور {{APPELLANT_ROLE}} کو الزامِ ہذا سے بری فرمایا جائے، معہ دیگر دادرسی قرینِ انصاف عدالت جناب۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-center doc-bold">عرضی نیاز</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">بذریعہ کونسل</div>
<div class="doc-center doc-bold">{{ADVOCATE_NAME}}</div>`,
    },
  },
  'rent-appeal': {
    ur: {
      // Appeal against an order of the Rent Tribunal. Heard on the civil side (District /
      // Additional District Judge as appellate authority). The Tribunal passes an ORDER, not a
      // decree — so impugnedTerm is حکم and the decree words are guarded against.
      side: 'civil',
      factsAsList: true,
      factsMaxTokens: 3072,

      roleWords: {
        appellantSingular: 'اپیلانٹ',
        appellantPlural: 'اپیلانٹس',
        respondentSingular: 'ریسپانڈنٹ',
        respondentPlural: 'ریسپانڈنٹس',
      },

      impugnedTerm: 'حکم',
      termFixes: [['حکم و پرچہ ڈگری', 'حکم'], ['پرچہ ڈگری', 'حکم'], ['فیصلہ و ڈگری', 'حکم']],

      narrativeTail: [
        'یہ کہ اپیل ہذا اندرِ معیاد ہے۔',
        'یہ کہ نقلِ حکم زیرِ اپیل لفِ اپیل ہذا ہے۔',
      ],

      // Two postures — the relief is the mirror image of each other, so they must not share
      // a prayer. Which grounds are pleaded is left to the facts (content-awareness rule).
      defaultVariant: 'landlord',
      variants: {
        // (a) Landlord appeals: the ejectment petition was dismissed; he wants ejectment.
        landlord: {
          outcomeDefault: 'درخواستِ بےدخلی خارج فرمائی',
          factsContext: `This is an appeal against an order of the Rent Tribunal under the Punjab Rented Premises Act 2009, heard by the District / Additional District Judge. The appellant (اپیلانٹ) is the LANDLORD («مالکِ مکان») whose ejectment petition was dismissed; the respondent (ریسپانڈنٹ) is the TENANT («کرایہ دار»). The appellant seeks ejectment of the tenant — never plead for the tenant to be allowed to remain. The Rent Tribunal passes an ORDER («حکم»), not a decree.`,
          factsInstruction: `You are drafting the numbered grounds of an appeal against an order of the Rent Tribunal (Punjab Rented Premises Act 2009), filed by the LANDLORD before the District / Additional District Judge. Produce the body as a SEQUENCE OF SEPARATE POINTS — each ONE formal court-Urdu statement beginning with «یہ کہ» and ending with «۔», referring to the appellant in the third person as «اپیلانٹ». Based ONLY on the facts provided: FIRST state the relationship of landlord and tenant, the premises and the rent, what the appellant's petition before the Rent Tribunal sought, and what the impugned order did with it; THEN give the GROUNDS appropriate to what actually happened, drawn from: the order is against the law, facts and record; the relationship of landlord and tenant and the appellant's ownership stood admitted or proved but were wrongly held otherwise; the grounds of ejectment pleaded (default in payment of rent, personal bona fide requirement, expiry or breach of the tenancy agreement, subletting without consent, material alteration, or the premises being unfit) were established but ignored; the tenant's defence was accepted without proof; the Tribunal misconstrued the Act; and any case-specific defect evident from the facts. Do NOT include the cause-title, the reference line, the «جناب عالی!» opening, the "within time" point, the "copy attached" point, or the final prayer — those are added separately.`,
          template: `<div class="doc-center doc-bold doc-court">{{COURT_LINE}}</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">({{APPELLANT_ROLE}})</div>
<div class="doc-center">بنام</div>
<div class="doc-center">{{RESPONDENTS}}</div>
<div class="doc-center">({{RESPONDENT_ROLE}})</div>
<div class="doc-para">اپیل زیر دفعہ 31 پنجاب رینٹڈ پریمسز ایکٹ 2009 بر خلاف حکم مورخہ {{JUDGMENT_DATE}} مصدرہ بعدالت {{LOWER_COURT}}، در {{SUIT_DESC}}، جس کی رُو سے صاحب موصوف نے {{OUTCOME}}، جو حکم فاضل عدالتِ تحت صریحاً غلط، خلافِ قانون و واقعات اور خلافِ ریکارڈ ہونے کے باعث قابلِ منسوخی ہے۔</div>
<div class="doc-para">استدعا: بمعہ منظوریٔ اپیل و منسوخیٔ حکم زیرِ اپیل، درخواستِ بےدخلی منظور فرمائے جانے و {{RESPONDENT_ROLE}} کو مکان/دکان متنازعہ سے بےدخل فرمائے جانے، معہ دیگر دادرسی قرینِ انصاف عدالت جناب۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-para">جناب عالی! {{APPELLANT_ROLE}} حسبِ ذیل مستدعی ہے:-</div>
{{NARRATIVE}}
<div class="doc-para">اندریں حالات استدعا ہے کہ اپیل ہذا منظور فرما کر حکم زیرِ اپیل منسوخ فرمایا جائے اور {{APPELLANT_ROLE}} کی درخواستِ بےدخلی منظور فرماتے ہوئے {{RESPONDENT_ROLE}} کو بےدخل فرمایا جائے، معہ دیگر دادرسی قرینِ انصاف عدالت جناب۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-center doc-bold">عرضی نیاز</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">بذریعہ کونسل</div>
<div class="doc-center doc-bold">{{ADVOCATE_NAME}}</div>`,
        },

        // (b) Tenant appeals: an ejectment order was passed; he wants it set aside.
        tenant: {
          outcomeDefault: 'درخواستِ بےدخلی منظور فرمائی',
          factsContext: `This is an appeal against an order of the Rent Tribunal under the Punjab Rented Premises Act 2009, heard by the District / Additional District Judge. The appellant (اپیلانٹ) is the TENANT («کرایہ دار») against whom an ejectment order was passed; the respondent (ریسپانڈنٹ) is the LANDLORD («مالکِ مکان»). The appellant seeks to have the ejectment order SET ASIDE and the ejectment petition dismissed — never plead for the tenant's ejectment. The Rent Tribunal passes an ORDER («حکم»), not a decree.`,
          factsInstruction: `You are drafting the numbered grounds of an appeal against an order of the Rent Tribunal (Punjab Rented Premises Act 2009), filed by the TENANT before the District / Additional District Judge. Produce the body as a SEQUENCE OF SEPARATE POINTS — each ONE formal court-Urdu statement beginning with «یہ کہ» and ending with «۔», referring to the appellant in the third person as «اپیلانٹ». Based ONLY on the facts provided: FIRST state the tenancy, the premises and the rent, what the landlord's petition sought, and that the impugned order directed the appellant's ejectment; THEN give the GROUNDS appropriate to what actually happened, drawn from: the order is against the law, facts and record; no ground of ejectment was made out or proved; rent was regularly paid or duly tendered/deposited and there was no wilful default; the plea of personal bona fide need is mala fide, a device to re-let at a higher rent, or unsupported by proof; the alleged breach of the tenancy agreement, subletting or material alteration was neither pleaded properly nor proved; the appellant was condemned without a fair opportunity of hearing or of leading evidence; the Tribunal misconstrued the Act; and any case-specific defect evident from the facts. Do NOT include the cause-title, the reference line, the «جناب عالی!» opening, the "within time" point, the "copy attached" point, or the final prayer — those are added separately.`,
          template: `<div class="doc-center doc-bold doc-court">{{COURT_LINE}}</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">({{APPELLANT_ROLE}})</div>
<div class="doc-center">بنام</div>
<div class="doc-center">{{RESPONDENTS}}</div>
<div class="doc-center">({{RESPONDENT_ROLE}})</div>
<div class="doc-para">اپیل زیر دفعہ 31 پنجاب رینٹڈ پریمسز ایکٹ 2009 بر خلاف حکم مورخہ {{JUDGMENT_DATE}} مصدرہ بعدالت {{LOWER_COURT}}، در {{SUIT_DESC}}، جس کی رُو سے صاحب موصوف نے {{OUTCOME}}، جو حکم فاضل عدالتِ تحت صریحاً غلط، خلافِ قانون و واقعات اور خلافِ ریکارڈ ہونے کے باعث قابلِ منسوخی ہے۔</div>
<div class="doc-para">استدعا: بمعہ منظوریٔ اپیل و منسوخیٔ حکم زیرِ اپیل، درخواستِ بےدخلی خارج فرمائے جانے، معہ دیگر دادرسی قرینِ انصاف عدالت جناب۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-para">جناب عالی! {{APPELLANT_ROLE}} حسبِ ذیل مستدعی ہے:-</div>
{{NARRATIVE}}
<div class="doc-para">اندریں حالات استدعا ہے کہ اپیل ہذا منظور فرما کر حکم زیرِ اپیل منسوخ فرمایا جائے اور {{RESPONDENT_ROLE}} کی درخواستِ بےدخلی خارج فرمائی جائے، معہ دیگر دادرسی قرینِ انصاف عدالت جناب۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-center doc-bold">عرضی نیاز</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">بذریعہ کونسل</div>
<div class="doc-center doc-bold">{{ADVOCATE_NAME}}</div>`,
        },
      },

      template: `<div class="doc-center doc-bold doc-court">{{COURT_LINE}}</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">({{APPELLANT_ROLE}})</div>
<div class="doc-center">بنام</div>
<div class="doc-center">{{RESPONDENTS}}</div>
<div class="doc-center">({{RESPONDENT_ROLE}})</div>
<div class="doc-para">اپیل زیر دفعہ 31 پنجاب رینٹڈ پریمسز ایکٹ 2009 بر خلاف حکم مورخہ {{JUDGMENT_DATE}} مصدرہ بعدالت {{LOWER_COURT}}، در {{SUIT_DESC}}۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-para">جناب عالی! {{APPELLANT_ROLE}} حسبِ ذیل مستدعی ہے:-</div>
{{NARRATIVE}}
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-center doc-bold">عرضی نیاز</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">بذریعہ کونسل</div>
<div class="doc-center doc-bold">{{ADVOCATE_NAME}}</div>`,
    },
  },
  'civil-revision': {
    ur: {
      // Revision u/s 115 CPC against an ORDER (usually interlocutory) of a subordinate civil
      // court. Parties are پٹیشنرز / ریسپانڈنٹس. A revision is NOT a second appeal: the test is
      // jurisdictional — jurisdiction not vested, jurisdiction not exercised, or illegality /
      // material irregularity in its exercise. Evidence is not re-appraised.
      side: 'civil',
      factsAsList: true,
      factsMaxTokens: 3072,

      roleWords: {
        appellantSingular: 'پٹیشنر',
        appellantPlural: 'پٹیشنرز',
        respondentSingular: 'ریسپانڈنٹ',
        respondentPlural: 'ریسپانڈنٹس',
      },

      impugnedTerm: 'حکم',
      termFixes: [['حکم و پرچہ ڈگری', 'حکم'], ['پرچہ ڈگری', 'حکم'], ['فیصلہ و ڈگری', 'حکم']],
      outcomeDefault: 'درخواستِ پٹیشنرز خارج فرمائی',

      factsContext: `This is a civil revision u/s 115 CPC before the District / Additional District Judge, against an order (usually interlocutory) of a subordinate civil court. The parties are the petitioners (پٹیشنرز) and the respondents (ریسپانڈنٹس) — NOT appellants. The impugned decision is an ORDER («حکم زیرِ نگرانی»), not a judgment or decree. Refer to this filing as «نگرانی ہذا».`,

      factsInstruction: `You are drafting the numbered grounds of a CIVIL REVISION under Section 115 CPC before the District / Additional District Judge in Pakistan, against an order of a subordinate civil court. Produce the body as a SEQUENCE OF SEPARATE POINTS — each ONE formal court-Urdu statement beginning with «یہ کہ» and ending with «۔», referring to the moving party in the third person as «پٹیشنرز» (or «پٹیشنر» if one). Based ONLY on the facts provided: FIRST state what proceedings were pending before the lower court and exactly what the impugned order did; THEN give the GROUNDS OF REVISION. CRITICAL — a revision is NOT a second appeal: the grounds must be JURISDICTIONAL in character, drawn from the s.115 CPC test — that the lower court exercised a jurisdiction not vested in it by law, or failed to exercise a jurisdiction so vested, or acted illegally or with material irregularity in the exercise of its jurisdiction. Phrase them for this case, for example: the order is against the law, facts, procedure and the requirements of natural justice; it is illegal and irregular; the court did not properly exercise the jurisdiction it had; the order is contrary to the settled rules of law and justice and results from a misconstruction of the Code of Civil Procedure; the petitioners were condemned without a fair opportunity; the mandatory provisions of the CPC were disregarded; and any case-specific defect evident from the facts. Do NOT re-argue the merits of the evidence or plead mis-reading / non-reading / appraisal of evidence as if this were an appeal, unless the facts show the court decided a matter it had no power to decide. Do NOT include the cause-title, the reference line, the «جناب عالی!» opening, the "within time" point, the "copy attached" point, or the final prayer — those are added separately.`,

      narrativeTail: [
        'یہ کہ نگرانی ہذا ہر لحاظ سے اندرِ معیاد ہے۔',
        'یہ کہ نقلِ حکم زیرِ نگرانی لفِ نگرانی ہذا ہے۔',
      ],

      template: `<div class="doc-center doc-bold doc-court">{{COURT_LINE}}</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">({{APPELLANT_ROLE}})</div>
<div class="doc-center">بنام</div>
<div class="doc-center">{{RESPONDENTS}}</div>
<div class="doc-center">({{RESPONDENT_ROLE}})</div>
<div class="doc-para">نگرانی زیر دفعہ 115 ضابطہ دیوانی بر خلاف حکم مورخہ {{JUDGMENT_DATE}} مصدرہ بعدالت {{LOWER_COURT}} جس کی رُو سے صاحب موصوف نے {{OUTCOME}}، جو حکم فاضل عدالتِ تحت صریحاً غلط، خلافِ قانون، خلافِ واقعات، خلافِ ضابطہ اور فطری انصاف کے تقاضوں کے بر عکس illegal اور irregular ہونے کے علاوہ حاصل کردہ jurisdiction کو exercise درست طور پر نہیں کیا گیا ہے، جس کی وجہ سے حکم زیرِ نگرانی صریحاً قابلِ منسوخی ہے، قانون و انصاف کے مروجہ قواعد سے متصادم اور ضابطہ دیوانی کی misconstruction کا نتیجہ ہے۔</div>
<div class="doc-para">استدعا: بمعہ منظوریٔ نگرانی و منسوخیٔ حکم زیرِ نگرانی، معہ دیگر دادرسی قرینِ انصاف عدالت جناب۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-para">جناب عالی! استدعا {{APPELLANT_ROLE}} حسبِ ذیل ہے:-</div>
{{NARRATIVE}}
<div class="doc-para">اندریں حالات استدعا ہے کہ نگرانی ہذا منظور فرما کر حکم زیرِ نگرانی منسوخ فرمایا جائے، معہ دیگر دادرسی قرینِ انصاف عدالت جناب۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-center doc-bold">عرضی نیاز</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">بذریعہ کونسل</div>
<div class="doc-center doc-bold">{{ADVOCATE_NAME}}</div>`,
    },
  },
  'criminal-revision': {
    ur: {
      // Revision before the Sessions Judge u/ss 435 / 439-A Cr.P.C. against an order of an
      // inferior criminal court. s.435 allows the record to be called for to satisfy the court
      // as to the CORRECTNESS, LEGALITY or PROPRIETY of the order and the REGULARITY of the
      // proceedings — a broader test than the civil s.115 jurisdiction test, but still not a
      // re-trial: it is not the forum for re-appraising evidence at large.
      side: 'criminal',
      factsAsList: true,
      factsMaxTokens: 3072,

      roleWords: {
        appellantSingular: 'پٹیشنر',
        appellantPlural: 'پٹیشنرز',
        respondentSingular: 'ریسپانڈنٹ',
        respondentPlural: 'ریسپانڈنٹس',
      },

      impugnedTerm: 'حکم',
      complainantTerm: 'مستغیث',
      termFixes: [['حکم و پرچہ ڈگری', 'حکم'], ['پرچہ ڈگری', 'حکم'], ['فیصلہ و ڈگری', 'حکم']],
      outcomeDefault: 'درخواستِ پٹیشنرز خارج فرمائی',

      factsContext: `This is a criminal revision u/ss 435 / 439-A Cr.P.C. before the Sessions Judge, against an order of an inferior criminal court (usually a Magistrate). The parties are the petitioners (پٹیشنرز) and the respondents (ریسپانڈنٹس) — the State is normally arrayed, often through the District Public Prosecutor, along with the complainant or the accused as the case may be. The impugned decision is an ORDER («حکم زیرِ نگرانی»), not a judgment or decree. Refer to this filing as «نگرانی ہذا». Use criminal terminology: مستغیث for the complainant — never the civil words مدعی / مدعا علیہ.`,

      factsInstruction: `You are drafting the numbered grounds of a CRIMINAL REVISION under Sections 435 / 439-A Cr.P.C. before the Sessions Judge in Pakistan, against an order of an inferior criminal court. Produce the body as a SEQUENCE OF SEPARATE POINTS — each ONE formal court-Urdu statement beginning with «یہ کہ» and ending with «۔», referring to the moving party in the third person as «پٹیشنرز» (or «پٹیشنر» if one). Based ONLY on the facts provided: FIRST state the case (FIR and offence where applicable), what proceedings were pending before the lower court, and exactly what the impugned order did; THEN give the GROUNDS OF REVISION, framed on the statutory test — that the order is not correct, legal or proper, and that the proceedings were not regular. Phrase them for this case, drawing on: the order is against the law, facts and record; it was passed in disregard of the mandatory provisions of the Cr.P.C.; the lower court exercised a jurisdiction not vested in it, or failed to exercise the jurisdiction vested in it, or acted with material irregularity; the order is contrary to the requirements of natural justice and was passed without affording the petitioner a fair opportunity of hearing; the court failed to apply its judicial mind and passed the order mechanically; the order is contrary to the principles settled by the Supreme Court and High Courts; and any case-specific defect evident from the facts. A revision is NOT an appeal or a re-trial — do not re-argue the whole evidence or plead general mis-reading / non-reading of evidence unless the facts show the order itself is illegal, improper or without jurisdiction. Do NOT include the cause-title, the reference line, the «جناب عالی!» opening, the "within time" point, the "copy attached" point, or the final prayer — those are added separately.`,

      narrativeTail: [
        'یہ کہ نگرانی ہذا ہر لحاظ سے اندرِ معیاد ہے۔',
        'یہ کہ نقلِ حکم زیرِ نگرانی لفِ نگرانی ہذا ہے۔',
      ],

      template: `<div class="doc-center doc-bold doc-court">{{COURT_LINE}}</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">({{APPELLANT_ROLE}})</div>
<div class="doc-center">بنام</div>
<div class="doc-center">{{RESPONDENTS}}</div>
<div class="doc-center">({{RESPONDENT_ROLE}})</div>
<div class="doc-para">نگرانی زیر دفعہ 435/439-A ض ف بر خلاف حکم مورخہ {{JUDGMENT_DATE}} مصدرہ بعدالت {{LOWER_COURT}}، در مقدمہ نمبر {{CASE_NUMBER}} مورخہ {{FIR_DATE}} بجرم {{OFFENCE_SECTIONS}} تھانہ {{POLICE_STATION}}، جس کی رُو سے صاحب موصوف نے {{OUTCOME}}، جو حکم فاضل عدالتِ تحت صریحاً غلط، خلافِ قانون، خلافِ واقعات، خلافِ ضابطہ اور فطری انصاف کے تقاضوں کے بر عکس illegal اور irregular ہونے کے علاوہ نہ درست ہے، نہ قانونی اور نہ ہی مناسب، جس کی وجہ سے حکم زیرِ نگرانی صریحاً قابلِ منسوخی ہے۔</div>
<div class="doc-para">استدعا: بمعہ منظوریٔ نگرانی و منسوخیٔ حکم زیرِ نگرانی، معہ دیگر دادرسی قرینِ انصاف عدالت جناب۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-para">جناب عالی! استدعا {{APPELLANT_ROLE}} حسبِ ذیل ہے:-</div>
{{NARRATIVE}}
<div class="doc-para">اندریں حالات استدعا ہے کہ نگرانی ہذا منظور فرما کر حکم زیرِ نگرانی منسوخ فرمایا جائے، معہ دیگر دادرسی قرینِ انصاف عدالت جناب۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-center doc-bold">عرضی نیاز</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">بذریعہ کونسل</div>
<div class="doc-center doc-bold">{{ADVOCATE_NAME}}</div>`,
    },
  },
  'order-37': {
    ur: {
      // Summary suit for recovery under Order 37 Rule 2 CPC. This is an ORIGINAL PLAINT, not a
      // challenge to an order: so there is no impugned decision, and it carries a plaint's own
      // requirements — cause of action, territorial jurisdiction, valuation & court fee, and the
      // تصدیق (verification) clause. Parties are مدعی / مدعاعلیہ (correct for a civil suit).
      side: 'civil',
      factsAsList: true,
      factsMaxTokens: 3072,

      roleWords: {
        appellantSingular: 'مدعی',
        appellantPlural: 'مدعیان',
        respondentSingular: 'مدعاعلیہ',
        respondentPlural: 'مدعاعلیہان',
      },

      narrativeTail: [
        'یہ کہ مالیتِ دعویٰ بغرضِ کورٹ فیس و اختیارِ سماعت مبلغ {{AMOUNT}} مقرر کی جاتی ہے جو قابلِ ادائیگی کورٹ فیس مبلغ {{COURT_FEE}} ہے۔',
      ],

      defaultVariant: 'pronote',
      variants: {
        // (a) Recovery on a promissory note — execution before witnesses and a stamp vendor.
        pronote: {
          factsContext: `This is a summary suit for recovery of money under Order 37 Rule 2 CPC, on a PROMISSORY NOTE (پرونوٹ), before the District / Additional District Judge. The parties are the plaintiff (مدعی) and the defendant (مدعاعلیہ) — this is a civil suit, so مدعی / مدعاعلیہ are the correct words. Refer to this filing as «دعویٰ ہذا».`,
          factsInstruction: `You are drafting the numbered paragraphs of a PLAINT — a summary suit for recovery of money under Order 37 Rule 2 CPC on a PROMISSORY NOTE — before the District / Additional District Judge in Pakistan. Produce the body as a SEQUENCE OF SEPARATE PARAGRAPHS — each ONE formal court-Urdu statement beginning with «یہ کہ» and ending with «۔», referring to the plaintiff in the third person as «من مدعی» and the defendant as «مدعاعلیہ». Based ONLY on the facts provided, plead in this order: (1) who the parties are, where they reside, and any relationship or prior dealings between them that explain the trust; (2) the transaction — the date, the amount advanced, the witnesses present, that the money was handed over, and that the promissory note was written, completed and signed/thumb-marked by the defendant before those witnesses and the stamp vendor, with the legal formalities (adhesive stamps, entry in the register) completed, the note remaining with the plaintiff, and its copy annexed to the plaint; (3) what happened afterwards — the defendant's excuses, delay, absence, and eventual refusal; (4) that repeated demands for payment were made but the defendant refused without lawful justification and is legally bound to pay; (5) the cause of action — when it arose and that it continues — and that the court has territorial jurisdiction because the parties reside and the cause of action arose within its territorial limits (use the actual place from the parties' addresses). Do NOT write the cause-title, the headnote/subject line, the «جنابِ عالی!» opening, the valuation and court-fee paragraph, the prayer, the verification clause, or the signature — those are added separately.`,
          headnote: 'دعویٰ زیر آرڈر 37 رول 2 ض د بمراسلہ پانے مبلغ {{AMOUNT}} زر نقد واجب الادا برُوئے {{INSTRUMENT}} معہ اخراجاتِ قانونی و دیگر خرچہ مقدمہ کورٹ فیس وغیرہ۔',
        },

        // (b) Recovery on a dishonoured cheque — presentation, dishonour, notice.
        cheque: {
          factsContext: `This is a summary suit for recovery of money under Order 37 Rule 2 CPC, on a DISHONOURED CHEQUE (چیک), before the District / Additional District Judge. The parties are the plaintiff (مدعی) and the defendant (مدعاعلیہ) — this is a civil suit, so مدعی / مدعاعلیہ are the correct words. Refer to this filing as «دعویٰ ہذا».`,
          factsInstruction: `You are drafting the numbered paragraphs of a PLAINT — a summary suit for recovery of money under Order 37 Rule 2 CPC on a DISHONOURED CHEQUE — before the District / Additional District Judge in Pakistan. Produce the body as a SEQUENCE OF SEPARATE PARAGRAPHS — each ONE formal court-Urdu statement beginning with «یہ کہ» and ending with «۔», referring to the plaintiff in the third person as «من مدعی» and the defendant as «مدعاعلیہ». Based ONLY on the facts provided, plead in this order: (1) who the parties are, where they reside, and any relationship or prior dealings between them; (2) the liability — how the debt arose and its amount; (3) the cheque — its number, date, the bank and branch on which it was drawn, and that the defendant issued and delivered it to the plaintiff towards discharge of that liability; (4) that the cheque was presented to the bank within time and was returned unpaid/dishonoured, with the reason stated in the bank's memo, a copy of the cheque and the memo being annexed; (5) any notice or demand for payment made afterwards and the defendant's refusal without lawful justification, and that the defendant is legally bound to pay; (6) the cause of action — when it arose and that it continues — and that the court has territorial jurisdiction because the parties reside and the cause of action arose within its territorial limits (use the actual place from the parties' addresses). Do NOT write the cause-title, the headnote/subject line, the «جنابِ عالی!» opening, the valuation and court-fee paragraph, the prayer, the verification clause, or the signature — those are added separately.`,
          headnote: 'دعویٰ زیر آرڈر 37 رول 2 ض د بمراسلہ پانے مبلغ {{AMOUNT}} زر نقد واجب الادا برُوئے {{INSTRUMENT}} معہ اخراجاتِ قانونی و دیگر خرچہ مقدمہ کورٹ فیس وغیرہ۔',
        },
      },

      template: `<div class="doc-center doc-bold doc-court">{{COURT_LINE}}</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">({{APPELLANT_ROLE}})</div>
<div class="doc-center">بنام</div>
<div class="doc-center">{{RESPONDENTS}}</div>
<div class="doc-center">({{RESPONDENT_ROLE}})</div>
<div class="doc-center doc-underline doc-title">{{HEADNOTE}}</div>
<div class="doc-para">جنابِ عالی! استدعا {{APPELLANT_ROLE}} حسبِ ذیل ہے:-</div>
{{NARRATIVE}}
<div class="doc-para">اندریں حالات استدعا ہے کہ دعویٰ {{APPELLANT_ROLE}} بحقِ {{APPELLANT_ROLE}} خلافِ {{RESPONDENT_ROLE}} معہ خرچہ مقدمہ ڈگری فرمایا جائے۔</div>
<div class="doc-para">تصدیق: بمقام {{VERIFY_PLACE}}</div>
<div class="doc-para">یہ کہ مظہر حلفاً بیانی ہے کہ جملہ مراتب بالا میرے بہترین علم و یقین سے درست و صحیح ہیں۔</div>
<div class="doc-sep">ــــــــــــــــــــــــــــــــــــــــــــــــــــ</div>
<div class="doc-center doc-bold">عرضیِ نیاز</div>
<div class="doc-center">{{APPLICANTS}}</div>
<div class="doc-center">بذریعہ کونسل</div>
<div class="doc-center doc-bold">{{ADVOCATE_NAME}}</div>`,
    },
  },
}

module.exports = { TEMPLATES }