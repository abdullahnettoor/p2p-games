import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BingoStrangerSearchScreen } from './BingoStrangerSearchScreen'

describe('BingoStrangerSearchScreen', () => {
  it('renders searching state with elapsed time and single cancel button', () => {
    const onCancel = vi.fn()

    render(
      <BingoStrangerSearchScreen
        status="searching"
        elapsedSeconds={65}
        onCancel={onCancel}
        onSearchAgain={vi.fn()}
        onCreateRoomInstead={vi.fn()}
      />
    )

    expect(screen.getByRole('heading', { name: /Searching for a stranger…/i })).toBeInTheDocument()
    expect(screen.getByText('1:05')).toBeInTheDocument()

    // Assert there is only one cancel button
    const cancelButtons = screen.getAllByRole('button', { name: /cancel/i })
    expect(cancelButtons).toHaveLength(1)
    fireEvent.click(cancelButtons[0])
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('renders timeout state with action buttons', () => {
    const onSearchAgain = vi.fn()
    const onCreateRoomInstead = vi.fn()
    const onCancel = vi.fn()

    render(
      <BingoStrangerSearchScreen
        status="timeout"
        elapsedSeconds={60}
        onCancel={onCancel}
        onSearchAgain={onSearchAgain}
        onCreateRoomInstead={onCreateRoomInstead}
      />
    )

    expect(screen.getByRole('heading', { name: /No one found right now/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Search again' }))
    expect(onSearchAgain).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /Create a room instead/i }))
    expect(onCreateRoomInstead).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Back to menu' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('renders error state with retry action buttons', () => {
    const onSearchAgain = vi.fn()
    const onCreateRoomInstead = vi.fn()
    const onCancel = vi.fn()

    render(
      <BingoStrangerSearchScreen
        status="error"
        errorMessage="Signaling server unavailable"
        elapsedSeconds={12}
        onCancel={onCancel}
        onSearchAgain={onSearchAgain}
        onCreateRoomInstead={onCreateRoomInstead}
      />
    )

    expect(screen.getByRole('heading', { name: /Connection failed/i })).toBeInTheDocument()
    expect(screen.getByText('Signaling server unavailable')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onSearchAgain).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /Create a room instead/i }))
    expect(onCreateRoomInstead).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Back to menu' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
