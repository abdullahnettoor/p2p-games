'use client'

import React from 'react'
import styles from './NotebookSurface.module.css'
import '../ticTacToeTokens.css'

export interface NotebookSurfaceProps {
  marginContent?: React.ReactNode
  children: React.ReactNode
  className?: string
  sheetClassName?: string
  sheetRef?: React.Ref<HTMLDivElement>
}

/**
 * NotebookSurface represents the tactile paper desk and raised squared notebook sheet.
 * Features:
 * - Faint grid lines (--ttt-grid-line)
 * - Pale desaturated pink margin line (--ttt-margin-line)
 * - Raised sheet elevation and shadow vocabulary
 * - Margin column for series tally and notes
 */
export const NotebookSurface: React.FC<NotebookSurfaceProps> = ({
  marginContent,
  children,
  className = '',
  sheetClassName = '',
  sheetRef,
}) => {
  return (
    <div className={`tttTokenScope ${styles.desk} ${className}`}>
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${sheetClassName}`}
        data-testid="notebook-sheet"
      >
        <aside
          className={styles.marginColumn}
          data-testid="notebook-margin"
          aria-label="Notebook margin"
        >
          {marginContent}
        </aside>
        <main className={styles.mainArea} data-testid="notebook-main">
          {children}
        </main>
      </div>
    </div>
  )
}
