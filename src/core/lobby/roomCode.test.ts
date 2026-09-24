import { describe, it, expect } from 'vitest'
import {
  ROOM_CODE_ALPHABET,
  generateRoomCode,
  formatHostPeerId,
  normalizeRoomCode,
  extractRoomCode,
  resolveTargetPeerId,
  createGameInviteUrl,
} from './roomCode'

describe('roomCode', () => {
  describe('alphabet & generator', () => {
    it('excludes ambiguous characters (0, O, 1, I, L)', () => {
      const forbidden = ['0', 'O', '1', 'I', 'L']
      for (const char of forbidden) {
        expect(ROOM_CODE_ALPHABET).not.toContain(char)
      }
    })

    it('generates a 6-character room code by default', () => {
      const code = generateRoomCode()
      expect(code).toHaveLength(6)
      for (const char of code) {
        expect(ROOM_CODE_ALPHABET).toContain(char)
      }
    })

    it('generates unique codes across multiple calls without bias', () => {
      const codes = new Set<string>()
      for (let i = 0; i < 50; i++) {
        const code = generateRoomCode()
        expect(code).toMatch(/^[2-9A-HJ-KM-NP-Z]{6}$/)
        codes.add(code)
      }
      expect(codes.size).toBe(50)
    })
  })

  describe('formatHostPeerId', () => {
    it('creates namespaced peer ID for game and code', () => {
      expect(formatHostPeerId('bingo', 'K7M4QX')).toBe('p2pgames-bingo-K7M4QX')
      expect(formatHostPeerId('TicTacToe', 'k7m4qx')).toBe('p2pgames-tictactoe-K7M4QX')
    })
  })

  describe('normalizeRoomCode', () => {
    it('converts to uppercase and strips spaces or hyphens', () => {
      expect(normalizeRoomCode(' k7-m4 qx ')).toBe('K7M4QX')
      expect(normalizeRoomCode('abc-def')).toBe('ABCDEF')
    })
  })

  describe('extractRoomCode', () => {
    it('extracts code from namespaced peer ID', () => {
      expect(extractRoomCode('p2pgames-bingo-K7M4QX')).toBe('K7M4QX')
      expect(extractRoomCode('p2pgames-tictactoe-ABCDEF')).toBe('ABCDEF')
    })

    it('extracts code from ?room= or ?match= URL', () => {
      expect(extractRoomCode('https://example.com/bingo?room=K7M4QX')).toBe('K7M4QX')
      expect(extractRoomCode('https://example.com/bingo?match=K7M4QX')).toBe('K7M4QX')
      expect(extractRoomCode('/bingo?room=K7M4QX&ref=share')).toBe('K7M4QX')
    })

    it('extracts code from raw user input (case-insensitive)', () => {
      expect(extractRoomCode('k7m4qx')).toBe('K7M4QX')
      expect(extractRoomCode('K7-M4-QX')).toBe('K7M4QX')
    })

    it('rejects codes containing ambiguous characters (0, O, 1, I, L)', () => {
      expect(extractRoomCode('07M4QX')).toBeNull()
      expect(extractRoomCode('K7MOQX')).toBeNull()
      expect(extractRoomCode('17M4QX')).toBeNull()
      expect(extractRoomCode('K7MIQX')).toBeNull()
      expect(extractRoomCode('K7MLQX')).toBeNull()
    })

    it('returns null for empty or invalid length strings', () => {
      expect(extractRoomCode('')).toBeNull()
      expect(extractRoomCode('ab')).toBeNull() // too short
      expect(extractRoomCode('K7M4QX78')).toBeNull() // too long (8 chars)
    })
  })

  describe('resolveTargetPeerId', () => {
    it('maps short room code to namespaced peer ID', () => {
      expect(resolveTargetPeerId('bingo', 'K7M4QX')).toBe('p2pgames-bingo-K7M4QX')
      expect(resolveTargetPeerId('bingo', 'k7m4qx')).toBe('p2pgames-bingo-K7M4QX')
      expect(resolveTargetPeerId('tictactoe', 'K7-M4QX')).toBe('p2pgames-tictactoe-K7M4QX')
    })

    it('leaves already-namespaced IDs untouched if game segment matches', () => {
      expect(resolveTargetPeerId('bingo', 'p2pgames-bingo-K7M4QX')).toBe('p2pgames-bingo-K7M4QX')
      expect(resolveTargetPeerId('bingo', 'p2pgames-BINGO-k7m4qx')).toBe('p2pgames-bingo-K7M4QX')
    })

    it('rejects already-namespaced IDs if game segment does not match', () => {
      // Trying to join bingo with a tictactoe room ID
      expect(resolveTargetPeerId('bingo', 'p2pgames-tictactoe-K7M4QX')).toBeUndefined()
    })

    it('rejects invalid or ambiguous room codes', () => {
      expect(resolveTargetPeerId('bingo', '01OIL2')).toBeUndefined()
    })

    it('preserves legacy UUID match IDs', () => {
      const uuid = '3f2c9a1e-4567-4abc-9def-123456789abc'
      expect(resolveTargetPeerId('bingo', uuid)).toBe(uuid)
    })

    it('returns undefined for empty input', () => {
      expect(resolveTargetPeerId('bingo', null)).toBeUndefined()
      expect(resolveTargetPeerId('bingo', '')).toBeUndefined()
    })
  })

  describe('createGameInviteUrl', () => {
    it('creates ?room=CODE invite URL for room codes', () => {
      const url = createGameInviteUrl('https://games.app', '/bingo', 'p2pgames-bingo-K7M4QX')
      expect(url).toBe('https://games.app/bingo?room=K7M4QX')

      const url2 = createGameInviteUrl('https://games.app', 'bingo', 'K7M4QX')
      expect(url2).toBe('https://games.app/bingo?room=K7M4QX')
    })

    it('falls back to ?match=<id> for legacy UUIDs', () => {
      const uuid = '3f2c9a1e-4567-4abc-9def-123456789abc'
      const url = createGameInviteUrl('https://games.app', '/bingo', uuid)
      expect(url).toBe(`https://games.app/bingo?match=${uuid}`)
    })
  })
})
