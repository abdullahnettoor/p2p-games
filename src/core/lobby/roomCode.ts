/**
 * Room code utilities for human-friendly match codes.
 *
 * Uses an unambiguous alphabet (excluding 0, O, 1, I, L) to avoid transcription
 * errors when reading or typing codes across devices.
 */

export const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const ROOM_CODE_LENGTH = 6
export const ROOM_CODE_PREFIX = 'p2pgames'

/**
 * Generates a random uppercase room code using the unambiguous alphabet.
 */
export function generateRoomCode(length: number = ROOM_CODE_LENGTH): string {
  let result = ''
  const alphabetLength = ROOM_CODE_ALPHABET.length

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length)
    crypto.getRandomValues(bytes)
    for (let i = 0; i < length; i++) {
      result += ROOM_CODE_ALPHABET[bytes[i] % alphabetLength]
    }
    return result
  }

  for (let i = 0; i < length; i++) {
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
 * Extracts a 6-character room code from either a full peer ID, URL, or raw code.
 * Returns null if the string does not contain a recognizable room code.
 */
export function extractRoomCode(input: string): string | null {
  if (!input) return null
  const trimmed = input.trim()

  // Match namespaced peer ID: p2pgames-<game>-<CODE>
  const prefixMatch = trimmed.match(new RegExp(`^${ROOM_CODE_PREFIX}-[a-z0-9]+-([A-Z0-9]{4,8})$`, 'i'))
  if (prefixMatch) {
    return prefixMatch[1].toUpperCase()
  }

  // Match code from URL query param: room=CODE or match=CODE
  const urlParamMatch = trimmed.match(/[?&](?:room|match)=([A-Za-z0-9]{4,8})(?:&|$)/)
  if (urlParamMatch) {
    return urlParamMatch[1].toUpperCase()
  }

  // Raw alphanumeric code between 4 and 8 chars (excluding UUIDs which contain multiple dashes)
  const normalized = normalizeRoomCode(trimmed)
  if (/^[A-Z0-9]{4,8}$/.test(normalized)) {
    return normalized
  }

  return null
}

/**
 * Resolves a guest target peer ID from user input or URL query params.
 *
 * - If input is a short room code (e.g. "K7M4QX"), formats it as `p2pgames-<game>-K7M4QX`.
 * - If input is already namespaced (`p2pgames-...`), returns it.
 * - If input is a legacy UUID or raw peer ID (e.g. from ?match=<uuid>), returns it as-is.
 */
export function resolveTargetPeerId(game: string, input?: string | null): string | undefined {
  if (!input) return undefined
  const trimmed = input.trim()
  if (!trimmed) return undefined

  // If already starts with the prefix, return as-is
  if (trimmed.startsWith(`${ROOM_CODE_PREFIX}-`)) {
    return trimmed
  }

  // If it's a UUID or legacy string (contains hyphens and is > 10 chars), return as-is
  if (trimmed.includes('-') && trimmed.length > 10) {
    return trimmed
  }

  // If it matches an extracted room code, namespace it for this game
  const code = extractRoomCode(trimmed)
  if (code) {
    return formatHostPeerId(game, code)
  }

  // Fallback to raw string
  return trimmed
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
