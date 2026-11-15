// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the night's pattern. ?shot=start|play|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot. ?autoplay=1 hands the firefly to the autopilot so a visitor can watch.
import { BEST_KEY, FIELD, LIVES, PLAYER, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, EVENT_DASH, EVENT_HEART, EVENT_HIT, EVENT_OVER, EVENT_PICKUP, EVENT_SUN, EVENT_WAVE,
} from './world.js';
import {
  ACTION_CONFIRM, ACTION_DASH, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput,
} from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot, autopilot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const autoplay = params.get('autoplay') === '1';
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let dashQueued = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.start();
    announce(`Playing. ${LIVES} lives. Gather embers, dodge the wisps.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    audio.gameOver();
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Game over. Score ${world.state.score}. Best ${best}. Press R to play again.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_DASH) {
      audio.unlock();
      dashQueued = true;
    }
    if (actions & ACTION_RESTART && (screen === SCREEN_OVER || screen === SCREEN_PAUSED)) {
      startGame();
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.pause();
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function steerFromInput() {
    const keys = input.keys();
    if (keys.x !== 0 || keys.y !== 0) {
      const length = Math.hypot(keys.x, keys.y);
      return { x: keys.x / length, y: keys.y / length };
    }
    const pointer = input.pointer();
    if (pointer.active && pointer.x !== null) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = FIELD.width / rect.width;
      const scaleY = FIELD.height / rect.height;
      const dx = pointer.x * scaleX - world.state.player.x;
      const dy = pointer.y * scaleY - world.state.player.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 24) return { x: dx / distance, y: dy / distance };
    }
    return { x: 0, y: 0 };
  }

  function playSounds(events) {
    if (events & EVENT_PICKUP) audio.pickup(world.state.combo);
    if (events & EVENT_SUN) audio.sunPickup();
    if (events & EVENT_HEART) audio.heart();
    if (events & EVENT_DASH) audio.dash();
    if (events & EVENT_WAVE) audio.waveClear(world.state.wave);
    if (events & EVENT_HIT) {
      audio.hit();
      audio.comboLost();
      announce(world.state.lives === 1 ? 'Hit. 1 life left.' : `Hit. ${world.state.lives} lives left.`);
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, false, true);
      return;
    }
    let steer = steerFromInput();
    let dash = dashQueued;
    dashQueued = false;
    if (autoplay) {
      const move = autopilot(world.state, 0.9);
      steer = move.steer;
      dash = move.dash;
    }
    const events = world.step(STEP, steer, dash, false);
    playSounds(events);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_WAVE) announce(`Wave ${world.state.wave}. The wisps grow bolder.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting wisps hunt unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Lumen. Press Space or click to start. Gather embers, dodge the shadow wisps.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
