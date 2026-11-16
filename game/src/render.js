// render.js: Synthwave vector graphics renderer, starfield parallax, HUD & screens
import { FIELD, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

class Starfield {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.stars = [];
    for (let i = 0; i < 160; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 40 + Math.random() * 220,
        size: 1 + Math.random() * 2,
        color: Math.random() > 0.6 ? PALETTE.neonCyan : Math.random() > 0.3 ? PALETTE.neonPurple : PALETTE.white,
      });
    }
  }

  update(dt) {
    for (const s of this.stars) {
      s.y += s.speed * dt;
      if (s.y > this.height) {
        s.y = 0;
        s.x = Math.random() * this.width;
      }
    }
  }

  render(ctx) {
    ctx.save();
    for (const s of this.stars) {
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.min(1, s.speed / 200);
      ctx.fillRect(s.x, s.y, s.size, s.size * (1 + s.speed / 120));
    }
    ctx.restore();
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const starfield = new Starfield(FIELD.width, FIELD.height);
  let pulse = 0;

  function drawPlayer(player) {
    ctx.save();
    ctx.translate(player.x, player.y);

    // Invulnerability flashing
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 16) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Shield bubble
    if (player.shield > 0) {
      ctx.beginPath();
      ctx.ellipse(0, 0, player.width / 2 + 10, player.height / 2 + 8, 0, 0, Math.PI * 2);
      ctx.strokeStyle = PALETTE.neonCyan;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = PALETTE.neonCyan;
      ctx.shadowBlur = 12;
      ctx.stroke();
    }

    // Ship Delta-Wing Hull
    ctx.beginPath();
    ctx.moveTo(0, -player.height / 2);
    ctx.lineTo(player.width / 2, player.height / 2);
    ctx.lineTo(player.width / 4, player.height / 2 - 8);
    ctx.lineTo(0, player.height / 2 - 4);
    ctx.lineTo(-player.width / 4, player.height / 2 - 8);
    ctx.lineTo(-player.width / 2, player.height / 2);
    ctx.closePath();

    ctx.fillStyle = '#0a1020';
    ctx.fill();
    ctx.strokeStyle = PALETTE.neonCyan;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = PALETTE.neonCyan;
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Cockpit Canopy
    ctx.beginPath();
    ctx.ellipse(0, -4, 5, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.neonPink;
    ctx.shadowColor = PALETTE.neonPink;
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.restore();
  }

  function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x, e.y);

    ctx.strokeStyle = e.color;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#140c1e';

    if (e.type === 'scout') {
      ctx.beginPath();
      ctx.moveTo(0, e.height / 2);
      ctx.lineTo(e.width / 2, -e.height / 2);
      ctx.lineTo(0, -e.height / 3);
      ctx.lineTo(-e.width / 2, -e.height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (e.type === 'interceptor') {
      ctx.beginPath();
      ctx.moveTo(0, e.height / 2);
      ctx.lineTo(e.width / 2, 0);
      ctx.lineTo(e.width / 3, -e.height / 2);
      ctx.lineTo(-e.width / 3, -e.height / 2);
      ctx.lineTo(-e.width / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Heavy Cruiser
      ctx.beginPath();
      ctx.moveTo(-e.width / 2, -e.height / 2);
      ctx.lineTo(e.width / 2, -e.height / 2);
      ctx.lineTo(e.width / 2 - 10, e.height / 2);
      ctx.lineTo(0, e.height / 2 + 10);
      ctx.lineTo(-e.width / 2 + 10, e.height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawBullets(bullets) {
    ctx.save();
    for (const b of bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = b.radius * 2.5;
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPickups(pickups) {
    ctx.save();
    for (const p of pickups) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.time * 2);

      const color = p.type === 'shield' ? PALETTE.neonCyan : p.type === 'triple' ? PALETTE.neonOrange : PALETTE.neonGreen;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.strokeRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);

      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = p.type === 'shield' ? 'S' : p.type === 'triple' ? '3X' : '$$';
      ctx.fillText(label, 0, 0);

      ctx.restore();
    }
    ctx.restore();
  }

  function drawHUD(world, bestScore) {
    ctx.save();

    // Top Header Bar
    ctx.fillStyle = 'rgba(6, 6, 14, 0.75)';
    ctx.fillRect(0, 0, FIELD.width, 56);
    ctx.strokeStyle = PALETTE.hudBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, FIELD.width, 56);

    // Score
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.neonCyan;
    ctx.shadowColor = PALETTE.neonCyan;
    ctx.shadowBlur = 8;
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${world.score.toLocaleString()}`, 32, 36);

    // High Score
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.textMuted;
    ctx.shadowBlur = 0;
    ctx.fillText(`HIGH: ${Math.max(world.score, bestScore).toLocaleString()}`, 240, 36);

    // Wave indicator
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.neonYellow;
    ctx.shadowColor = PALETTE.neonYellow;
    ctx.shadowBlur = 8;
    ctx.textAlign = 'center';
    ctx.fillText(`WAVE ${world.wave}`, FIELD.width / 2, 36);

    // Combo indicator
    if (world.combo > 1) {
      ctx.font = 'bold 20px "Segoe UI", sans-serif';
      ctx.fillStyle = PALETTE.neonPink;
      ctx.shadowColor = PALETTE.neonPink;
      ctx.shadowBlur = 10;
      ctx.textAlign = 'right';
      ctx.fillText(`${world.combo}X MULTIPLIER!`, FIELD.width - 32, 36);
    }

    // Bottom Player Vitals: Shield & Health
    const p = world.player;
    const barW = 200;
    const barH = 10;

    // Shield Bar
    ctx.fillStyle = 'rgba(10, 15, 25, 0.8)';
    ctx.fillRect(32, FIELD.height - 38, barW, barH);
    ctx.fillStyle = PALETTE.neonCyan;
    ctx.shadowColor = PALETTE.neonCyan;
    ctx.shadowBlur = 6;
    ctx.fillRect(32, FIELD.height - 38, barW * (p.shield / 100), barH);
    ctx.strokeStyle = PALETTE.hudBorder;
    ctx.strokeRect(32, FIELD.height - 38, barW, barH);

    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.neonCyan;
    ctx.textAlign = 'left';
    ctx.fillText(`SHIELD: ${Math.round(p.shield)}%`, 32, FIELD.height - 44);

    // Health Bar
    ctx.fillStyle = 'rgba(10, 15, 25, 0.8)';
    ctx.fillRect(32, FIELD.height - 18, barW, barH);
    ctx.fillStyle = PALETTE.neonPink;
    ctx.shadowColor = PALETTE.neonPink;
    ctx.shadowBlur = 6;
    ctx.fillRect(32, FIELD.height - 18, barW * (p.health / 100), barH);
    ctx.strokeStyle = PALETTE.hudBorder;
    ctx.strokeRect(32, FIELD.height - 18, barW, barH);

    ctx.fillStyle = PALETTE.neonPink;
    ctx.fillText(`HULL: ${Math.round(p.health)}%`, 32, FIELD.height - 24);

    // Weapon Mode
    if (p.tripleShotTimer > 0) {
      ctx.font = 'bold 13px "Segoe UI", sans-serif';
      ctx.fillStyle = PALETTE.neonOrange;
      ctx.shadowColor = PALETTE.neonOrange;
      ctx.shadowBlur = 6;
      ctx.textAlign = 'left';
      ctx.fillText(`WEAPON: TRIPLE SPREAD (${Math.ceil(p.tripleShotTimer)}s)`, 250, FIELD.height - 22);
    }

    ctx.restore();
  }

  function drawTitleScreen() {
    ctx.save();
    // Backdrop
    ctx.fillStyle = 'rgba(6, 6, 12, 0.65)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    // Title Logo
    ctx.textAlign = 'center';
    ctx.font = '900 68px "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.neonCyan;
    ctx.shadowColor = PALETTE.neonCyan;
    ctx.shadowBlur = 28;
    ctx.fillText('NEON STRIKE', FIELD.width / 2, FIELD.height / 2 - 80);

    ctx.font = 'bold 36px "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.neonPink;
    ctx.shadowColor = PALETTE.neonPink;
    ctx.shadowBlur = 18;
    ctx.fillText('VOID RUNNER', FIELD.width / 2, FIELD.height / 2 - 25);

    // Instructions
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.white;
    ctx.shadowColor = PALETTE.neonCyan;
    ctx.shadowBlur = 8;
    ctx.fillText('[WASD] / [ARROWS] Move  •  [SPACE] / [CLICK] Fire Laser  •  [P] Pause', FIELD.width / 2, FIELD.height / 2 + 50);

    // Start prompt with gentle pulse
    const promptAlpha = 0.6 + Math.sin(pulse * 3) * 0.4;
    ctx.globalAlpha = promptAlpha;
    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.neonYellow;
    ctx.shadowColor = PALETTE.neonYellow;
    ctx.shadowBlur = 14;
    ctx.fillText('PRESS [SPACE] OR CLICK TO LAUNCH', FIELD.width / 2, FIELD.height / 2 + 120);

    ctx.restore();
  }

  function drawGameOverScreen(world, bestScore) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 6, 12, 0.85)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    ctx.textAlign = 'center';
    ctx.font = '900 64px "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.neonRed;
    ctx.shadowColor = PALETTE.neonRed;
    ctx.shadowBlur = 24;
    ctx.fillText('MISSION FAILED', FIELD.width / 2, FIELD.height / 2 - 100);

    ctx.font = '24px "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.neonCyan;
    ctx.shadowColor = PALETTE.neonCyan;
    ctx.shadowBlur = 10;
    ctx.fillText(`FINAL SCORE: ${world.score.toLocaleString()}`, FIELD.width / 2, FIELD.height / 2 - 30);

    ctx.font = '18px "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.textMuted;
    ctx.shadowBlur = 0;
    ctx.fillText(`SECTOR RECORD: ${bestScore.toLocaleString()}`, FIELD.width / 2, FIELD.height / 2 + 10);

    // Rank designation
    const rank = world.score > 25000 ? 'VOID ACE' : world.score > 10000 ? 'VETERAN PILOT' : 'STAR CADET';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.neonYellow;
    ctx.shadowColor = PALETTE.neonYellow;
    ctx.shadowBlur = 10;
    ctx.fillText(`RANK ATTAINED: ${rank}`, FIELD.width / 2, FIELD.height / 2 + 60);

    // Restart prompt
    const promptAlpha = 0.6 + Math.sin(pulse * 3) * 0.4;
    ctx.globalAlpha = promptAlpha;
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.white;
    ctx.shadowColor = PALETTE.neonCyan;
    ctx.shadowBlur = 10;
    ctx.fillText('PRESS [SPACE] OR CLICK TO RESTART', FIELD.width / 2, FIELD.height / 2 + 130);

    ctx.restore();
  }

  return {
    draw(world, screen, bestScore) {
      pulse += 0.03;
      starfield.update(1 / 60);

      // Clear field
      ctx.fillStyle = PALETTE.bgVoid;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);

      // Starfield parallax
      starfield.render(ctx);

      // Camera shake transform
      ctx.save();
      const shakeX = world.particles.shakeX;
      const shakeY = world.particles.shakeY;
      ctx.translate(shakeX, shakeY);

      // Game objects
      drawPickups(world.pickups);
      drawBullets(world.bullets);
      for (const e of world.enemies) drawEnemy(e);
      world.boss.render(ctx);
      drawPlayer(world.player);
      world.particles.render(ctx);

      ctx.restore();

      // HUD & Overlays
      drawHUD(world, bestScore);

      if (screen === SCREEN_TITLE) {
        drawTitleScreen();
      } else if (screen === SCREEN_OVER) {
        drawGameOverScreen(world, bestScore);
      } else if (screen === SCREEN_PAUSED) {
        ctx.fillStyle = 'rgba(6, 6, 12, 0.7)';
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
        ctx.textAlign = 'center';
        ctx.font = 'bold 44px "Segoe UI", sans-serif';
        ctx.fillStyle = PALETTE.neonCyan;
        ctx.shadowColor = PALETTE.neonCyan;
        ctx.shadowBlur = 18;
        ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2);
        ctx.font = '18px "Segoe UI", sans-serif';
        ctx.fillStyle = PALETTE.white;
        ctx.fillText('PRESS [P] OR [SPACE] TO RESUME', FIELD.width / 2, FIELD.height / 2 + 50);
      }
    },
  };
}
