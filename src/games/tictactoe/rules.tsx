import React from 'react'
import { EntryRulesConfig } from '@/components/entry/types'

export const ticTacToeRules: EntryRulesConfig = {
  title: 'TIC-TAC-TOE RULES',
  subtitle: 'Classic 3×3 Grid Series',
  ariaLabel: 'Tic-Tac-Toe rules and instructions',
  closeAriaLabel: 'Close rules',
  content: (
    <div className="space-y-4 text-sm leading-relaxed text-[var(--ttt-ink)]">
      <section>
        <h3 className="font-bold text-[var(--ttt-pencil)] mb-1">Objective</h3>
        <p>
          Be the first player to get three of your marks in a row — horizontally, vertically,
          or diagonally on a 3×3 grid.
        </p>
      </section>

      <section>
        <h3 className="font-bold text-[var(--ttt-pencil)] mb-1">Marks & Turns</h3>
        <p>
          The Host plays blue <strong>X</strong> and the Guest plays red <strong>O</strong>.
          Players take turns placing their mark in an empty square.
          Starting player alternates every round.
        </p>
      </section>

      <section>
        <h3 className="font-bold text-[var(--ttt-pencil)] mb-1">Rounds & Series</h3>
        <p>
          Matches are played as a series (Best of 1, 3, or 5 rounds).
          A win earns 1 point. A draw gives no points and does not count towards the series length.
          The first player to reach a majority of wins claims the match.
        </p>
      </section>

      <section>
        <h3 className="font-bold text-[var(--ttt-pencil)] mb-1">Turn Timer</h3>
        <p>
          You have 15 seconds to make your move each turn.
          If the timer expires, your turn is skipped.
        </p>
      </section>
    </div>
  ),
}
