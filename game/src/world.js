// world.js: Core game simulation state, entity updates, and wave progression
import { BULLET, FIELD, PALETTE, PLAYER } from './config.js';
import { ParticleEngine } from './particles.js';
import { Boss } from './boss.js';
import { audio } from './audio.js';

export const EVENT_HIT = 1 << 0;
export const EVENT_OVER = 1 << 1;
export const EVENT_BOSS = 1 << 2;

export class World {
  constructor(random) {
    this.random = random;
    this.particles = new ParticleEngine();
    this.boss = new Boss();
    this.reset();
  }

  reset() {
    this.player = {
      x: FIELD.width / 2,
      y: FIELD.height - 100,
      vx: 0,
      vy: 0,
      width: PLAYER.width,
      height: PLAYER.height,
      health: PLAYER.maxHealth,
      shield: PLAYER.maxShield,
      shieldRegenCooldown: 0,
      shootCooldown: 0,
      tripleShotTimer: 0,
      invulnerable: 0,
    };

    this.bullets = [];
    this.enemies = [];
    this.pickups = [];
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.wave = 1;
    this.waveTimer = 0;
    this.isOver = false;

    this.boss.reset();
  }

  spawnEnemy(type) {
    const x = this.random.range(80, FIELD.width - 80);
    const y = -40;
    let hp = 40;
    let speed = 140;
    let color = PALETTE.neonPink;
    let width = 42;
    let height = 36;

    if (type === 'interceptor') {
      hp = 65;
      speed = 190;
      color = PALETTE.neonOrange;
      width = 48;
      height = 42;
    } else if (type === 'heavy') {
      hp = 180;
      speed = 90;
      color = PALETTE.neonYellow;
      width = 68;
      height = 54;
    }

    this.enemies.push({
      x,
      y,
      vx: 0,
      vy: speed,
      hp,
      maxHp: hp,
      type,
      width,
      height,
      color,
      shootCooldown: this.random.range(0.8, 2.0),
      time: 0,
    });
  }

  spawnPickup(x, y) {
    const types = ['shield', 'triple', 'score'];
    const type = this.random.choice(types);
    this.pickups.push({
      x,
      y,
      vy: 110,
      type,
      radius: 12,
      time: 0,
    });
  }

  firePlayerLasers() {
    if (this.player.shootCooldown > 0) return;
    const isTriple = this.player.tripleShotTimer > 0;
    this.player.shootCooldown = isTriple ? PLAYER.tripleShotCooldown : PLAYER.shootCooldown;

    const px = this.player.x;
    const py = this.player.y - 20;

    if (isTriple) {
      this.bullets.push(
        { x: px, y: py, vx: 0, vy: -BULLET.playerSpeed, radius: 4, color: PALETTE.neonCyan, isEnemy: false, damage: BULLET.damage },
        { x: px - 18, y: py, vx: -160, vy: -BULLET.playerSpeed * 0.95, radius: 4, color: PALETTE.neonCyan, isEnemy: false, damage: BULLET.damage },
        { x: px + 18, y: py, vx: 160, vy: -BULLET.playerSpeed * 0.95, radius: 4, color: PALETTE.neonCyan, isEnemy: false, damage: BULLET.damage }
      );
    } else {
      this.bullets.push(
        { x: px - 14, y: py, vx: 0, vy: -BULLET.playerSpeed, radius: 4, color: PALETTE.neonCyan, isEnemy: false, damage: BULLET.damage },
        { x: px + 14, y: py, vx: 0, vy: -BULLET.playerSpeed, radius: 4, color: PALETTE.neonCyan, isEnemy: false, damage: BULLET.damage }
      );
    }

    audio.playLaser();
    this.particles.burstThruster(this.player.x, this.player.y + 22, 0, 1);
  }

  step(dt, inputVector, isFiring) {
    if (this.isOver) return EVENT_OVER;
    let events = 0;

    // 1. Player Movement & Shield
    const p = this.player;
    p.vx = inputVector.dx * PLAYER.speed;
    p.vy = inputVector.dy * PLAYER.speed;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Bounds clamp
    const halfW = p.width / 2;
    const halfH = p.height / 2;
    p.x = Math.max(halfW, Math.min(FIELD.width - halfW, p.x));
    p.y = Math.max(halfH + 60, Math.min(FIELD.height - halfH, p.y));

    // Thruster trail
    if (Math.abs(p.vx) > 10 || Math.abs(p.vy) > 10 || Math.random() < 0.6) {
      this.particles.burstThruster(p.x, p.y + halfH, 0, 1);
    }

    if (p.invulnerable > 0) p.invulnerable -= dt;
    if (p.shootCooldown > 0) p.shootCooldown -= dt;
    if (p.tripleShotTimer > 0) p.tripleShotTimer -= dt;

    // Shield recharge
    if (p.shieldRegenCooldown > 0) {
      p.shieldRegenCooldown -= dt;
    } else if (p.shield < PLAYER.maxShield) {
      p.shield = Math.min(PLAYER.maxShield, p.shield + PLAYER.shieldRegenRate * dt);
    }

    // Firing
    if (isFiring) {
      this.firePlayerLasers();
    }

    // 2. Combo Timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // 3. Wave & Spawn Logic
    this.waveTimer += dt;
    if (this.waveTimer > 28 && !this.boss.active && this.boss.phase === 0) {
      this.boss.spawn();
      events |= EVENT_BOSS;
    }

    // Regular enemy spawns if boss not in Phase 3
    if (!this.boss.active && Math.random() < dt * (1.2 + this.wave * 0.25)) {
      const roll = Math.random();
      if (roll < 0.55) this.spawnEnemy('scout');
      else if (roll < 0.85) this.spawnEnemy('interceptor');
      else this.spawnEnemy('heavy');
    }

    // 4. Update Boss
    if (this.boss.active) {
      this.boss.update(dt, p, this.bullets, this.particles);
    }

    // 5. Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.time += dt;
      if (e.type === 'scout') {
        e.x += Math.sin(e.time * 4) * 140 * dt;
      }
      e.y += e.vy * dt;

      // Enemy firing
      e.shootCooldown -= dt;
      if (e.shootCooldown <= 0 && e.y < FIELD.height - 120) {
        e.shootCooldown = this.random.range(1.2, 2.4);
        this.bullets.push({
          x: e.x,
          y: e.y + e.height / 2,
          vx: 0,
          vy: BULLET.enemySpeed,
          radius: 5,
          color: e.color,
          isEnemy: true,
          damage: 15,
        });
        audio.playEnemyLaser();
      }

      if (e.y > FIELD.height + 60 || e.hp <= 0) {
        this.enemies.splice(i, 1);
      }
    }

    // 6. Update Pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.time += dt;
      pk.y += pk.vy * dt;

      // Player collection
      const dist = Math.hypot(p.x - pk.x, p.y - pk.y);
      if (dist < pk.radius + p.width / 2) {
        audio.playPowerup();
        if (pk.type === 'shield') p.shield = Math.min(PLAYER.maxShield, p.shield + 50);
        else if (pk.type === 'triple') p.tripleShotTimer = 10;
        else if (pk.type === 'score') this.score += 500;
        this.particles.burstHit(pk.x, pk.y, PALETTE.neonGreen);
        this.pickups.splice(i, 1);
        continue;
      }

      if (pk.y > FIELD.height + 40) {
        this.pickups.splice(i, 1);
      }
    }

    // 7. Update Bullets & Collisions
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Out of bounds
      if (b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Player laser vs Enemies & Boss
      if (!b.isEnemy) {
        // Hit regular enemy
        let hit = false;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (Math.abs(b.x - e.x) < e.width / 2 && Math.abs(b.y - e.y) < e.height / 2) {
            e.hp -= b.damage;
            this.particles.burstHit(b.x, b.y, PALETTE.neonCyan);
            audio.playHit();
            hit = true;

            if (e.hp <= 0) {
              this.particles.burstExplosion(e.x, e.y, 60, e.color);
              audio.playExplosion(1.0);
              this.combo++;
              this.comboTimer = 2.5;
              this.score += (e.maxHp * 10) * Math.min(8, this.combo);
              if (Math.random() < 0.28) this.spawnPickup(e.x, e.y);
            }
            break;
          }
        }

        // Hit Boss
        if (!hit && this.boss.active && this.boss.phase > 0 && this.boss.phase < 4) {
          if (Math.abs(b.x - this.boss.x) < this.boss.width / 2 && Math.abs(b.y - this.boss.y) < this.boss.height / 2) {
            this.boss.takeDamage(b.damage, this.particles);
            this.particles.burstHit(b.x, b.y, PALETTE.neonCyan);
            audio.playHit();
            this.score += 25 * Math.min(8, this.combo + 1);
            hit = true;
          }
        }

        if (hit) {
          this.bullets.splice(i, 1);
          continue;
        }
      }

      // Enemy laser vs Player
      else {
        if (p.invulnerable <= 0 && Math.abs(b.x - p.x) < p.width / 2 - 4 && Math.abs(b.y - p.y) < p.height / 2 - 4) {
          this.bullets.splice(i, 1);
          events |= EVENT_HIT;
          audio.playHit();
          this.particles.burstHit(p.x, p.y, PALETTE.neonRed);
          this.particles.shake(8, 0.25);
          p.shieldRegenCooldown = PLAYER.shieldRegenDelay;
          p.invulnerable = 0.35;

          if (p.shield > 0) {
            p.shield -= b.damage;
            if (p.shield < 0) {
              p.health += p.shield; // Overflow to health
              p.shield = 0;
            }
          } else {
            p.health -= b.damage;
            if (p.health <= 0) {
              p.health = 0;
              this.isOver = true;
              events |= EVENT_OVER;
              this.particles.burstExplosion(p.x, p.y, 180, PALETTE.neonCyan);
              audio.playExplosion(2.0);
            }
          }
          continue;
        }
      }
    }

    // 8. Update Particles & Shake
    this.particles.update(dt);

    return events;
  }
}
