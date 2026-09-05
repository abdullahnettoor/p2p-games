/**
 * Control experiment for scripts/p2p-loop.mjs.
 *
 * Runs plain WebRTC (no PeerJS, no app code) inside one Chromium page with
 * in-page signaling, under two ICE configurations:
 *   A) the app's DEFAULT_ICE_SERVERS (google STUN + peerjs TURN)
 *   B) no ICE servers at all (host candidates only)
 *
 * Purpose: prove whether ICE can complete at all in this environment, and
 * whether the app's iceServers list is what breaks it.
 *
 * IMPORTANT: run this on a real workstation, not inside a sandboxed agent
 * shell. `code=701 ... host lookup received error` for every STUN/TURN URL
 * means the environment itself blocks UDP/DNS egress, so the STUN and TURN
 * rows are meaningless there and only host-candidate results can be trusted.
 */
import { chromium } from 'playwright'

const CHROMIUM_ARGS = ['--disable-features=WebRtcHideLocalIpsWithMdns']

const CONFIGS = {
  'no ICE servers': [],
  'google STUN only': [{ urls: 'stun:stun.l.google.com:19302' }],
  'STUN + openrelay TURN': [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turns:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  'TURN only (relay forced)': [
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turns:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
}

async function probe(page, label, iceServers) {
  const forceRelay = label.includes('relay forced')
  const result = await page.evaluate(
    async ({ servers, forceRelay }) => {
      const config = { iceServers: servers }
      if (forceRelay) config.iceTransportPolicy = 'relay'

      const a = new RTCPeerConnection(config)
      const b = new RTCPeerConnection(config)
      const candidates = { a: [], b: [] }
      const errors = []

      a.onicecandidateerror = (e) =>
        errors.push(`${e.url ?? '?'} code=${e.errorCode} ${e.errorText ?? ''}`)

      a.onicecandidate = (e) => {
        if (e.candidate) {
          candidates.a.push(e.candidate.candidate)
          b.addIceCandidate(e.candidate).catch(() => {})
        }
      }
      b.onicecandidate = (e) => {
        if (e.candidate) {
          candidates.b.push(e.candidate.candidate)
          a.addIceCandidate(e.candidate).catch(() => {})
        }
      }

      const dc = a.createDataChannel('probe')
      const opened = new Promise((resolve) => {
        dc.onopen = () => resolve('open')
        setTimeout(() => resolve(`timeout ice=${a.iceConnectionState}`), 15000)
      })

      const offer = await a.createOffer()
      await a.setLocalDescription(offer)
      await b.setRemoteDescription(offer)
      const answer = await b.createAnswer()
      await b.setLocalDescription(answer)
      await a.setRemoteDescription(answer)

      const outcome = await opened
      const summary = {
        outcome,
        iceState: a.iceConnectionState,
        candidateTypes: [...new Set(candidates.a.map((c) => (c.match(/ typ (\w+)/) ?? [])[1]))],
        relayCount: candidates.a.filter((c) => c.includes(' typ relay')).length,
        errors: [...new Set(errors)].slice(0, 4),
      }
      a.close()
      b.close()
      return summary
    },
    { servers: iceServers, forceRelay }
  )

  console.log(`\n[${label}]`)
  console.log(`  outcome        : ${result.outcome}`)
  console.log(`  candidate types: ${result.candidateTypes.join(', ') || '(none)'}`)
  console.log(`  relay cands    : ${result.relayCount}`)
  for (const e of result.errors) console.log(`  ice error      : ${e}`)
  return result.outcome === 'open'
}

const browser = await chromium.launch({ headless: true, args: CHROMIUM_ARGS })
const page = await browser.newPage()
await page.goto('https://example.com', { waitUntil: 'domcontentloaded' })

for (const [label, servers] of Object.entries(CONFIGS)) {
  await probe(page, label, servers)
}

await browser.close()
