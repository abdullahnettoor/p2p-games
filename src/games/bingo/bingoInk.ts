export type BingoInkRole = 'host' | 'guest'

export interface BingoPlayerInk {
  name: string
  role: BingoInkRole
}

export const BINGO_INK_PRESENTATION = {
  host: {
    label: 'Host ink',
    markShape: 'cross',
    markGlyph: '×',
  },
  guest: {
    label: 'Guest ink',
    markShape: 'loop',
    markGlyph: '○',
  },
} as const

export function getBingoInkPresentation(role: BingoInkRole) {
  return BINGO_INK_PRESENTATION[role]
}
