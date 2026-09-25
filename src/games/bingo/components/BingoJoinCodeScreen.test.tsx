import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BingoJoinCodeScreen } from './BingoJoinCodeScreen'

describe('BingoJoinCodeScreen', () => {
  it('renders input, validates 6-character room codes, and triggers callbacks', () => {
    const onJoin = vi.fn()
    const onBack = vi.fn()

    render(<BingoJoinCodeScreen onJoin={onJoin} onBack={onBack} />)

    const input = screen.getByPlaceholderText('CODE')
    const submitBtn = screen.getByRole('button', { name: 'Join Room' })

    // Disabled initially
    expect(submitBtn).toBeDisabled()

    // Invalid code (less than 6 chars or invalid characters)
    fireEvent.change(input, { target: { value: '123' } })
    expect(submitBtn).not.toBeDisabled()
    fireEvent.click(submitBtn)
    expect(screen.getByRole('alert')).toHaveTextContent(/Enter a valid 6-character room code/i)
    expect(onJoin).not.toHaveBeenCalled()

    // Valid code (uppercase conversion and extractRoomCode)
    fireEvent.change(input, { target: { value: 'k7m4qx' } })
    fireEvent.click(submitBtn)
    expect(onJoin).toHaveBeenCalledWith('K7M4QX')

    // Back button
    fireEvent.click(screen.getByRole('button', { name: 'Back to menu' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('displays initial error if provided', () => {
    render(
      <BingoJoinCodeScreen
        onJoin={vi.fn()}
        onBack={vi.fn()}
        initialError="Room not found"
      />
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Room not found')
  })
})
