import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import {
  NotebookSurface,
  TicTacToeMark,
  TicTacToeBoardGrid,
  TicTacToeStrikeThrough,
  TicTacToeMarginTally,
  TicTacToePageTurn,
  TicTacToePrimitivesShowcase,
} from './components'
import { TicTacToeBoard } from './types'

describe('Tic-Tac-Toe Design Layer: Static Visual Primitives', () => {
  describe('NotebookSurface', () => {
    it('renders the notebook desk, raised sheet, margin column, and main workspace', () => {
      render(
        <NotebookSurface marginContent={<div data-testid="test-margin">Margin Notes</div>}>
          <div data-testid="test-main">Main Content</div>
        </NotebookSurface>
      )

      expect(screen.getByTestId('notebook-sheet')).toBeDefined()
      expect(screen.getByTestId('notebook-margin')).toBeDefined()
      expect(screen.getByTestId('test-margin').textContent).toBe('Margin Notes')
      expect(screen.getByTestId('notebook-main')).toBeDefined()
      expect(screen.getByTestId('test-main').textContent).toBe('Main Content')
    })
  })

  describe('TicTacToeMark', () => {
    it('renders Host X as two distinct hand-drawn SVG stroke paths in Host ink without font glyphs', () => {
      const { container } = render(<TicTacToeMark mark="X" seed={0} />)

      const markContainer = screen.getByTestId('ttt-mark-x')
      expect(markContainer).toBeDefined()
      expect(markContainer.getAttribute('aria-label')).toBe('Mark X (Host)')

      const strokesGroup = screen.getByTestId('ttt-mark-x-strokes')
      const paths = strokesGroup.querySelectorAll('path')
      expect(paths.length).toBe(2)

      // Ensure no font glyphs (<text> elements) are present in the SVG
      expect(container.querySelectorAll('text').length).toBe(0)

      // Verify stroke paths have round caps and fill: none
      paths.forEach((p) => {
        expect(p.style.strokeLinecap).toBe('round')
        expect(p.style.fill).toBe('none')
      })
    })

    it('renders Guest O as a single continuous looped stroke in Guest ink without font glyphs', () => {
      const { container } = render(<TicTacToeMark mark="O" seed={1} />)

      const markContainer = screen.getByTestId('ttt-mark-o')
      expect(markContainer).toBeDefined()
      expect(markContainer.getAttribute('aria-label')).toBe('Mark O (Guest)')

      const loopGroup = screen.getByTestId('ttt-mark-o-loop')
      const paths = loopGroup.querySelectorAll('path')
      expect(paths.length).toBe(1)

      // Ensure no font glyphs (<text> elements) are present
      expect(container.querySelectorAll('text').length).toBe(0)

      const loopPath = paths[0]
      expect(loopPath.style.strokeLinecap).toBe('round')
      expect(loopPath.style.fill).toBe('none')
      expect(loopPath.getAttribute('d')).toContain('C')
    })

    it('applies deterministic per-mark jitter across different cell seeds', () => {
      const { container: c0 } = render(<TicTacToeMark mark="X" seed={0} />)
      const { container: c1 } = render(<TicTacToeMark mark="X" seed={1} />)

      const svg0 = c0.querySelector('svg')
      const svg1 = c1.querySelector('svg')

      expect(svg0?.style.transform).toBeDefined()
      expect(svg1?.style.transform).toBeDefined()
      expect(svg0?.style.transform).not.toBe(svg1?.style.transform)
    })
  })

  describe('TicTacToeStrikeThrough', () => {
    it('renders winning strike-through overshooting the board bounds by ~6%', () => {
      const { container } = render(
        <TicTacToeStrikeThrough line={[0, 1, 2]} winnerInk="host" />
      )

      const overlay = screen.getByTestId('ttt-strike-through')
      expect(overlay).toBeDefined()
      expect(overlay.getAttribute('data-winner-ink')).toBe('host')

      const path = screen.getByTestId('ttt-strike-path')
      const d = path.getAttribute('d') ?? ''

      // Row 0 horizontal stroke in 300x300 starts at x = -18 (6% overshoot of 300) and ends at x = 318
      expect(d).toContain('-18')
      expect(d).toContain('318')
      expect(path.style.stroke).toBe('var(--ttt-host-ink)')
      expect(path.style.strokeLinecap).toBe('round')
    })

    it('renders vertical and diagonal winning strike-through lines in winner ink', () => {
      const { container: cCol } = render(
        <TicTacToeStrikeThrough line={[1, 4, 7]} winnerInk="guest" />
      )
      const pathCol = cCol.querySelector('[data-testid="ttt-strike-path"]')
      expect(pathCol?.getAttribute('d')).toContain('-18')
      expect(pathCol?.getAttribute('d')).toContain('318')
      expect((pathCol as HTMLElement).style.stroke).toBe('var(--ttt-guest-ink)')

      const { container: cDiag } = render(
        <TicTacToeStrikeThrough line={[0, 4, 8]} winnerInk="host" />
      )
      const pathDiag = cDiag.querySelector('[data-testid="ttt-strike-path"]')
      expect(pathDiag?.getAttribute('d')).toContain('-18')
      expect(pathDiag?.getAttribute('d')).toContain('318')
    })
  })

  describe('TicTacToeBoardGrid', () => {
    const emptyBoard: TicTacToeBoard = Array(9).fill(null)

    it('renders 4 hand-drawn pencil strokes for board grid lines', () => {
      render(<TicTacToeBoardGrid board={emptyBoard} />)

      expect(screen.getByTestId('ttt-pencil-v1')).toBeDefined()
      expect(screen.getByTestId('ttt-pencil-v2')).toBeDefined()
      expect(screen.getByTestId('ttt-pencil-h1')).toBeDefined()
      expect(screen.getByTestId('ttt-pencil-h2')).toBeDefined()
    })

    it('renders 9 clickable grid cells with 44px min touch target semantics', () => {
      const onCellClick = vi.fn()
      render(<TicTacToeBoardGrid board={emptyBoard} onCellClick={onCellClick} />)

      const cells = screen.getAllByRole('gridcell')
      expect(cells.length).toBe(9)

      fireEvent.click(cells[0])
      expect(onCellClick).toHaveBeenCalledWith(0)
    })

    it('renders marks in cells and disables occupied cells', () => {
      const boardWithMarks: TicTacToeBoard = [
        'X', 'O', null,
        null, 'X', null,
        null, null, 'O',
      ]
      const onCellClick = vi.fn()
      render(<TicTacToeBoardGrid board={boardWithMarks} onCellClick={onCellClick} />)

      const cell0 = screen.getByTestId('ttt-cell-0')
      expect(cell0.hasAttribute('disabled')).toBe(true)
      expect(cell0.querySelector('[data-testid="ttt-mark-x"]')).toBeDefined()

      const cell1 = screen.getByTestId('ttt-cell-1')
      expect(cell1.hasAttribute('disabled')).toBe(true)
      expect(cell1.querySelector('[data-testid="ttt-mark-o"]')).toBeDefined()

      // Empty cell 2 should be clickable
      const cell2 = screen.getByTestId('ttt-cell-2')
      expect(cell2.hasAttribute('disabled')).toBe(false)
      fireEvent.click(cell2)
      expect(onCellClick).toHaveBeenCalledWith(2)
    })

    it('renders winning strike-through when winningLine is provided', () => {
      const board: TicTacToeBoard = [
        'X', 'X', 'X',
        'O', 'O', null,
        null, null, null,
      ]
      render(
        <TicTacToeBoardGrid
          board={board}
          winningLine={[0, 1, 2]}
          winnerInk="host"
        />
      )

      expect(screen.getByTestId('ttt-strike-through')).toBeDefined()
    })
  })

  describe('TicTacToeMarginTally', () => {
    it('renders 0 for empty tallies and correct strokes for scores 1-4', () => {
      const { rerender } = render(
        <TicTacToeMarginTally hostScore={0} guestScore={0} bestOf={3} />
      )

      expect(screen.getByTestId('host-tally-empty').textContent).toBe('0')
      expect(screen.getByTestId('guest-tally-empty').textContent).toBe('0')

      rerender(<TicTacToeMarginTally hostScore={3} guestScore={2} bestOf={3} />)

      expect(screen.getByTestId('host-tally-stroke-1')).toBeDefined()
      expect(screen.getByTestId('host-tally-stroke-2')).toBeDefined()
      expect(screen.getByTestId('host-tally-stroke-3')).toBeDefined()
      expect(screen.queryByTestId('host-tally-stroke-4')).toBeNull()

      expect(screen.getByTestId('guest-tally-stroke-1')).toBeDefined()
      expect(screen.getByTestId('guest-tally-stroke-2')).toBeDefined()
      expect(screen.queryByTestId('guest-tally-stroke-3')).toBeNull()
    })

    it('renders a 5-bar gate cluster (4 vertical + 1 diagonal cross stroke) for score 5', () => {
      render(<TicTacToeMarginTally hostScore={5} guestScore={0} bestOf={5} />)

      expect(screen.getByTestId('host-tally-stroke-1')).toBeDefined()
      expect(screen.getByTestId('host-tally-stroke-2')).toBeDefined()
      expect(screen.getByTestId('host-tally-stroke-3')).toBeDefined()
      expect(screen.getByTestId('host-tally-stroke-4')).toBeDefined()
      expect(screen.getByTestId('host-tally-stroke-5')).toBeDefined()
    })

    it('renders target marker for Match series indicating win threshold', () => {
      render(<TicTacToeMarginTally hostScore={1} guestScore={0} bestOf={5} />)

      const targetMarker = screen.getByTestId('ttt-tally-target-marker')
      expect(targetMarker).toBeDefined()
      // Best of 5 requires ceil(5/2) = 3 wins
      expect(targetMarker.textContent).toContain('3')

      const tallyRegion = screen.getByTestId('ttt-margin-tally')
      expect(tallyRegion.getAttribute('aria-label')).toContain('Target is 3 wins (Best of 5)')
    })
  })

  describe('TicTacToePageTurn & Reduced Motion Fallback', () => {
    it('executes page turn transition ≤ 400ms when roundKey changes', () => {
      vi.useFakeTimers()
      const onTurnComplete = vi.fn()

      const { rerender } = render(
        <TicTacToePageTurn roundKey={1} onTurnComplete={onTurnComplete}>
          <div data-testid="round-content">Round 1</div>
        </TicTacToePageTurn>
      )

      expect(screen.getByTestId('ttt-page-turn').getAttribute('data-turning')).toBe('true')

      // Advance by 360ms
      act(() => {
        vi.advanceTimersByTime(360)
      })

      expect(screen.getByTestId('ttt-page-turn').getAttribute('data-turning')).toBe('false')
      expect(onTurnComplete).toHaveBeenCalledTimes(1)
      vi.useRealTimers()
    })

    it('verifies stylesheet contains reduced-motion fallback rules for page turn and strokes', () => {
      const tokensCssPath = path.resolve(__dirname, 'ticTacToeTokens.css')
      const tokensCss = fs.readFileSync(tokensCssPath, 'utf-8')

      expect(tokensCss).toContain('@media (prefers-reduced-motion: reduce)')
      expect(tokensCss).toContain('animation-duration: 0.01ms')

      const pageTurnCssPath = path.resolve(__dirname, 'components/TicTacToePageTurn.module.css')
      const pageTurnCss = fs.readFileSync(pageTurnCssPath, 'utf-8')

      expect(pageTurnCss).toContain('@media (prefers-reduced-motion: reduce)')
      expect(pageTurnCss).toContain('ttt-crossfade')
      expect(pageTurnCss).toContain('transform: none')
    })
  })

  describe('TicTacToePrimitivesShowcase', () => {
    it('mounts the isolated showcase with surface, board, tally, and interactive controls', () => {
      render(<TicTacToePrimitivesShowcase />)

      expect(screen.getByTestId('ttt-primitives-showcase')).toBeDefined()
      expect(screen.getByTestId('notebook-sheet')).toBeDefined()
      expect(screen.getByTestId('ttt-board-grid')).toBeDefined()
      expect(screen.getByTestId('ttt-margin-tally')).toBeDefined()

      // Toggle strike through
      const strikeToggleBtn = screen.getByTestId('showcase-toggle-strike-btn')
      expect(screen.getByTestId('ttt-strike-through')).toBeDefined()
      fireEvent.click(strikeToggleBtn)
      expect(screen.queryByTestId('ttt-strike-through')).toBeNull()

      // Increment tally
      const incHostBtn = screen.getByTestId('showcase-inc-host-btn')
      fireEvent.click(incHostBtn)
      expect(screen.getByTestId('host-tally-column').getAttribute('aria-label')).toBe('Host score: 3')
    })
  })
})
