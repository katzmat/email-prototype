import { GameConfig, GameCallbacks } from './types';
import { BaseGame } from './engine';
import { playBounce, playScore, playShoot, playDie, playPowerUp, playCollect, playWin, playLose } from './sounds';

interface Invader {
  x: number;
  y: number;
  alive: boolean;
  col: number;
  row: number;
}

interface Bullet {
  x: number;
  y: number;
  vy: number;
  isEnemy: boolean;
}

interface Shield {
  x: number;
  y: number;
  health: number;
}

interface PowerDrop {
  x: number;
  y: number;
  vy: number;
}

export class InvadersGame extends BaseGame {
  private playerX = 0;
  private playerSpeed = 350;
  private invaders: Invader[] = [];
  private bullets: Bullet[] = [];
  private shields: Shield[] = [];
  private powerDrops: PowerDrop[] = [];

  private invaderDir = 1;
  private invaderSpeed = 40;
  private invaderDropAmount = 25;
  private invaderShootTimer = 0;
  private shootCooldown = 0;
  private wave = 1;
  private invaderMoveTimer = 0;
  private invaderMoveInterval = 0.5;

  private gridCols = 8;
  private gridRows = 4;
  private invaderSize = 28;
  private invaderSpacing = 42;

  constructor(canvas: HTMLCanvasElement, config: GameConfig, callbacks: GameCallbacks) {
    super(canvas, config, callbacks);
  }

  getInstructions(): string {
    return '⬅️➡️ Move  |  Space Shoot  |  🅿️ Power (Rapid Fire)';
  }

  setup() {
    this.lives = 3;
    this.setLives(3);
    this.setScore(0);
    this.wave = 1;
    this.playerX = this.width / 2;
    this.bullets = [];
    this.powerDrops = [];
    this.spawnWave();
  }

  private spawnWave() {
    this.invaders = [];
    this.shields = [];
    this.bullets = [];
    this.powerDrops = [];

    // Scale grid based on screen size
    this.invaderSpacing = Math.min(42, (this.width - 80) / this.gridCols);
    this.invaderSize = this.invaderSpacing * 0.65;

    const gridWidth = this.gridCols * this.invaderSpacing;
    const startX = (this.width - gridWidth) / 2 + this.invaderSpacing / 2;
    const startY = 60;

    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        this.invaders.push({
          x: startX + col * this.invaderSpacing,
          y: startY + row * this.invaderSpacing,
          alive: true,
          col,
          row,
        });
      }
    }

    // Shields
    const shieldCount = 3;
    const shieldSpacing = this.width / (shieldCount + 1);
    for (let i = 0; i < shieldCount; i++) {
      for (let sx = -1; sx <= 1; sx++) {
        for (let sy = 0; sy < 2; sy++) {
          this.shields.push({
            x: shieldSpacing * (i + 1) + sx * 18,
            y: this.height - 160 + sy * 18,
            health: 3,
          });
        }
      }
    }

    this.invaderDir = 1;
    this.invaderSpeed = 40 + this.wave * 15;
    this.invaderMoveInterval = Math.max(0.1, 0.5 - this.wave * 0.06);
    this.invaderMoveTimer = 0;
    this.invaderShootTimer = 1;

    this.callbacks.onMessage(`Wave ${this.wave} - Defend against ${this.config.villainName}!`);
  }

  update(dt: number) {
    // Player movement
    let moveDir = 0;
    if (this.keyDown('arrowleft') || this.keyDown('a')) moveDir = -1;
    if (this.keyDown('arrowright') || this.keyDown('d')) moveDir = 1;

    // Touch
    if (this.touchActive) {
      if (this.touchX < this.playerX - 20) moveDir = -1;
      else if (this.touchX > this.playerX + 20) moveDir = 1;
    }

    const spd = this.powerActive ? this.playerSpeed * 1.3 : this.playerSpeed;
    this.playerX += moveDir * spd * dt;
    this.playerX = Math.max(20, Math.min(this.width - 20, this.playerX));

    // Shooting
    this.shootCooldown -= dt;
    const wantShoot = this.keyJustPressed(' ') || (this.powerActive && this.keyDown(' ') && this.shootCooldown <= 0);
    const touchShoot = this.touchActive && this.touchY < this.height * 0.5;

    if ((wantShoot || touchShoot) && this.shootCooldown <= 0) {
      const maxBullets = this.powerActive ? 5 : 2;
      const playerBullets = this.bullets.filter(b => !b.isEnemy).length;
      if (playerBullets < maxBullets) {
        this.bullets.push({
          x: this.playerX,
          y: this.height - 80,
          vy: -450,
          isEnemy: false,
        });
        this.shootCooldown = this.powerActive ? 0.1 : 0.3;
        playShoot();
      }
    }

    // Power
    if (this.keyJustPressed('p')) {
      if (this.activatePower()) {
        playPowerUp();
        this.callbacks.onMessage(`${this.config.heroName} activated ${this.config.specialPower}!`);
      }
    }

    // Invader movement (step-based like original)
    this.invaderMoveTimer -= dt;
    if (this.invaderMoveTimer <= 0) {
      this.invaderMoveTimer = this.invaderMoveInterval;

      // Check if any invader hit the edge
      let hitEdge = false;
      for (const inv of this.invaders) {
        if (!inv.alive) continue;
        if ((this.invaderDir > 0 && inv.x > this.width - 40) ||
            (this.invaderDir < 0 && inv.x < 40)) {
          hitEdge = true;
          break;
        }
      }

      if (hitEdge) {
        this.invaderDir *= -1;
        for (const inv of this.invaders) {
          if (!inv.alive) continue;
          inv.y += this.invaderDropAmount;
        }
      } else {
        for (const inv of this.invaders) {
          if (!inv.alive) continue;
          inv.x += this.invaderDir * this.invaderSpeed * 0.5;
        }
      }
    }

    // Speed up as fewer invaders remain
    const aliveCount = this.invaders.filter(i => i.alive).length;
    const totalCount = this.invaders.length;
    if (aliveCount > 0) {
      const ratio = aliveCount / totalCount;
      this.invaderMoveInterval = Math.max(0.05, (0.5 - this.wave * 0.06) * ratio);
    }

    // Enemy shooting
    this.invaderShootTimer -= dt;
    if (this.invaderShootTimer <= 0) {
      this.invaderShootTimer = Math.max(0.4, 1.5 - this.wave * 0.15);

      // Find bottom-most alive invaders per column
      const bottomInvaders: Invader[] = [];
      for (let col = 0; col < this.gridCols; col++) {
        let bottom: Invader | null = null;
        for (const inv of this.invaders) {
          if (inv.alive && inv.col === col) {
            if (!bottom || inv.row > bottom.row) bottom = inv;
          }
        }
        if (bottom) bottomInvaders.push(bottom);
      }

      if (bottomInvaders.length > 0) {
        const shooter = bottomInvaders[Math.floor(Math.random() * bottomInvaders.length)];
        this.bullets.push({
          x: shooter.x,
          y: shooter.y + 15,
          vy: 200 + this.wave * 20,
          isEnemy: true,
        });
      }
    }

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.y += b.vy * dt;
      if (b.y < -10 || b.y > this.height + 10) {
        this.bullets.splice(i, 1);
        continue;
      }

      if (!b.isEnemy) {
        // Player bullet hits invader
        for (const inv of this.invaders) {
          if (!inv.alive) continue;
          if (this.collides(
            b.x - 4, b.y - 6, 8, 12,
            inv.x - this.invaderSize / 2, inv.y - this.invaderSize / 2,
            this.invaderSize, this.invaderSize
          )) {
            inv.alive = false;
            this.bullets.splice(i, 1);
            const points = (this.gridRows - inv.row) * 10 + 10;
            this.addScore(points);
            playScore();
            this.addParticles(inv.x, inv.y, this.config.villainEmoji, 4, 120);

            // Maybe drop power
            if (Math.random() < 0.15) {
              this.powerDrops.push({
                x: inv.x,
                y: inv.y,
                vy: 100,
              });
            }
            break;
          }
        }

        // Player bullet hits shield (from below going up - skip)
      } else {
        // Enemy bullet hits player
        if (this.collides(
          b.x - 4, b.y - 6, 8, 12,
          this.playerX - 16, this.height - 75, 32, 32
        )) {
          this.bullets.splice(i, 1);
          this.lives--;
          this.setLives(this.lives);
          this.shake(0.3);
          playDie();
          this.addParticles(this.playerX, this.height - 60, '💥', 6, 150);

          if (this.lives <= 0) {
            playLose();
            this.endGame(false);
            return;
          }
          this.callbacks.onMessage(`${this.config.heroName} was hit! ${this.lives} lives left`);
          continue;
        }

        // Enemy bullet hits shield
        for (let si = this.shields.length - 1; si >= 0; si--) {
          const s = this.shields[si];
          if (s.health <= 0) continue;
          if (this.collides(b.x - 4, b.y - 6, 8, 12, s.x - 8, s.y - 8, 16, 16)) {
            s.health--;
            this.bullets.splice(i, 1);
            playBounce();
            if (s.health <= 0) {
              this.addParticles(s.x, s.y, '💨', 3, 60);
            }
            break;
          }
        }
      }
    }

    // Shield collision with player bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (b.isEnemy) continue;
      for (const s of this.shields) {
        if (s.health <= 0) continue;
        if (this.collides(b.x - 4, b.y - 6, 8, 12, s.x - 8, s.y - 8, 16, 16)) {
          s.health--;
          this.bullets.splice(i, 1);
          break;
        }
      }
    }

    // Power drops
    for (let i = this.powerDrops.length - 1; i >= 0; i--) {
      const p = this.powerDrops[i];
      p.y += p.vy * dt;
      if (p.y > this.height + 20) {
        this.powerDrops.splice(i, 1);
        continue;
      }
      if (this.collidesCircle(p.x, p.y, 12, this.playerX, this.height - 60, 20)) {
        this.powerDrops.splice(i, 1);
        this.addScore(100);
        playCollect();
        this.addParticles(p.x, p.y, this.config.collectibleEmoji, 5, 100);
      }
    }

    // Invaders reach bottom
    for (const inv of this.invaders) {
      if (inv.alive && inv.y > this.height - 100) {
        playLose();
        this.endGame(false);
        return;
      }
    }

    // Wave clear
    if (aliveCount === 0) {
      this.wave++;
      if (this.wave > 5) {
        playWin();
        this.addScore(1000);
        this.endGame(true);
      } else {
        this.gridRows = Math.min(6, 4 + Math.floor(this.wave / 2));
        this.spawnWave();
      }
    }
  }

  render() {
    // Draw shields
    for (const s of this.shields) {
      if (s.health <= 0) continue;
      const alpha = s.health / 3;
      this.ctx.fillStyle = `rgba(80, 255, 80, ${alpha * 0.6})`;
      this.ctx.beginPath();
      this.ctx.roundRect(s.x - 8, s.y - 8, 16, 16, 3);
      this.ctx.fill();
    }

    // Draw invaders
    for (const inv of this.invaders) {
      if (!inv.alive) continue;
      // Slight wobble animation
      const wobble = Math.sin(this.frame * 0.05 + inv.col * 0.5) * 2;
      this.drawEmoji(this.config.villainEmoji, inv.x, inv.y + wobble, this.invaderSize);
    }

    // Draw power drops
    for (const p of this.powerDrops) {
      const bobY = Math.sin(this.frame * 0.15) * 3;
      this.drawEmoji(this.config.collectibleEmoji, p.x, p.y + bobY, 22);
    }

    // Draw bullets
    for (const b of this.bullets) {
      if (b.isEnemy) {
        this.ctx.fillStyle = '#ff4444';
        this.ctx.shadowColor = '#ff4444';
      } else {
        this.ctx.fillStyle = '#44ff44';
        this.ctx.shadowColor = '#44ff44';
      }
      this.ctx.shadowBlur = 6;
      if (b.isEnemy) {
        this.drawEmoji(this.config.villainEmoji, b.x, b.y, 10);
      } else {
        this.drawEmoji(this.config.projectileEmoji, b.x, b.y, 12);
      }
      this.ctx.shadowBlur = 0;
    }

    // Draw player
    const playerY = this.height - 60;
    if (this.powerActive) {
      this.ctx.shadowColor = '#ffdd00';
      this.ctx.shadowBlur = 15;
    }
    this.drawEmoji(this.config.heroEmoji, this.playerX, playerY, 36);
    this.ctx.shadowBlur = 0;

    // Wave indicator
    this.drawText(`Wave ${this.wave}/5`, this.width - 60, 30, 16, 'rgba(255,255,255,0.6)');

    // Invader count
    const alive = this.invaders.filter(i => i.alive).length;
    this.drawText(
      `${this.config.villainEmoji} x${alive}`,
      this.width - 60,
      55,
      14,
      'rgba(255,255,255,0.4)'
    );

    // Power indicator
    if (this.powerCooldown > 0 && !this.powerActive) {
      const pct = 1 - this.powerCooldown / 15;
      this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
      this.ctx.fillRect(10, this.height - 20, 100, 10);
      this.ctx.fillStyle = '#44ff44';
      this.ctx.fillRect(10, this.height - 20, 100 * pct, 10);
    } else if (!this.powerActive && this.powerCooldown <= 0) {
      this.drawText('⚡ POWER READY (P)', 60, this.height - 14, 11, '#44ff44', 'left');
    }
    if (this.powerActive) {
      this.drawText(`⚡ ${this.config.specialPower}!`, 60, this.height - 14, 13, '#ffdd00', 'left');
    }
  }
}
