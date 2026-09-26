import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * Calculates the relative luminance of an sRGB hex color per WCAG 2.1 specifications:
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace(/^#/, '').trim()
  let r: number, g: number, b: number

  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255
    g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255
    b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16) / 255
    g = parseInt(cleanHex.substring(2, 4), 16) / 255
    b = parseInt(cleanHex.substring(4, 6), 16) / 255
  } else {
    throw new Error(`Invalid hex color: ${hex}`)
  }

  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/**
 * Calculates the contrast ratio between two hex colors per WCAG 2.1:
 * (L1 + 0.05) / (L2 + 0.05), where L1 is the lighter color.
 */
function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1)
  const lum2 = getRelativeLuminance(hex2)
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Converts a 3-digit or 6-digit hex color to HSL to check hue families and saturation invariants.
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const cleanHex = hex.replace(/^#/, '').trim()
  let r: number, g: number, b: number

  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255
    g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255
    b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16) / 255
    g = parseInt(cleanHex.substring(2, 4), 16) / 255
    b = parseInt(cleanHex.substring(4, 6), 16) / 255
  } else {
    throw new Error(`Invalid hex color: ${hex}`)
  }

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/**
 * Parses CSS custom properties from stylesheet content into a key-value Map.
 */
function parseCssTokens(cssContent: string): Map<string, string> {
  const tokens = new Map<string, string>()
  const declRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g
  let match: RegExpExecArray | null
  while ((match = declRegex.exec(cssContent)) !== null) {
    tokens.set(match[1].trim(), match[2].trim())
  }
  return tokens
}

/**
 * Parses color entries from DESIGN.md YAML frontmatter into a key-value Map.
 */
function parseDesignMdColors(mdContent: string): Map<string, string> {
  const colorsMatch = mdContent.match(/colors:\s*\n([\s\S]*?)(?=\ntypography:|\n---)/)
  if (!colorsMatch) {
    throw new Error('Could not find colors section in DESIGN.md frontmatter')
  }

  const colorMap = new Map<string, string>()
  const lines = colorsMatch[1].split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes(':')) continue
    const [key, ...rest] = trimmed.split(':')
    const value = rest.join(':').replace(/["']/g, '').trim()
    colorMap.set(key.trim(), value)
  }
  return colorMap
}

describe('Design System Contrast & Color Invariants', () => {
  describe('WCAG calculation validation', () => {
    it('accurately calculates black on white as 21:1 and white on white as 1:1', () => {
      expect(getContrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0)
      expect(getContrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 0)
    })

    it('correctly handles 3-digit shorthand hex values', () => {
      expect(getContrastRatio('#000', '#fff')).toBeCloseTo(21, 0)
      const hslWhite = hexToHsl('#fff')
      expect(hslWhite.l).toBe(100)
    })
  })

  describe('Bingo CSS Token Parsing & DESIGN.md Parity', () => {
    const cssPath = path.resolve(__dirname, 'bingo/bingoTokens.css')
    const mdPath = path.resolve(__dirname, 'bingo/DESIGN.md')

    expect(fs.existsSync(cssPath)).toBe(true)
    expect(fs.existsSync(mdPath)).toBe(true)

    const cssTokens = parseCssTokens(fs.readFileSync(cssPath, 'utf-8'))
    const docTokens = parseDesignMdColors(fs.readFileSync(mdPath, 'utf-8'))

    it('verifies all hex color tokens in DESIGN.md strictly match bingoTokens.css', () => {
      expect(cssTokens.size).toBeGreaterThan(0)
      expect(docTokens.size).toBeGreaterThan(0)

      docTokens.forEach((docVal, key) => {
        // Only check hex colors against CSS tokens
        if (docVal.startsWith('#')) {
          const expectedCssToken = `--bingo-${key}`
          const cssVal = cssTokens.get(expectedCssToken)
          expect(cssVal).toBeDefined()
          expect(cssVal!.toLowerCase()).toBe(docVal.toLowerCase())
        }
      })
    })

    describe('Contrast evaluation on actual parsed CSS tokens', () => {
      const paper = cssTokens.get('--bingo-paper')!
      const paperRaised = cssTokens.get('--bingo-paper-raised')!

      expect(paper).toBeDefined()
      expect(paperRaised).toBeDefined()

      const readableTextTokens = [
        { name: 'graphite', varName: '--bingo-graphite', minExpected: 4.5 },
        { name: 'graphite-muted', varName: '--bingo-graphite-muted', minExpected: 4.5 },
        { name: 'host-ink', varName: '--bingo-host-ink', minExpected: 4.5 },
        { name: 'guest-ink', varName: '--bingo-guest-ink', minExpected: 4.5 },
        { name: 'warning', varName: '--bingo-warning', minExpected: 4.5 },
        { name: 'urgent', varName: '--bingo-urgent', minExpected: 4.5 },
        { name: 'focus', varName: '--bingo-focus', minExpected: 4.5 },
      ]

      readableTextTokens.forEach(({ name, varName, minExpected }) => {
        const hex = cssTokens.get(varName)!

        it(`ensures parsed ${varName} (${hex}) meets ≥ ${minExpected}:1 contrast against base paper (${paper})`, () => {
          expect(hex).toBeDefined()
          const ratio = getContrastRatio(hex, paper)
          expect(ratio).toBeGreaterThanOrEqual(minExpected)
        })

        it(`ensures parsed ${varName} (${hex}) meets ≥ ${minExpected}:1 contrast against raised paper (${paperRaised})`, () => {
          expect(hex).toBeDefined()
          const ratio = getContrastRatio(hex, paperRaised)
          expect(ratio).toBeGreaterThanOrEqual(minExpected)
        })
      })

      describe('Inverted text contrast on filled buttons/badges from CSS tokens', () => {
        const whiteText = paperRaised
        const filledTokens = [
          { name: 'primary button', varName: '--bingo-graphite' },
          { name: 'host badge/pill', varName: '--bingo-host-ink' },
          { name: 'guest badge/pill', varName: '--bingo-guest-ink' },
          { name: 'urgent alert', varName: '--bingo-urgent' },
        ]

        filledTokens.forEach(({ name, varName }) => {
          const hex = cssTokens.get(varName)!

          it(`ensures white text meets ≥ 4.5:1 contrast against ${name} (${varName}: ${hex})`, () => {
            expect(hex).toBeDefined()
            const ratio = getContrastRatio(whiteText, hex)
            expect(ratio).toBeGreaterThanOrEqual(4.5)
          })
        })
      })

      describe('Player ink color family invariants (Host = Blue, Guest = Red)', () => {
        const hostInk = cssTokens.get('--bingo-host-ink')!
        const guestInk = cssTokens.get('--bingo-guest-ink')!

        it('verifies parsed CSS player inks belong to blue and red families respectively with distinct hue separation', () => {
          expect(hostInk).toBeDefined()
          expect(guestInk).toBeDefined()

          const hostHsl = hexToHsl(hostInk)
          const guestHsl = hexToHsl(guestInk)

          // Host ink must be in the blue hue range (180° - 250°)
          expect(hostHsl.h).toBeGreaterThanOrEqual(180)
          expect(hostHsl.h).toBeLessThanOrEqual(250)

          // Guest ink must be in the red/berry hue range (330° - 360° or 0° - 30°)
          const isRedFamily = guestHsl.h >= 330 || guestHsl.h <= 30
          expect(isRedFamily).toBe(true)

          // Inks must have clear saturation (not desaturated gray tones)
          expect(hostHsl.s).toBeGreaterThanOrEqual(40)
          expect(guestHsl.s).toBeGreaterThanOrEqual(40)

          // Inks must have a meaningful angular hue separation on the 360° color wheel (≥ 90°)
          const rawDiff = Math.abs(hostHsl.h - guestHsl.h)
          const angularSeparation = Math.min(rawDiff, 360 - rawDiff)
          expect(angularSeparation).toBeGreaterThanOrEqual(90)
        })
      })
    })
  })

  describe('Tic-Tac-Toe CSS Token Parsing & DESIGN.md Parity', () => {
    const cssPath = path.resolve(__dirname, 'tictactoe/ticTacToeTokens.css')
    const mdPath = path.resolve(__dirname, 'tictactoe/DESIGN.md')

    expect(fs.existsSync(cssPath)).toBe(true)
    expect(fs.existsSync(mdPath)).toBe(true)

    const cssTokens = parseCssTokens(fs.readFileSync(cssPath, 'utf-8'))
    const docTokens = parseDesignMdColors(fs.readFileSync(mdPath, 'utf-8'))

    it('verifies all hex color tokens in DESIGN.md strictly match ticTacToeTokens.css', () => {
      expect(cssTokens.size).toBeGreaterThan(0)
      expect(docTokens.size).toBeGreaterThan(0)

      docTokens.forEach((docVal, key) => {
        // Only check hex colors against CSS tokens
        if (docVal.startsWith('#')) {
          const expectedCssToken = `--ttt-${key}`
          const cssVal = cssTokens.get(expectedCssToken)
          expect(cssVal).toBeDefined()
          expect(cssVal!.toLowerCase()).toBe(docVal.toLowerCase())
        }
      })
    })

    describe('Contrast evaluation on actual parsed CSS tokens', () => {
      const paper = cssTokens.get('--ttt-paper')!
      const paperRaised = cssTokens.get('--ttt-paper-raised')!

      expect(paper).toBeDefined()
      expect(paperRaised).toBeDefined()

      const readableTextTokens = [
        { name: 'ink', varName: '--ttt-ink', minExpected: 4.5 },
        { name: 'ink-muted', varName: '--ttt-ink-muted', minExpected: 4.5 },
        { name: 'pencil', varName: '--ttt-pencil', minExpected: 4.5 },
        { name: 'host-ink', varName: '--ttt-host-ink', minExpected: 4.5 },
        { name: 'guest-ink', varName: '--ttt-guest-ink', minExpected: 4.5 },
        { name: 'warning', varName: '--ttt-warning', minExpected: 4.5 },
        { name: 'urgent', varName: '--ttt-urgent', minExpected: 4.5 },
        { name: 'focus', varName: '--ttt-focus', minExpected: 4.5 },
      ]

      readableTextTokens.forEach(({ name, varName, minExpected }) => {
        const hex = cssTokens.get(varName)!

        it(`ensures parsed ${varName} (${hex}) meets ≥ ${minExpected}:1 contrast against base paper (${paper})`, () => {
          expect(hex).toBeDefined()
          const ratio = getContrastRatio(hex, paper)
          expect(ratio).toBeGreaterThanOrEqual(minExpected)
        })

        it(`ensures parsed ${varName} (${hex}) meets ≥ ${minExpected}:1 contrast against raised paper (${paperRaised})`, () => {
          expect(hex).toBeDefined()
          const ratio = getContrastRatio(hex, paperRaised)
          expect(ratio).toBeGreaterThanOrEqual(minExpected)
        })
      })

      describe('Inverted text contrast on filled buttons/badges from CSS tokens', () => {
        const whiteText = paperRaised
        const filledTokens = [
          { name: 'primary button', varName: '--ttt-ink' },
          { name: 'host badge/pill', varName: '--ttt-host-ink' },
          { name: 'guest badge/pill', varName: '--ttt-guest-ink' },
          { name: 'urgent alert', varName: '--ttt-urgent' },
        ]

        filledTokens.forEach(({ name, varName }) => {
          const hex = cssTokens.get(varName)!

          it(`ensures white text meets ≥ 4.5:1 contrast against ${name} (${varName}: ${hex})`, () => {
            expect(hex).toBeDefined()
            const ratio = getContrastRatio(whiteText, hex)
            expect(ratio).toBeGreaterThanOrEqual(4.5)
          })
        })
      })

      describe('Player ink color family invariants (Host = Blue, Guest = Red)', () => {
        const hostInk = cssTokens.get('--ttt-host-ink')!
        const guestInk = cssTokens.get('--ttt-guest-ink')!

        it('verifies parsed CSS player inks belong to blue and red families respectively with distinct hue separation', () => {
          expect(hostInk).toBeDefined()
          expect(guestInk).toBeDefined()

          const hostHsl = hexToHsl(hostInk)
          const guestHsl = hexToHsl(guestInk)

          // Host ink must be in the blue hue range (180° - 250°)
          expect(hostHsl.h).toBeGreaterThanOrEqual(180)
          expect(hostHsl.h).toBeLessThanOrEqual(250)

          // Guest ink must be in the red hue range (330° - 360° or 0° - 30°)
          const isRedFamily = guestHsl.h >= 330 || guestHsl.h <= 30
          expect(isRedFamily).toBe(true)

          // Inks must have clear saturation (not desaturated gray tones)
          expect(hostHsl.s).toBeGreaterThanOrEqual(40)
          expect(guestHsl.s).toBeGreaterThanOrEqual(40)

          // Inks must have a meaningful angular hue separation on the 360° color wheel (≥ 90°)
          const rawDiff = Math.abs(hostHsl.h - guestHsl.h)
          const angularSeparation = Math.min(rawDiff, 360 - rawDiff)
          expect(angularSeparation).toBeGreaterThanOrEqual(90)
        })
      })

      describe('Notebook margin line distinction and paper contrast invariants', () => {
        const marginLine = cssTokens.get('--ttt-margin-line')!
        const guestInk = cssTokens.get('--ttt-guest-ink')!

        it('verifies margin line is a subtle paper divider on notebook paper', () => {
          expect(marginLine).toBeDefined()
          const ratioOnPaper = getContrastRatio(marginLine, paper)
          // Margin line is a faint paper guideline: soft enough to stay background (~1.68:1)
          expect(ratioOnPaper).toBeGreaterThanOrEqual(1.2)
          expect(ratioOnPaper).toBeLessThanOrEqual(2.5)
        })

        it('ensures pale margin line is clearly distinguished from saturated Guest red ink', () => {
          expect(marginLine).toBeDefined()
          expect(guestInk).toBeDefined()

          const marginHsl = hexToHsl(marginLine)
          const guestHsl = hexToHsl(guestInk)

          // Margin line is a pale, desaturated pink with high lightness
          expect(marginHsl.l).toBeGreaterThanOrEqual(75)

          // Guest ink is dark and deeply saturated (contrast vs paper ≥ 4.5:1)
          expect(guestHsl.s).toBeGreaterThanOrEqual(45)

          // Contrast ratio between pale margin line and guest ink is ≥ 3.0:1
          const marginVsGuestRatio = getContrastRatio(marginLine, guestInk)
          expect(marginVsGuestRatio).toBeGreaterThanOrEqual(3.0)
        })
      })
    })
  })
})
