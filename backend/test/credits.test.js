// Runs the real server against a temporary data folder and a stand-in for the
// Claude API, so these tests touch no customer data and cost nothing.

const { test, before, after } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const http = require('http')
const { spawn, spawnSync } = require('child_process')

const BACKEND = path.join(__dirname, '..')
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'legaldraft-test-'))
const DATA_FILE = path.join(DATA_DIR, 'accounts-data.json')
const PORT = 3977
const STUB_PORT = 3978
const API = `http://127.0.0.1:${PORT}`

process.env.DATA_DIR = DATA_DIR
const accounts = require('../accounts.js')

let server
let stub
let stubFails = false

const DRAFT = {
  documentType: 'not-a-template',
  language: 'en',
  facts: 'Test facts',
  applicants: [{ name: 'Test Applicant' }],
}

function makeAccount(email, credits) {
  const made = accounts.createAccount(email, 'password123', 'Test User')
  accounts.verifyEmail(email, made.verifyCode)
  const current = 2 // free trial credits
  if (credits !== current) accounts.adminAdjustBalance(made.account.id, credits - current, 'test')
  const signedIn = accounts.login(email, 'password123')
  return { id: made.account.id, token: signedIn.sessionToken }
}

const balanceOf = (email) => accounts.findByEmail(email).balance

const generate = (token) =>
  fetch(API + '/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
    body: JSON.stringify(DRAFT),
  })

before(async () => {
  stub = http.createServer((req, res) => {
    req.resume()
    req.on('end', () => {
      setTimeout(() => {
        if (stubFails) {
          res.writeHead(400, { 'content-type': 'application/json' })
          return res.end(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'stub' } }))
        }
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({
          id: 'msg_test',
          type: 'message',
          role: 'assistant',
          model: 'stub',
          content: [{ type: 'text', text: 'Stub draft' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 1, output_tokens: 1 },
        }))
      }, 150)
    })
  })
  await new Promise((resolve) => stub.listen(STUB_PORT, '127.0.0.1', resolve))

  server = spawn(process.execPath, ['server.js'], {
    cwd: BACKEND,
    stdio: 'ignore',
    env: {
      ...process.env,
      PORT: String(PORT),
      ANTHROPIC_API_KEY: 'test-key',
      ANTHROPIC_BASE_URL: `http://127.0.0.1:${STUB_PORT}`,
      TRUST_PROXY_HOPS: '0',
      ALLOWED_ORIGINS: '',
    },
  })

  for (let i = 0; i < 50; i++) {
    try {
      await fetch(API + '/api/health')
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
  throw new Error('Test server did not start')
})

after(() => {
  server.kill()
  stub.close()
  fs.rmSync(DATA_DIR, { recursive: true, force: true })
})

test('simultaneous requests cannot share one credit', async () => {
  const { token } = makeAccount('race@example.com', 1)
  const results = await Promise.all([1, 2, 3, 4, 5].map(() => generate(token)))
  const statuses = results.map((r) => r.status).sort()
  assert.deepStrictEqual(statuses, [200, 402, 402, 402, 402])
  assert.strictEqual(balanceOf('race@example.com'), 0)
})

test('a failed draft refunds the credit', async () => {
  const { token } = makeAccount('refund@example.com', 1)
  stubFails = true
  const res = await generate(token)
  stubFails = false
  assert.strictEqual(res.status, 500)
  assert.strictEqual(balanceOf('refund@example.com'), 1)
})

test('drafting is limited to 30 an hour per account', async () => {
  const { token } = makeAccount('limit@example.com', 100)
  const results = await Promise.all(Array.from({ length: 31 }, () => generate(token)))
  const limited = results.filter((r) => r.status === 429).length
  assert.strictEqual(limited, 1)
  assert.strictEqual(balanceOf('limit@example.com'), 70)
})

test('a faked X-Forwarded-For header does not get round the login limit', async () => {
  const statuses = []
  for (let i = 0; i < 11; i++) {
    const res = await fetch(API + '/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${i}` },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong-password' }),
    })
    statuses.push(res.status)
  }
  assert.strictEqual(statuses[9], 401)
  assert.strictEqual(statuses[10], 429)
})

test('an upload named .html is stored with an image extension', async () => {
  const { token } = makeAccount('upload@example.com', 1)
  const form = new FormData()
  form.append('screenshot', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'evil.html')
  form.append('packageId', 'single')
  form.append('credits', '1')
  form.append('amountPkr', '100')
  form.append('method', 'EasyPaisa')
  form.append('reference', 'TEST123')
  const res = await fetch(API + '/api/payment-proof', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token },
    body: form,
  })
  assert.strictEqual(res.status, 200)
  const stored = fs.readdirSync(path.join(DATA_DIR, 'uploads'))
  assert.strictEqual(stored.length, 1)
  assert.strictEqual(path.extname(stored[0]), '.png')
})

test('entering a verification code twice says already verified', () => {
  const made = accounts.createAccount('twice@example.com', 'password123', 'Test User')
  const first = accounts.verifyEmail('twice@example.com', made.verifyCode)
  const second = accounts.verifyEmail('twice@example.com', made.verifyCode)
  assert.strictEqual(first.ok, true)
  assert.ok(!first.alreadyVerified)
  assert.ok(accounts.accountFromSession(first.sessionToken))
  assert.strictEqual(second.alreadyVerified, true)
  assert.ok(!second.sessionToken)
  assert.strictEqual(accounts.findByEmail('twice@example.com').balance, 2)
})

const wrongCodeFor = (code) => (code === '000000' ? '000001' : '000000')

test('a verification code is not stored in plain text', () => {
  const made = accounts.createAccount('hashed@example.com', 'password123', 'Test User')
  assert.match(made.verifyCode, /^\d{6}$/)
  assert.ok(!fs.readFileSync(DATA_FILE, 'utf8').includes(`"${made.verifyCode}"`))
})

test('a verification code stops working after five wrong attempts', () => {
  const email = 'guesser@example.com'
  const made = accounts.createAccount(email, 'password123', 'Test User')
  for (let i = 0; i < 4; i++) {
    const wrong = accounts.verifyEmail(email, wrongCodeFor(made.verifyCode))
    assert.strictEqual(wrong.ok, false)
    assert.ok(!wrong.expired)
  }
  assert.strictEqual(accounts.verifyEmail(email, wrongCodeFor(made.verifyCode)).expired, true)
  assert.strictEqual(accounts.verifyEmail(email, made.verifyCode).ok, false)
  assert.strictEqual(accounts.findByEmail(email).balance, 0)
})

test('a badly formatted code does not use up an attempt', () => {
  const email = 'format@example.com'
  const made = accounts.createAccount(email, 'password123', 'Test User')
  for (let i = 0; i < 10; i++) accounts.verifyEmail(email, 'abc')
  const spaced = made.verifyCode.slice(0, 3) + ' ' + made.verifyCode.slice(3)
  assert.strictEqual(accounts.verifyEmail(email, spaced).ok, true)
})

test('an expired verification code is refused', () => {
  const email = 'expired@example.com'
  const made = accounts.createAccount(email, 'password123', 'Test User')
  const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  db.accounts[made.account.id].verifyExpires = new Date(Date.now() - 1000).toISOString()
  fs.writeFileSync(DATA_FILE, JSON.stringify(db))
  const result = accounts.verifyEmail(email, made.verifyCode)
  assert.strictEqual(result.ok, false)
  assert.strictEqual(result.expired, true)
})

test('resending a code waits for the cooldown, replaces the old code and is capped per hour', () => {
  const email = 'resend@example.com'
  const made = accounts.createAccount(email, 'password123', 'Test User')
  const tooSoon = accounts.refreshVerifyCode(email)
  assert.strictEqual(tooSoon.ok, false)
  assert.ok(tooSoon.retryAfter > 0)

  const age = (minutes) => {
    const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    const acct = db.accounts[made.account.id]
    acct.verifySends = acct.verifySends.map((at) => new Date(new Date(at).getTime() - minutes * 60000).toISOString())
    fs.writeFileSync(DATA_FILE, JSON.stringify(db))
  }

  age(2)
  const fresh = accounts.refreshVerifyCode(email)
  assert.strictEqual(fresh.ok, true)
  if (fresh.verifyCode !== made.verifyCode) {
    assert.strictEqual(accounts.verifyEmail(email, made.verifyCode).ok, false)
  }

  for (let i = 0; i < 3; i++) {
    age(2)
    assert.strictEqual(accounts.refreshVerifyCode(email).ok, true)
  }
  age(2)
  const capped = accounts.refreshVerifyCode(email)
  assert.strictEqual(capped.ok, false)
  assert.ok(capped.retryAfter > 60)
})

test('the verify endpoint signs in on success and gives nothing away afterwards', async () => {
  const email = 'endpoint@example.com'
  const made = accounts.createAccount(email, 'password123', 'Test User')
  const post = (body) =>
    fetch(API + '/api/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })

  assert.strictEqual((await post({ email, code: wrongCodeFor(made.verifyCode) })).status, 400)
  assert.strictEqual((await post({ email: 'nobody@example.com', code: '123456' })).status, 400)

  const ok = await post({ email, code: made.verifyCode })
  const body = await ok.json()
  assert.strictEqual(ok.status, 200)
  assert.strictEqual(body.credits, 2)
  assert.ok(accounts.accountFromSession(body.token))

  const again = await (await post({ email, code: '' })).json()
  assert.deepStrictEqual(again, { ok: true, alreadyVerified: true })
})

test('a damaged accounts file stops the app and is not overwritten', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'legaldraft-damaged-'))
  const file = path.join(dir, 'accounts-data.json')
  fs.writeFileSync(file, '{ damaged')
  const result = spawnSync(process.execPath, ['-e', "require('./accounts.js')"], {
    cwd: BACKEND,
    env: { ...process.env, DATA_DIR: dir },
  })
  assert.notStrictEqual(result.status, 0)
  assert.strictEqual(fs.readFileSync(file, 'utf8'), '{ damaged')
  fs.rmSync(dir, { recursive: true, force: true })
  assert.ok(fs.existsSync(DATA_FILE))
})
