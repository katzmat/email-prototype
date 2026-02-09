import { GameConfig, GameCallbacks } from './types';
import { BaseGame } from './engine';
import { playBounce, playScore, playShoot, playDie, playPowerUp, playCollect, playWin, playLose } from './sounds';

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number; // 3=large, 2=medium, 1=small
  rotation: number;
  rotSpeed: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Collectible {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export class AsteroidsGame extends BaseGame {
  private shipX = 0;
  private shipY = 0;
  private shipVX = 0;
  private shipVY = 0;
  private shipAngle = -Math.PI / 2;
  private shipThrust = false;
  private asteroids: Asteroid[] = [];
  private bullets: Bullet[] = [];
  private collectibles: Collectible[] = [];
  private wave = 1;
  private invulnTimer = 0;
  private shootCooldown = 0;

  constructor(canvas: HTMLCanvasElement, config: GameConfig, callbacks: GameCallbacks) {
    super(canvas, config, callbacks);
  }

  getInstructions(): string {
    return '⬅️➡️ Rotate  |  ⬆️ Thrust  |  Space Shoot  |  🅿️ Power';
  }

  setup() {
    this.shipX = this.width / 2;
    this.shipY = this.height / 2;
    this.shipVX = 0;
    this.shipVY = 0;
    this.shipAngle = -Math.PI / 2;
    this.lives = 3;
    this.setLives(3);
    this.setScore(0);
    this.wave = 1;
    this.asteroids = [];
    this.bullets = [];
    this.collectibles = [];
    this.spawnWave();
  }

  private spawnWave() {
    const count = 3 + this.wave * 2;
    for (let i = 0; i < count; i++) {
      this.spawnAsteroid(3);
    }
    this.callbacks.onMessage(`Wave ${this.wave}!`);
  }

  private spawnAsteroid(size: number, x?: number, y?: number) {
    const px = x ?? (Math.random() < 0.5 ? 0 : this.width);
    const py = y ?? Math.random() * this.height;
    const speed = (60 + Math.random() * 40) * (4 - size) * 0.6;
    const angle = Math.random() * Math.PI * 2;
    this.asteroids.push({
      x: px,
      y: py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 3,
    });
  }

  private asteroidRadius(size: number): number {
    return [0, 12, 22, 35][size] * Math.min(this.width, this.height) / 700;
  }

  update(dt: number) {
    // Rotation
    if (this.keyDown('arrowleft') || this.keyDown('a')) {
      this.shipAngle -= 4 * dt;
    }
    if (this.keyDown('arrowright') || this.keyDown('d')) {
      this.shipAngle += 4 * dt;
    }

    // Thrust
    this.shipThrust = this.keyDown('arrowup') || this.keyDown('w');
    if (this.shipThrust) {
      const thrustPower = this.powerActive ? 500 : 300;
      this.shipVX += Math.cos(this.shipAngle) * thrustPower * dt;
      this.shipVY += Math.sin(this.shipAngle) * thrustPower * dt;
    }

    // Touch controls
    if (this.touchActive) {
      const dx = this.touchX - this.shipX;
      const dy = this.touchY - this.shipY;
      this.shipAngle = Math.atan2(dy, dx);
      if (Math.sqrt(dx * dx + dy * dy) > 50) {
        this.shipThrust = true;
        this.shipVX += Math.cos(this.shipAngle) * 300 * dt;
        this.shipVY += Math.sin(this.shipAngle) * 300 * dt;
      }
    }

    // Drag
    this.shipVX *= 0.995;
    this.shipVY *= 0.995;

    // Max speed
    const speed = Math.sqrt(this.shipVX * this.shipVX + this.shipVY * this.shipVY);
    const maxSpeed = 400;
    if (speed > maxSpeed) {
      this.shipVX = (this.shipVX / speed) * maxSpeed;
      this.shipVY = (this.shipVY / speed) * maxSpeed;
    }

    // Move ship
    this.shipX += this.shipVX * dt;
    this.shipY += this.shipVY * dt;

    // Wrap
    if (this.shipX < -20) this.shipX = this.width + 20;
    if (this.shipX > this.width + 20) this.shipX = -20;
    if (this.shipY < -20) this.shipY = this.height + 20;
    if (this.shipY > this.height + 20) this.shipY = -20;

    // Shoot
    this.shootCooldown -= dt;
    const canShoot = this.keyJustPressed(' ') || (this.powerActive && this.keyDown(' ') && this.shootCooldown <= 0);
    if (canShoot && this.shootCooldown <= 0) {
      const bulletSpeed = 500;
      this.bullets.push({
        x: this.shipX + Math.cos(this.shipAngle) * 20,
        y: this.shipY + Math.sin(this.shipAngle) * 20,
        vx: Math.cos(this.shipAngle) * bulletSpeed + this.shipVX * 0.3,
        vy: Math.sin(this.shipAngle) * bulletSpeed + this.shipVY * 0.3,
        life: 1.5,
      });
      this.shootCooldown = this.powerActive ? 0.1 : 0.25;
      playShoot();
    }

    // Power
    if (this.keyJustPressed('p')) {
      if (this.activatePower()) {
        playPowerUp();
        this.callbacks.onMessage(`${this.config.heroName} activated ${this.config.specialPower}!`);
      }
    }

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      // Wrap
      if (b.x < 0) b.x = this.width;
      if (b.x > this.width) b.x = 0;
      if (b.y < 0) b.y = this.height;
      if (b.y > this.height) b.y = 0;
      if (b.life <= 0) {
        this.bullets.splice(i, 1);
      }
    }

    // Update asteroids
    for (const a of this.asteroids) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rotation += a.rotSpeed * dt;
      // Wrap
      if (a.x < -50) a.x = this.width + 50;
      if (a.x > this.width + 50) a.x = -50;
      if (a.y < -50) a.y = this.height + 50;
      if (a.y > this.height + 50) a.y = -50;
    }

    // Update collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.life -= dt;
      if (c.life <= 0) {
        this.collectibles.splice(i, 1);
      }
    }

    // Bullet-asteroid collisions
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
        const a = this.asteroids[ai];
        const r = this.asteroidRadius(a.size);
        if (this.collidesCircle(b.x, b.y, 5, a.x, a.y, r)) {
          // Hit!
          this.bullets.splice(bi, 1);
          this.asteroids.splice(ai, 1);
          const points = [0, 100, 50, 20][a.size];
          this.addScore(points);
          playBounce();
          this.addParticles(a.x, a.y, this.config.villainEmoji, 4, 120);

          // Split
          if (a.size > 1) {
            this.spawnAsteroid(a.size - 1, a.x, a.y);
            this.spawnAsteroid(a.size - 1, a.x, a.y);
          }

          // Maybe spawn collectible
          if (Math.random() < 0.3) {
            this.collectibles.push({
              x: a.x,
              y: a.y,
              vx: (Math.random() - 0.5) * 60,
              vy: (Math.random() - 0.5) * 60,
              life: 5,
            });
          }
          break;
        }
      }
    }

    // Ship-collectible collision
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      if (this.collidesCircle(this.shipX, this.shipY, 15, c.x, c.y, 12)) {
        this.collectibles.splice(i, 1);
        this.addScore(250);
        playCollect();
        this.addParticles(c.x, c.y, this.config.collectibleEmoji, 6, 100);
      }
    }

    // Ship-asteroid collision
    this.invulnTimer -= dt;
    if (this.invulnTimer <= 0) {
      for (const a of this.asteroids) {
        const r = this.asteroidRadius(a.size);
        if (this.collidesCircle(this.shipX, this.shipY, 12, a.x, a.y, r)) {
          this.lives--;
          this.setLives(this.lives);
          this.invulnTimer = 2;
          this.shake(0.4);
          playDie();
          this.addParticles(this.shipX, this.shipY, '💥', 8, 200);
          this.shipVX = 0;
          this.shipVY = 0;
          if (this.lives <= 0) {
            playLose();
            this.endGame(false);
            return;
          }
          this.callbacks.onMessage(`${this.config.heroName} was hit! ${this.lives} lives left`);
          break;
        }
      }
    }

    // Next wave
    if (this.asteroids.length === 0 && !this.isGameOver) {
      this.wave++;
      if (this.wave > 5) {
        playWin();
        this.endGame(true);
      } else {
        playScore();
        this.spawnWave();
      }
    }
  }

  render() {
    // Draw collectibles
    for (const c of this.collectibles) {
      const alpha = c.life < 1 ? c.life : 1;
      this.ctx.globalAlpha = alpha;
      const bobY = Math.sin(this.frame * 0.1 + c.x) * 5;
      this.drawEmoji(this.config.collectibleEmoji, c.x, c.y + bobY, 24);
      this.ctx.globalAlpha = 1;
    }

    // Draw asteroids
    for (const a of this.asteroids) {
      const r = this.asteroidRadius(a.size);
      this.ctx.save();
      this.ctx.translate(a.x, a.y);
      this.ctx.rotate(a.rotation);
      this.drawEmoji(this.config.villainEmoji, 0, 0, r * 1.8);
      this.ctx.restore();
    }

    // Draw bullets
    for (const b of this.bullets) {
      this.ctx.shadowColor = '#ffff00';
      this.ctx.shadowBlur = 8;
      this.drawEmoji(this.config.projectileEmoji, b.x, b.y, 14);
      this.ctx.shadowBlur = 0;
    }

    // Draw ship
    const blink = this.invulnTimer > 0 && Math.floor(this.invulnTimer * 8) % 2 === 0;
    if (!blink) {
      this.ctx.save();
      this.ctx.translate(this.shipX, this.shipY);
      this.ctx.rotate(this.shipAngle + Math.PI / 2);
      this.drawEmoji(this.config.heroEmoji, 0, 0, 36);
      this.ctx.restore();

      // Thrust flame
      if (this.shipThrust) {
        const fx = this.shipX - Math.cos(this.shipAngle) * 25;
        const fy = this.shipY - Math.sin(this.shipAngle) * 25;
        const flameSize = 12 + Math.random() * 8;
        this.drawEmoji('🔥', fx, fy, flameSize);
      }
    }

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

    // Wave indicator
    this.drawText(`Wave ${this.wave}/5`, this.width - 60, 30, 16, 'rgba(255,255,255,0.6)');
  }
}
