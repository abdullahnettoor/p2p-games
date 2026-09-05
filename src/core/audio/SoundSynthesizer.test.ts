import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SoundSynthesizer } from './SoundSynthesizer'

describe('SoundSynthesizer', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('initializes unmuted by default when localStorage is empty', () => {
    const synth = new SoundSynthesizer()
    expect(synth.isMuted).toBe(false)
  })

  it('respects stored mute preference from localStorage', () => {
    localStorage.setItem('games:sound-enabled', 'false')
    const synth = new SoundSynthesizer()
    expect(synth.isMuted).toBe(true)
  })

  it('toggles mute state and saves to localStorage', () => {
    const synth = new SoundSynthesizer()
    expect(synth.isMuted).toBe(false)

    synth.toggleMute()
    expect(synth.isMuted).toBe(true)
    expect(localStorage.getItem('games:sound-enabled')).toBe('false')

    synth.toggleMute()
    expect(synth.isMuted).toBe(false)
    expect(localStorage.getItem('games:sound-enabled')).toBe('true')
  })

  it('allows explicit setMuted calls', () => {
    const synth = new SoundSynthesizer()
    synth.setMuted(true)
    expect(synth.isMuted).toBe(true)

    synth.setMuted(false)
    expect(synth.isMuted).toBe(false)
  })

  it('safely handles audio playback methods when muted without throwing', () => {
    const synth = new SoundSynthesizer()
    synth.setMuted(true)

    expect(() => {
      synth.playNumberSelect()
      synth.playTurnChange()
      synth.playLineComplete()
      synth.playVictory()
      synth.playDefeat()
      synth.playReaction()
    }).not.toThrow()
  })

  it('safely handles audio playback methods when AudioContext is not supported', () => {
    const synth = new SoundSynthesizer()
    expect(() => {
      synth.playNumberSelect()
      synth.playTurnChange()
      synth.playLineComplete()
      synth.playVictory()
      synth.playDefeat()
      synth.playReaction()
    }).not.toThrow()
  })

  it('interacts with AudioContext when available and unmuted', () => {
    const mockGainNode = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    }

    const mockOscillatorNode = {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }

    const mockAudioContext = {
      state: 'running',
      currentTime: 100,
      resume: vi.fn().mockResolvedValue(undefined),
      createGain: vi.fn().mockReturnValue(mockGainNode),
      createOscillator: vi.fn().mockReturnValue(mockOscillatorNode),
      destination: {},
    }

    const synth = new SoundSynthesizer({
      audioContextFactory: () => mockAudioContext as unknown as AudioContext,
    })

    synth.playNumberSelect()
    expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    expect(mockAudioContext.createGain).toHaveBeenCalled()
    expect(mockOscillatorNode.start).toHaveBeenCalled()
  })
})
