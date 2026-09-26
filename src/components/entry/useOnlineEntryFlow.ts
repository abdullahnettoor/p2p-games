import { useState, useEffect, useRef, useCallback } from 'react'
import { StrangerMatchmaker, StrangerMatchResult } from '@/core/matchmaking/strangerMatch'
import { PlayerRole } from '@/core/games/types'
import { EntryScreen } from './types'

export interface EntryLobbyLifecycle {
  start?: () => Promise<void> | void
  destroy: () => void
}

export interface UseOnlineEntryFlowOptions<TLobby extends EntryLobbyLifecycle> {
  gameId: string
  initialAction?: 'create' | null
  initialRoomCode?: string | null
  initialMatchId?: string | null
  createFriendLobby: (role: PlayerRole, targetOrRoomCode?: string) => TLobby
  createStrangerLobby: (result: StrangerMatchResult) => TLobby
  startLobby?: (lobby: TLobby) => void | Promise<void>
  destroyLobby?: (lobby: TLobby) => void
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

export function useOnlineEntryFlow<TLobby extends EntryLobbyLifecycle>({
  gameId,
  initialAction,
  initialRoomCode,
  initialMatchId,
  createFriendLobby,
  createStrangerLobby,
  startLobby,
  destroyLobby,
}: UseOnlineEntryFlowOptions<TLobby>) {
  // Resolve target (room or match) and action from explicit options or URL parameters
  const explicitTarget = initialRoomCode || initialMatchId || null
  const explicitAction = initialAction ?? null

  // Read URL query parameters once per render only when explicit props are omitted
  const urlParams =
    initialRoomCode === undefined && initialMatchId === undefined && initialAction === undefined
      ? getEntryUrlParams()
      : null

  const resolvedTarget = explicitTarget || urlParams?.roomOrMatch || null
  const resolvedAction = explicitAction || urlParams?.action || null

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
  const initialLobbyCreatedRef = useRef(false)
  const destroyedLobbiesRef = useRef(new WeakSet<TLobby>())
  const startedLobbiesRef = useRef(new WeakSet<TLobby>())

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

  // Initialize friend lobby in an effect to avoid side-effects in useState initializers (StrictMode-safe)
  useEffect(() => {
    if (initialLobbyCreatedRef.current) return
    initialLobbyCreatedRef.current = true

    if (resolvedTarget) {
      const lobby = createFriendLobby('guest', resolvedTarget)
      setLobbyCoordinator(lobby)
    } else if (resolvedAction === 'create') {
      const lobby = createFriendLobby('host')
      setLobbyCoordinator(lobby)
    }
  }, [resolvedTarget, resolvedAction, createFriendLobby])

  // Manage lobby lifecycle
  useEffect(() => {
    if (!lobbyCoordinator) return
    if (destroyedLobbiesRef.current.has(lobbyCoordinator)) {
      return
    }
    if (startedLobbiesRef.current.has(lobbyCoordinator)) {
      return
    }
    startedLobbiesRef.current.add(lobbyCoordinator)

    let cancelled = false
    activeRef.current = true
    lobbyRef.current = lobbyCoordinator

    const initLobby = async () => {
      try {
        if (startLobbyRef.current) {
          await startLobbyRef.current(lobbyCoordinator)
        } else if (typeof lobbyCoordinator.start === 'function') {
          await lobbyCoordinator.start()
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
      destroyedLobbiesRef.current.add(lobbyCoordinator)
      if (destroyLobbyRef.current) {
        destroyLobbyRef.current(lobbyCoordinator)
      } else if (typeof lobbyCoordinator.destroy === 'function') {
        lobbyCoordinator.destroy()
      }
      if (lobbyRef.current === lobbyCoordinator) {
        lobbyRef.current = null
      }
    }
  }, [lobbyCoordinator])

  // Cleanup on unmount or beforeunload
  useEffect(() => {
    activeRef.current = true
    const handleBeforeUnload = () => {
      cancelStrangerSearch()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      activeRef.current = false
      window.removeEventListener('beforeunload', handleBeforeUnload)
      cancelStrangerSearch()
    }
  }, [cancelStrangerSearch])

  const handleCreateRoom = useCallback(() => {
    cancelStrangerSearch()
    setIsStrangerMatch(false)
    updateEntryBrowserUrl(`/${gameId}?action=create`)
    const lobby = createFriendLobby('host')
    setLobbyCoordinator(lobby)
    setScreen('create-room')
  }, [gameId, createFriendLobby, cancelStrangerSearch])

  const handleOpenJoinCode = useCallback(() => {
    cancelStrangerSearch()
    setLobbyCoordinator(null)
    setJoinCodeError(null)
    setScreen('join-code')
    updateEntryBrowserUrl(`/${gameId}`)
  }, [gameId, cancelStrangerSearch])

  const handleJoinCodeSubmit = useCallback(
    (cleanCode: string) => {
      cancelStrangerSearch()
      setIsStrangerMatch(false)
      updateEntryBrowserUrl(`/${gameId}?room=${encodeURIComponent(cleanCode)}`)
      const lobby = createFriendLobby('guest', cleanCode)
      setLobbyCoordinator(lobby)
      setScreen('guest-lobby')
    },
    [gameId, createFriendLobby, cancelStrangerSearch]
  )

  const handleTryAnotherCode = handleOpenJoinCode

  const startStrangerSearch = useCallback(async () => {
    setLobbyCoordinator(null)
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
      setLobbyCoordinator(strangerLobby)
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
  }, [gameId, createStrangerLobby, cancelStrangerSearch, clearSearchTimer])

  const handleCancelStrangerSearch = useCallback(() => {
    cancelStrangerSearch()
    setScreen('choice')
    updateEntryBrowserUrl(`/${gameId}`)
  }, [gameId, cancelStrangerSearch])

  const handleBackToChoice = useCallback(() => {
    setLobbyCoordinator(null)
    cancelStrangerSearch()
    setIsStrangerMatch(false)
    setScreen('choice')
    updateEntryBrowserUrl(`/${gameId}`)
  }, [gameId, cancelStrangerSearch])

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
