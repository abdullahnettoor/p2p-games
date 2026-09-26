import { PeerJSTransport } from '@/core/transport/PeerJSTransport'
import { extractRoomCode } from './roomCode'

/**
 * How long after the last save a cached Match can still be resumed. It matches
 * the reconnect grace (ADR 0005): after that the other Player has already
 * ended the Match.
 */
export const RESUME_WINDOW_MS = 30_000

export interface ResumablePlayers {
  localPlayer: { id: string; role: 'host' | 'guest' }
  remotePlayer: { id: string; role: 'host' | 'guest' }
  updatedAt: number
}

/**
 * A cached Match can be resumed after a reload when it is recent and was a
 * friend Match. Stranger Hosts give up their broker slot once paired, so
 * their peer id can't be reclaimed safely.
 */
export function isResumable(cached: ResumablePlayers | null, now: number = Date.now()): boolean {
  if (!cached?.localPlayer?.id || !cached.remotePlayer?.id) return false
  if (typeof cached.updatedAt !== 'number' || now - cached.updatedAt > RESUME_WINDOW_MS) return false
  const hostId = cached.localPlayer.role === 'host' ? cached.localPlayer.id : cached.remotePlayer.id
  return extractRoomCode(hostId) !== null
}

/**
 * Builds a transport that reconnects to the same Match after a reload: it
 * reclaims this Player's previous peer id, and a Guest redials the Host.
 */
export function createResumeTransport(cached: ResumablePlayers): PeerJSTransport {
  const isHost = cached.localPlayer.role === 'host'
  const transport = new PeerJSTransport({
    role: cached.localPlayer.role,
    localPlayerId: cached.localPlayer.id,
    targetPeerId: isHost ? undefined : cached.remotePlayer.id,
    reclaimLocalId: true,
  })
  if (!isHost) transport.setAutoRedial(true)
  return transport
}

/** Calls `save` when the page is being hidden or unloaded, so the cache stays fresh. */
export function onPageHide(save: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => save()
  window.addEventListener('pagehide', handler)
  return () => window.removeEventListener('pagehide', handler)
}
