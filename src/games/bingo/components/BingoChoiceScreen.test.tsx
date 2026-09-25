import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BingoChoiceScreen } from './BingoChoiceScreen'

describe('BingoChoiceScreen', () => {
  it('renders the 3 mode choices and triggers their callbacks', () => {
    const onCreateRoom = vi.fn()
    const onJoinWithCode = vi.fn()
    const onPlayStranger = vi.fn()
    const onExit = vi.fn()

    render(
      <BingoChoiceScreen
        onCreateRoom={onCreateRoom}
        onJoinWithCode={onJoinWithCode}
        onPlayStranger={onPlayStranger}
        onExit={onExit}
      />
    )

    expect(screen.getByRole('heading', { name: 'Choose how to play' })).toBeInTheDocument()

    // 1. Create a room
    const createBtn = screen.getByRole('button', { name: /Create a room/i })
    expect(createBtn).toBeInTheDocument()
    fireEvent.click(createBtn)
    expect(onCreateRoom).toHaveBeenCalledTimes(1)

    // 2. Join with a code
    const joinBtn = screen.getByRole('button', { name: /Join with a code/i })
    expect(joinBtn).toBeInTheDocument()
    fireEvent.click(joinBtn)
    expect(onJoinWithCode).toHaveBeenCalledTimes(1)

    // 3. Play with a stranger
    const strangerBtn = screen.getByRole('button', { name: /Play with a stranger/i })
    expect(strangerBtn).toBeInTheDocument()
    fireEvent.click(strangerBtn)
    expect(onPlayStranger).toHaveBeenCalledTimes(1)

    // Exit
    const exitBtn = screen.getByRole('button', { name: /Exit to game catalog/i })
    expect(exitBtn).toBeInTheDocument()
    fireEvent.click(exitBtn)
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('opens and closes the rules dialog', () => {
    render(
      <BingoChoiceScreen
        onCreateRoom={vi.fn()}
        onJoinWithCode={vi.fn()}
        onPlayStranger={vi.fn()}
        onExit={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Bingo rules' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('BINGO Sunday Puzzle')

    fireEvent.click(screen.getByRole('button', { name: 'Close Bingo rules' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
