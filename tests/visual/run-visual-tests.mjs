/**
 * Bingo Visual Regression Baseline Suite
 *
 * Captures Bingo's four entry/lobby screens (choice, join code incl. empty/error,
 * stranger search, match lobby) at 390×844 mobile viewport, with the transport mocked,
 * verifying visual fidelity without a real PeerJS connection.
 *
 * Usage:
 *   node tests/visual/run-visual-tests.mjs             # Run visual diff assertions
 *   node tests/visual/run-visual-tests.mjs --update    # Capture & update baseline images
 */

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

// Load Playwright's bundled image comparator (pixelmatch + SSIM/anti-aliasing)
const coreBundlePath = path.resolve(__dirname, '../../node_modules/playwright-core/lib/coreBundle.js')
const coreBundle = require(coreBundlePath)
const comparePng = coreBundle.utils.getComparator('image/png')

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const BASELINE_DIR = path.resolve(__dirname, 'baselines')
const FAILURES_DIR = path.resolve(__dirname, 'failures')

// Acceptance criteria: fails if any screen differs by more than ~0.1% of pixels
const MAX_DIFF_PIXEL_RATIO = 0.001 // 0.1% of pixels
const PIXELMATCH_THRESHOLD = 0.2

const VIEWPORT = { width: 390, height: 844 }

const updateMode = process.argv.includes('--update')

async function isServerUp() {
  try {
    const res = await fetch(`${BASE_URL}/bingo`, { signal: AbortSignal.timeout(2000) })
    return res.ok || res.status < 500
  } catch {
    return false
  }
}

async function ensureServer() {
  if (await isServerUp()) {
    console.log(`✓ Reusing server at ${BASE_URL}`)
    return null
  }

  console.log(`· Starting dev server (none found at ${BASE_URL})…`)
  const child = spawn('npm', ['run', 'dev'], {
    stdio: 'ignore',
    detached: false,
  })

  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    await sleep(1000)
    if (await isServerUp()) {
      console.log('✓ Dev server ready')
      return child
    }
  }
  child.kill()
  throw new Error('Dev server failed to start within 60s')
}

/**
 * Configure page determinism:
 * - Deterministic random room code generation (crypto.getRandomValues)
 * - Freezes stranger search elapsed timer (setInterval at 1000ms)
 * - Caret hiding to prevent blinking cursor diffs
 */
async function setupPageDeterminism(context) {
  await context.addInitScript(() => {
    // Deterministic random numbers for room code generator
    let seed = 42
    crypto.getRandomValues = function (buffer) {
      for (let i = 0; i < buffer.length; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0
        buffer[i] = seed % 31
      }
      return buffer
    }

    // Freeze stranger search 1000ms timer at 0:00
    const originalSetInterval = window.setInterval
    window.setInterval = function (fn, delay, ...args) {
      if (delay === 1000) return 999999
      return originalSetInterval(fn, delay, ...args)
    }

    // Hide blinking text carets in inputs
    const style = document.createElement('style')
    style.innerHTML = '*, *::before, *::after { caret-color: transparent !important; }'
    if (document.head) {
      document.head.appendChild(style)
    } else {
      document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style))
    }
  })
}

/**
 * Intercept WebSocket connections to PeerJS signaling server:
 * Prevents real network connection and completes handshake instantly with OPEN event.
 */
async function mockPeerJSTransport(page) {
  await page.routeWebSocket(/.*peerjs.*/, (ws) => {
    setTimeout(() => {
      ws.send(JSON.stringify({ type: 'OPEN' }))
    }, 10)
  })
}

/**
 * Wait for web fonts and layout stability
 */
async function waitForStability(page) {
  await page.evaluate(() => document.fonts.ready)
  await sleep(150)
}

async function run() {
  fs.mkdirSync(BASELINE_DIR, { recursive: true })
  fs.mkdirSync(FAILURES_DIR, { recursive: true })

  const serverProcess = await ensureServer()

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-features=WebRtcHideLocalIpsWithMdns'],
  })

  let failedCount = 0
  let passedCount = 0

  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    })

    await setupPageDeterminism(context)

    const page = await context.newPage()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mockPeerJSTransport(page)

    // Definitions of the 5 screen states across the four entry/lobby screens
    const screens = [
      {
        id: 'bingo-choice',
        name: 'Choice Screen',
        navigate: async () => {
          await page.goto(`${BASE_URL}/bingo`, { waitUntil: 'networkidle' })
          await page.getByRole('heading', { name: 'Choose how to play' }).waitFor()
        },
      },
      {
        id: 'bingo-join-code-empty',
        name: 'Join Code Screen (Empty)',
        navigate: async () => {
          await page.goto(`${BASE_URL}/bingo`, { waitUntil: 'networkidle' })
          await page.click('button[data-variant="join"]')
          await page.locator('#bingo-join-code-input').waitFor()
        },
      },
      {
        id: 'bingo-join-code-error',
        name: 'Join Code Screen (Error)',
        navigate: async () => {
          await page.goto(`${BASE_URL}/bingo`, { waitUntil: 'networkidle' })
          await page.click('button[data-variant="join"]')
          await page.locator('#bingo-join-code-input').waitFor()
          await page.fill('#bingo-join-code-input', 'ABC')
          await page.click('button[type="submit"]')
          await page.locator('#join-code-error').waitFor()
        },
      },
      {
        id: 'bingo-stranger-search',
        name: 'Stranger Search Screen',
        navigate: async () => {
          await page.goto(`${BASE_URL}/bingo`, { waitUntil: 'networkidle' })
          await page.click('button[data-variant="stranger"]')
          await page.getByRole('heading', { name: /Searching for a stranger/ }).waitFor()
        },
      },
      {
        id: 'bingo-match-lobby',
        name: 'Host Match Lobby Screen',
        navigate: async () => {
          await page.goto(`${BASE_URL}/bingo`, { waitUntil: 'networkidle' })
          await page.click('button[data-variant="create"]')
          await page.getByText('Invite ready for your friend').waitFor()
          await page.locator('strong[class*="roomCodeValue"]').waitFor()
        },
      },
    ]

    console.log(`\nStarting visual regression test suite (${updateMode ? 'UPDATE MODE' : 'ASSERT MODE'})...\n`)

    for (const screen of screens) {
      process.stdout.write(`· Testing "${screen.name}" (${screen.id})... `)

      await screen.navigate()
      await waitForStability(page)

      const actualBuffer = await page.screenshot({
        animations: 'disabled',
        fullPage: false,
      })

      const baselinePath = path.join(BASELINE_DIR, `${screen.id}.png`)

      if (updateMode || !fs.existsSync(baselinePath)) {
        fs.writeFileSync(baselinePath, actualBuffer)
        console.log(`✓ Baseline saved to ${path.relative(process.cwd(), baselinePath)}`)
        passedCount++
        continue
      }

      const expectedBuffer = fs.readFileSync(baselinePath)
      const diffResult = comparePng(actualBuffer, expectedBuffer, {
        maxDiffPixelRatio: MAX_DIFF_PIXEL_RATIO,
        threshold: PIXELMATCH_THRESHOLD,
      })

      if (!diffResult) {
        console.log(`✓ Passed (pixel diff within ${MAX_DIFF_PIXEL_RATIO * 100}% threshold)`)
        passedCount++
      } else {
        console.log(`✗ FAILED: ${diffResult.errorMessage}`)
        failedCount++

        const actualFailPath = path.join(FAILURES_DIR, `${screen.id}-actual.png`)
        const diffFailPath = path.join(FAILURES_DIR, `${screen.id}-diff.png`)

        fs.writeFileSync(actualFailPath, actualBuffer)
        if (diffResult.diff) {
          fs.writeFileSync(diffFailPath, diffResult.diff)
        }
        console.log(`  Artifacts: ${path.relative(process.cwd(), actualFailPath)} & ${path.relative(process.cwd(), diffFailPath)}`)
      }
    }

    console.log(`\nVisual Suite Summary: ${passedCount} passed, ${failedCount} failed (${screens.length} total)`)

    if (failedCount > 0) {
      process.exitCode = 1
    }
  } finally {
    await browser.close()
    if (serverProcess) {
      serverProcess.kill()
    }
  }
}

run().catch((err) => {
  console.error('\nVisual test execution error:', err)
  process.exit(1)
})
