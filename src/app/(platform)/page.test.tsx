import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CatalogPage from './page'

const navigation = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => navigation,
}))

afterEach(() => {
  vi.useRealTimers()
  navigation.push.mockClear()
})

describe('CatalogPage', () => {
  it('renders games as a compact icon drawer', () => {
    render(<CatalogPage />)

    expect(screen.getByRole('heading', { name: 'Choose a game.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Bingo' })).toHaveAttribute('href', '/bingo')
    expect(screen.getByRole('link', { name: 'Open Bingo' }).querySelector('svg')).toBeInTheDocument()
  })

  it('navigates into the selected Game after the short opening transition', () => {
    vi.useFakeTimers()
    render(<CatalogPage />)

    fireEvent.click(screen.getByRole('link', { name: 'Open Bingo' }))
    expect(navigation.push).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(260)
    })
    expect(navigation.push).toHaveBeenCalledWith('/bingo')
  })

  it('keeps coming-soon games visible but unavailable', () => {
    render(<CatalogPage />)

    expect(screen.getByLabelText('Hangman, coming soon')).toHaveTextContent('Soon')
    expect(screen.queryByRole('link', { name: 'Open Hangman' })).not.toBeInTheDocument()
  })

  it('does not list the TicTacToe connectivity harness', () => {
    render(<CatalogPage />)

    expect(screen.queryByText(/tic.?tac.?toe/i)).not.toBeInTheDocument()
  })
})
