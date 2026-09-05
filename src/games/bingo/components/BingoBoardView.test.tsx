import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BingoCall } from '../types'
import { BingoPlayerInk } from '../bingoInk'
import { BingoBoardView } from './BingoBoardView'

const sampleBoard = Array.from({ length: 25 }, (_, i) => i + 1)
const calls: BingoCall[] = [
  { type: 'call', number: 1, playerId: 'host-id', sequence: 1 },
  { type: 'call', number: 7, playerId: 'guest-id', sequence: 2 },
  { type: 'call', number: 13, playerId: 'host-id', sequence: 3 },
]
const playersById: Record<string, BingoPlayerInk> = {
  'host-id': { name: 'Alice', role: 'host' },
  'guest-id': { name: 'Bob', role: 'guest' },
}
const lineDetails = { count: 0, rows: [], cols: [], diags: [] }

describe('BingoBoardView Component', () => {
  it('renders all 25 numbers on the board', () => {
    render(
      <BingoBoardView
        board={sampleBoard}
        calls={calls}
        playersById={playersById}
        lineDetails={lineDetails}
        isMyTurn
      />
    )

    for (let i = 1; i <= 25; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument()
    }
  })

  it('names caller ownership and allows picking only uncalled numbers during the Player turn', () => {
    const handlePickNumber = vi.fn()
    render(
      <BingoBoardView
        board={sampleBoard}
        calls={calls}
        playersById={playersById}
        lineDetails={lineDetails}
        isMyTurn
        onPickNumber={handlePickNumber}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '5' }))
    expect(handlePickNumber).toHaveBeenCalledWith(5)

    handlePickNumber.mockClear()
    fireEvent.click(screen.getByRole('button', { name: '1, called by Alice' }))
    expect(handlePickNumber).not.toHaveBeenCalled()
  })

  it('renders each called cell with the caller ink and mark shape', () => {
    const { container } = render(
      <BingoBoardView board={sampleBoard} calls={calls} playersById={playersById} />
    )

    expect(container.querySelector('[data-call-number="1"][data-ink="host"]')).toHaveAttribute('data-mark-shape', 'cross')
    expect(container.querySelector('[data-call-number="7"][data-ink="guest"]')).toHaveAttribute('data-mark-shape', 'loop')
  })

  it('animates only Calls added after the board mounts', async () => {
    const { container, rerender } = render(
      <BingoBoardView board={sampleBoard} calls={calls} playersById={playersById} />
    )

    expect(container.querySelector('[data-call-number="13"]')).toHaveAttribute('data-animated', 'false')

    const nextCalls: BingoCall[] = [
      ...calls,
      { type: 'call', number: 20, playerId: 'guest-id', sequence: 4 },
    ]
    rerender(
      <BingoBoardView board={sampleBoard} calls={nextCalls} playersById={playersById} />
    )

    await waitFor(() => {
      expect(container.querySelector('[data-call-number="20"]')).toHaveAttribute('data-animated', 'true')
    })
    expect(container.querySelector('[data-call-number="13"]')).toHaveAttribute('data-animated', 'false')
  })

  it('draws completed rows, columns, and diagonals as separate owner-ink strokes', async () => {
    const allCalls: BingoCall[] = sampleBoard.map((number, index) => ({
      type: 'call',
      number,
      playerId: index % 2 === 0 ? 'host-id' : 'guest-id',
      sequence: index + 1,
    }))
    const { container, rerender } = render(
      <BingoBoardView
        board={sampleBoard}
        calls={allCalls}
        playersById={playersById}
        lineDetails={{ count: 4, rows: [0], cols: [0], diags: [0, 1] }}
        boardOwnerRole="host"
      />
    )

    const strokes = container.querySelectorAll('[data-completed-line][data-ink="host"]')
    expect(strokes).toHaveLength(4)
    expect(container.querySelector('[data-completed-line="row-0"]')).toBeInTheDocument()
    expect(container.querySelector('[data-completed-line="col-0"]')).toBeInTheDocument()
    expect(container.querySelector('[data-completed-line="diag-0"]')).toBeInTheDocument()
    expect(container.querySelector('[data-completed-line="diag-1"]')).toBeInTheDocument()
    expect(container.querySelector('[data-completed-line="row-0"]')).toHaveAttribute('data-animated', 'false')

    rerender(
      <BingoBoardView
        board={sampleBoard}
        calls={allCalls}
        playersById={playersById}
        lineDetails={{ count: 5, rows: [0, 1], cols: [0], diags: [0, 1] }}
        boardOwnerRole="host"
      />
    )
    await waitFor(() => {
      expect(container.querySelector('[data-completed-line="row-1"]')).toHaveAttribute('data-animated', 'true')
    })
  })

  it('does not allow clicking when it is not the Player turn', () => {
    const handlePickNumber = vi.fn()
    render(
      <BingoBoardView
        board={sampleBoard}
        calls={calls}
        playersById={playersById}
        lineDetails={lineDetails}
        isMyTurn={false}
        onPickNumber={handlePickNumber}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '5' }))
    expect(handlePickNumber).not.toHaveBeenCalled()
  })
})
