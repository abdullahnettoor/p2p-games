import { PlayerRole } from '../games/types'
import {
  ITransport,
  HostRejectedError,
} from '../transport/types'
import { PeerJSTransport, PeerJSTransportOptions, isPeerUnavailable } from '../transport/PeerJSTransport'
import { generateStrangerName } from './strangerNames'

export const DEFAULT_SLOT_COUNT = 4
export const DEFAULT_PROBE_TIMEOUT_MS = 2500
export const DEFAULT_SEARCH_TIMEOUT_MS = 60000

export type StrangerMatchStatus =
  | 'idle'
  | 'probing'
  | 'claiming'
  | 'waiting'
  | 'matched'
  | 'cancelled'
  | 'timeout'
  | 'error'

export interface StrangerMatchResult {
  transport: ITransport
  role: PlayerRole
  localPeerId: string
  remotePeerId: string
  strangerName: string
}

export interface StrangerMatchmakerOptions {
  gameId: string
  slotCount?: number
  slotPrefix?: string
  probeTimeoutMs?: number
  searchTimeoutMs?: number
  createTransport?: (options: PeerJSTransportOptions) => ITransport
  onStatusChange?: (status: StrangerMatchStatus, detail?: string) => void
  randomFn?: () => number
}

export function getSlotPeerId(gameId: string, slotIndex: number, slotPrefix?: string): string {
  const prefix = slotPrefix ?? `p2pgames-${gameId}-q`
  return `${prefix}-${slotIndex}`
}

export function isIdTakenError(err: unknown): boolean {
  if (!err) return false
  const errorObj = err as { type?: string; message?: string }
  return (
    errorObj.type === 'unavailable-id' ||
    (typeof errorObj.message === 'string' &&
      (errorObj.message.includes('unavailable-id') ||
        errorObj.message.includes('ID taken') ||
        errorObj.message.includes('is taken')))
  )
}

export class StrangerMatchmaker {
  public status: StrangerMatchStatus = 'idle'
  private gameId: string
  private slotCount: number
  private slotPrefix?: string
  private probeTimeoutMs: number
  private searchTimeoutMs: number
  private createTransport: (options: PeerJSTransportOptions) => ITransport
  private onStatusChange?: (status: StrangerMatchStatus, detail?: string) => void
  private randomFn: () => number

  private isCancelled = false
  private currentTransport: ITransport | null = null
  private cancelWait: (() => void) | null = null
  private searchTimer: ReturnType<typeof setTimeout> | null = null

  constructor(options: StrangerMatchmakerOptions) {
    this.gameId = options.gameId
    this.slotCount = options.slotCount ?? DEFAULT_SLOT_COUNT
    this.slotPrefix = options.slotPrefix
    this.probeTimeoutMs = options.probeTimeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS
    this.searchTimeoutMs = options.searchTimeoutMs ?? DEFAULT_SEARCH_TIMEOUT_MS
    this.createTransport =
      options.createTransport ?? ((opts) => new PeerJSTransport(opts))
    this.onStatusChange = options.onStatusChange
    this.randomFn = options.randomFn ?? Math.random
  }

  private setStatus(status: StrangerMatchStatus, detail?: string): void {
    this.status = status
    this.onStatusChange?.(status, detail)
  }

  private shuffleIndices(count: number): number[] {
    const indices = Array.from({ length: count }, (_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(this.randomFn() * (i + 1))
      const temp = indices[i]
      indices[i] = indices[j]
      indices[j] = temp
    }
    return indices
  }

  public async findMatch(): Promise<StrangerMatchResult> {
    this.isCancelled = false
    const strangerName = generateStrangerName()

    return new Promise<StrangerMatchResult>((resolve, reject) => {
      let isSettled = false

      const safeResolve = (result: StrangerMatchResult) => {
        if (isSettled) return
        isSettled = true
        this.clearSearchTimer()
        this.setStatus('matched')
        resolve(result)
      }

      const safeReject = (err: Error) => {
        if (isSettled) return
        isSettled = true
        this.clearSearchTimer()
        reject(err)
      }

      this.searchTimer = setTimeout(() => {
        if (isSettled) return
        this.cancelInternal('timeout')
        safeReject(new Error('Matchmaking timeout: no opponent found'))
      }, this.searchTimeoutMs)

      const runLoop = async () => {
        while (!this.isCancelled && !isSettled) {
          // Phase 1: Probe existing slots as guest
          const probeSlots = this.shuffleIndices(this.slotCount)
          for (const slotIndex of probeSlots) {
            if (this.isCancelled || isSettled) return

            const matchedResult = await this.probeSlotAsGuest(slotIndex, strangerName)
            if (matchedResult) {
              safeResolve(matchedResult)
              return
            }
          }

          if (this.isCancelled || isSettled) return

          // Phase 2: Attempt to claim an empty slot as host
          const claimSlots = this.shuffleIndices(this.slotCount)
          for (const slotIndex of claimSlots) {
            if (this.isCancelled || isSettled) return

            const claimedResult = await this.claimSlotAsHost(slotIndex, strangerName)
            if (claimedResult) {
              safeResolve(claimedResult)
              return
            }
          }

          // If all slots failed to claim or join, wait briefly before retrying
          if (!this.isCancelled && !isSettled) {
            await new Promise((r) => setTimeout(r, 600))
          }
        }
      }

      runLoop().catch((err) => {
        if (!isSettled) {
          this.setStatus('error', err instanceof Error ? err.message : String(err))
          safeReject(err instanceof Error ? err : new Error(String(err)))
        }
      })
    })
  }

  private async probeSlotAsGuest(
    slotIndex: number,
    strangerName: string
  ): Promise<StrangerMatchResult | null> {
    const targetPeerId = getSlotPeerId(this.gameId, slotIndex, this.slotPrefix)
    this.setStatus('probing', targetPeerId)

    const guest = this.createTransport({
      role: 'guest',
      targetPeerId,
    })
    this.currentTransport = guest

    return new Promise<StrangerMatchResult | null>((resolve) => {
      let settled = false
      let probeTimer: ReturnType<typeof setTimeout> | null = null

      const cleanup = () => {
        if (probeTimer) {
          clearTimeout(probeTimer)
          probeTimer = null
        }
        if (this.currentTransport === guest) {
          this.currentTransport = null
        }
      }

      const finish = (result: StrangerMatchResult | null) => {
        if (settled) return
        settled = true
        cleanup()
        if (!result) {
          guest.disconnect()
        }
        resolve(result)
      }

      probeTimer = setTimeout(() => {
        finish(null)
      }, this.probeTimeoutMs)

      guest.onError((err) => {
        // peer-unavailable or HostRejectedError means slot is either empty or full
        finish(null)
      })

      guest.onStatusChange((newStatus) => {
        if (newStatus === 'connected') {
          const remotePeerId = guest.remotePlayerId || targetPeerId
          finish({
            transport: guest,
            role: 'guest',
            localPeerId: guest.localPlayerId,
            remotePeerId,
            strangerName,
          })
        }
      })

      guest.connect().catch((err) => {
        finish(null)
      })
    })
  }

  private async claimSlotAsHost(
    slotIndex: number,
    strangerName: string
  ): Promise<StrangerMatchResult | null> {
    const localPeerId = getSlotPeerId(this.gameId, slotIndex, this.slotPrefix)
    this.setStatus('claiming', localPeerId)

    const host = this.createTransport({
      role: 'host',
      localPlayerId: localPeerId,
      rejectExtraConnections: true,
    })
    this.currentTransport = host

    try {
      await host.connect()
    } catch (err) {
      host.disconnect()
      if (this.currentTransport === host) {
        this.currentTransport = null
      }

      // If ID is already taken, someone just claimed it — try joining as guest immediately
      if (isIdTakenError(err)) {
        return this.probeSlotAsGuest(slotIndex, strangerName)
      }
      return null
    }

    if (this.isCancelled) {
      host.disconnect()
      this.currentTransport = null
      return null
    }

    // Host claimed slot successfully! Now wait for an incoming guest
    this.setStatus('waiting', localPeerId)

    return new Promise<StrangerMatchResult | null>((resolve) => {
      let settled = false

      const finish = (result: StrangerMatchResult | null) => {
        if (settled) return
        settled = true
        this.cancelWait = null
        if (!result) {
          host.disconnect()
          if (this.currentTransport === host) {
            this.currentTransport = null
          }
        } else {
          // Release signaling so the broker slot is freed for the next waiting players
          try {
            host.releaseSignaling?.()
          } catch {
            // Safe ignore
          }
        }
        resolve(result)
      }

      this.cancelWait = () => {
        finish(null)
      }

      host.onPlayerJoin((guestId) => {
        finish({
          transport: host,
          role: 'host',
          localPeerId,
          remotePeerId: guestId,
          strangerName,
        })
      })

      host.onError(() => {
        finish(null)
      })

      // In case guest was already connected before listener attached
      if (host.remotePlayerId && host.status === 'connected') {
        finish({
          transport: host,
          role: 'host',
          localPeerId,
          remotePeerId: host.remotePlayerId,
          strangerName,
        })
      }
    })
  }

  private clearSearchTimer(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
      this.searchTimer = null
    }
  }

  private cancelInternal(reason: 'cancelled' | 'timeout'): void {
    this.isCancelled = true
    this.clearSearchTimer()

    if (this.cancelWait) {
      this.cancelWait()
      this.cancelWait = null
    }

    if (this.currentTransport) {
      try {
        this.currentTransport.disconnect()
      } catch {
        // Safe ignore
      }
      this.currentTransport = null
    }

    this.setStatus(reason)
  }

  public cancel(): void {
    this.cancelInternal('cancelled')
  }
}
