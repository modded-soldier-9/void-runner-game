// random.js: 32-bit deterministic Mulberry32 PRNG

export function createRandom(seed = 42) {
  let s = Math.floor(seed) >>> 0;
  return {
    next() {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(min, max) {
      return min + this.next() * (max - min);
    },
    rangeInt(min, max) {
      return Math.floor(this.range(min, max + 1));
    },
    choice(arr) {
      return arr[this.rangeInt(0, arr.length - 1)];
    },
  };
}
