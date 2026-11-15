// Keyboard and pointer input for Lumen. Held keys give a steering vector in two
// dimensions; the pointer steers too (the firefly drifts toward the mouse when no key
// is held); one-shot presses (start, restart, pause, dash) are queued as bit flags and
// taken once by the loop, so a press between two frames is never lost or counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_RESTART = 8;
export const ACTION_MUTE = 16;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const DASH = new Set(['ShiftLeft', 'ShiftRight']);
const RESTART = new Set(['KeyR']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  const held = { up: false, down: false, left: false, right: false };
  let actions = 0;
  let pointer = { x: null, y: null, active: false };
  let pointerDown = false;

  function keyDown(event) {
    if (UP.has(event.code)) held.up = true;
    else if (DOWN.has(event.code)) held.down = true;
    else if (LEFT.has(event.code)) held.left = true;
    else if (RIGHT.has(event.code)) held.right = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (DASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DASH;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  }

  function keyUp(event) {
    if (UP.has(event.code)) held.up = false;
    else if (DOWN.has(event.code)) held.down = false;
    else if (LEFT.has(event.code)) held.left = false;
    else if (RIGHT.has(event.code)) held.right = false;
  }

  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', () => {
    held.up = false;
    held.down = false;
    held.left = false;
    held.right = false;
    pointer.active = false;
    pointerDown = false;
  });

  target.addEventListener('pointermove', (event) => {
    const rect = target.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top, active: true };
  });
  target.addEventListener('pointerdown', (event) => {
    pointerDown = true;
    const rect = target.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top, active: true };
    actions |= ACTION_DASH;
    if (event.button === 0) actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointerup', () => {
    pointerDown = false;
  });
  target.addEventListener('pointerleave', () => {
    pointer.active = false;
  });

  return {
    /** Steering vector from the held keys: x and y each -1, 0 or 1. */
    keys() {
      return {
        x: (held.right ? 1 : 0) - (held.left ? 1 : 0),
        y: (held.down ? 1 : 0) - (held.up ? 1 : 0),
      };
    },
    /** The pointer position in CSS pixels over the canvas, or inactive when away. */
    pointer() {
      return pointer;
    },
    pointerDown() {
      return pointerDown;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Drop any queued one-shot presses (used when the screen changes). */
    clearActions() {
      actions = 0;
    },
  };
}
