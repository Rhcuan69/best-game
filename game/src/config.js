// Lumen — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to fit the
// window, so no rule below depends on the screen size. A lantern firefly drifts through
// a dark garden, gathering ember orbs while shadow wisps hunt it.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 16,
  speed: 340,
  accel: 2600,
  drag: 4.2,
  invulnerable: 1.6,
  dashSpeed: 980,
  dashTime: 0.16,
  dashCooldown: 1.1,
  attractRadius: 170,
};

export const LIVES = 3;

/** An ember orb: the thing you collect. Worth 10 points times the combo multiplier. */
export const EMBER = {
  radius: 11,
  points: 10,
  interval: 0.8,
  intervalJitter: 0.5,
  drift: 26,
  maxAlive: 14,
};

/** A rare golden sun ember: worth 50 points times the combo multiplier. */
export const SUN_EMBER = {
  radius: 15,
  points: 50,
  chance: 0.09,
};

/** A heart moth: restores one life, up to the maximum. Rare, and it flees the player. */
export const HEART = {
  radius: 13,
  chance: 0.05,
  minInterval: 22,
};

/** An ember that nobody gathers fades away after this many seconds, so the garden
 *  keeps turning over and a careless player cannot farm one corner forever. */
export const EMBER_LIFETIME = 16;

/** A shadow wisp: drifts, then chases. Touching one costs a life and resets the combo. */
export const WISP = {
  radius: 17,
  driftSpeed: 55,
  chaseSpeed: 108,
  chasePerWave: 8,
  maxChaseSpeed: 235,
  interval: 2.6,
  intervalScale: 0.9,
  minInterval: 0.9,
  maxAlive: 16,
};

/** Combo: each ember collected within the window raises the multiplier, up to x8. */
export const COMBO = { window: 3.0, max: 8, perPickup: 1 };

/** A wave lasts this long; each new wave spawns wisps faster and they chase harder. */
export const WAVE = { seconds: 18, max: 99 };

/** How many entities can exist at once; the pools are allocated once, at boot. */
export const POOL_SIZE = 96;

export const PALETTE = {
  backdrop: '#070a12',
  skyTop: '#0b1024',
  skyBottom: '#131a2e',
  ground: '#0e1420',
  ember: '#ffb347',
  emberCore: '#ffe9a8',
  sunEmber: '#ffd94a',
  heart: '#ff7d9c',
  wisp: '#7b6fd6',
  wispCore: '#b7aef5',
  player: '#ffd27a',
  playerCore: '#fff6d8',
  panel: '#141a2b',
  panelEdge: '#2c3550',
  text: '#f4eedd',
  muted: '#9aa5bd',
  danger: '#ff6b6b',
  dash: '#7ee7d2',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lumen.best';
