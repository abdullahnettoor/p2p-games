import React from 'react'
import { cn } from '@/lib/utils'
import '../../bingoTokens.css'
import styles from './BingoGrid.module.css'

export interface BingoCellContext {
  index: number
  row: number
  column: number
}

export interface BingoGridProps {
  renderCell: (context: BingoCellContext) => React.ReactNode
  getCellProps?: (context: BingoCellContext) => React.HTMLAttributes<HTMLDivElement>
  ariaLabel: string
  className?: string
  testId?: string
  ariaDescribedBy?: string
  children?: React.ReactNode
}

export const BingoGrid: React.FC<BingoGridProps> = ({
  renderCell,
  getCellProps,
  ariaLabel,
  className,
  testId,
  ariaDescribedBy,
  children,
}) => (
  <div className={cn('bingoTokenScope', styles.gridFrame, className)}>
    <div
      role="grid"
      aria-label={ariaLabel}
      aria-rowcount={5}
      aria-colcount={5}
      aria-describedby={ariaDescribedBy}
      className={styles.gridSurface}
      data-testid={testId}
    >
      {Array.from({ length: 5 }, (_, row) => (
        <div key={row} role="row" aria-rowindex={row + 1} className={styles.gridRow}>
          {Array.from({ length: 5 }, (_, column) => {
            const context = { index: row * 5 + column, row, column }
            return (
              <div
                key={context.index}
                role="gridcell"
                aria-rowindex={row + 1}
                aria-colindex={column + 1}
                className={styles.gridCell}
                {...getCellProps?.(context)}
              >
                {renderCell(context)}
              </div>
            )
          })}
        </div>
      ))}
    </div>
    {children}
  </div>
)
