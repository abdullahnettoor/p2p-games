import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TicTacToeSeriesPicker } from './components/TicTacToeSeriesPicker'
import { TicTacToeMatchLobby } from './components/TicTacToeMatchLobby'
import { TicTacToeOnlineGame } from './components/TicTacToeOnlineGame'
import { LobbyCoordinator } from '@/core/lobby/LobbyCoordinator'
import { createLoopbackTransportPair } from '@/core/transport/LoopbackTransport'
import TicTacToePocPage from '@/app/(game)/tictactoe/poc/page'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
}))

describe('TicTacToeSeriesPicker', () => {
  it('renders interactive radio group for Host with default Best of 3', () => {
    const onSelect = vi.fn()
    render(
      <TicTacToeSeriesPicker
        length={3}
        isHost={true}
        onSelectLength={onSelect}
      />
    )

    expect(screen.getByTestId('series-picker-host')).toBeInTheDocument()
    const option1 = screen.getByTestId('series-option-1')
    const option3 = screen.getByTestId('series-option-3')
    const option5 = screen.getByTestId('series-option-5')

    expect(option3).toHaveAttribute('aria-checked', 'true')
    expect(option1).toHaveAttribute('aria-checked', 'false')
    expect(option5).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(option5)
    expect(onSelect).toHaveBeenCalledWith(5)

    fireEvent.click(option1)
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('renders read-only badge for Guest', () => {
    render(
      <TicTacToeSeriesPicker
        length={5}
        isHost={false}
      />
    )

    expect(screen.getByTestId('series-picker-guest')).toBeInTheDocument()
    expect(screen.getByTestId('guest-series-length')).toHaveTextContent('Best of 5')
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('renders nothing for stranger matches', () => {
    const { container } = render(
      <TicTacToeSeriesPicker
        length={3}
        isHost={true}
        isStranger={true}
      />
    )

    expect(container.firstChild).toBeNull()
  })
})

describe('TicTacToeMatchLobby', () => {
  it('initializes local player as ready once named and renders player marks', async () => {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()
    const hostSession = new LobbyCoordinator<null>({
      transport: hostTransport,
      playerName: 'Charlie',
      roomCode: 'ABCD12',
      validateSetup: () => true,
    })

    await act(async () => {
      await hostSession.start()
    })

    render(<TicTacToeMatchLobby session={hostSession} />)

    expect(screen.getByTestId('room-code')).toHaveTextContent('ABCD12')
    expect(screen.getByTestId('local-player-name')).toHaveTextContent('Charlie (You)')
    expect(screen.getByTestId('local-ready-badge')).toHaveTextContent('Ready')
    expect(screen.getByTestId('series-picker-host')).toBeInTheDocument()
  })

  it('un-readies both players when host changes series length and re-readies upon clicking Ready to Play', async () => {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()
    const hostSession = new LobbyCoordinator<null>({
      transport: hostTransport,
      playerName: 'HostAlice',
      validateSetup: () => true,
    })
    const guestSession = new LobbyCoordinator<null>({
      transport: guestTransport,
      playerName: 'GuestBob',
      validateSetup: () => true,
    })

    await act(async () => {
      await hostSession.start()
      await guestSession.start()
    })

    render(<TicTacToeMatchLobby session={hostSession} />)

    // Initially host is ready
    expect(hostSession.state.localPlayer.isReady).toBe(true)
    // Guest is not yet ready
    expect(guestSession.state.localPlayer.isReady).toBe(false)

    // Host changes series length to 5 before guest is ready
    const option5 = screen.getByTestId('series-option-5')
    act(() => {
      fireEvent.click(option5)
    })

    expect(hostSession.seriesLength).toBe(5)
    expect(hostSession.state.localPlayer.isReady).toBe(false)
    expect(guestSession.seriesLength).toBe(5)

    // Host sees the "Ready to Play" button
    const readyButton = screen.getByTestId('ready-button')
    expect(readyButton).toBeInTheDocument()

    act(() => {
      fireEvent.click(readyButton)
    })

    expect(hostSession.state.localPlayer.isReady).toBe(true)
  })

  it('hides invite pill and series picker in stranger matches', async () => {
    const [hostTransport] = createLoopbackTransportPair()
    const strangerSession = new LobbyCoordinator<null>({
      transport: hostTransport,
      playerName: 'Swift Otter',
      validateSetup: () => true,
      initialSeriesLength: 3,
    })

    await act(async () => {
      await strangerSession.start()
    })

    render(<TicTacToeMatchLobby session={strangerSession} isStrangerMatch={true} />)

    expect(screen.queryByTestId('room-code')).not.toBeInTheDocument()
    expect(screen.queryByTestId('series-picker-host')).not.toBeInTheDocument()
    expect(screen.queryByTestId('series-picker-guest')).not.toBeInTheDocument()
  })
})

describe('TicTacToeOnlineGame', () => {
  it('renders the choice screen with Tic-Tac-Toe heading and options', () => {
    render(<TicTacToeOnlineGame />)

    expect(screen.getByRole('heading', { name: 'Play Tic-Tac-Toe' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create a room/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /join with a code/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /play with a stranger/i })).toBeInTheDocument()
  })

  it('navigates to join code screen and allows typing code', () => {
    render(<TicTacToeOnlineGame />)

    fireEvent.click(screen.getByRole('button', { name: /join with a code/i }))
    expect(screen.getByRole('heading', { name: /join with a code/i })).toBeInTheDocument()

    const codeInput = screen.getByRole('textbox', { name: /room code/i })
    fireEvent.change(codeInput, { target: { value: 'XYZ123' } })
    expect(codeInput).toHaveValue('XYZ123')
  })

  it('mounts into host lobby when create room is clicked with mock override', async () => {
    const [hostTransport] = createLoopbackTransportPair()
    let mockLobby: LobbyCoordinator<null> | null = null

    render(
      <TicTacToeOnlineGame
        createFriendLobbyOverride={() => {
          mockLobby = new LobbyCoordinator<null>({
            transport: hostTransport,
            playerName: 'LocalPlayer',
            roomCode: 'MOCK12',
            validateSetup: () => true,
          })
          return mockLobby
        }}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create a room/i }))
    })

    expect(await screen.findByTestId('room-code')).toHaveTextContent('MOCK12')
    expect(screen.getByTestId('local-player-name')).toHaveTextContent('LocalPlayer (You)')
  })

  it('mounts directly into host lobby when ?action=create is in URL', async () => {
    window.history.replaceState(null, '', '/tictactoe?action=create')
    const [hostTransport, guestTransport] = createLoopbackTransportPair()

    try {
      render(
        <TicTacToeOnlineGame
          createFriendLobbyOverride={(role) => {
            const transport = role === 'host' ? hostTransport : guestTransport
            return new LobbyCoordinator<null>({
              transport,
              playerName: 'HostCreated',
              roomCode: 'HOST01',
              validateSetup: () => true,
            })
          }}
        />
      )

      expect(await screen.findByTestId('room-code')).toHaveTextContent('HOST01')
      expect(screen.getByTestId('local-player-name')).toHaveTextContent('HostCreated (You)')
    } finally {
      window.history.replaceState(null, '', '/')
    }
  })

  it('mounts directly into guest lobby when ?room=CODE is in URL', async () => {
    window.history.replaceState(null, '', '/tictactoe?room=ROOM99')
    const [hostTransport, guestTransport] = createLoopbackTransportPair()
    let passedTarget: string | undefined

    try {
      render(
        <TicTacToeOnlineGame
          createFriendLobbyOverride={(role, target) => {
            passedTarget = target
            const transport = role === 'host' ? hostTransport : guestTransport
            return new LobbyCoordinator<null>({
              transport,
              playerName: 'GuestJoined',
              roomCode: target,
              validateSetup: () => true,
            })
          }}
        />
      )

      expect(await screen.findByTestId('guest-series-length')).toHaveTextContent('Best of 3')
      expect(screen.getByTestId('local-player-name')).toHaveTextContent('GuestJoined (You)')
      expect(passedTarget).toBe('ROOM99')
    } finally {
      window.history.replaceState(null, '', '/')
    }
  })
})

describe('TicTacToePocPage', () => {
  it('renders POC view at /tictactoe/poc', () => {
    render(<TicTacToePocPage />)
    expect(screen.getByTestId('switch-to-primitives-link')).toBeInTheDocument()
    expect(screen.getByTestId('poc-status')).toBeInTheDocument()
  })
})
