'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from './catalog.module.css'

type GameIconName = 'bingo' | 'hangman' | 'tictactoe'

type CatalogGame = {
  id: GameIconName
  label: string
  href?: string
  comingSoon?: boolean
}

const GAMES: CatalogGame[] = [
  { id: 'bingo', label: 'Bingo', href: '/bingo' },
  { id: 'tictactoe', label: 'Tic-Tac-Toe', href: '/tictactoe' },
  { id: 'hangman', label: 'Hangman', comingSoon: true },
]

function GameIcon({ name }: { name: GameIconName }) {
  if (name === 'hangman') {
    return (
      <svg viewBox="0 0 96 96" aria-hidden="true" className={styles.gameIcon}>
        <path d="M18 82h61M27 82V15h42M27 18h29l13 13" />
        <path d="M69 31v6M69 48v1M69 60v1" />
        <circle cx="69" cy="29" r="9" />
        <path d="M69 38v25M69 45 57 55M69 45l12 10M69 63 58 77M69 63l11 14" />
      </svg>
    )
  }

  if (name === 'tictactoe') {
    return (
      <svg viewBox="0 0 96 96" aria-hidden="true" className={styles.gameIcon}>
        <path d="M36 16v64M60 16v64M16 36h64M16 60h64" />
        <path d="M22 22l8 8M30 22l-8 8" />
        <circle cx="70" cy="70" r="5" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" className={styles.gameIcon}>
      <path d="M15 21c0-4 3-7 7-7h52c4 0 7 3 7 7v54c0 4-3 7-7 7H22c-4 0-7-3-7-7V21Z" />
      <path d="M15 34h66M31 14v20M49 14v20M67 14v20" />
      <circle cx="29" cy="48" r="4" />
      <circle cx="48" cy="48" r="4" />
      <circle cx="67" cy="48" r="4" />
      <circle cx="29" cy="66" r="4" />
      <path d="M44 66h10M49 61v10" />
      <circle cx="67" cy="66" r="4" />
    </svg>
  )
}

function GameTile({ game }: { game: CatalogGame }) {
  const router = useRouter()
  const [isOpening, setIsOpening] = useState(false)

  if (game.comingSoon) {
    return (
      <div className={`${styles.gameTile} ${styles.gameTileDisabled}`} aria-label={`${game.label}, coming soon`}>
        <span className={styles.iconFrame}>
          <GameIcon name={game.id} />
          <span className={styles.comingSoonBadge}>Soon</span>
        </span>
        <span className={styles.gameLabel}>{game.label}</span>
      </div>
    )
  }

  return (
    <Link
      href={game.href ?? '#'}
      className={`${styles.gameTile} ${isOpening ? styles.gameTileOpening : ''}`}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        setIsOpening(true)
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
        if (reducedMotion) {
          router.push(game.href ?? '/')
          return
        }
        window.setTimeout(() => router.push(game.href ?? '/'), 260)
      }}
      aria-label={`Open ${game.label}`}
    >
      <span className={styles.iconFrame}>
        <GameIcon name={game.id} />
      </span>
      <span className={styles.gameLabel}>{game.label}</span>
    </Link>
  )
}

export default function CatalogPage() {
  return (
    <section className={styles.catalog} aria-labelledby="catalog-heading">
      <div className={styles.catalogHeading}>
        <p className={styles.eyebrow}>A small drawer of direct-play games</p>
        <h1 id="catalog-heading">Choose a game.</h1>
      </div>

      <div className={styles.gameGrid} aria-label="Games">
        {GAMES.map((game) => <GameTile key={game.id} game={game} />)}
      </div>
    </section>
  )
}
