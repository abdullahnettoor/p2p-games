/**
 * Room code utilities for human-friendly match codes.
 *
 * Uses an unambiguous alphabet (excluding 0, O, 1, I, L) to avoid transcription
 * errors when reading or typing codes across devices.
 */

export const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const ROOM_CODE_LENGTH = 6
export const ROOM_CODE_PREFIX = 'p2pgames'

// Regex for strictly 6 characters from ROOM_CODE_ALPHABET (case-insensitive)
const CODE_CHARS_REGEX = '[2-9A-HJ-KM-NP-Z]{6}'

/**
 * Generates a random uppercase room code using the unambiguous alphabet.
 * Uses rejection sampling to eliminate modulo bias.
 */
export function generateRoomCode(length: number = ROOM_CODE_LENGTH): string {
  let result = ''
  const alphabetLength = ROOM_CODE_ALPHABET.length // 31
  const maxValidByte = 248 // 31 * 8, eliminating bias for 0..255

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    while (result.length < length) {
      const needed = length - result.length
      const buffer = new Uint8Array(needed * 2)
      crypto.getRandomValues(buffer)
      for (let i = 0; i < buffer.length && result.length < length; i++) {
        const byte = buffer[i]
        if (byte < maxValidByte) {
          result += ROOM_CODE_ALPHABET[byte % alphabetLength]
        }
      }
    }
    return result
  }

  while (result.length < length) {
    const randomIndex = Math.floor(Math.random() * alphabetLength)
    result += ROOM_CODE_ALPHABET[randomIndex]
  }
  return result
}

/**
 * Formats a namespaced PeerJS ID from a game name and room code.
 * E.g., formatHostPeerId('bingo', 'K7M4QX') -> 'p2pgames-bingo-K7M4QX'
 */
export function formatHostPeerId(game: string, roomCode: string): string {
  const cleanGame = game.toLowerCase().trim()
  const cleanCode = normalizeRoomCode(roomCode)
  return `${ROOM_CODE_PREFIX}-${cleanGame}-${cleanCode}`
}

/**
 * Normalizes user input for room codes: removes spaces/hyphens and converts to uppercase.
 */
export function normalizeRoomCode(code: string): string {
  return code.replace(/[\s-_]/g, '').toUpperCase()
}

/**
 * Extracts an exact 6-character room code from either a full peer ID, URL, or raw code.
 * Returns null if the string does not contain an unambiguous 6-char room code.
 */
export function extractRoomCode(input: string): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null

  // Match namespaced peer ID: p2pgames-<game>-<CODE>
  const prefixMatch = trimmed.match(
    new RegExp(`^${ROOM_CODE_PREFIX}-[a-z0-9]+-(${CODE_CHARS_REGEX})$`, 'i')
  )
  if (prefixMatch) {
    return prefixMatch[1].toUpperCase()
  }

  // Match code from URL query param: room=CODE or match=CODE
  const urlParamMatch = trimmed.match(
    new RegExp(`[?&](?:room|match)=(${CODE_CHARS_REGEX})(?:&|$)`, 'i')
  )
  if (urlParamMatch) {
    return urlParamMatch[1].toUpperCase()
  }

  // Raw code of exactly 6 characters from the unambiguous alphabet
  const normalized = normalizeRoomCode(trimmed)
  if (new RegExp(`^${CODE_CHARS_REGEX}$`, 'i').test(normalized)) {
    return normalized.toUpperCase()
  }

  return null
}

/**
 * Resolves a guest target peer ID from user input or URL query params.
 *
 * - If input is a short room code (e.g. "K7M4QX"), formats it as `p2pgames-<game>-K7M4QX`.
 * - If input is already namespaced (`p2pgames-<game>-<CODE>`), validates game segment.
 * - If input is a legacy UUID, returns it as-is.
 * - Otherwise returns undefined.
 */
export function resolveTargetPeerId(game: string, input?: string | null): string | undefined {
  if (!input) return undefined
  const trimmed = input.trim()
  if (!trimmed) return undefined

  const cleanGame = game.toLowerCase().trim()

  // If starts with namespaced prefix
  if (trimmed.toLowerCase().startsWith(`${ROOM_CODE_PREFIX}-`)) {
    const match = trimmed.match(
      new RegExp(`^${ROOM_CODE_PREFIX}-([a-z0-9]+)-(${CODE_CHARS_REGEX})$`, 'i')
    )
    if (match) {
      const matchGame = match[1].toLowerCase()
      if (matchGame === cleanGame) {
        return `${ROOM_CODE_PREFIX}-${cleanGame}-${match[2].toUpperCase()}`
      }
    }
    // Prefix present but game does not match or code is invalid
    return undefined
  }

  // Check if it's a legacy UUID (e.g. from ?match=<uuid>)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return trimmed
  }

  // If it matches an extracted room code, namespace it for this game
  const code = extractRoomCode(trimmed)
  if (code) {
    return formatHostPeerId(cleanGame, code)
  }

  return undefined
}

/**
 * Generates an invite URL using ?room=CODE if a room code can be derived,
 * or falling back to ?match=<id> for legacy peer IDs.
 */
export function createGameInviteUrl(
  origin: string,
  gamePath: string,
  peerIdOrCode: string
): string {
  const code = extractRoomCode(peerIdOrCode)
  const base = origin.replace(/\/$/, '')
  const path = gamePath.startsWith('/') ? gamePath : `/${gamePath}`

  if (code) {
    return `${base}${path}?room=${code}`
  }

  return `${base}${path}?match=${encodeURIComponent(peerIdOrCode)}`
}
