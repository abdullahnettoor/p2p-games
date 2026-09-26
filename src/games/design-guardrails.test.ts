import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

export interface TokenViolation {
  file: string
  line: number
  tokenPrefix: string
  lineContent: string
}

/**
 * Checks a file content against game token isolation rules:
 * - `--bingo-*` tokens are only permitted within `src/games/bingo/`
 * - `--ttt-*` tokens are only permitted within `src/games/tictactoe/`
 * - Shared components (e.g. `src/app/`, `src/core/`, `src/lib/`) must not use any game-specific tokens
 */
export function validateTokenIsolation(
  filePath: string,
  content: string
): TokenViolation[] {
  const normalizedPath = filePath.replace(/\\/g, '/')
  const isBingoFolder = normalizedPath.includes('src/games/bingo/')
  const isTicTacToeFolder = normalizedPath.includes('src/games/tictactoe/')

  const violations: TokenViolation[] = []
  const lines = content.split('\n')

  lines.forEach((lineText, idx) => {
    // Check for --bingo-* outside bingo folder
    if (!isBingoFolder && /--bingo-[a-zA-Z0-9_-]+/.test(lineText)) {
      violations.push({
        file: filePath,
        line: idx + 1,
        tokenPrefix: '--bingo-',
        lineContent: lineText.trim(),
      })
    }

    // Check for --ttt-* outside tictactoe folder
    if (!isTicTacToeFolder && /--ttt-[a-zA-Z0-9_-]+/.test(lineText)) {
      violations.push({
        file: filePath,
        line: idx + 1,
        tokenPrefix: '--ttt-',
        lineContent: lineText.trim(),
      })
    }
  })

  return violations
}

function scanSourceFiles(dir: string): string[] {
  const results: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === '.next' ||
        entry.name === '.git'
      ) {
        continue
      }
      results.push(...scanSourceFiles(fullPath))
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name)
      // Check code and stylesheet files
      if (['.css', '.tsx', '.ts', '.jsx', '.js'].includes(ext)) {
        // Exclude test files so assertions / string fixtures don't trigger false positives
        if (!/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          results.push(fullPath)
        }
      }
    }
  }

  return results
}

describe('Design Token Isolation Guardrails', () => {
  it('enforces that --bingo-* tokens are used only in the Bingo folder and --ttt-* in the Tic-Tac-Toe folder', () => {
    const srcDir = path.resolve(__dirname, '..')
    const files = scanSourceFiles(srcDir)

    expect(files.length).toBeGreaterThan(0)

    const allViolations: TokenViolation[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const violations = validateTokenIsolation(file, content)
      allViolations.push(...violations)
    }

    if (allViolations.length > 0) {
      const details = allViolations
        .map(
          (v) =>
            `${v.file}:${v.line} uses ${v.tokenPrefix} outside its folder: "${v.lineContent}"`
        )
        .join('\n')
      expect.fail(`Design token isolation violations detected:\n${details}`)
    }

    expect(allViolations).toEqual([])
  })

  describe('validateTokenIsolation unit assertions', () => {
    it('flags --bingo-* token used in a shared platform file', () => {
      const testFile = 'src/app/(platform)/page.module.css'
      const sampleContent = '.card { background: var(--bingo-paper); }'
      const violations = validateTokenIsolation(testFile, sampleContent)

      expect(violations).toHaveLength(1)
      expect(violations[0].tokenPrefix).toBe('--bingo-')
      expect(violations[0].line).toBe(1)
    })

    it('flags --ttt-* token used in a shared platform file', () => {
      const testFile = 'src/app/(game)/tictactoe/page.tsx'
      const sampleContent = 'const color = "var(--ttt-ink)"'
      const violations = validateTokenIsolation(testFile, sampleContent)

      expect(violations).toHaveLength(1)
      expect(violations[0].tokenPrefix).toBe('--ttt-')
      expect(violations[0].line).toBe(1)
    })

    it('flags cross-game token contamination between games', () => {
      const bingoUsingTtt = 'src/games/bingo/components/BingoMatchplay.tsx'
      const tttUsingBingo = 'src/games/tictactoe/components/TicTacToeBoard.tsx'

      expect(
        validateTokenIsolation(bingoUsingTtt, 'var(--ttt-margin-line)')
      ).toHaveLength(1)

      expect(
        validateTokenIsolation(tttUsingBingo, 'var(--bingo-paper)')
      ).toHaveLength(1)
    })

    it('allows legitimate tokens inside their designated game folders', () => {
      const validBingo = 'src/games/bingo/components/BingoMatchLobby.module.css'
      const validTtt = 'src/games/tictactoe/ticTacToeTokens.css'

      expect(
        validateTokenIsolation(validBingo, '.title { color: var(--bingo-graphite); }')
      ).toEqual([])

      expect(
        validateTokenIsolation(validTtt, '.board { border: var(--ttt-rule); }')
      ).toEqual([])
    })
  })
})
