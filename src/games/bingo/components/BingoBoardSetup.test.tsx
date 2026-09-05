import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BingoBoardSetup } from './BingoBoardSetup'

describe('BingoBoardSetup', () => {
  it('places sequential numbers into whichever empty cells the Player chooses', () => {
    render(<BingoBoardSetup onBoardComplete={() => {}} />)

    expect(screen.getByText('Place 1')).toBeInTheDocument()

    const bottomRight = screen.getByRole('button', { name: 'Empty cell, row 5, column 5. Place 1' })
    fireEvent.click(bottomRight)

    expect(screen.getByText('Place 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Number 1, row 5, column 5. Select to swap' })).toHaveTextContent('1')

    fireEvent.click(screen.getByRole('button', { name: 'Empty cell, row 1, column 1. Place 2' }))
    expect(screen.getByRole('button', { name: 'Number 2, row 1, column 1. Select to swap' })).toHaveTextContent('2')
  })

  it('swaps two occupied cells without losing either number', () => {
    render(<BingoBoardSetup onBoardComplete={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Empty cell, row 1, column 1. Place 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Empty cell, row 1, column 2. Place 2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Number 1, row 1, column 1. Select to swap' }))
    fireEvent.click(screen.getByRole('button', { name: 'Number 2, row 1, column 2. Swap with number 1' }))

    expect(screen.getByRole('button', { name: 'Number 2, row 1, column 1. Select to swap' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Number 1, row 1, column 2. Select to swap' })).toBeInTheDocument()
    expect(screen.getByText('Place 3')).toBeInTheDocument()
  })

  it('undoes placement, clear, and shuffle actions', () => {
    render(<BingoBoardSetup onBoardComplete={() => {}} />)

    const firstCell = screen.getByRole('button', { name: 'Empty cell, row 1, column 1. Place 1' })
    fireEvent.click(firstCell)
    fireEvent.click(screen.getByRole('button', { name: 'Undo last change' }))
    expect(screen.getByRole('button', { name: 'Empty cell, row 1, column 1. Place 1' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Shuffle board' }))
    expect(screen.getByText('All 25 placed')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear board' }))
    expect(screen.getByText('Place 1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Undo last change' }))
    expect(screen.getByText('All 25 placed')).toBeInTheDocument()
  })

  it('submits a complete board with the configured action label', () => {
    const handleComplete = vi.fn()
    render(
      <BingoBoardSetup
        onBoardComplete={handleComplete}
        submitLabel="Ready with this board"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Shuffle board' }))

    const readyButton = screen.getByRole('button', { name: 'Ready with this board' })
    expect(readyButton).not.toBeDisabled()
    fireEvent.click(readyButton)

    expect(handleComplete).toHaveBeenCalledTimes(1)
    expect(handleComplete.mock.calls[0][0]).toHaveLength(25)
  })

  it('uses the shared board grid and touch-sized setup controls', () => {
    render(<BingoBoardSetup onBoardComplete={() => {}} />)

    expect(screen.getByRole('grid', { name: 'BINGO Board setup' })).toBeInTheDocument()
    expect(screen.getAllByRole('gridcell')).toHaveLength(25)
    expect(screen.getByRole('button', { name: 'Shuffle board' })).toHaveClass('min-h-11')
  })
})
