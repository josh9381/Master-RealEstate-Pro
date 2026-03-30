/**
 * Notification sound system.
 *
 * Uses the Web Audio API to generate short tones — no external audio files needed.
 * Each notification type maps to a distinct frequency/pattern so users can
 * distinguish event types by ear.
 *
 * Sound preferences are stored per-user via userStorage and exposed
 * through the notification settings page.
 */

import { getUserItem, setUserItem } from '@/lib/userStorage'

const SOUND_SETTINGS_KEY = 'notification_sound_settings'

export interface SoundSettings {
  /** Master toggle — sounds ON by default per DS-15 decision */
  enabled: boolean
  /** Volume 0–1 */
  volume: number
  /** Per-event toggles */
  events: Record<string, boolean>
}

const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.5,
  events: {
    'new-lead': true,
    'lead-updated': false,
    'lead-assigned': true,
    'lead-converted': true,
    'campaign-sent': true,
    'campaign-milestone': true,
    'campaign-issue': true,
    'new-message': true,
    'message-replied': true,
    'missed-call': true,
    'task-due': true,
    'followup-reminder': true,
    'meeting-reminder': true,
  },
}

export function getSoundSettings(userId: string | undefined): SoundSettings {
  const raw = getUserItem(userId, SOUND_SETTINGS_KEY)
  if (!raw) return { ...DEFAULT_SOUND_SETTINGS }
  try {
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_SOUND_SETTINGS,
      ...parsed,
      events: { ...DEFAULT_SOUND_SETTINGS.events, ...parsed.events },
    }
  } catch {
    return { ...DEFAULT_SOUND_SETTINGS }
  }
}

export function saveSoundSettings(userId: string | undefined, settings: SoundSettings): void {
  setUserItem(userId, SOUND_SETTINGS_KEY, JSON.stringify(settings))
}

// ---------- Audio generation ----------

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContext()
    }
    return audioCtx
  } catch {
    return null
  }
}

type ToneShape = { freq: number; duration: number; type: OscillatorType }

const TONE_MAP: Record<string, ToneShape[]> = {
  // Leads — warm bell
  'new-lead': [{ freq: 880, duration: 0.12, type: 'sine' }, { freq: 1100, duration: 0.15, type: 'sine' }],
  'lead-assigned': [{ freq: 660, duration: 0.1, type: 'sine' }, { freq: 880, duration: 0.12, type: 'sine' }],
  'lead-converted': [{ freq: 523, duration: 0.1, type: 'sine' }, { freq: 659, duration: 0.1, type: 'sine' }, { freq: 784, duration: 0.15, type: 'sine' }],
  // Campaigns — sharper
  'campaign-sent': [{ freq: 700, duration: 0.15, type: 'triangle' }],
  'campaign-milestone': [{ freq: 600, duration: 0.1, type: 'triangle' }, { freq: 800, duration: 0.15, type: 'triangle' }],
  'campaign-issue': [{ freq: 400, duration: 0.15, type: 'square' }, { freq: 350, duration: 0.2, type: 'square' }],
  // Communication — soft chime
  'new-message': [{ freq: 1047, duration: 0.08, type: 'sine' }, { freq: 1319, duration: 0.12, type: 'sine' }],
  'message-replied': [{ freq: 880, duration: 0.1, type: 'sine' }],
  'missed-call': [{ freq: 500, duration: 0.12, type: 'triangle' }, { freq: 400, duration: 0.15, type: 'triangle' }],
  // Tasks — gentle nudge
  'task-due': [{ freq: 740, duration: 0.1, type: 'sine' }, { freq: 740, duration: 0.1, type: 'sine' }],
  'followup-reminder': [{ freq: 660, duration: 0.12, type: 'sine' }],
  'meeting-reminder': [{ freq: 784, duration: 0.1, type: 'sine' }, { freq: 988, duration: 0.15, type: 'sine' }],
}

/** Default tone when event type is unknown */
const DEFAULT_TONE: ToneShape[] = [{ freq: 800, duration: 0.12, type: 'sine' }]

function playToneSequence(tones: ToneShape[], volume: number) {
  const ctx = getAudioContext()
  if (!ctx) return

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume()
  }

  let offset = 0
  for (const tone of tones) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = tone.type
    osc.frequency.value = tone.freq

    gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime + offset)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + tone.duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(ctx.currentTime + offset)
    osc.stop(ctx.currentTime + offset + tone.duration + 0.05)

    offset += tone.duration + 0.03
  }
}

/**
 * Play a notification sound for the given event type.
 * Respects the user's per-event and master sound settings.
 */
export function playNotificationSound(userId: string | undefined, eventType: string): void {
  const settings = getSoundSettings(userId)
  if (!settings.enabled) return
  if (settings.events[eventType] === false) return

  const tones = TONE_MAP[eventType] || DEFAULT_TONE
  playToneSequence(tones, settings.volume)
}

/**
 * Play a test/preview sound for settings UI.
 */
export function playPreviewSound(eventType: string, volume = 0.5): void {
  const tones = TONE_MAP[eventType] || DEFAULT_TONE
  playToneSequence(tones, volume)
}
