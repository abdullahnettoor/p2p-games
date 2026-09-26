import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * Calculates the relative luminance of an sRGB hex color per WCAG 2.1 specifications:
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getRelativeLuminance(hex: string): number {
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
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1)
  const lum2 = getRelativeLuminance(hex2)
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Converts a hex color to HSL to check hue families and saturation invariants.
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const cleanHex = hex.replace(/^#/, '').trim()
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255

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

describe('Design System Contrast & Color Invariants', () => {
  describe('WCAG calculation validation', () => {
    it('accurately calculates black on white as 21:1 and white on white as 1:1', () => {
      expect(getContrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0)
      expect(getContrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 0)
    })
  })

  describe('Bingo design system contrast pairs', () => {
    const paper = '#F7F9F4'
    const paperRaised = '#FFFFFF'

    const textColors = [
      { name: 'graphite', hex: '#27313A', minExpected: 4.5 },
      { name: 'graphite-muted', hex: '#65716F', minExpected: 4.5 },
      { name: 'host-ink', hex: '#175E9C', minExpected: 4.5 },
      { name: 'guest-ink', hex: '#A63D57', minExpected: 4.5 },
      { name: 'warning', hex: '#A85B16', minExpected: 4.5 },
      { name: 'urgent', hex: '#B42335', minExpected: 4.5 },
      { name: 'focus', hex: '#087E8B', minExpected: 4.5 },
    ]

    textColors.forEach(({ name, hex, minExpected }) => {
      it(`ensures ${name} (${hex}) meets ≥ ${minExpected}:1 contrast against base paper (${paper})`, () => {
        const ratio = getContrastRatio(hex, paper)
        expect(ratio).toBeGreaterThanOrEqual(minExpected)
      })

      it(`ensures ${name} (${hex}) meets ≥ ${minExpected}:1 contrast against raised paper (${paperRaised})`, () => {
        const ratio = getContrastRatio(hex, paperRaised)
        expect(ratio).toBeGreaterThanOrEqual(minExpected)
      })
    })

    describe('Inverted text contrast on filled buttons/badges', () => {
      const whiteText = '#FFFFFF'
      const filledBgs = [
        { name: 'button-primary (graphite)', hex: '#27313A' },
        { name: 'host badge/pill (host-ink)', hex: '#175E9C' },
        { name: 'guest badge/pill (guest-ink)', hex: '#A63D57' },
        { name: 'urgent alert (urgent)', hex: '#B42335' },
      ]

      filledBgs.forEach(({ name, hex }) => {
        it(`ensures white text meets ≥ 4.5:1 contrast against ${name} (${hex})`, () => {
          const ratio = getContrastRatio(whiteText, hex)
          expect(ratio).toBeGreaterThanOrEqual(4.5)
        })
      })
    })
  })

  describe('Player ink color family invariants (Host = Blue, Guest = Red)', () => {
    it('verifies Bingo player inks belong to blue and red families respectively', () => {
      const hostInk = '#175E9C'
      const guestInk = '#A63D57'

      const hostHsl = hexToHsl(hostInk)
      const guestHsl = hexToHsl(guestInk)

      // Host ink must be in the blue hue range (180° - 250°)
      expect(hostHsl.h).toBeGreaterThanOrEqual(180)
      expect(hostHsl.h).toBeLessThanOrEqual(250)

      // Guest ink must be in the red/berry hue range (330° - 360° or 0° - 30°)
      const isRedFamily = guestHsl.h >= 330 || guestHsl.h <= 30
      expect(isRedFamily).toBe(true)

      // Inks must have clear contrast from each other so they do not clash or confuse
      const inkContrast = getContrastRatio(hostInk, guestInk)
      expect(inkContrast).toBeGreaterThan(1.0)
    })
  })

  describe('Documented game DESIGN.md contrast auditing', () => {
    it('audits all color tokens documented in src/games/bingo/DESIGN.md', () => {
      const bingoDesignPath = path.resolve(__dirname, 'bingo/DESIGN.md')
      expect(fs.existsSync(bingoDesignPath)).toBe(true)

      const content = fs.readFileSync(bingoDesignPath, 'utf-8')

      // Extract colors block from YAML frontmatter
      const colorsMatch = content.match(/colors:\s*\n([\s\S]*?)(?=\ntypography:|\n---)/)
      expect(colorsMatch).not.toBeNull()

      const colorsBlock = colorsMatch![1]
      const colorEntries = colorsBlock
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes(':'))
        .map((line) => {
          const [key, ...rest] = line.split(':')
          const value = rest.join(':').replace(/["']/g, '').trim()
          return { key: key.trim(), value }
        })

      const colorMap = new Map(colorEntries.map((e) => [e.key, e.value]))

      const paper = colorMap.get('paper')!
      expect(paper).toBeDefined()

      const requiredReadableTextKeys = [
        'graphite',
        'graphite-muted',
        'host-ink',
        'guest-ink',
        'warning',
        'urgent',
      ]

      for (const key of requiredReadableTextKeys) {
        const hex = colorMap.get(key)
        expect(hex, `Expected token ${key} to be defined in frontmatter`).toBeDefined()
        const ratio = getContrastRatio(hex!, paper)
        expect(
          ratio,
          `Token ${key} (${hex}) on paper (${paper}) has contrast ${ratio.toFixed(2)}, expected >= 4.5:1`
        ).toBeGreaterThanOrEqual(4.5)
      }
    })
  })
})
