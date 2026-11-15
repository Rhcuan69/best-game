// Synthesized sound for Lumen: no audio files, every note is built with WebAudio
// oscillators at the moment it is needed. A soft chime when an ember is gathered (its
// pitch climbs with the combo), a low thud when a wisp hits, a bright arpeggio when a
// wave clears, and a gentle pluck on the title screen. The audio context is created
// on the first user gesture, so browsers never block it.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context !== null) {
      if (context.state === 'suspended') context.resume();
      return context !== null;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.16;
      master.connect(context.destination);
    } catch {
      context = null;
    }
    return context;
  }

  function tone(frequency, duration, type, volume, when) {
    if (!ensure() || muted) return;
    const start = context.currentTime + (when || 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function slide(from, to, duration, type, volume) {
    if (!ensure() || muted) return;
    const start = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  return {
    /** Unlock audio from a user gesture (a key press or a click). */
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    /** Ember pickup: a chime that climbs a little with each combo step. */
    pickup(combo) {
      const base = 523.25 * (1 + 0.06 * Math.min(combo, 8));
      tone(base, 0.22, 'sine', 0.5, 0);
      tone(base * 1.5, 0.3, 'sine', 0.3, 0.03);
    },
    /** Golden sun ember: a brighter, longer chime. */
    sunPickup() {
      tone(659.25, 0.3, 'sine', 0.5, 0);
      tone(987.77, 0.4, 'sine', 0.35, 0.05);
      tone(1318.5, 0.5, 'sine', 0.25, 0.1);
    },
    /** Heart moth: a warm two-note lift. */
    heart() {
      tone(392, 0.25, 'triangle', 0.45, 0);
      tone(587.33, 0.4, 'triangle', 0.4, 0.08);
    },
    /** Wisp hit: a low thud that slides down. */
    hit() {
      slide(220, 55, 0.35, 'sawtooth', 0.5);
      tone(110, 0.3, 'triangle', 0.4, 0);
    },
    /** Dash: a quick airy whoosh upward. */
    dash() {
      slide(300, 900, 0.14, 'sine', 0.25);
    },
    /** A new wave begins: a short rising arpeggio. */
    waveClear(wave) {
      const root = 440 + wave * 12;
      tone(root, 0.18, 'triangle', 0.35, 0);
      tone(root * 1.25, 0.18, 'triangle', 0.35, 0.07);
      tone(root * 1.5, 0.3, 'triangle', 0.35, 0.14);
    },
    /** A soft low note when the game pauses. */
    pause() {
      tone(330, 0.18, 'sine', 0.3, 0);
    },
    /** The combo is lost: a short falling note under the hit thud. */
    comboLost() {
      slide(392, 196, 0.22, 'triangle', 0.3);
    },
    /** Game over: three slow descending notes. */
    gameOver() {
      tone(392, 0.4, 'triangle', 0.4, 0);
      tone(311.13, 0.4, 'triangle', 0.4, 0.25);
      tone(233.08, 0.7, 'triangle', 0.4, 0.5);
    },
    /** Title screen pluck when the game starts. */
    start() {
      tone(523.25, 0.2, 'triangle', 0.4, 0);
      tone(783.99, 0.35, 'triangle', 0.35, 0.06);
    },
  };
}
