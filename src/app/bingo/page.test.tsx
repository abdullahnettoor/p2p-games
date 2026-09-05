import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BingoPage from './page'

const navigation = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => navigation.searchParams,
  useRouter: () => ({ replace: navigation.replace }),
}))

vi.mock('@/games/bingo/components/BingoLocalGame', () => ({
  BingoLocalGame: () => <div>Local BINGO</div>,
}))

vi.mock('@/games/bingo/components/BingoOnlineGame', () => ({
  BingoOnlineGame: ({ role, matchId }: { role: string; matchId?: string }) => (
    <div>{`Online BINGO: ${role}:${matchId ?? 'new'}`}</div>
  ),
}))

describe('BingoPage', () => {
  beforeEach(() => {
    navigation.searchParams = new URLSearchParams()
    navigation.replace.mockClear()
  })

  it('makes online play primary and keeps Pass & Play secondary', () => {
    render(<BingoPage />)

    expect(screen.getByRole('button', { name: 'Create Online Match' })).toHaveAttribute(
      'data-priority',
      'primary'
    )
    expect(screen.getByRole('button', { name: 'Pass & Play on this device' })).toHaveAttribute(
      'data-priority',
      'secondary'
    )
    expect(screen.getByRole('link', { name: 'All Games' })).toHaveClass('min-h-11')
  })

  it('opens an invited Guest Match without showing mode selection', () => {
    navigation.searchParams = new URLSearchParams('match=friend-123')
    render(<BingoPage />)

    expect(screen.getByText('Online BINGO: guest:friend-123')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create Online Match' })).not.toBeInTheDocument()
  })

  it('starts a Host Match from the primary action', () => {
    render(<BingoPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Create Online Match' }))

    expect(screen.getByText('Online BINGO: host:new')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change Mode' })).toHaveClass('min-h-11')
  })
})
