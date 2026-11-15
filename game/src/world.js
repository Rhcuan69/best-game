// The game's rules and state, with no drawing and no browser in it: the lantern
// firefly, the pools of ember orbs, sun embers, heart moths and shadow wisps, spawning,
// waves, combo, dash, collisions, score and lives. step() advances one fixed step and
// returns what happened as bit flags, so the caller can react (and play sounds) without
// the world knowing about screens. Nothing here allocates after createWorld returns.

import {
  COMBO, EMBER, EMBER_LIFETIME, FIELD, HEART, LIVES, PLAYER, POOL_SIZE, SUN_EMBER, WAVE, WISP,
} from './config.js';
import { range } from './random.js';

export const KIND_EMBER = 0;
export const KIND_WISP = 1;
export const KIND_SUN = 2;
export const KIND_HEART = 3;

export const EVENT_PICKUP = 1;
export const EVENT_SUN = 2;
export const EVENT_HEART = 4;
export const EVENT_HIT = 8;
export const EVENT_OVER = 16;
export const EVENT_WAVE = 32;
export const EVENT_DASH = 64;

function circleHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const reach = ar + br;
  return dx * dx + dy * dy < reach * reach;
}

function clampToField(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createWorld(random) {
  const player = {
    x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0,
    invulnerable: 0, dashTime: 0, dashCooldown: 0, dashX: 1, dashY: 0, facing: 1,
  };
  const entities = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    entities.push({
      active: false, kind: KIND_EMBER, x: 0, y: 0, vx: 0, vy: 0,
      radius: EMBER.radius, age: 0, seed: 0, phase: 0,
    });
  }
  const particles = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, kind: 0 });
  }
  const state = {
    player, entities, particles,
    score: 0, lives: LIVES, wave: 1, combo: 0, comboTimer: 0, bestCombo: 0,
    elapsed: 0, emberTimer: 0.4, wispTimer: 2.2, heartTimer: HEART.minInterval,
    embersCaught: 0, wispsDodged: 0, dashes: 0,
  };

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height / 2;
    player.vx = 0;
    player.vy = 0;
    player.invulnerable = 0;
    player.dashTime = 0;
    player.dashCooldown = 0;
    player.facing = 1;
    for (const entity of entities) entity.active = false;
    for (const spark of particles) spark.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.wave = 1;
    state.combo = 0;
    state.comboTimer = 0;
    state.bestCombo = 0;
    state.elapsed = 0;
    state.emberTimer = 0.4;
    state.wispTimer = 2.2;
    state.heartTimer = HEART.minInterval;
    state.embersCaught = 0;
    state.wispsDodged = 0;
    state.dashes = 0;
  }

  function freeEntity() {
    for (let index = 0; index < entities.length; index += 1) {
      if (!entities[index].active) return entities[index];
    }
    return null;
  }

  function freeParticle() {
    for (let index = 0; index < particles.length; index += 1) {
      if (!particles[index].active) return particles[index];
    }
    return null;
  }

  function burst(x, y, count, kind, speed) {
    for (let made = 0; made < count; made += 1) {
      const spark = freeParticle();
      if (spark === null) return;
      const angle = random() * Math.PI * 2;
      const push = range(random, speed * 0.3, speed);
      spark.active = true;
      spark.x = x;
      spark.y = y;
      spark.vx = Math.cos(angle) * push;
      spark.vy = Math.sin(angle) * push;
      spark.maxLife = range(random, 0.35, 0.8);
      spark.life = spark.maxLife;
      spark.size = range(random, 2, 4.5);
      spark.kind = kind;
    }
  }

  function farFromPlayer(minDistance) {
    for (let tries = 0; tries < 8; tries += 1) {
      const x = range(random, 40, FIELD.width - 40);
      const y = range(random, 70, FIELD.height - 40);
      const dx = x - player.x;
      const dy = y - player.y;
      if (dx * dx + dy * dy > minDistance * minDistance) return { x, y };
    }
    return { x: range(random, 40, FIELD.width - 40), y: range(random, 70, FIELD.height - 40) };
  }

  function spawnEmber() {
    const entity = freeEntity();
    if (entity === null) return;
    const spot = farFromPlayer(90);
    const golden = random() < SUN_EMBER.chance;
    entity.active = true;
    entity.kind = golden ? KIND_SUN : KIND_EMBER;
    entity.x = spot.x;
    entity.y = spot.y;
    entity.vx = range(random, -EMBER.drift, EMBER.drift);
    entity.vy = range(random, -EMBER.drift, EMBER.drift);
    entity.radius = golden ? SUN_EMBER.radius : EMBER.radius;
    entity.age = 0;
    entity.seed = random() * Math.PI * 2;
    entity.phase = 0;
  }

  function spawnWisp() {
    const entity = freeEntity();
    if (entity === null) return;
    const edge = Math.floor(random() * 4);
    let x = 0;
    let y = 0;
    if (edge === 0) { x = range(random, 0, FIELD.width); y = -30; }
    else if (edge === 1) { x = range(random, 0, FIELD.width); y = FIELD.height + 30; }
    else if (edge === 2) { x = -30; y = range(random, 0, FIELD.height); }
    else { x = FIELD.width + 30; y = range(random, 0, FIELD.height); }
    entity.active = true;
    entity.kind = KIND_WISP;
    entity.x = x;
    entity.y = y;
    entity.vx = 0;
    entity.vy = 0;
    entity.radius = WISP.radius;
    entity.age = 0;
    entity.seed = random() * Math.PI * 2;
    entity.phase = 0;
  }

  function spawnHeart() {
    const entity = freeEntity();
    if (entity === null) return;
    const spot = farFromPlayer(220);
    entity.active = true;
    entity.kind = KIND_HEART;
    entity.x = spot.x;
    entity.y = spot.y;
    entity.vx = 0;
    entity.vy = 0;
    entity.radius = HEART.radius;
    entity.age = 0;
    entity.seed = random() * Math.PI * 2;
    entity.phase = 0;
  }

  function countKind(kind) {
    let count = 0;
    for (const entity of entities) if (entity.active && entity.kind === kind) count += 1;
    return count;
  }

  function wispInterval() {
    return Math.max(WISP.minInterval, WISP.interval * (WISP.intervalScale ** (state.wave - 1)));
  }

  function wispChaseSpeed() {
    return Math.min(WISP.maxChaseSpeed, WISP.chaseSpeed + WISP.chasePerWave * (state.wave - 1));
  }

  function addCombo() {
    state.combo = Math.min(COMBO.max, state.combo + COMBO.perPickup);
    state.comboTimer = COMBO.window;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
  }

  function collect(entity) {
    entity.active = false;
    addCombo();
    const base = entity.kind === KIND_SUN ? SUN_EMBER.points : EMBER.points;
    state.score += base * state.combo;
    state.embersCaught += 1;
    burst(entity.x, entity.y, entity.kind === KIND_SUN ? 16 : 9, entity.kind, 130);
    return entity.kind === KIND_SUN ? EVENT_SUN : EVENT_PICKUP;
  }

  /**
   * One fixed step. `steer` is the movement vector {x, y} (keys, or toward the pointer);
   * `dash` asks for a dash this step. With `harmless` set (the title screen's backdrop)
   * things drift but nothing scores and nothing can hurt the player.
   */
  function step(dt, steer, dash, harmless) {
    let events = 0;
    state.elapsed += dt;
    const wave = Math.min(WAVE.max, 1 + Math.floor(state.elapsed / WAVE.seconds));
    if (wave !== state.wave) {
      state.wave = wave;
      events |= EVENT_WAVE;
    }

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (player.dashCooldown > 0) player.dashCooldown = Math.max(0, player.dashCooldown - dt);

    // Dashing: a short burst in the steering direction (or the facing direction),
    // with brief invulnerability and a trail of sparks.
    if (dash && player.dashCooldown === 0 && player.dashTime === 0 && !harmless) {
      const length = Math.hypot(steer.x, steer.y);
      if (length > 0.01) {
        player.dashX = steer.x / length;
        player.dashY = steer.y / length;
      } else {
        player.dashX = player.facing;
        player.dashY = 0;
      }
      player.dashTime = PLAYER.dashTime;
      player.dashCooldown = PLAYER.dashCooldown;
      player.invulnerable = Math.max(player.invulnerable, PLAYER.dashTime + 0.08);
      state.dashes += 1;
      events |= EVENT_DASH;
    }

    if (player.dashTime > 0) {
      player.dashTime = Math.max(0, player.dashTime - dt);
      player.vx = player.dashX * PLAYER.dashSpeed;
      player.vy = player.dashY * PLAYER.dashSpeed;
      burst(player.x, player.y, 2, 4, 40);
    } else {
      player.vx += steer.x * PLAYER.accel * dt;
      player.vy += steer.y * PLAYER.accel * dt;
      const drag = Math.max(0, 1 - PLAYER.drag * dt);
      player.vx *= drag;
      player.vy *= drag;
      const speed = Math.hypot(player.vx, player.vy);
      if (speed > PLAYER.speed) {
        player.vx = (player.vx / speed) * PLAYER.speed;
        player.vy = (player.vy / speed) * PLAYER.speed;
      }
    }
    player.x = clampToField(player.x + player.vx * dt, PLAYER.radius, FIELD.width - PLAYER.radius);
    player.y = clampToField(player.y + player.vy * dt, PLAYER.radius + 44, FIELD.height - PLAYER.radius);
    if (Math.abs(player.vx) > 20) player.facing = player.vx > 0 ? 1 : -1;

    // Spawning.
    state.emberTimer -= dt;
    if (state.emberTimer <= 0 && countKind(KIND_EMBER) + countKind(KIND_SUN) < EMBER.maxAlive) {
      spawnEmber();
      state.emberTimer += EMBER.interval + random() * EMBER.intervalJitter;
    }
    state.wispTimer -= dt;
    if (state.wispTimer <= 0 && countKind(KIND_WISP) < Math.min(WISP.maxAlive, 2 + state.wave)) {
      spawnWisp();
      state.wispTimer += wispInterval();
    }
    state.heartTimer -= dt;
    if (state.heartTimer <= 0) {
      if (state.lives < LIVES && random() < 0.6) spawnHeart();
      state.heartTimer += HEART.minInterval + random() * 10;
    }

    // Entities move and meet the player.
    for (let index = 0; index < entities.length; index += 1) {
      const entity = entities[index];
      if (!entity.active) continue;
      entity.age += dt;
      entity.phase += dt;
      if (entity.kind === KIND_EMBER || entity.kind === KIND_SUN) {
        if (entity.age > EMBER_LIFETIME) {
          entity.active = false;
          continue;
        }
        entity.x += entity.vx * dt + Math.sin(entity.phase * 1.7 + entity.seed) * 12 * dt;
        entity.y += entity.vy * dt + Math.cos(entity.phase * 1.3 + entity.seed) * 12 * dt;
        entity.x = clampToField(entity.x, 20, FIELD.width - 20);
        entity.y = clampToField(entity.y, 60, FIELD.height - 20);
        // The lantern's glow pulls nearby embers in: collecting feels magnetic.
        const dx = player.x - entity.x;
        const dy = player.y - entity.y;
        const distance = Math.hypot(dx, dy);
        if (!harmless && distance < PLAYER.attractRadius && distance > 1) {
          const pull = (1 - distance / PLAYER.attractRadius) * 260;
          entity.x += (dx / distance) * pull * dt;
          entity.y += (dy / distance) * pull * dt;
        }
        if (!harmless && circleHit(player.x, player.y, PLAYER.radius + 6, entity.x, entity.y, entity.radius)) {
          events |= collect(entity);
        }
      } else if (entity.kind === KIND_HEART) {
        // A heart moth flees the lantern, slowly, so it must be chased down.
        const dx = entity.x - player.x;
        const dy = entity.y - player.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 1 && distance < 200) {
          entity.x += (dx / distance) * 55 * dt;
          entity.y += (dy / distance) * 55 * dt;
        }
        entity.x = clampToField(entity.x, 20, FIELD.width - 20);
        entity.y = clampToField(entity.y, 60, FIELD.height - 20);
        if (!harmless && circleHit(player.x, player.y, PLAYER.radius + 6, entity.x, entity.y, entity.radius)) {
          entity.active = false;
          if (state.lives < LIVES) state.lives += 1;
          state.score += 25;
          burst(entity.x, entity.y, 14, KIND_HEART, 120);
          events |= EVENT_HEART;
        }
      } else if (entity.kind === KIND_WISP) {
        const dx = player.x - entity.x;
        const dy = player.y - entity.y;
        const distance = Math.hypot(dx, dy);
        // Far away a wisp only drifts; once it senses the lantern it chases, faster
        // with every wave, so the night keeps getting harder.
        const speed = distance < 260 ? wispChaseSpeed() : WISP.driftSpeed;
        if (distance > 1) {
          entity.x += (dx / distance) * speed * dt + Math.sin(entity.phase * 2.2 + entity.seed) * 30 * dt;
          entity.y += (dy / distance) * speed * dt + Math.cos(entity.phase * 1.8 + entity.seed) * 30 * dt;
        }
        if (entity.x < -60 || entity.x > FIELD.width + 60 || entity.y < -60 || entity.y > FIELD.height + 60) {
          entity.active = false;
          if (!harmless) state.wispsDodged += 1;
          continue;
        }
        if (!harmless && player.invulnerable === 0
          && circleHit(player.x, player.y, PLAYER.radius - 2, entity.x, entity.y, entity.radius - 2)) {
          entity.active = false;
          state.lives -= 1;
          state.combo = 0;
          state.comboTimer = 0;
          player.invulnerable = PLAYER.invulnerable;
          player.vx = -dx * 2.2;
          player.vy = -dy * 2.2;
          burst(player.x, player.y, 18, KIND_WISP, 200);
          events |= EVENT_HIT;
          if (state.lives === 0) {
            events |= EVENT_OVER;
            break;
          }
        }
      }
    }

    // Particles fade.
    for (let index = 0; index < particles.length; index += 1) {
      const spark = particles[index];
      if (!spark.active) continue;
      spark.life -= dt;
      if (spark.life <= 0) {
        spark.active = false;
        continue;
      }
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= 0.98;
      spark.vy *= 0.98;
    }
    return events;
  }

  reset();
  return { state, reset, step, burst };
}
