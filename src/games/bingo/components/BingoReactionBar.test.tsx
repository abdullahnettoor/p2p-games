import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { BingoReactionBar } from './BingoReactionBar'

describe('BingoReactionBar', () => {
  it('shows every quick reaction directly in the action row', () => {
    const handleSend = vi.fn()
    render(<BingoReactionBar onSendReaction={handleSend} />)

    expect(screen.getByRole('toolbar', { name: 'Quick reactions' })).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send doodle 🔥' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send doodle 👋' })).toBeInTheDocument()
  })

  it('invokes onSendReaction with the clicked emoji', () => {
    const handleSend = vi.fn()
    render(<BingoReactionBar onSendReaction={handleSend} />)

    fireEvent.click(screen.getByRole('button', { name: 'Send doodle 🔥' }))

    expect(handleSend).toHaveBeenCalledWith('🔥')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('disables buttons when disabled prop is true', () => {
    const handleSend = vi.fn()
    render(<BingoReactionBar onSendReaction={handleSend} disabled={true} />)

    const doodleButtons = screen.getAllByRole('button', { name: /Send doodle/ })
    expect(doodleButtons).toHaveLength(5)
    expect(doodleButtons.every((button) => (button as HTMLButtonElement).disabled)).toBe(true)

    fireEvent.click(doodleButtons[0])
    expect(handleSend).not.toHaveBeenCalled()
  })
})
