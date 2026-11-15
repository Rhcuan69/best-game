// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot
// (chase the nearest ember, keep clear of wisps, dash when one closes in), so the frame
// is what a short game really looks like and the same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER, KIND_EMBER, KIND_SUN, KIND_WISP } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 28;
const END_LIMIT_SECONDS = 600;
/**
 * How far ahead, in seconds, the autopilot checks each way it could move: the play
 * scene's pilot looks well ahead and keeps all its lives; the end scene's looks only a
 * moment ahead, so it is caught out once the wisps speed up, as a hurried player is.
 */
const HORIZON_PLAY = 1.2;
const HORIZON_END = 0.22;
const SAMPLE = 1 / 30;
const DASH_DISTANCE = 140;
/** How close a wisp must come, in pixels, to count as a hit in the look-ahead. */
const HIT_RADIUS = 34;

/** Seconds until steering `steer` runs the firefly into a wisp; Infinity when it never does. */
function timeToHit(state, steer, horizon) {
  const player = state.player;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const x = Math.min(FIELD.width - 16, Math.max(16, player.x + steer.x * 340 * t));
    const y = Math.min(FIELD.height - 16, Math.max(60, player.y + steer.y * 340 * t));
    for (let index = 0; index < state.entities.length; index += 1) {
      const entity = state.entities[index];
      if (!entity.active || entity.kind !== KIND_WISP) continue;
      const dx = entity.x - x;
      const dy = entity.y - y;
      if (dx * dx + dy * dy < HIT_RADIUS * HIT_RADIUS) return t;
    }
  }
  return Infinity;
}

function nearestEmber(state) {
  let best = null;
  let bestDistance = Infinity;
  for (let index = 0; index < state.entities.length; index += 1) {
    const entity = state.entities[index];
    if (!entity.active || (entity.kind !== KIND_EMBER && entity.kind !== KIND_SUN)) continue;
    const dx = entity.x - state.player.x;
    const dy = entity.y - state.player.y;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = entity;
    }
  }
  return best;
}

function nearestWispDistance(state) {
  let best = Infinity;
  for (let index = 0; index < state.entities.length; index += 1) {
    const entity = state.entities[index];
    if (!entity.active || entity.kind !== KIND_WISP) continue;
    const dx = entity.x - state.player.x;
    const dy = entity.y - state.player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < best) best = distance;
  }
  return best;
}

/** Chase the nearest ember when that is safe; otherwise steer to the way hit last. */
export function autopilot(state, horizon) {
  const player = state.player;
  const ember = nearestEmber(state);
  const target = ember === null ? { x: FIELD.width / 2, y: FIELD.height / 2 } : ember;
  const wanted = {
    x: target.x > player.x + 10 ? 1 : target.x < player.x - 10 ? -1 : 0,
    y: target.y > player.y + 10 ? 1 : target.y < player.y - 10 ? -1 : 0,
  };
  let best = wanted;
  let bestTime = timeToHit(state, wanted, horizon);
  const options = [
    { x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 },
    { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: -1 },
    { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 },
  ];
  for (let index = 0; index < options.length && bestTime !== Infinity; index += 1) {
    const time = timeToHit(state, options[index], horizon);
    if (time > bestTime) {
      bestTime = time;
      best = options[index];
    }
  }
  const dash = nearestWispDistance(state) < DASH_DISTANCE && bestTime < 0.4;
  return { steer: best, dash };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { x: 0, y: 0 }, false, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const horizon = name === 'end' ? HORIZON_END : HORIZON_PLAY;
  for (let index = 0; index < limit / STEP; index += 1) {
    const move = autopilot(world.state, horizon);
    if (world.step(STEP, move.steer, move.dash, false) & EVENT_OVER) break;
  }
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
