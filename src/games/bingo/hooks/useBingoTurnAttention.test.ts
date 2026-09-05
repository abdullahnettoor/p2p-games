import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useBingoTurnAttention } from './useBingoTurnAttention'

describe('useBingoTurnAttention', () => {
  const originalTitle = document.title
  const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden')

  afterEach(() => {
    document.title = originalTitle
    if (originalHidden) {
      Object.defineProperty(document, 'hidden', originalHidden)
    }
  })

  it('updates the title when a hidden tab receives the local turn and restores it when visible', () => {
    document.title = 'BINGO'
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })

    const { rerender } = renderHook(
      ({ activePlayerId, secondsRemaining }) =>
        useBingoTurnAttention({
          activePlayerId,
          localPlayerId: 'p1',
          secondsRemaining,
        }),
      { initialProps: { activePlayerId: 'p2', secondsRemaining: 30 } }
    )

    rerender({ activePlayerId: 'p1', secondsRemaining: 30 })
    expect(document.title).toBe('Your BINGO turn · 30s')

    rerender({ activePlayerId: 'p1', secondsRemaining: 29 })
    expect(document.title).toBe('Your BINGO turn · 29s')

    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(document.title).toBe('BINGO')
  })
})
