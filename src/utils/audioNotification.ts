/**
 * Audio Notification Utility for Reyadat Al-Ataa
 * Provides subtle, pleasant Web Audio API synthesizers for notifications,
 * specifically for new volunteer & team application submissions.
 */

import { useState, useEffect, useCallback } from 'react';

export const APP_AUDIO_STORAGE_KEY = 'reyada_audio_notif_applications';
export const GENERAL_AUDIO_STORAGE_KEY = 'notif_sound_enabled';

// Event name for instant cross-component synchronization
const AUDIO_CHANGE_EVENT = 'reyada_application_audio_change';

/**
 * Check if audio notification for applications is enabled by the user.
 * Defaults to true.
 */
export function isApplicationAudioEnabled(): boolean {
  try {
    const val = localStorage.getItem(APP_AUDIO_STORAGE_KEY);
    if (val === null) return true; // default enabled
    return val === 'true';
  } catch {
    return true;
  }
}

/**
 * Update the user's audio notification preference for applications.
 */
export function setApplicationAudioEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(APP_AUDIO_STORAGE_KEY, String(enabled));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(AUDIO_CHANGE_EVENT, { detail: { enabled } })
      );
    }
  } catch (err) {
    console.warn('Failed to save audio notification setting:', err);
  }
}

/**
 * Synthesize and play a gentle, subtle audio chime.
 * Major triad harmony (D5 -> F#5 -> A5) with soft attack & smooth exponential decay.
 * Respects user settings unless forcePlay is set to true (e.g. for testing).
 */
export function playApplicationSubmittedChime(forcePlay: boolean = false): void {
  if (!forcePlay && !isApplicationAudioEnabled()) {
    return;
  }

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    // Browser autoplay policy might suspend ctx until first user interaction
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Master volume (soft and subtle)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.12, now);
    masterGain.connect(ctx.destination);

    // Warm three-tone ascending chord (D5: 587.33Hz, F#5: 739.99Hz, A5: 880Hz)
    const notes = [
      { freq: 587.33, start: 0, duration: 0.16 },
      { freq: 739.99, start: 0.08, duration: 0.2 },
      { freq: 880.00, start: 0.16, duration: 0.38 }
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      // Sine wave for smooth, warm, non-jarring bell tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      // Subtle exponential decay
      noteGain.gain.setValueAtTime(0.001, now + start);
      noteGain.gain.linearRampToValueAtTime(0.35, now + start + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(now + start);
      osc.stop(now + start + duration);
    });

    // Cleanup AudioContext after playback completes
    setTimeout(() => {
      try {
        ctx.close();
      } catch {}
    }, 1200);
  } catch (err) {
    console.warn('Audio notification playback suppressed or unsupported:', err);
  }
}

/**
 * Preview / Test the application submission chime
 */
export function testApplicationSound(): void {
  playApplicationSubmittedChime(true);
}

/**
 * React hook to observe and toggle the application audio notification setting.
 */
export function useApplicationAudio() {
  const [enabled, setEnabled] = useState<boolean>(() => isApplicationAudioEnabled());

  useEffect(() => {
    const handleSettingChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.enabled === 'boolean') {
        setEnabled(customEvent.detail.enabled);
      } else {
        setEnabled(isApplicationAudioEnabled());
      }
    };

    window.addEventListener(AUDIO_CHANGE_EVENT, handleSettingChange);
    window.addEventListener('storage', handleSettingChange);

    return () => {
      window.removeEventListener(AUDIO_CHANGE_EVENT, handleSettingChange);
      window.removeEventListener('storage', handleSettingChange);
    };
  }, []);

  const toggle = useCallback(() => {
    const nextState = !enabled;
    setApplicationAudioEnabled(nextState);
    setEnabled(nextState);
    if (nextState) {
      testApplicationSound();
    }
  }, [enabled]);

  return {
    isAudioEnabled: enabled,
    setIsAudioEnabled: (val: boolean) => {
      setApplicationAudioEnabled(val);
      setEnabled(val);
    },
    toggleAudio: toggle,
    testSound: testApplicationSound
  };
}
