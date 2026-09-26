import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react'
import {
  ChoiceScreen,
  JoinCodeScreen,
  StrangerSearchScreen,
  EntryRulesModal,
  EntryHeader,
  useOnlineEntryFlow,
  getEntryUrlParams,
  EntryRulesConfig,
} from './index'

describe('Shared Entry Components', () => {
  const sampleRules: EntryRulesConfig = {
    title: 'Test Game Rules',
    subtitle: 'Two-player test',
    ariaLabel: 'Test rules',
    closeAriaLabel: 'Close test rules',
    content: <p>Sample rules body content.</p>,
  }

  describe('EntryRulesModal', () => {
    it('renders dialog when isOpen is true and closes via button or Escape key', () => {
      const onClose = vi.fn()
      const { rerender } = render(
        <EntryRulesModal
          isOpen={true}
          onClose={onClose}
          rules={sampleRules}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Test Game Rules')).toBeInTheDocument()
      expect(screen.getByText('Sample rules body content.')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Close test rules' }))
      expect(onClose).toHaveBeenCalledTimes(1)

      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).toHaveBeenCalledTimes(2)

      rerender(<EntryRulesModal isOpen={false} onClose={onClose} rules={sampleRules} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('EntryHeader', () => {
    it('renders game title, back button, and rules modal trigger', () => {
      const onBack = vi.fn()
      render(
        <EntryHeader
          gameTitle="TIC-TAC-TOE"
          onBack={onBack}
          backText="Exit"
          rules={sampleRules}
          renderUtilityRight={<span data-testid="sound-mock">Sound</span>}
        />
      )

      expect(screen.getByRole('heading', { level: 1, name: 'TIC-TAC-TOE' })).toBeInTheDocument()
      expect(screen.getByTestId('sound-mock')).toBeInTheDocument()

      const backBtn = screen.getByRole('button', { name: 'Exit to game catalog' })
      fireEvent.click(backBtn)
      expect(onBack).toHaveBeenCalledTimes(1)

      const rulesBtn = screen.getByRole('button', { name: 'Test rules' })
      fireEvent.click(rulesBtn)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('ChoiceScreen', () => {
    it('renders 3 mode cards and calls handlers on click', () => {
      const onCreateRoom = vi.fn()
      const onJoinWithCode = vi.fn()
      const onPlayStranger = vi.fn()
      const onExit = vi.fn()

      render(
        <ChoiceScreen
          gameId="tictactoe"
          gameTitle="TIC-TAC-TOE"
          onCreateRoom={onCreateRoom}
          onJoinWithCode={onJoinWithCode}
          onPlayStranger={onPlayStranger}
          onExit={onExit}
          rules={sampleRules}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /create a room/i }))
      expect(onCreateRoom).toHaveBeenCalledTimes(1)

      fireEvent.click(screen.getByRole('button', { name: /join with a code/i }))
      expect(onJoinWithCode).toHaveBeenCalledTimes(1)

      fireEvent.click(screen.getByRole('button', { name: /play with a stranger/i }))
      expect(onPlayStranger).toHaveBeenCalledTimes(1)

      fireEvent.click(screen.getByRole('button', { name: /exit to game catalog/i }))
      expect(onExit).toHaveBeenCalledTimes(1)
    })
  })

  describe('JoinCodeScreen', () => {
    it('handles input validation and submissions', () => {
      const onJoin = vi.fn()
      const onBack = vi.fn()

      render(
        <JoinCodeScreen
          gameId="tictactoe"
          gameTitle="TIC-TAC-TOE"
          onJoin={onJoin}
          onBack={onBack}
          inputId="ttt-input"
        />
      )

      const input = screen.getByRole('textbox')
      const submitBtn = screen.getByRole('button', { name: /join room/i })
      expect(submitBtn).toBeDisabled()

      // Typing code enables submit
      fireEvent.change(input, { target: { value: 'abc234' } })
      expect(input).toHaveValue('ABC234')
      expect(submitBtn).not.toBeDisabled()

      fireEvent.click(submitBtn)
      expect(onJoin).toHaveBeenCalledWith('ABC234')

      // Back button
      fireEvent.click(screen.getByRole('button', { name: /back to menu/i }))
      expect(onBack).toHaveBeenCalledTimes(1)
    })
  })

  describe('StrangerSearchScreen', () => {
    it('renders searching, timeout, and error states', () => {
      const onCancel = vi.fn()
      const onSearchAgain = vi.fn()
      const onCreateRoomInstead = vi.fn()

      const { rerender } = render(
        <StrangerSearchScreen
          gameId="tictactoe"
          gameTitle="TIC-TAC-TOE"
          status="searching"
          elapsedSeconds={25}
          onCancel={onCancel}
          onSearchAgain={onSearchAgain}
          onCreateRoomInstead={onCreateRoomInstead}
        />
      )

      expect(screen.getByRole('heading', { name: /searching for a stranger/i })).toBeInTheDocument()
      expect(screen.getByText('0:25')).toBeInTheDocument()

      // Switch to timeout
      rerender(
        <StrangerSearchScreen
          gameId="tictactoe"
          gameTitle="TIC-TAC-TOE"
          status="timeout"
          elapsedSeconds={30}
          onCancel={onCancel}
          onSearchAgain={onSearchAgain}
          onCreateRoomInstead={onCreateRoomInstead}
        />
      )
      expect(screen.getByRole('heading', { name: /no one found right now/i })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Search again' }))
      expect(onSearchAgain).toHaveBeenCalledTimes(1)
      fireEvent.click(screen.getByRole('button', { name: /create a room instead/i }))
      expect(onCreateRoomInstead).toHaveBeenCalledTimes(1)

      // Switch to error
      rerender(
        <StrangerSearchScreen
          gameId="tictactoe"
          gameTitle="TIC-TAC-TOE"
          status="error"
          errorMessage="Custom signaling failure"
          elapsedSeconds={5}
          onCancel={onCancel}
          onSearchAgain={onSearchAgain}
          onCreateRoomInstead={onCreateRoomInstead}
        />
      )
      expect(screen.getByRole('heading', { name: /connection failed/i })).toBeInTheDocument()
      expect(screen.getByText('Custom signaling failure')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
      expect(onSearchAgain).toHaveBeenCalledTimes(2)
    })
  })

  describe('getEntryUrlParams', () => {
    it('extracts room or match and action from query string', () => {
      expect(getEntryUrlParams('?room=XYZ789')).toEqual({
        action: null,
        roomOrMatch: 'XYZ789',
      })
      expect(getEntryUrlParams('?match=peer-room-123')).toEqual({
        action: null,
        roomOrMatch: 'peer-room-123',
      })
      expect(getEntryUrlParams('?action=create')).toEqual({
        action: 'create',
        roomOrMatch: null,
      })
      expect(getEntryUrlParams('?room=ABC&action=create')).toEqual({
        action: 'create',
        roomOrMatch: 'ABC',
      })
      expect(getEntryUrlParams('')).toEqual({
        action: null,
        roomOrMatch: null,
      })
    })
  })

  describe('useOnlineEntryFlow', () => {
    it('delays lobby creation until an action is selected', () => {
      const createFriendLobby = vi.fn((role: string) => ({ role, destroyed: false }))
      const createStrangerLobby = vi.fn((_res) => ({ role: 'stranger', destroyed: false }))

      const { result } = renderHook(() =>
        useOnlineEntryFlow({
          gameId: 'tictactoe',
          createFriendLobby,
          createStrangerLobby,
        })
      )

      // Initially on choice screen without any lobby created
      expect(result.current.screen).toBe('choice')
      expect(result.current.lobbyCoordinator).toBeNull()
      expect(createFriendLobby).not.toHaveBeenCalled()

      // Create room creates host lobby
      act(() => {
        result.current.handleCreateRoom()
      })
      expect(result.current.screen).toBe('create-room')
      expect(result.current.lobbyCoordinator).toEqual({ role: 'host', destroyed: false })
      expect(createFriendLobby).toHaveBeenCalledWith('host')

      // Back to choice tears down lobby
      act(() => {
        result.current.handleBackToChoice()
      })
      expect(result.current.screen).toBe('choice')
      expect(result.current.lobbyCoordinator).toBeNull()
    })

    it('creates lobby immediately when initialRoomCode or initialAction is passed', () => {
      const createFriendLobby = vi.fn((role: string, code?: string) => ({ role, code }))
      const createStrangerLobby = vi.fn((_res) => ({ role: 'stranger', code: undefined }))

      const { result } = renderHook(() =>
        useOnlineEntryFlow({
          gameId: 'tictactoe',
          initialRoomCode: 'XYZ789',
          createFriendLobby,
          createStrangerLobby,
        })
      )

      expect(result.current.screen).toBe('guest-lobby')
      expect(result.current.lobbyCoordinator).toEqual({ role: 'guest', code: 'XYZ789' })
      expect(createFriendLobby).toHaveBeenCalledWith('guest', 'XYZ789')
    })

    it('creates guest lobby immediately when initialMatchId is passed', () => {
      const createFriendLobby = vi.fn((role: string, target?: string) => ({ role, target }))
      const createStrangerLobby = vi.fn((_res) => ({ role: 'stranger' }))

      const { result } = renderHook(() =>
        useOnlineEntryFlow({
          gameId: 'tictactoe',
          initialMatchId: 'match-custom-target',
          createFriendLobby,
          createStrangerLobby,
        })
      )

      expect(result.current.screen).toBe('guest-lobby')
      expect(result.current.lobbyCoordinator).toEqual({ role: 'guest', target: 'match-custom-target' })
      expect(createFriendLobby).toHaveBeenCalledWith('guest', 'match-custom-target')
    })

    it('resolves ?match= from browser search params if initialRoomCode/initialMatchId are omitted', () => {
      window.history.replaceState(null, '', '/tictactoe?match=url-target-456')

      const createFriendLobby = vi.fn((role: string, target?: string) => ({ role, target }))
      const createStrangerLobby = vi.fn((_res) => ({ role: 'stranger' }))

      try {
        const { result } = renderHook(() =>
          useOnlineEntryFlow({
            gameId: 'tictactoe',
            createFriendLobby,
            createStrangerLobby,
          })
        )

        expect(result.current.screen).toBe('guest-lobby')
        expect(result.current.lobbyCoordinator).toEqual({ role: 'guest', target: 'url-target-456' })
        expect(createFriendLobby).toHaveBeenCalledWith('guest', 'url-target-456')
      } finally {
        window.history.replaceState(null, '', '/')
      }
    })
  })
})
