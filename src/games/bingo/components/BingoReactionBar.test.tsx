import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { BingoReactionBar } from './BingoReactionBar'

describe('BingoReactionBar', () => {
  it('renders all default emoji reaction buttons', () => {
    const handleSend = vi.fn()
    render(<BingoReactionBar onSendReaction={handleSend} />)

    const expectedEmojis = ['👋', '😂', '😱', '🔥', '👏']
    for (const emoji of expectedEmojis) {
      expect(screen.getByRole('button', { name: new RegExp(emoji) })).toBeDefined()
    }
  })

  it('invokes onSendReaction with the clicked emoji', () => {
    const handleSend = vi.fn()
    render(<BingoReactionBar onSendReaction={handleSend} />)

    const fireButton = screen.getByRole('button', { name: /🔥/ })
    fireEvent.click(fireButton)

    expect(handleSend).toHaveBeenCalledWith('🔥')
  })

  it('disables buttons when disabled prop is true', () => {
    const handleSend = vi.fn()
    render(<BingoReactionBar onSendReaction={handleSend} disabled={true} />)

    const fireButton = screen.getByRole('button', { name: /🔥/ })
    expect(fireButton).toHaveProperty('disabled', true)

    fireEvent.click(fireButton)
    expect(handleSend).not.toHaveBeenCalled()
  })
})
