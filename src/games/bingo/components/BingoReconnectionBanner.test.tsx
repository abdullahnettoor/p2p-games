import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BingoReconnectionBanner } from './BingoReconnectionBanner'

describe('BingoReconnectionBanner', () => {
  it('renders null when not reconnecting', () => {
    const { container } = render(
      <BingoReconnectionBanner
        isReconnecting={false}
        secondsRemaining={30}
        remotePlayerName="Bob"
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders countdown and warning when reconnecting', () => {
    render(
      <BingoReconnectionBanner
        isReconnecting={true}
        secondsRemaining={18}
        remotePlayerName="Bob"
      />
    )

    expect(screen.getByRole('alert')).toBeDefined()
    expect(screen.getByText('Connection interrupted')).toBeDefined()
    expect(screen.getByText(/Bob is disconnected/)).toBeDefined()
    expect(screen.getByText('18s grace')).toBeDefined()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '18')
  })
})
