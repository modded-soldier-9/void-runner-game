// config.js: Tuning constants, palette, and dimensions for NEON STRIKE: VOID RUNNER

export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;

export const PLAYER = {
  width: 54,
  height: 48,
  speed: 460,
  maxHealth: 100,
  maxShield: 100,
  shieldRegenRate: 15, // per second after delay
  shieldRegenDelay: 3.0,
  shootCooldown: 0.12,
  tripleShotCooldown: 0.14,
};

export const BULLET = {
  playerSpeed: 820,
  enemySpeed: 380,
  bossOrbSpeed: 290,
  damage: 25,
};

export const ENEMY_TYPES = {
  SCOUT: 0,
  INTERCEPTOR: 1,
  HEAVY: 2,
};

export const PALETTE = {
  bgVoid: '#06060c',
  bgNebula: '#120d24',
  neonCyan: '#00f3ff',
  neonPink: '#ff007f',
  neonPurple: '#b026ff',
  neonYellow: '#ffea00',
  neonOrange: '#ff8800',
  neonRed: '#ff2244',
  neonGreen: '#00ff66',
  white: '#ffffff',
  shieldCyan: 'rgba(0, 243, 255, 0.4)',
  hudBorder: 'rgba(0, 243, 255, 0.35)',
  textMuted: '#8a88a6',
};

export const BEST_KEY = 'neon-strike.best-score';
