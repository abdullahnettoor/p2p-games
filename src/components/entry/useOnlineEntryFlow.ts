import { useState, useEffect, useRef, useCallback } from 'react'
import { StrangerMatchmaker, StrangerMatchResult } from '@/core/matchmaking/strangerMatch'
import { PlayerRole } from '@/core/games/types'
import { EntryScreen } from './types'

export interface EntryLobbyLifecycle {
  start?: () => Promise<void> | void
  destroy: () => void
}

export interface UseOnlineEntryFlowOptions<TLobby> {
  gameId: string
  initialAction?: 'create' | null
  initialRoomCode?: string | null
  initialMatchId?: string | null
  createFriendLobby: (role: PlayerRole, targetOrRoomCode?: string) => TLobby
  createStrangerLobby: (result: StrangerMatchResult) => TLobby
  startLobby?: (lobby: TLobby) => void | Promise<void>
  destroyLobby?: (lobby: TLobby) => void
  onExit?: () => void
}

export function updateEntryBrowserUrl(url: string) {
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', url)
  }
}

/**
 * Extracts entry query parameters (?room=, ?match=, ?action=) from URL search string.
 */
export function getEntryUrlParams(customSearch?: string): {
  action: 'create' | null
  roomOrMatch: string | null
} {
  if (typeof window === 'undefined' && !customSearch) {
    return { action: null, roomOrMatch: null }
  }
  try {
    const queryString =
      customSearch ?? (typeof window !== 'undefined' ? window.location.search : '')
    const params = new URLSearchParams(queryString)
    const roomOrMatch = params.get('room') || params.get('match') || null
    const action = params.get('action') === 'create' ? 'create' : null
    return { action, roomOrMatch }
  } catch {
    return { action: null, roomOrMatch: null }
  }
}

export function useOnlineEntryFlow<TLobby>({
  gameId,
  initialAction,
  initialRoomCode,
  initialMatchId,
  createFriendLobby,
  createStrangerLobby,
  startLobby,
  destroyLobby,
  onExit,
}: UseOnlineEntryFlowOptions<TLobby>) {
  // Capture initial URL or prop target and action once on mount
  const initialMountParamsRef = useRef<{
    target: string | null
    action: string | null
  } | null>(null)

  if (!initialMountParamsRef.current) {
    const explicitTarget = initialRoomCode || initialMatchId || null
    const explicitAction = initialAction ?? null

    const resolvedTarget =
      explicitTarget ||
      (initialRoomCode === undefined && initialMatchId === undefined
        ? getEntryUrlParams().roomOrMatch
        : null)

    const resolvedAction =
      explicitAction ||
      (initialAction === undefined ? getEntryUrlParams().action : null)

    initialMountParamsRef.current = {
      target: resolvedTarget,
      action: resolvedAction,
    }
  }

  const { target: resolvedTarget, action: resolvedAction } = initialMountParamsRef.current

  const getInitialScreen = (): EntryScreen => {
    if (resolvedTarget) return 'guest-lobby'
    if (resolvedAction === 'create') return 'create-room'
    return 'choice'
  }

  const [screen, setScreen] = useState<EntryScreen>(getInitialScreen)
  const [isStrangerMatch, setIsStrangerMatch] = useState(false)
  const [strangerStatus, setStrangerStatus] = useState<'searching' | 'timeout' | 'error'>('searching')
  const [strangerError, setStrangerError] = useState<string | null>(null)
  const [strangerElapsed, setStrangerElapsed] = useState(0)
  const [joinCodeError, setJoinCodeError] = useState<string | null>(null)

  const activeRef = useRef(true)
  const lobbyRef = useRef<TLobby | null>(null)
  const strangerMatchmakerRef = useRef<StrangerMatchmaker | null>(null)
  const searchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startLobbyRef = useRef(startLobby)
  startLobbyRef.current = startLobby
  const destroyLobbyRef = useRef(destroyLobby)
  destroyLobbyRef.current = destroyLobby

  const clearSearchTimer = useCallback(() => {
    if (searchIntervalRef.current) {
      clearInterval(searchIntervalRef.current)
      searchIntervalRef.current = null
    }
  }, [])

  const cancelStrangerSearch = useCallback(() => {
    clearSearchTimer()
    const matchmaker = strangerMatchmakerRef.current
    strangerMatchmakerRef.current = null
    matchmaker?.cancel()
  }, [clearSearchTimer])

  const [lobbyCoordinator, setLobbyCoordinator] = useState<TLobby | null>(null)

  const destroyCurrentLobby = useCallback(() => {
    if (lobbyRef.current) {
      const prev = lobbyRef.current
      lobbyRef.current = null
      if (destroyLobbyRef.current) {
        destroyLobbyRef.current(prev)
      } else if (typeof (prev as any).destroy === 'function') {
        ;(prev as any).destroy()
      }
    }
    setLobbyCoordinator(null)
  }, [])

  const activateLobby = useCallback((lobby: TLobby) => {
    if (lobbyRef.current && lobbyRef.current !== lobby) {
      const prev = lobbyRef.current
      if (destroyLobbyRef.current) {
        destroyLobbyRef.current(prev)
      } else if (typeof (prev as any).destroy === 'function') {
        ;(prev as any).destroy()
      }
    }

    lobbyRef.current = lobby
    setLobbyCoordinator(lobby)

    const init = async () => {
      try {
        if (startLobbyRef.current) {
          await startLobbyRef.current(lobby)
        } else if (typeof (lobby as any).start === 'function') {
          await (lobby as any).start()
        }
      } catch (err) {
        if (activeRef.current) {
          console.error('[useOnlineEntryFlow] Failed to start lobby:', err)
        }
      }
    }

    init()
  }, [])

  // Auto-create and start lobby on initial mount if target or action is specified (StrictMode-safe)
  useEffect(() => {
    if (!resolvedTarget && resolvedAction !== 'create') return

    let cancelled = false
    const lobby = resolvedTarget
      ? createFriendLobby('guest', resolvedTarget)
      : createFriendLobby('host')

    lobbyRef.current = lobby
    setLobbyCoordinator(lobby)

    const initLobby = async () => {
      try {
        if (startLobbyRef.current) {
          await startLobbyRef.current(lobby)
        } else if (typeof (lobby as any).start === 'function') {
          await (lobby as any).start()
        }
      } catch (err) {
        if (!cancelled && activeRef.current) {
          console.error('[useOnlineEntryFlow] Failed to start lobby:', err)
        }
      }
    }

    initLobby()

    return () => {
      cancelled = true
      if (destroyLobbyRef.current) {
        destroyLobbyRef.current(lobby)
      } else if (typeof (lobby as any).destroy === 'function') {
        ;(lobby as any).destroy()
      }
      if (lobbyRef.current === lobby) {
        lobbyRef.current = null
      }
      setLobbyCoordinator(null)
    }
  }, [resolvedTarget, resolvedAction, createFriendLobby])

  // Cleanup on unmount or beforeunload
  useEffect(() => {
    activeRef.current = true
    const handleBeforeUnload = () => {
      strangerMatchmakerRef.current?.cancel()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      activeRef.current = false
      window.removeEventListener('beforeunload', handleBeforeUnload)
      clearSearchTimer()
      strangerMatchmakerRef.current?.cancel()
      strangerMatchmakerRef.current = null
      if (lobbyRef.current) {
        const prev = lobbyRef.current
        lobbyRef.current = null
        if (destroyLobbyRef.current) {
          destroyLobbyRef.current(prev)
        } else if (typeof (prev as any).destroy === 'function') {
          ;(prev as any).destroy()
        }
      }
    }
  }, [clearSearchTimer])

  const handleCreateRoom = useCallback(() => {
    clearSearchTimer()
    strangerMatchmakerRef.current?.cancel()
    strangerMatchmakerRef.current = null
    setIsStrangerMatch(false)
    updateEntryBrowserUrl(`/${gameId}?action=create`)
    const lobby = createFriendLobby('host')
    activateLobby(lobby)
    setScreen('create-room')
  }, [gameId, createFriendLobby, clearSearchTimer, activateLobby])

  const handleOpenJoinCode = useCallback(() => {
    cancelStrangerSearch()
    destroyCurrentLobby()
    setJoinCodeError(null)
    setScreen('join-code')
    updateEntryBrowserUrl(`/${gameId}`)
  }, [gameId, cancelStrangerSearch, destroyCurrentLobby])

  const handleJoinCodeSubmit = useCallback(
    (cleanCode: string) => {
      cancelStrangerSearch()
      setIsStrangerMatch(false)
      updateEntryBrowserUrl(`/${gameId}?room=${encodeURIComponent(cleanCode)}`)
      const lobby = createFriendLobby('guest', cleanCode)
      activateLobby(lobby)
      setScreen('guest-lobby')
    },
    [gameId, createFriendLobby, cancelStrangerSearch, activateLobby]
  )

  const handleTryAnotherCode = handleOpenJoinCode

  const startStrangerSearch = useCallback(async () => {
    destroyCurrentLobby()
    cancelStrangerSearch()

    setStrangerStatus('searching')
    setStrangerError(null)
    setStrangerElapsed(0)
    setScreen('stranger-search')
    updateEntryBrowserUrl(`/${gameId}`)

    searchIntervalRef.current = setInterval(() => {
      setStrangerElapsed((prev) => prev + 1)
    }, 1000)

    const matchmaker = new StrangerMatchmaker({ gameId })
    strangerMatchmakerRef.current = matchmaker

    try {
      const matchResult = await matchmaker.findMatch()
      if (strangerMatchmakerRef.current !== matchmaker || !activeRef.current) {
        matchResult.transport.disconnect()
        return
      }
      strangerMatchmakerRef.current = null
      clearSearchTimer()
      setIsStrangerMatch(true)
      const strangerLobby = createStrangerLobby(matchResult)
      activateLobby(strangerLobby)
      setScreen('stranger-lobby')
    } catch (err) {
      if (strangerMatchmakerRef.current !== matchmaker) return
      strangerMatchmakerRef.current = null
      clearSearchTimer()
      if (!activeRef.current) return
      if (matchmaker.status === 'timeout') {
        setStrangerStatus('timeout')
        setStrangerError(null)
      } else {
        setStrangerStatus('error')
        const message = err instanceof Error ? err.message : 'Matchmaking connection failed.'
        setStrangerError(message)
      }
    }
  }, [gameId, createStrangerLobby, cancelStrangerSearch, clearSearchTimer, destroyCurrentLobby, activateLobby])

  const handleCancelStrangerSearch = useCallback(() => {
    cancelStrangerSearch()
    setScreen('choice')
    updateEntryBrowserUrl(`/${gameId}`)
  }, [gameId, cancelStrangerSearch])

  const handleBackToChoice = useCallback(() => {
    destroyCurrentLobby()
    cancelStrangerSearch()
    setIsStrangerMatch(false)
    setScreen('choice')
    updateEntryBrowserUrl(`/${gameId}`)
  }, [gameId, cancelStrangerSearch, destroyCurrentLobby])

  return {
    screen,
    setScreen,
    isStrangerMatch,
    setIsStrangerMatch,
    lobbyCoordinator,
    setLobbyCoordinator,
    lobbyRef,
    strangerStatus,
    strangerError,
    strangerElapsed,
    joinCodeError,
    setJoinCodeError,
    handleCreateRoom,
    handleOpenJoinCode,
    handleJoinCodeSubmit,
    handleTryAnotherCode,
    startStrangerSearch,
    handleCancelStrangerSearch,
    handleBackToChoice,
    cancelStrangerSearch,
  }
}
