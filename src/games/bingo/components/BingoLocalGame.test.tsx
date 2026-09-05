import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BingoLocalGame } from './BingoLocalGame'

describe('BingoLocalGame Component', () => {
  it('allows completing setup for both players and starting the game', () => {
    render(<BingoLocalGame />)

    // Player 1 setup screen
    expect(screen.getByText(/Player 1/i)).toBeInTheDocument()
    const randomizeBtn = screen.getByRole('button', { name: /Randomize/i })
    fireEvent.click(randomizeBtn)
    fireEvent.click(screen.getByRole('button', { name: /Confirm Board/i }))

    // Player 2 setup screen
    expect(screen.getByText(/Player 2/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Randomize/i }))
    fireEvent.click(screen.getByRole('button', { name: /Confirm Board/i }))

    // Active Match view
    expect(screen.getByText(/Current Turn/i)).toBeInTheDocument()
    expect(screen.getByText(/Called Numbers/i)).toBeInTheDocument()

    // Sound toggle is available in active match view
    const soundToggle = screen.getByRole('button', { name: /mute sound effects/i })
    expect(soundToggle).toBeInTheDocument()
    fireEvent.click(soundToggle)
    expect(screen.getByRole('button', { name: /unmute sound effects/i })).toBeInTheDocument()
  })
})
