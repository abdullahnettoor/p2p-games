import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { BingoReactionBar } from './BingoReactionBar'

describe('BingoReactionBar', () => {
  it('keeps the reaction choices behind one compact Doodle control', () => {
    const handleSend = vi.fn()
    render(<BingoReactionBar onSendReaction={handleSend} />)

    expect(screen.getByRole('button', { name: 'Doodle' })).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Doodle' }))

    expect(screen.getByRole('menu', { name: 'Doodle choices' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Send doodle 🔥' })).toBeInTheDocument()
  })

  it('invokes onSendReaction with the clicked emoji', () => {
    const handleSend = vi.fn()
    render(<BingoReactionBar onSendReaction={handleSend} />)

    fireEvent.click(screen.getByRole('button', { name: 'Doodle' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Send doodle 🔥' }))

    expect(handleSend).toHaveBeenCalledWith('🔥')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('disables buttons when disabled prop is true', () => {
    const handleSend = vi.fn()
    render(<BingoReactionBar onSendReaction={handleSend} disabled={true} />)

    const doodleButton = screen.getByRole('button', { name: 'Doodle' })
    expect(doodleButton).toHaveProperty('disabled', true)

    fireEvent.click(doodleButton)
    expect(handleSend).not.toHaveBeenCalled()
  })
})
