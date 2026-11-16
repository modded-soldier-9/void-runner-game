// particles.js: Zero-allocation high-performance neon particle physics engine & screenshake
import { PALETTE } from './config.js';

const MAX_PARTICLES = 1024;
const MAX_RINGS = 64;

class Particle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.size = 2;
    this.color = '#fff';
    this.life = 0;
    this.maxLife = 1;
    this.drag = 0.96;
    this.gravity = 0;
  }

  init(x, y, vx, vy, size, color, life, drag = 0.96, gravity = 0) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.drag = drag;
    this.gravity = gravity;
  }

  update(dt) {
    if (!this.active) return false;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= this.drag;
    this.vy *= this.drag;
    this.vy += this.gravity * dt;
    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return false;
    }
    return true;
  }
}

class ShockwaveRing {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.radius = 0;
    this.maxRadius = 100;
    this.speed = 200;
    this.color = PALETTE.neonCyan;
    this.alpha = 1;
  }

  init(x, y, maxRadius, speed, color) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.radius = 4;
    this.maxRadius = maxRadius;
    this.speed = speed;
    this.color = color;
    this.alpha = 1;
  }

  update(dt) {
    if (!this.active) return false;
    this.radius += this.speed * dt;
    this.alpha = 1 - this.radius / this.maxRadius;
    if (this.alpha <= 0 || this.radius >= this.maxRadius) {
      this.active = false;
      return false;
    }
    return true;
  }
}

export class ParticleEngine {
  constructor() {
    this.particles = Array.from({ length: MAX_PARTICLES }, () => new Particle());
    this.rings = Array.from({ length: MAX_RINGS }, () => new ShockwaveRing());
    this.particleHead = 0;
    this.ringHead = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  emit(x, y, vx, vy, size, color, life, drag = 0.96, gravity = 0) {
    const p = this.particles[this.particleHead];
    p.init(x, y, vx, vy, size, color, life, drag, gravity);
    this.particleHead = (this.particleHead + 1) % MAX_PARTICLES;
  }

  emitRing(x, y, maxRadius, speed, color) {
    const r = this.rings[this.ringHead];
    r.init(x, y, maxRadius, speed, color);
    this.ringHead = (this.ringHead + 1) % MAX_RINGS;
  }

  shake(intensity, duration) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  // Neon thruster wake
  burstThruster(x, y, dirX, dirY) {
    for (let i = 0; i < 3; i++) {
      const spread = (Math.random() - 0.5) * 60;
      const speed = -(180 + Math.random() * 120);
      const color = Math.random() > 0.4 ? PALETTE.neonCyan : PALETTE.neonPurple;
      this.emit(
        x + (Math.random() - 0.5) * 6,
        y + (Math.random() - 0.5) * 6,
        dirX * speed + (Math.random() - 0.5) * 30,
        dirY * speed + spread,
        2 + Math.random() * 3,
        color,
        0.25 + Math.random() * 0.2,
        0.92
      );
    }
  }

  // Laser hit burst
  burstHit(x, y, color = PALETTE.neonCyan) {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 260;
      this.emit(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        2 + Math.random() * 3,
        color,
        0.35 + Math.random() * 0.25,
        0.90
      );
    }
    this.emitRing(x, y, 45, 180, color);
    this.shake(4, 0.15);
  }

  // Giant neon explosion
  burstExplosion(x, y, radius = 90, color = PALETTE.neonPink) {
    for (let i = 0; i < 48; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 450;
      const c = Math.random() > 0.5 ? color : Math.random() > 0.5 ? PALETTE.neonYellow : PALETTE.white;
      this.emit(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        3 + Math.random() * 5,
        c,
        0.5 + Math.random() * 0.6,
        0.92
      );
    }
    this.emitRing(x, y, radius * 1.5, 360, color);
    this.emitRing(x, y, radius * 0.9, 240, PALETTE.neonYellow);
    this.shake(12, 0.35);
  }

  // Boss void vortex particle spiral
  burstBossVortex(centerX, centerY, radius = 120) {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = radius * (0.6 + Math.random() * 0.5);
      const px = centerX + Math.cos(angle) * dist;
      const py = centerY + Math.sin(angle) * dist;
      // Inward tangent vector
      const vx = -Math.cos(angle) * 140 - Math.sin(angle) * 180;
      const vy = -Math.sin(angle) * 140 + Math.cos(angle) * 180;
      this.emit(
        px,
        py,
        vx,
        vy,
        2.5 + Math.random() * 3,
        PALETTE.neonPurple,
        0.5 + Math.random() * 0.3,
        0.94
      );
    }
  }

  update(dt) {
    // Update particles
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (p.active) p.update(dt);
    }
    // Update shockwave rings
    for (let i = 0; i < MAX_RINGS; i++) {
      const r = this.rings[i];
      if (r.active) r.update(dt);
    }
    // Update screenshake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      const decay = Math.max(0, this.shakeDuration);
      this.shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensity * (decay + 0.2);
      this.shakeY = (Math.random() - 0.5) * 2 * this.shakeIntensity * (decay + 0.2);
    } else {
      this.shakeIntensity = 0;
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Draw shockwave rings
    for (let i = 0; i < MAX_RINGS; i++) {
      const r = this.rings[i];
      if (!r.active) continue;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = Math.max(1, 4 * r.alpha);
      ctx.globalAlpha = Math.max(0, Math.min(1, r.alpha));
      ctx.stroke();
    }

    // Draw particles
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      const progress = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, Math.min(1, progress));
      const sz = p.size * (0.3 + 0.7 * progress);
      ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }

    ctx.restore();
  }
}
