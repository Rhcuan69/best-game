// A tiny seeded random generator (mulberry32), so a screenshot seed always plays the
// same game: the same embers drift in, the same wisps hunt, the same frame comes out.

export function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random number in [min, max) from the seeded generator. */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** Pick one entry of an array with the seeded generator. */
export function pick(random, entries) {
  return entries[Math.floor(random() * entries.length)];
}

/** A shuffled copy of an array, drawn with the seeded generator. */
export function shuffle(random, entries) {
  const copy = entries.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const held = copy[index];
    copy[index] = copy[other];
    copy[other] = held;
  }
  return copy;
}

/** A random whole number in [min, max] from the seeded generator. */
export function rangeInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}
