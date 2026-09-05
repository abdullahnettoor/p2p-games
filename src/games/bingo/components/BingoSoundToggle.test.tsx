import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { BingoSoundToggle } from './BingoSoundToggle'

describe('BingoSoundToggle', () => {
  it('renders unmuted state correctly and triggers toggle on click', () => {
    const handleToggle = vi.fn()
    render(<BingoSoundToggle isMuted={false} onToggle={handleToggle} />)

    const button = screen.getByRole('button', { name: /mute sound effects/i })
    expect(button).toBeDefined()

    fireEvent.click(button)
    expect(handleToggle).toHaveBeenCalledTimes(1)
  })

  it('renders muted state correctly', () => {
    const handleToggle = vi.fn()
    render(<BingoSoundToggle isMuted={true} onToggle={handleToggle} />)

    const button = screen.getByRole('button', { name: /unmute sound effects/i })
    expect(button).toBeDefined()
  })
})
