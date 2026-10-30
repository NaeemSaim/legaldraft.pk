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
  accounts.verifyEmail(made.verifyToken)
  const current = 2 // free trial credits
  if (credits !== current) accounts.adminAdjustBalance(made.account.id, credits - current, 'test')
  const signedIn = accounts.login(email, 'password123')
  return { id: made.account.id, token: signedIn.sessionToken, verifyToken: made.verifyToken }
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

test('clicking a verification link twice says already verified', () => {
  const made = accounts.createAccount('twice@example.com', 'password123', 'Test User')
  const first = accounts.verifyEmail(made.verifyToken)
  const second = accounts.verifyEmail(made.verifyToken)
  assert.strictEqual(first.ok, true)
  assert.ok(!first.alreadyVerified)
  assert.strictEqual(second.alreadyVerified, true)
  assert.strictEqual(accounts.findByEmail('twice@example.com').balance, 2)
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
