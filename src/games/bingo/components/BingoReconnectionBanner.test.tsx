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
    expect(screen.getByText('Opponent Disconnected')).toBeDefined()
    expect(screen.getByText('Bob')).toBeDefined()
    expect(screen.getByText('Forfeit win in 18s')).toBeDefined()
  })
})
