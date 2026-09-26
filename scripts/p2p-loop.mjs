/**
 * P2P connectivity feedback loop.
 *
 * Drives two real Chromium contexts (host + guest) through the tic-tac-toe
 * connectivity POC, over the real PeerJS signaling server and real WebRTC.
 * Goes red on exactly the symptom users report: guest never reaches `connected`
 * and the host never sees a peer join.
 *
 *   node scripts/p2p-loop.mjs
 *   BASE_URL=http://localhost:3000 P2P_TIMEOUT_MS=30000 node scripts/p2p-loop.mjs
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const TIMEOUT_MS = Number(process.env.P2P_TIMEOUT_MS ?? 30_000)

const CHROMIUM_ARGS = [
  // Without this Chrome hides host candidates behind .local mDNS names, which
  // do not resolve in a headless sandbox and would fail the loop for the wrong reason.
  '--disable-features=WebRtcHideLocalIpsWithMdns',
]

function log(...args) {
  console.log(...args)
}

async function isServerUp() {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(2000) })
    return res.ok || res.status < 500
  } catch {
    return false
  }
}

async function ensureServer() {
  if (await isServerUp()) {
    log(`✓ reusing dev server at ${BASE_URL}`)
    return null
  }

  log(`· starting dev server (none found at ${BASE_URL})…`)
  const child = spawn('npm', ['run', 'dev'], { stdio: 'ignore', detached: false })

  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    await sleep(1000)
    if (await isServerUp()) {
      log('✓ dev server ready')
      return child
    }
  }
  child.kill()
  throw new Error('dev server did not become ready within 90s')
}

function attachDiagnostics(page, label, sink) {
  page.on('console', (msg) => {
    const text = msg.text()
    if (msg.type() === 'error' || msg.type() === 'warning' || text.includes('[DEBUG-')) {
      sink.push(`[${label}] ${text}`)
    }
  })
  page.on('pageerror', (err) => sink.push(`[${label}:pageerror] ${err.message}`))
}

async function readText(page, testId) {
  return (await page.getByTestId(testId).textContent())?.trim() ?? ''
}

async function dumpPocLog(page, label) {
  const entries = await page.getByTestId('poc-log').locator('li').allTextContents()
  log(`--- ${label} event log ---`)
  for (const entry of entries) log(`    ${entry.replace(/\s+/g, ' ').trim()}`)
  const error = await page.getByTestId('poc-error').textContent().catch(() => null)
  if (error) log(`    ERROR: ${error.trim()}`)
}

async function run() {
  const server = await ensureServer()
  const browser = await chromium.launch({ headless: true, args: CHROMIUM_ARGS })
  const diagnostics = []
  const failures = []
  let hostPage
  let guestPage

  try {
    const hostContext = await browser.newContext()
    const guestContext = await browser.newContext()
    hostPage = await hostContext.newPage()
    guestPage = await guestContext.newPage()
    attachDiagnostics(hostPage, 'host', diagnostics)
    attachDiagnostics(guestPage, 'guest', diagnostics)

    const startedAt = Date.now()

    log('· host: opening /tictactoe/poc')
    await hostPage.goto(`${BASE_URL}/tictactoe/poc`, { waitUntil: 'domcontentloaded' })

    await hostPage
      .getByTestId('poc-local-id')
      .filter({ hasNotText: '—' })
      .waitFor({ timeout: TIMEOUT_MS })
    const matchId = await readText(hostPage, 'poc-local-id')
    log(`✓ host registered with signaling server as ${matchId} (${Date.now() - startedAt}ms)`)

    log('· guest: opening invite link')
    await guestPage.goto(`${BASE_URL}/tictactoe/poc?match=${matchId}`, {
      waitUntil: 'domcontentloaded',
    })

    await Promise.all([
      hostPage.getByTestId('poc-status').filter({ hasText: 'connected' }).waitFor({ timeout: TIMEOUT_MS }),
      guestPage.getByTestId('poc-status').filter({ hasText: 'connected' }).waitFor({ timeout: TIMEOUT_MS }),
    ]).catch((err) => {
      failures.push(
        `peers never both reached "connected" within ${TIMEOUT_MS}ms ` +
          `(host=${err.message.includes('host') ? '?' : '?'})`
      )
      throw err
    })
    log(`✓ data channel open on both peers (${Date.now() - startedAt}ms)`)

    log('· host: playing cell 0')
    await hostPage.getByTestId('cell-0').click()
    await guestPage
      .getByTestId('poc-board')
      .filter({ hasText: 'X........' })
      .waitFor({ timeout: 10_000 })
    log('✓ guest received host move')

    log('· guest: playing cell 4')
    await guestPage.getByTestId('cell-4').click()
    await hostPage
      .getByTestId('poc-board')
      .filter({ hasText: 'X...O....' })
      .waitFor({ timeout: 10_000 })
    log('✓ host received guest move')

    log(`\nPASS — bidirectional P2P verified in ${Date.now() - startedAt}ms`)
    if (process.env.P2P_VERBOSE) {
      await dumpPocLog(hostPage, 'host')
      await dumpPocLog(guestPage, 'guest')
    }
  } catch (err) {
    log(`\nFAIL — ${err.message.split('\n')[0]}`)
    if (hostPage) {
      log(`    host status: ${await readText(hostPage, 'poc-status').catch(() => 'n/a')}`)
      await dumpPocLog(hostPage, 'host').catch(() => {})
    }
    if (guestPage) {
      log(`    guest status: ${await readText(guestPage, 'poc-status').catch(() => 'n/a')}`)
      await dumpPocLog(guestPage, 'guest').catch(() => {})
    }
    if (diagnostics.length) {
      log('--- browser diagnostics ---')
      for (const line of diagnostics.slice(-60)) log(`    ${line}`)
    }
    process.exitCode = 1
  } finally {
    await browser.close()
    if (server) server.kill()
  }
}

run()
