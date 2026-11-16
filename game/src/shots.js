// shots.js: Deterministic scene staging for automated headless screenshot verification
import { FIELD, PALETTE, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

export function stageShot(name, world) {
  world.reset();

  // 1. Title Screen Shot (?shot=title)
  if (name === 'title' || name === 'start') {
    // Advance stars and subtle particle effects
    for (let i = 0; i < 60; i++) {
      world.particles.update(STEP);
    }
    return { screen: SCREEN_TITLE, best: 48500 };
  }

  // 2. Mid-combat Play Scene Shot (?shot=play)
  if (name === 'play') {
    world.score = 14250;
    world.combo = 4;
    world.comboTimer = 2.0;
    world.wave = 3;
    world.player.x = FIELD.width / 2;
    world.player.y = FIELD.height - 120;
    world.player.shield = 85;
    world.player.health = 100;
    world.player.tripleShotTimer = 8.5;

    // Active player lasers
    world.bullets.push(
      { x: world.player.x, y: world.player.y - 40, vx: 0, vy: -700, radius: 4.5, color: PALETTE.neonCyan, isEnemy: false, damage: 25 },
      { x: world.player.x - 22, y: world.player.y - 30, vx: -120, vy: -680, radius: 4.5, color: PALETTE.neonCyan, isEnemy: false, damage: 25 },
      { x: world.player.x + 22, y: world.player.y - 30, vx: 120, vy: -680, radius: 4.5, color: PALETTE.neonCyan, isEnemy: false, damage: 25 }
    );

    // Staged enemies in formation
    world.enemies.push(
      { x: 380, y: 180, vx: 0, vy: 60, hp: 50, maxHp: 65, type: 'interceptor', width: 48, height: 42, color: PALETTE.neonOrange, shootCooldown: 1, time: 0 },
      { x: 640, y: 150, vx: 0, vy: 40, hp: 120, maxHp: 180, type: 'heavy', width: 68, height: 54, color: PALETTE.neonYellow, shootCooldown: 1, time: 0 },
      { x: 900, y: 180, vx: 0, vy: 60, hp: 65, maxHp: 65, type: 'interceptor', width: 48, height: 42, color: PALETTE.neonOrange, shootCooldown: 1, time: 0 }
    );

    // Mid-air explosion and sparks
    world.particles.burstExplosion(540, 260, 80, PALETTE.neonPink);
    world.particles.burstHit(640, 160, PALETTE.neonCyan);

    return { screen: SCREEN_PLAY, best: 48500 };
  }

  // 3. Boss Battle Staged Shot (?shot=boss)
  if (name === 'boss') {
    world.score = 28900;
    world.combo = 6;
    world.wave = 5;
    world.player.x = FIELD.width / 2;
    world.player.y = FIELD.height - 100;
    world.player.shield = 60;
    world.player.health = 80;

    // Stage boss in Phase 2/3
    world.boss.stageForShot();

    // Bullet hell spiral bullets from boss
    const arms = 8;
    for (let i = 0; i < arms; i++) {
      const a = (i * Math.PI * 2) / arms + 0.4;
      world.bullets.push({
        x: world.boss.x,
        y: world.boss.y + 40,
        vx: Math.cos(a) * 220,
        vy: Math.sin(a) * 220,
        radius: 6,
        color: PALETTE.neonPurple,
        isEnemy: true,
        damage: 18,
      });
    }

    // Heavy plasma orbs
    for (const offset of [-80, 80]) {
      world.bullets.push({
        x: world.boss.x + offset,
        y: world.boss.y + 80,
        vx: 0,
        vy: 280,
        radius: 8,
        color: PALETTE.neonOrange,
        isEnemy: true,
        damage: 22,
      });
    }

    // Boss vortex particles
    world.particles.burstBossVortex(world.boss.x, world.boss.y + 20, 140);
    world.particles.burstHit(world.boss.x - 20, world.boss.y + 10, PALETTE.neonCyan);

    return { screen: SCREEN_PLAY, best: 48500 };
  }

  // 4. Game Over / Score Debrief Shot (?shot=over or ?shot=end)
  if (name === 'over' || name === 'end') {
    world.score = 36800;
    world.wave = 6;
    world.player.health = 0;
    world.player.shield = 0;
    world.isOver = true;
    return { screen: SCREEN_OVER, best: 48500 };
  }

  return { screen: SCREEN_TITLE, best: 48500 };
}
