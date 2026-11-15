// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the
// backdrop colour. Everything is drawn in canvas: a parallax starfield, glowing ember
// orbs, wispy shadows, the lantern firefly with its halo, drifting spores, and the HUD
// and panels in canvas text. No images, no fonts fetched, no network at all.

import { COMBO, FIELD, FONT, LIVES, PALETTE, PLAYER } from './config.js';
import { KIND_EMBER, KIND_HEART, KIND_SUN, KIND_WISP } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** The panel's width; its height grows with its lines. */
const PANEL = { width: 640, top: 150, line: 34, bottom: 78 };
const STAR_COUNT = 110;
const SPORE_COUNT = 26;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('SCORE ');
  const waveLabel = cachedLabel('WAVE ');
  const finalLabel = cachedLabel('FINAL SCORE  ');
  const bestLabel = cachedLabel('BEST  ');
  const comboLabel = cachedLabel('COMBO x');
  const fonts = new Map();

  // The starfield and the drifting spores are fixed at boot, so the night sky never
  // flickers between frames.
  const stars = [];
  for (let index = 0; index < STAR_COUNT; index += 1) {
    const seed = (index * 2654435761) % 100000;
    stars.push({
      x: (seed % 1280),
      y: ((seed * 7) % 720),
      size: 0.6 + ((seed % 10) / 10) * 1.6,
      depth: 0.25 + ((seed % 5) / 5) * 0.6,
      twinkle: (seed % 100) / 100,
    });
  }
  const spores = [];
  for (let index = 0; index < SPORE_COUNT; index += 1) {
    const seed = (index * 40503 + 17) % 100000;
    spores.push({
      x: (seed * 3) % 1280,
      y: (seed * 11) % 720,
      size: 1 + ((seed % 8) / 8) * 2.4,
      speed: 6 + ((seed % 10) / 10) * 14,
    });
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${size}:${weight || ''}`;
    if (!fonts.has(key)) fonts.set(key, `${weight ? `${weight} ` : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function glowCircle(x, y, radius, core, halo, alpha) {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius * 3.2);
    gradient.addColorStop(0, halo);
    gradient.addColorStop(0.35, halo);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.globalAlpha = alpha;
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius * 3.2, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    context.fillStyle = core;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  function drawSky(elapsed) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.skyTop);
    gradient.addColorStop(1, PALETTE.skyBottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    // A soft moon low on the right, clear of the HUD, and a dark hill along the bottom.
    const moon = context.createRadialGradient(1150, 548, 4, 1150, 548, 90);
    moon.addColorStop(0, 'rgba(235, 230, 200, 0.9)');
    moon.addColorStop(0.25, 'rgba(235, 230, 200, 0.28)');
    moon.addColorStop(1, 'rgba(235, 230, 200, 0)');
    context.fillStyle = moon;
    context.beginPath();
    context.arc(1150, 548, 90, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#e9e2c2';
    context.beginPath();
    context.arc(1150, 548, 34, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = PALETTE.ground;
    context.beginPath();
    context.moveTo(0, FIELD.height);
    context.lineTo(0, 648);
    context.quadraticCurveTo(320, 606, 640, 648);
    context.quadraticCurveTo(960, 682, 1280, 636);
    context.lineTo(1280, FIELD.height);
    context.closePath();
    context.fill();

    for (let index = 0; index < stars.length; index += 1) {
      const star = stars[index];
      const twinkle = 0.45 + 0.55 * Math.sin(elapsed * 1.4 + star.twinkle * Math.PI * 2);
      context.globalAlpha = twinkle * star.depth;
      context.fillStyle = '#dfe6ff';
      context.fillRect(star.x, star.y, star.size, star.size);
    }
    context.globalAlpha = 1;

    for (let index = 0; index < spores.length; index += 1) {
      const spore = spores[index];
      const drift = (elapsed * spore.speed + index * 47) % (FIELD.width + 80);
      const x = (spore.x + drift) % (FIELD.width + 40) - 20;
      const y = spore.y + Math.sin(elapsed * 0.6 + index) * 8;
      context.globalAlpha = 0.16;
      context.fillStyle = PALETTE.ember;
      context.beginPath();
      context.arc(x, y, spore.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawParticles(state) {
    for (let index = 0; index < state.particles.length; index += 1) {
      const spark = state.particles[index];
      if (!spark.active) continue;
      const fade = spark.life / spark.maxLife;
      context.globalAlpha = fade;
      context.fillStyle = spark.kind === KIND_WISP ? PALETTE.wispCore
        : spark.kind === KIND_HEART ? PALETTE.heart
        : spark.kind === 4 ? PALETTE.dash : PALETTE.emberCore;
      context.beginPath();
      context.arc(spark.x, spark.y, spark.size * fade + 0.6, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawEntities(state, elapsed) {
    for (let index = 0; index < state.entities.length; index += 1) {
      const entity = state.entities[index];
      if (!entity.active) continue;
      const pulse = 1 + 0.18 * Math.sin(elapsed * 3 + entity.seed);
      if (entity.kind === KIND_EMBER) {
        glowCircle(entity.x, entity.y, entity.radius * 0.62 * pulse, PALETTE.emberCore, 'rgba(255,179,71,0.55)', 0.9);
        context.fillStyle = PALETTE.ember;
        context.beginPath();
        context.arc(entity.x, entity.y, entity.radius * 0.62 * pulse, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.emberCore;
        context.beginPath();
        context.arc(entity.x, entity.y, entity.radius * 0.3, 0, Math.PI * 2);
        context.fill();
      } else if (entity.kind === KIND_SUN) {
        glowCircle(entity.x, entity.y, entity.radius * 0.7 * pulse, '#fff3b0', 'rgba(255,217,74,0.7)', 1);
        context.fillStyle = PALETTE.sunEmber;
        context.beginPath();
        context.arc(entity.x, entity.y, entity.radius * 0.7 * pulse, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = PALETTE.emberCore;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(entity.x, entity.y, entity.radius * 0.38, 0, Math.PI * 2);
        context.stroke();
      } else if (entity.kind === KIND_HEART) {
        const r = entity.radius * pulse;
        glowCircle(entity.x, entity.y, r * 0.6, PALETTE.heart, 'rgba(255,125,156,0.5)', 0.95);
        context.fillStyle = PALETTE.heart;
        context.beginPath();
        context.moveTo(entity.x, entity.y + r * 0.8);
        context.bezierCurveTo(entity.x - r * 1.2, entity.y - r * 0.2, entity.x - r * 0.55, entity.y - r, entity.x, entity.y - r * 0.35);
        context.bezierCurveTo(entity.x + r * 0.55, entity.y - r, entity.x + r * 1.2, entity.y - r * 0.2, entity.x, entity.y + r * 0.8);
        context.fill();
      } else if (entity.kind === KIND_WISP) {
        const wobble = Math.sin(elapsed * 2.4 + entity.seed) * 3;
        const gradient = context.createRadialGradient(
          entity.x, entity.y + wobble, 0, entity.x, entity.y + wobble, entity.radius * 3,
        );
        gradient.addColorStop(0, 'rgba(123,111,214,0.55)');
        gradient.addColorStop(1, 'rgba(123,111,214,0)');
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(entity.x, entity.y + wobble, entity.radius * 3, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.wisp;
        context.beginPath();
        context.arc(entity.x - 5, entity.y + wobble - 2, entity.radius * 0.62, 0, Math.PI * 2);
        context.arc(entity.x + 6, entity.y + wobble + 3, entity.radius * 0.55, 0, Math.PI * 2);
        context.arc(entity.x, entity.y + wobble - 7, entity.radius * 0.58, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.wispCore;
        context.beginPath();
        context.arc(entity.x - 4, entity.y + wobble - 3, 3, 0, Math.PI * 2);
        context.arc(entity.x + 5, entity.y + wobble - 3, 3, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#1a1433';
        context.beginPath();
        context.arc(entity.x - 4, entity.y + wobble - 3, 1.6, 0, Math.PI * 2);
        context.arc(entity.x + 5, entity.y + wobble - 3, 1.6, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawPlayer(state, elapsed) {
    const player = state.player;
    const blink = player.invulnerable > 0 && Math.floor(player.invulnerable * 10) % 2 === 0;
    if (blink) return;
    const flicker = 1 + 0.1 * Math.sin(elapsed * 6) + 0.06 * Math.sin(elapsed * 13.7);
    const halo = context.createRadialGradient(player.x, player.y, 0, player.x, player.y, 120 * flicker);
    halo.addColorStop(0, 'rgba(255,210,122,0.5)');
    halo.addColorStop(0.5, 'rgba(255,179,71,0.16)');
    halo.addColorStop(1, 'rgba(255,179,71,0)');
    context.fillStyle = halo;
    context.beginPath();
    context.arc(player.x, player.y, 120 * flicker, 0, Math.PI * 2);
    context.fill();

    // The lantern: a warm glowing body with a little flame, swaying wings and a trail.
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.ellipse(player.x, player.y, PLAYER.radius * 0.9, PLAYER.radius * 1.15, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.playerCore;
    context.beginPath();
    context.ellipse(player.x, player.y + 2, PLAYER.radius * 0.55, PLAYER.radius * 0.75, 0, 0, Math.PI * 2);
    context.fill();
    const wing = Math.sin(elapsed * 22) * 6;
    context.fillStyle = 'rgba(255,246,216,0.75)';
    context.beginPath();
    context.ellipse(player.x - 14, player.y - 10 - wing, 10, 4.5, -0.5, 0, Math.PI * 2);
    context.ellipse(player.x + 14, player.y - 10 + wing, 10, 4.5, 0.5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#2b1d08';
    context.beginPath();
    context.arc(player.x - 5, player.y - 3, 2.2, 0, Math.PI * 2);
    context.arc(player.x + 5, player.y - 3, 2.2, 0, Math.PI * 2);
    context.fill();

    if (player.dashCooldown > 0) {
      const fraction = 1 - player.dashCooldown / PLAYER.dashCooldown;
      context.strokeStyle = 'rgba(126,231,210,0.8)';
      context.lineWidth = 3;
      context.beginPath();
      context.arc(player.x, player.y, PLAYER.radius + 10, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2);
      context.stroke();
    }
  }

  function drawLanternIcon(x, y, filled) {
    context.globalAlpha = filled ? 1 : 0.25;
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.ellipse(x, y, 9, 11, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.playerCore;
    context.beginPath();
    context.ellipse(x, y + 1, 5, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  function drawHud(state, best) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 18, 30, PALETTE.text, 'left', '700');
    text(waveLabel(state.wave), FIELD.width / 2, 18, 30, PALETTE.text, 'center', '700');
    const firstLife = FIELD.width - 24 - LIVES * 28;
    text('LIVES', firstLife - 14, 24, 18, PALETTE.muted, 'right', '700');
    for (let life = 0; life < LIVES; life += 1) {
      drawLanternIcon(firstLife + life * 28 + 10, 30, life < state.lives);
    }
    if (state.combo >= 2) {
      const pulse = 1 + 0.12 * Math.sin(state.elapsed * 8);
      context.save();
      context.translate(24, 62);
      context.scale(pulse, pulse);
      text(comboLabel(state.combo), 0, 0, 26, PALETTE.ember, 'left', '800');
      context.restore();
      const barWidth = 120;
      context.fillStyle = 'rgba(255,179,71,0.25)';
      context.fillRect(24, 96, barWidth, 6);
      context.fillStyle = PALETTE.ember;
      context.fillRect(24, 96, barWidth * Math.max(0, state.comboTimer / COMBO.window), 6);
    }
    if (best > 0) text(bestLabel(best), FIELD.width - 24, 56, 18, PALETTE.muted, 'right', '600');
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(4, 6, 12, 0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x + 1, y + 1, PANEL.width - 2, height - 2);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 82, 52, accent || PALETTE.text, 'center', '800');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center', '400');
    }
    text(prompt, FIELD.width / 2, y + height - 42, 24, PALETTE.ember, 'center', '700');
  }

  const TITLE_LINES = [
    'Guide the lantern firefly through the night garden.',
    'Gather ember orbs to grow your combo — golden sun embers pay x5.',
    'Shadow wisps drift, then hunt. One touch costs a life and your combo.',
    'Dash with click or Shift to slip through danger. Heart moths mend a life.',
    '',
  ];
  const PAUSED_LINES = ['The garden waits for you.'];
  const OVER_LINES = ['', '', '', ''];

  /** Paint one frame: the night sky, then the entities, the player, the HUD or a panel. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawSky(state.elapsed);
    drawEntities(state, state.elapsed);
    drawParticles(state);
    drawPlayer(state, state.elapsed);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = best > 0 ? bestLabel(best) : 'Move with WASD or arrows — or drift toward your mouse.';
      drawPanel('LUMEN', TITLE_LINES, 'Press Space, click, or tap R to begin', PALETTE.player);
      return;
    }
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', PAUSED_LINES, 'Press P or Space to keep glowing', PALETTE.text);
    } else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = `Embers gathered  ${state.embersCaught}    Best combo  x${state.bestCombo}    Waves reached  ${state.wave}`;
      OVER_LINES[2] = bestLabel(best);
      OVER_LINES[3] = 'The garden goes dark — until the lantern returns.';
      drawPanel('The Light Fades', OVER_LINES, 'Press R or click to light the lantern again', PALETTE.danger);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
