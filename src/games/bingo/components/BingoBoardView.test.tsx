import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BingoBoardView } from './BingoBoardView'

describe('BingoBoardView Component', () => {
  const sampleBoard = Array.from({ length: 25 }, (_, i) => i + 1)
  const calledNumbers = [1, 7, 13]
  const lineDetails = {
    count: 0,
    rows: [],
    cols: [],
    diags: [],
  }

  it('renders all 25 numbers on the board', () => {
    render(
      <BingoBoardView
        board={sampleBoard}
        calledNumbers={calledNumbers}
        lineDetails={lineDetails}
        isMyTurn={true}
        onPickNumber={() => {}}
      />
    )

    for (let i = 1; i <= 25; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument()
    }
  })

  it('marks called numbers and allows picking uncalled numbers when it is player turn', () => {
    const handlePickNumber = vi.fn()
    render(
      <BingoBoardView
        board={sampleBoard}
        calledNumbers={calledNumbers}
        lineDetails={lineDetails}
        isMyTurn={true}
        onPickNumber={handlePickNumber}
      />
    )

    // Click an uncalled number (e.g., 5)
    fireEvent.click(screen.getByText('5'))
    expect(handlePickNumber).toHaveBeenCalledWith(5)

    // Click an already called number (e.g., 1)
    handlePickNumber.mockClear()
    fireEvent.click(screen.getByText('1'))
    expect(handlePickNumber).not.toHaveBeenCalled()
  })

  it('does not allow clicking when not player turn', () => {
    const handlePickNumber = vi.fn()
    render(
      <BingoBoardView
        board={sampleBoard}
        calledNumbers={calledNumbers}
        lineDetails={lineDetails}
        isMyTurn={false}
        onPickNumber={handlePickNumber}
      />
    )

    fireEvent.click(screen.getByText('5'))
    expect(handlePickNumber).not.toHaveBeenCalled()
  })
})
