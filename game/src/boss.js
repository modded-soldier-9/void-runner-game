// boss.js: VOID TITAN: OMEGA DREADNOUGHT Boss AI & rendering
import { FIELD, PALETTE } from './config.js';
import { audio } from './audio.js';

export const BOSS_PHASE = {
  INTRO: 0,
  PHASE_1_BARRAGE: 1,
  PHASE_2_DASH_MISSILES: 2,
  PHASE_3_VOID_SPIRAL: 3,
  DYING: 4,
  DEAD: 5,
};

export class Boss {
  constructor() {
    this.reset();
  }

  reset() {
    this.active = false;
    this.name = 'VOID TITAN: OMEGA DREADNOUGHT';
    this.x = FIELD.width / 2;
    this.y = -220; // Starts offscreen top
    this.targetY = 160;
    this.width = 340;
    this.height = 140;

    this.maxHealth = 2500;
    this.health = 2500;
    this.maxShield = 1000;
    this.shield = 1000;

    this.phase = BOSS_PHASE.INTRO;
    this.phaseTimer = 0;
    this.attackCooldown = 0;
    this.spiralAngle = 0;
    this.moveDir = 1;
    this.moveSpeed = 120;

    this.leftWingDestroyed = false;
    this.rightWingDestroyed = false;
    this.hitFlash = 0;
    this.pulse = 0;
  }

  spawn() {
    this.reset();
    this.active = true;
    audio.playBossWarning();
  }

  stageForShot() {
    this.reset();
    this.active = true;
    this.x = FIELD.width / 2;
    this.y = 160;
    this.health = 1650;
    this.shield = 320;
    this.phase = BOSS_PHASE.PHASE_2_DASH_MISSILES;
    this.leftWingDestroyed = true;
  }

  takeDamage(amount, particles) {
    if (!this.active || this.phase === BOSS_PHASE.INTRO || this.phase === BOSS_PHASE.DYING) return;
    this.hitFlash = 0.12;

    if (this.shield > 0) {
      this.shield -= amount;
      if (this.shield <= 0) {
        this.shield = 0;
        particles.burstExplosion(this.x, this.y, 140, PALETTE.neonCyan);
        audio.playExplosion(1.2);
      }
    } else {
      this.health -= amount;
      if (this.health <= 0) {
        this.health = 0;
        this.phase = BOSS_PHASE.DYING;
        this.phaseTimer = 2.5;
        particles.burstExplosion(this.x, this.y, 250, PALETTE.neonRed);
        audio.playExplosion(2.5);
      }
    }

    // Phase transition triggers
    const healthPct = this.health / this.maxHealth;
    if (healthPct < 0.35 && this.phase !== BOSS_PHASE.PHASE_3_VOID_SPIRAL && this.phase !== BOSS_PHASE.DYING) {
      this.phase = BOSS_PHASE.PHASE_3_VOID_SPIRAL;
      this.phaseTimer = 0;
      this.rightWingDestroyed = true;
      particles.burstExplosion(this.x + 120, this.y, 120, PALETTE.neonOrange);
      audio.playExplosion(1.8);
    } else if (healthPct < 0.70 && this.phase === BOSS_PHASE.PHASE_1_BARRAGE) {
      this.phase = BOSS_PHASE.PHASE_2_DASH_MISSILES;
      this.phaseTimer = 0;
      this.leftWingDestroyed = true;
      particles.burstExplosion(this.x - 120, this.y, 120, PALETTE.neonPink);
      audio.playExplosion(1.8);
    }
  }

  update(dt, player, bullets, particles) {
    if (!this.active) return;
    this.pulse += dt * 4;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    // Intro entrance
    if (this.phase === BOSS_PHASE.INTRO) {
      this.y += 110 * dt;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.phase = BOSS_PHASE.PHASE_1_BARRAGE;
        particles.shake(14, 0.4);
      }
      return;
    }

    // Dying death sequence
    if (this.phase === BOSS_PHASE.DYING) {
      this.phaseTimer -= dt;
      if (Math.random() < 0.3) {
        const ox = (Math.random() - 0.5) * this.width;
        const oy = (Math.random() - 0.5) * this.height;
        particles.burstExplosion(this.x + ox, this.y + oy, 80, PALETTE.neonPink);
        audio.playExplosion(0.8);
      }
      if (this.phaseTimer <= 0) {
        this.active = false;
        this.phase = BOSS_PHASE.DEAD;
        particles.burstExplosion(this.x, this.y, 350, PALETTE.neonYellow);
        audio.playExplosion(3.0);
      }
      return;
    }

    // Horizontal hovering
    this.x += this.moveDir * this.moveSpeed * dt;
    if (this.x > FIELD.width - this.width / 2 - 40) {
      this.x = FIELD.width - this.width / 2 - 40;
      this.moveDir = -1;
    } else if (this.x < this.width / 2 + 40) {
      this.x = this.width / 2 + 40;
      this.moveDir = 1;
    }

    this.attackCooldown -= dt;
    this.phaseTimer += dt;

    // PHASE 1: Twin plasma barrage
    if (this.phase === BOSS_PHASE.PHASE_1_BARRAGE) {
      if (this.attackCooldown <= 0) {
        this.attackCooldown = 0.55;
        // Fire from left and right turrets
        for (const offset of [-100, 100]) {
          const spread = [-0.25, 0, 0.25];
          for (const angle of spread) {
            bullets.push({
              x: this.x + offset,
              y: this.y + 45,
              vx: Math.sin(angle) * 320,
              vy: Math.cos(angle) * 320,
              radius: 6,
              color: PALETTE.neonPink,
              isEnemy: true,
              damage: 18,
            });
          }
        }
        audio.playEnemyLaser();
      }
    }

    // PHASE 2: Dash ram + homing plasma orbs
    else if (this.phase === BOSS_PHASE.PHASE_2_DASH_MISSILES) {
      this.moveSpeed = 260; // Faster glide
      particles.burstThruster(this.x, this.y - 40, 0, -1);

      if (this.attackCooldown <= 0) {
        this.attackCooldown = 0.45;
        // Fire 4 aimed plasma orbs towards player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const angle = Math.atan2(dy, dx);

        for (let i = -1; i <= 1; i += 2) {
          const spreadAngle = angle + i * 0.28;
          bullets.push({
            x: this.x,
            y: this.y + 50,
            vx: Math.cos(spreadAngle) * 340,
            vy: Math.sin(spreadAngle) * 340,
            radius: 8,
            color: PALETTE.neonOrange,
            isEnemy: true,
            damage: 22,
          });
        }
        audio.playEnemyLaser();
      }
    }

    // PHASE 3: Void spiral vortex + core pulse
    else if (this.phase === BOSS_PHASE.PHASE_3_VOID_SPIRAL) {
      this.moveSpeed = 80;
      particles.burstBossVortex(this.x, this.y + 20, 130);

      this.spiralAngle += dt * 3.5;
      if (this.attackCooldown <= 0) {
        this.attackCooldown = 0.14; // High frequency bullet hell
        const arms = 4;
        for (let i = 0; i < arms; i++) {
          const a = this.spiralAngle + (i * Math.PI * 2) / arms;
          bullets.push({
            x: this.x,
            y: this.y + 30,
            vx: Math.cos(a) * 270,
            vy: Math.sin(a) * 270,
            radius: 5,
            color: PALETTE.neonPurple,
            isEnemy: true,
            damage: 15,
          });
        }
      }
    }
  }

  render(ctx) {
    if (!this.active) return;
    ctx.save();

    // Hit flash or phase pulse
    const mainColor = this.hitFlash > 0 ? PALETTE.white : this.phase === BOSS_PHASE.PHASE_3_VOID_SPIRAL ? PALETTE.neonRed : PALETTE.neonPurple;
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 16;

    // Draw main hull (heavy neon geometric dreadnought)
    ctx.fillStyle = PALETTE.bgNebula;
    ctx.beginPath();
    ctx.moveTo(this.x - 80, this.y - 50);
    ctx.lineTo(this.x + 80, this.y - 50);
    ctx.lineTo(this.x + 120, this.y);
    ctx.lineTo(this.x + 40, this.y + 60);
    ctx.lineTo(this.x - 40, this.y + 60);
    ctx.lineTo(this.x - 120, this.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Left plasma wing (if not destroyed)
    if (!this.leftWingDestroyed) {
      ctx.beginPath();
      ctx.moveTo(this.x - 80, this.y - 20);
      ctx.lineTo(this.x - 165, this.y - 40);
      ctx.lineTo(this.x - 140, this.y + 35);
      ctx.lineTo(this.x - 70, this.y + 25);
      ctx.closePath();
      ctx.fillStyle = '#1e1136';
      ctx.fill();
      ctx.strokeStyle = PALETTE.neonPink;
      ctx.stroke();
    }

    // Right plasma wing (if not destroyed)
    if (!this.rightWingDestroyed) {
      ctx.beginPath();
      ctx.moveTo(this.x + 80, this.y - 20);
      ctx.lineTo(this.x + 165, this.y - 40);
      ctx.lineTo(this.x + 140, this.y + 35);
      ctx.lineTo(this.x + 70, this.y + 25);
      ctx.closePath();
      ctx.fillStyle = '#1e1136';
      ctx.fill();
      ctx.strokeStyle = PALETTE.neonPink;
      ctx.stroke();
    }

    // Glowing core reactor
    const coreGlow = Math.sin(this.pulse) * 4 + 14;
    ctx.beginPath();
    ctx.arc(this.x, this.y + 10, coreGlow, 0, Math.PI * 2);
    ctx.fillStyle = this.phase === BOSS_PHASE.PHASE_3_VOID_SPIRAL ? PALETTE.neonRed : PALETTE.neonCyan;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 24;
    ctx.fill();

    // Shield bubble (if shield active)
    if (this.shield > 0) {
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + 5, this.width / 2 + 18, this.height / 2 + 25, 0, 0, Math.PI * 2);
      ctx.strokeStyle = PALETTE.neonCyan;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = PALETTE.neonCyan;
      ctx.shadowBlur = 20;
      ctx.globalAlpha = 0.4 + Math.sin(this.pulse * 1.5) * 0.2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Render Boss HUD bar
    this.renderHUD(ctx);
  }

  renderHUD(ctx) {
    const barWidth = 640;
    const barHeight = 16;
    const barX = (FIELD.width - barWidth) / 2;
    const barY = 32;

    ctx.save();

    // Boss Name & Phase
    ctx.font = 'bold 16px "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.neonPink;
    ctx.shadowColor = PALETTE.neonPink;
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    const phaseText = this.phase === BOSS_PHASE.PHASE_3_VOID_SPIRAL ? ' [OVERDRIVE]' : '';
    ctx.fillText(`${this.name}${phaseText}`, FIELD.width / 2, barY - 10);

    // Frame background
    ctx.fillStyle = 'rgba(10, 10, 20, 0.85)';
    ctx.strokeStyle = PALETTE.hudBorder;
    ctx.lineWidth = 1.5;
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
    ctx.strokeRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

    // Health bar fill
    const hpPct = Math.max(0, this.health / this.maxHealth);
    ctx.fillStyle = this.phase === BOSS_PHASE.PHASE_3_VOID_SPIRAL ? PALETTE.neonRed : PALETTE.neonPurple;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.fillRect(barX, barY, barWidth * hpPct, barHeight);

    // Shield bar overlay (cyan line)
    if (this.shield > 0) {
      const shieldPct = Math.max(0, this.shield / this.maxShield);
      ctx.fillStyle = PALETTE.neonCyan;
      ctx.shadowColor = PALETTE.neonCyan;
      ctx.shadowBlur = 10;
      ctx.fillRect(barX, barY + barHeight - 4, barWidth * shieldPct, 4);
    }

    ctx.restore();
  }
}
