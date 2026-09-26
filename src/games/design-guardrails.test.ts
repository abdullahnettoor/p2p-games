import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

interface TokenViolation {
  file: string
  line: number
  tokenPrefix: string
  lineContent: string
  reason: string
}

/**
 * Mapping of game token prefixes to their designated directory.
 * Adding a new game requires adding only one mapping here.
 */
const GAME_TOKEN_PREFIX_MAP: Record<string, string> = {
  '--bingo-': 'src/games/bingo',
  '--ttt-': 'src/games/tictactoe',
}

/**
 * Approved CSS contract variables that shared components and shared entry screens
 * are permitted to consume per #17 decisions and docs/design/GAME-DESIGN-RULES.md.
 */
const ALLOWED_ENTRY_CONTRACT_VARS = new Set([
  '--entry-surface',
  '--entry-surface-raised',
  '--entry-ink',
  '--entry-ink-muted',
  '--entry-accent',
  '--entry-rule',
  '--entry-focus',
  '--entry-urgent',
])

/**
 * Checks a file's content against design token isolation and shared component rules:
 * 1. Game-specific tokens (e.g. `--bingo-*`, `--ttt-*`) are only permitted within their designated game folder.
 * 2. Shared components outside game folders (such as `src/components/` and `src/app/(platform)/`)
 *    must never reference game-scoped tokens, rejected `--p-*` tokens, or unauthorized entry variables.
 */
function validateFileTokenUsage(filePath: string, content: string): TokenViolation[] {
  const normalizedPath = filePath.replace(/\\/g, '/')
  const violations: TokenViolation[] = []
  const lines = content.split('\n')

  // Rule 1: Enforce game folder isolation for every registered game prefix
  for (const [prefix, allowedFolder] of Object.entries(GAME_TOKEN_PREFIX_MAP)) {
    const isAllowedFolder = normalizedPath.includes(allowedFolder)

    if (!isAllowedFolder) {
      lines.forEach((lineText, idx) => {
        if (lineText.includes(prefix)) {
          violations.push({
            file: filePath,
            line: idx + 1,
            tokenPrefix: prefix,
            lineContent: lineText.trim(),
            reason: `Token "${prefix}" is only permitted in "${allowedFolder}", but referenced in "${filePath}"`,
          })
        }
      })
    }
  }

  // Rule 2: Shared components use only the entry contract variables
  const isSharedComponent =
    normalizedPath.includes('src/components/') ||
    normalizedPath.includes('src/app/(platform)/')

  if (isSharedComponent) {
    lines.forEach((lineText, idx) => {
      // Find all var(--...) usages
      const varMatches = lineText.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)/g)
      for (const match of varMatches) {
        const varName = match[1]

        // Reject platform token proposal (--p-*) per ADR 0008 & Issue #17
        if (varName.startsWith('--p-')) {
          violations.push({
            file: filePath,
            line: idx + 1,
            tokenPrefix: '--p-',
            lineContent: lineText.trim(),
            reason: `Shared component uses rejected platform token "${varName}"; use --entry-* contract instead`,
          })
        }

        // If an entry variable is referenced, it must be in the approved entry contract
        if (varName.startsWith('--entry-') && !ALLOWED_ENTRY_CONTRACT_VARS.has(varName)) {
          violations.push({
            file: filePath,
            line: idx + 1,
            tokenPrefix: varName,
            lineContent: lineText.trim(),
            reason: `Shared component uses undeclared entry contract variable "${varName}"`,
          })
        }
      }
    })
  }

  return violations
}

/**
 * Recursively scans source files across the workspace.
 * Only excludes the guardrail and contrast test suites themselves (which contain test fixture strings).
 * All other files—including other test and spec files—are inspected.
 */
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
      if (['.css', '.tsx', '.ts', '.jsx', '.js'].includes(ext)) {
        // Exclude only the design guardrail and contrast test suites that test/assert token literals
        if (
          entry.name === 'design-guardrails.test.ts' ||
          entry.name === 'contrast.test.ts'
        ) {
          continue
        }
        results.push(fullPath)
      }
    }
  }

  return results
}

describe('Design Token Isolation Guardrails', () => {
  it('enforces token isolation across all scanned project files via prefix map', () => {
    const srcDir = path.resolve(__dirname, '..')
    const files = scanSourceFiles(srcDir)

    expect(files.length).toBeGreaterThan(0)

    const allViolations: TokenViolation[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const violations = validateFileTokenUsage(file, content)
      allViolations.push(...violations)
    }

    if (allViolations.length > 0) {
      const details = allViolations
        .map((v) => `${v.file}:${v.line} (${v.reason}): "${v.lineContent}"`)
        .join('\n')
      expect.fail(`Design token isolation violations detected:\n${details}`)
    }

    expect(allViolations).toEqual([])
  })

  describe('validateFileTokenUsage unit assertions', () => {
    it('flags game tokens used in shared platform files', () => {
      const testFile = 'src/app/(platform)/page.module.css'
      const bingoContent = '.card { background: var(--bingo-paper); }'
      const tttContent = 'const ink = "var(--ttt-ink)"'

      const bingoViolations = validateFileTokenUsage(testFile, bingoContent)
      expect(bingoViolations).toHaveLength(1)
      expect(bingoViolations[0].tokenPrefix).toBe('--bingo-')

      const tttViolations = validateFileTokenUsage(testFile, tttContent)
      expect(tttViolations).toHaveLength(1)
      expect(tttViolations[0].tokenPrefix).toBe('--ttt-')
    })

    it('flags cross-game token contamination between games', () => {
      const bingoUsingTtt = 'src/games/bingo/components/BingoMatchplay.tsx'
      const tttUsingBingo = 'src/games/tictactoe/components/TicTacToeBoard.tsx'

      expect(
        validateFileTokenUsage(bingoUsingTtt, 'var(--ttt-margin-line)')
      ).toHaveLength(1)

      expect(
        validateFileTokenUsage(tttUsingBingo, 'var(--bingo-paper)')
      ).toHaveLength(1)
    })

    it('flags shared components using rejected --p-* platform tokens', () => {
      const sharedComponent = 'src/components/entry/ChoiceScreen.module.css'
      const sampleContent = '.sheet { background: var(--p-surface); }'
      const violations = validateFileTokenUsage(sharedComponent, sampleContent)

      expect(violations).toHaveLength(1)
      expect(violations[0].tokenPrefix).toBe('--p-')
    })

    it('flags shared components using unauthorized entry contract variables', () => {
      const sharedComponent = 'src/components/entry/ChoiceScreen.module.css'
      const sampleContent = '.sheet { background: var(--entry-unknown-shadow); }'
      const violations = validateFileTokenUsage(sharedComponent, sampleContent)

      expect(violations).toHaveLength(1)
      expect(violations[0].tokenPrefix).toBe('--entry-unknown-shadow')
    })

    it('allows valid entry contract variables in shared components', () => {
      const sharedComponent = 'src/components/entry/ChoiceScreen.module.css'
      const validContent = `
        .container {
          background: var(--entry-surface);
          color: var(--entry-ink);
          border: 1px solid var(--entry-rule);
        }
        .raised {
          background: var(--entry-surface-raised);
          outline-color: var(--entry-focus);
        }
      `
      const violations = validateFileTokenUsage(sharedComponent, validContent)
      expect(violations).toEqual([])
    })

    it('allows legitimate game tokens inside their designated game folders', () => {
      const validBingo = 'src/games/bingo/components/BingoMatchLobby.module.css'
      const validTtt = 'src/games/tictactoe/ticTacToeTokens.css'

      expect(
        validateFileTokenUsage(
          validBingo,
          '.title { color: var(--bingo-graphite); }'
        )
      ).toEqual([])

      expect(
        validateFileTokenUsage(validTtt, '.board { border: var(--ttt-rule); }')
      ).toEqual([])
    })
  })
})
