# LegalDraft.pk — launch checklist

Work top to bottom. The first section is the one that loses data if skipped.

---

## 1. Data persistence — do this before anything else

Your customer accounts, credit balances and payment screenshots are written to
files on the server:

- `accounts-data.json` — accounts, balances, ledger, saved drafts
- `uploads/` — payment screenshots

**On Render's free tier and most default hosting, the filesystem is wiped on
every redeploy and every restart.** Without the step below you would lose every
customer account and all payment evidence, silently.

Fix it one of two ways:

**a) Persistent disk (simplest)**
1. In Render: Service → Disks → Add Disk, mount path `/var/data`.
2. Set `DATA_DIR=/var/data` in the environment settings.

**b) Move to a real database** — the right answer once you have steady traffic.
All file access is inside `accounts.js`, so only that file changes.

### Backups
Whatever you choose, take regular copies of `accounts-data.json` and `uploads/`.
These are financial records: if a customer disputes a payment, the screenshot is
your evidence.

---

## 2. Fill in your real details

`frontend/src/pages.jsx`, the `BUSINESS` block at the top. Every page reads from
it — Contact, Pricing, Privacy, Terms, Refund.

- [ ] `email` — a real, monitored support inbox (currently `support@legaldraft.pk`)
- [ ] `phone` — currently a placeholder `+92 300 0000000`
- [ ] `address`
- [ ] `payment.easypaisa`, `payment.jazzcash` — currently placeholders
- [ ] `payment.bankName`, `bankTitle`, `bankAccount` — currently `PK00XXXX…`
- [ ] `effectiveDate` on the policies

**Nobody can pay you until the payment details are real.**

---

## 3. Environment and secrets

- [ ] `.env` exists in `backend/`, built from `.env.example`
- [ ] `.env` is NOT in git (`.gitignore` covers it)
- [ ] `ADMIN_TOKEN` is long and random — it guards credit granting
- [ ] `ANTHROPIC_API_KEY` is set in the host's environment, never in a file in git
- [ ] `PUBLIC_URL` points at your live front end, or password-reset links will be wrong
- [ ] `ALLOWED_ORIGINS` set to your real domain(s) in production
- [ ] `TRUST_PROXY_HOPS` set for your host. Check it: from two different networks
      (e.g. phone data and home wifi), fail a login 11 times on one. It must block
      only that network, and a spoofed `X-Forwarded-For` header must not get round it

---

## 4. Email

Verification codes and password-reset links must actually arrive.

- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` set
- [ ] Gmail requires an **App Password**, not your normal password
- [ ] Send yourself a test signup and confirm the email lands (check spam)

Until SMTP is configured, nobody can finish signing up or reset a password. For
local testing without email, set `EMAIL_DEV_MODE=true`. **Never set it on the live
server:** it shows reset links on screen, so anyone could take over any account.
Also set `NODE_ENV=production` on the live server, which makes it ignored.

---

## 5. Test the whole path yourself

- [ ] Sign up → receive email → click link → credits granted
- [ ] Sign in, draft a document, confirm one credit is deducted
- [ ] Reopen the draft from **My drafts** and print it
- [ ] Run out of credits, confirm drafting is blocked
- [ ] Submit a payment screenshot from the Pricing page
- [ ] Approve it at `#/admin`, confirm credits are granted
- [ ] Forgotten password → reset link → sign in with the new password
- [ ] Try signing up with a disposable address, confirm it is refused

---

## 6. Test on a real phone

Most of your users will be on mobile.

- [ ] Urdu (Nastaliq) renders correctly, not as boxes
- [ ] The RTL form fields behave and text is readable
- [ ] The draft preview and printing work
- [ ] The payment screenshot upload works from the phone's gallery

Note: the app sets the text direction, but it **cannot** switch the user's
keyboard. Users need an Urdu keyboard installed to type Urdu.

---

## 7. Know your margin

Every draft costs an API call, and longer documents (appeals, revisions) cost
more than short ones. Draft one of each type, check your Anthropic usage, and
confirm PKR 100 leaves the margin you expect.

---

## 8. Known gaps

Not blockers, but be aware:

- **English drafts are AI-generated**, not template-driven — structurally looser
  than the Urdu templates. The site no longer advertises English.
- **Rent appeal and criminal revision** were built without specimens; **civil
  revision** from a partial one. Have a practitioner check them.
- **One account per person** is stated in the Terms but only lightly enforced.
  Email aliases (`name+1@gmail.com`) are blocked; different real addresses are not.
- **No automated payment gateway** — approvals are manual through `#/admin`.