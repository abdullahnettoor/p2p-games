/**
 * End-to-end check of the original bug report: two browsers in the Bingo lobby
 * must actually see each other over P2P.
 *
 * Drives the real /bingo host + guest flow (no test hooks) and asserts the
 * lobby reports "Connected via P2P" on both sides.
 *
 *   node scripts/bingo-lobby-loop.mjs
 */
import { chromium } from "playwright"

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000"
const TIMEOUT_MS = Number(process.env.P2P_TIMEOUT_MS ?? 30_000)
const CHROMIUM_ARGS = ["--disable-features=WebRtcHideLocalIpsWithMdns"]

const browser = await chromium.launch({ headless: true, args: CHROMIUM_ARGS })
const startedAt = Date.now()

try {
  const hostPage = await (await browser.newContext()).newPage()
  const guestPage = await (await browser.newContext()).newPage()

  console.log("· host: creating online match")
  await hostPage.goto(`${BASE_URL}/bingo?action=create`, { waitUntil: "domcontentloaded" })

  const inviteInput = hostPage.locator("input[readonly]")
  await inviteInput.waitFor({ timeout: TIMEOUT_MS })
  await hostPage.waitForFunction(
    () => {
      const val = document.querySelector("input[readonly]")?.value ?? ""
      return val.includes("match=") || val.includes("room=")
    },
    undefined,
    { timeout: TIMEOUT_MS }
  )
  const inviteUrl = await inviteInput.inputValue()
  console.log(`✓ invite link: ${inviteUrl}`)

  console.log("· guest: opening invite link")
  await guestPage.goto(inviteUrl, { waitUntil: "domcontentloaded" })

  await Promise.all([
    hostPage.getByText("Connected via P2P").waitFor({ timeout: TIMEOUT_MS }),
    guestPage.getByText("Connected via P2P").waitFor({ timeout: TIMEOUT_MS }),
  ])

  console.log(`\nPASS — Bingo lobby peers connected in ${Date.now() - startedAt}ms`)
} catch (err) {
  console.log(`\nFAIL — ${err.message.split("\n")[0]}`)
  process.exitCode = 1
} finally {
  await browser.close()
}
