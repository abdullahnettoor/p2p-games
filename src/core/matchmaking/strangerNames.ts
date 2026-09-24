const ADJECTIVES = [
  'Swift',
  'Brave',
  'Clever',
  'Lucky',
  'Quiet',
  'Mighty',
  'Calm',
  'Sunny',
  'Wild',
  'Cosmic',
  'Bright',
  'Witty',
  'Bold',
  'Nimble',
  'Keen',
  'Merry',
  'Gentle',
  'Jolly',
  'Eager',
  'Noble',
] as const

const ANIMALS = [
  'Otter',
  'Falcon',
  'Badger',
  'Panda',
  'Fox',
  'Eagle',
  'Dolphin',
  'Lynx',
  'Koala',
  'Tiger',
  'Hawk',
  'Wolf',
  'Owl',
  'Robin',
  'Bear',
  'Rabbit',
  'Stag',
  'Seal',
  'Finch',
  'Hedgehog',
] as const

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/**
 * Generates an auto-generated friendly stranger name (e.g. "Swift Otter").
 * If a seed is provided, generation is deterministic.
 */
export function generateStrangerName(seed?: number | string): string {
  if (seed !== undefined) {
    const num = typeof seed === 'number' ? Math.abs(Math.floor(seed)) : hashString(seed)
    const adjIndex = num % ADJECTIVES.length
    const animalIndex = Math.floor(num / ADJECTIVES.length) % ANIMALS.length
    return `${ADJECTIVES[adjIndex]} ${ANIMALS[animalIndex]}`
  }

  const adjIndex = Math.floor(Math.random() * ADJECTIVES.length)
  const animalIndex = Math.floor(Math.random() * ANIMALS.length)
  return `${ADJECTIVES[adjIndex]} ${ANIMALS[animalIndex]}`
}
