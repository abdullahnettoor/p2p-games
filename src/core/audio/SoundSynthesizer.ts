export interface SoundSynthesizerOptions {
  audioContextFactory?: () => AudioContext | null
  storageKey?: string
}

const DEFAULT_STORAGE_KEY = 'games:sound-enabled'

/**
 * Procedural zero-asset Web Audio synthesizer.
 * Generates dynamic audio effects on demand using Web Audio oscillators.
 * Safely no-ops in Node.js/SSR environments or when AudioContext is unsupported.
 */
export class SoundSynthesizer {
  private muted: boolean = false
  private audioContext: AudioContext | null = null
  private readonly storageKey: string
  private readonly audioContextFactory?: () => AudioContext | null

  constructor(options?: SoundSynthesizerOptions) {
    this.storageKey = options?.storageKey ?? DEFAULT_STORAGE_KEY
    this.audioContextFactory = options?.audioContextFactory

    this.muted = this.readStoragePreference()
  }

  public get isMuted(): boolean {
    return this.muted
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted)
    return this.muted
  }

  public setMuted(muted: boolean): void {
    this.muted = muted
    this.writeStoragePreference(muted)
  }

  private readStoragePreference(): boolean {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false
    }
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored !== null) {
        return stored === 'false'
      }
    } catch {
      // Ignore storage access errors
    }
    return false
  }

  private writeStoragePreference(muted: boolean): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return
    }
    try {
      localStorage.setItem(this.storageKey, muted ? 'false' : 'true')
    } catch {
      // Ignore storage access errors
    }
  }

  private getAudioContext(): AudioContext | null {
    if (this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {})
      }
      return this.audioContext
    }

    if (this.audioContextFactory) {
      this.audioContext = this.audioContextFactory()
      return this.audioContext
    }

    if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        try {
          this.audioContext = new AudioCtx()
          if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {})
          }
          return this.audioContext
        } catch {
          return null
        }
      }
    }

    return null
  }

  /**
   * Helper to play a single tone with optional frequency drop and exponential decay.
   */
  private playTone(
    freq: number,
    type: OscillatorType,
    durationSeconds: number,
    initialGain: number = 0.2,
    pitchDropTo?: number,
    startTimeOffsetSeconds: number = 0
  ): void {
    if (this.muted) return

    const ctx = this.getAudioContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime + startTimeOffsetSeconds
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = type
      osc.frequency.setValueAtTime(freq, now)

      if (pitchDropTo !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, pitchDropTo), now + durationSeconds)
      }

      gain.gain.setValueAtTime(initialGain, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + durationSeconds)
    } catch {
      // Ignore synthesis errors
    }
  }

  /**
   * Crisp, tactile pop/click for number selection.
   */
  public playNumberSelect(): void {
    this.playTone(560, 'sine', 0.08, 0.25, 320)
  }

  /**
   * Subtle two-tone chime alerting player that turn changed.
   */
  public playTurnChange(): void {
    this.playTone(440, 'sine', 0.07, 0.18)
    this.playTone(660, 'sine', 0.12, 0.2, undefined, 0.07)
  }

  /**
   * Harmonious chord when completing a BINGO line.
   */
  public playLineComplete(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'triangle', 0.35, 0.15, undefined, idx * 0.04)
    })
  }

  /**
   * Celebratory ascending fanfare upon achieving victory / 5 lines.
   */
  public playVictory(): void {
    const notes = [
      { freq: 261.63, delay: 0 },    // C4
      { freq: 329.63, delay: 0.1 },  // E4
      { freq: 392.00, delay: 0.2 },  // G4
      { freq: 523.25, delay: 0.3 },  // C5
      { freq: 659.25, delay: 0.45 }, // E5
      { freq: 783.99, delay: 0.6 },  // G5
      { freq: 1046.5, delay: 0.75 }, // C6
    ]

    notes.forEach((n) => {
      this.playTone(n.freq, 'sine', 0.4, 0.2, undefined, n.delay)
    })
  }

  /**
   * Gentle, subtle minor cadence for defeat.
   */
  public playDefeat(): void {
    const notes = [
      { freq: 392.00, delay: 0 },    // G4
      { freq: 349.23, delay: 0.15 }, // F4
      { freq: 329.63, delay: 0.3 },  // E4
      { freq: 261.63, delay: 0.45 }, // C4
    ]

    notes.forEach((n) => {
      this.playTone(n.freq, 'sine', 0.35, 0.15, undefined, n.delay)
    })
  }

  /**
   * Light bubble pop for transient emoji reactions.
   */
  public playReaction(): void {
    this.playTone(680, 'sine', 0.07, 0.15, 900)
  }
}

export const defaultSoundSynthesizer = new SoundSynthesizer()
