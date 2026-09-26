import { useState, useEffect, useRef, useCallback } from 'react'
import { StrangerMatchmaker, StrangerMatchResult } from '@/core/matchmaking/strangerMatch'
import { PlayerRole } from '@/core/games/types'
import { EntryScreen } from './types'

export interface UseOnlineEntryFlowOptions<TLobby> {
  gameId: string
  initialAction?: 'create' | null
  initialRoomCode?: string | null
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

export function useOnlineEntryFlow<TLobby>({
  gameId,
  initialAction = null,
  initialRoomCode = null,
  createFriendLobby,
  createStrangerLobby,
  startLobby,
  destroyLobby,
  onExit,
}: UseOnlineEntryFlowOptions<TLobby>) {
  const getInitialScreen = (): EntryScreen => {
    if (initialRoomCode) return 'guest-lobby'
    if (initialAction === 'create') return 'create-room'
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

  const clearSearchTimer = () => {
    if (searchIntervalRef.current) {
      clearInterval(searchIntervalRef.current)
      searchIntervalRef.current = null
    }
  }

  // Initial lobby coordinator is ONLY created if initialRoomCode or initialAction is present!
  const [lobbyCoordinator, setLobbyCoordinator] = useState<TLobby | null>(() => {
    if (initialRoomCode) {
      return createFriendLobby('guest', initialRoomCode)
    }
    if (initialAction === 'create') {
      return createFriendLobby('host')
    }
    return null
  })

  // Manage lobby lifecycle
  useEffect(() => {
    if (!lobbyCoordinator) return
    activeRef.current = true
    lobbyRef.current = lobbyCoordinator

    if (startLobbyRef.current) {
      startLobbyRef.current(lobbyCoordinator)
    } else if (typeof (lobbyCoordinator as any).start === 'function') {
      ;(lobbyCoordinator as any).start().catch(() => {})
    }

    return () => {
      if (destroyLobbyRef.current) {
        destroyLobbyRef.current(lobbyCoordinator)
      } else if (typeof (lobbyCoordinator as any).destroy === 'function') {
        ;(lobbyCoordinator as any).destroy()
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
      strangerMatchmakerRef.current?.cancel()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      activeRef.current = false
      window.removeEventListener('beforeunload', handleBeforeUnload)
      clearSearchTimer()
      strangerMatchmakerRef.current?.cancel()
      strangerMatchmakerRef.current = null
    }
  }, [])

  const handleCreateRoom = useCallback(() => {
    clearSearchTimer()
    strangerMatchmakerRef.current?.cancel()
    strangerMatchmakerRef.current = null
    setIsStrangerMatch(false)
    updateEntryBrowserUrl(`/${gameId}?action=create`)
    const lobby = createFriendLobby('host')
    setLobbyCoordinator(lobby)
    setScreen('create-room')
  }, [gameId, createFriendLobby])

  const handleOpenJoinCode = useCallback(() => {
    setLobbyCoordinator(null)
    setJoinCodeError(null)
    setScreen('join-code')
    updateEntryBrowserUrl(`/${gameId}`)
  }, [gameId])

  const handleJoinCodeSubmit = useCallback(
    (cleanCode: string) => {
      setIsStrangerMatch(false)
      updateEntryBrowserUrl(`/${gameId}?room=${encodeURIComponent(cleanCode)}`)
      const lobby = createFriendLobby('guest', cleanCode)
      setLobbyCoordinator(lobby)
      setScreen('guest-lobby')
    },
    [gameId, createFriendLobby]
  )

  const handleTryAnotherCode = useCallback(() => {
    setLobbyCoordinator(null)
    setJoinCodeError(null)
    setScreen('join-code')
    updateEntryBrowserUrl(`/${gameId}`)
  }, [gameId])

  const cancelStrangerSearch = useCallback(() => {
    clearSearchTimer()
    const matchmaker = strangerMatchmakerRef.current
    strangerMatchmakerRef.current = null
    matchmaker?.cancel()
  }, [])

  const startStrangerSearch = useCallback(async () => {
    setLobbyCoordinator(null)
    clearSearchTimer()
    strangerMatchmakerRef.current?.cancel()
    strangerMatchmakerRef.current = null

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
  }, [gameId, createStrangerLobby])

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
