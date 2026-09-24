import { describe, it, expect } from 'vitest'
import { generateStrangerName } from './strangerNames'

describe('generateStrangerName', () => {
  it('generates a valid two-word name in "<Adjective> <Animal>" format', () => {
    const name = generateStrangerName()
    expect(name).toBeTruthy()
    const parts = name.split(' ')
    expect(parts.length).toBe(2)
    expect(parts[0].length).toBeGreaterThan(1)
    expect(parts[1].length).toBeGreaterThan(1)
  })

  it('generates identical names when given the same numeric seed', () => {
    const name1 = generateStrangerName(42)
    const name2 = generateStrangerName(42)
    expect(name1).toBe(name2)
    expect(name1).toBe('Clever Badger')
  })

  it('generates identical names when given the same string seed', () => {
    const name1 = generateStrangerName('player-session-123')
    const name2 = generateStrangerName('player-session-123')
    expect(name1).toBe(name2)
  })

  it('generates different names for different seeds', () => {
    const name1 = generateStrangerName(1)
    const name2 = generateStrangerName(2)
    expect(name1).not.toBe(name2)
  })
})
