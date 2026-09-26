import { describe, it, expect } from 'vitest'
import { isResumable, RESUME_WINDOW_MS } from './resume'

const now = 1_000_000
const friend = {
  localPlayer: { id: 'p2pgames-tictactoe-K7M4QX', role: 'host' as const },
  remotePlayer: { id: 'guest-peer-123', role: 'guest' as const },
  updatedAt: now - 5_000,
}

describe('isResumable', () => {
  it('accepts a recent friend Match from either side', () => {
    expect(isResumable(friend, now)).toBe(true)
    expect(
      isResumable(
        {
          localPlayer: { id: 'guest-peer-123', role: 'guest' },
          remotePlayer: { id: 'p2pgames-bingo-K7M4QX', role: 'host' },
          updatedAt: now,
        },
        now
      )
    ).toBe(true)
  })

  it('rejects a Match saved longer ago than the reconnect grace', () => {
    expect(isResumable({ ...friend, updatedAt: now - RESUME_WINDOW_MS - 1 }, now)).toBe(false)
  })

  it('rejects stranger Matches, whose Host slot is released', () => {
    expect(
      isResumable({ ...friend, localPlayer: { id: 'p2pgames-tictactoe-q-3', role: 'host' } }, now)
    ).toBe(false)
  })

  it('rejects missing or malformed caches', () => {
    expect(isResumable(null, now)).toBe(false)
    expect(isResumable({ ...friend, updatedAt: undefined as unknown as number }, now)).toBe(false)
  })
})
