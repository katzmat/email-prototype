import { GameConfig, GameCallbacks } from './types';
import { BaseGame } from './engine';
import { playBounce, playDie, playPowerUp, playCollect, playLose } from './sounds';

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'ground' | 'air';
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

export class RunnerGame extends BaseGame {
  private heroX = 0;
  private heroY = 0;
  private heroVY = 0;
  private heroSize = 36;
  private ducking = false;
  private onGround = true;

  private scrollSpeed = 250;
  private maxSpeed = 600;
  private groundY = 0;
  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private distance = 0;
  private spawnTimer = 0;
  private coinSpawnTimer = 0;
  private groundTiles: number[] = [];
  private invulnTimer = 0;

  private gravity = 1400;
  private jumpForce = -550;

  constructor(canvas: HTMLCanvasElement, config: GameConfig, callbacks: GameCallbacks) {
    super(canvas, config, callbacks);
  }

  getInstructions(): string {
    return '⬆️/Space Jump  |  ⬇️ Duck  |  🅿️ Power (Invincible)';
  }

  setup() {
    this.lives = 1;
    this.setLives(1);
    this.setScore(0);
    this.distance = 0;
    this.scrollSpeed = 250;
    this.groundY = this.height - 80;
    this.heroX = this.width * 0.2;
    this.heroY = this.groundY - this.heroSize;
    this.heroVY = 0;
    this.onGround = true;
    this.ducking = false;
    this.obstacles = [];
    this.coins = [];
    this.spawnTimer = 1.5;
    this.coinSpawnTimer = 0.5;
    this.groundTiles = [];
    for (let i = 0; i < Math.ceil(this.width / 40) + 2; i++) {
      this.groundTiles.push(i * 40);
    }
  }

  update(dt: number) {
    // Speed increases over time
    this.scrollSpeed = Math.min(this.maxSpeed, 250 + this.distance * 0.05);

    // Jump
    const wantJump = this.keyJustPressed('arrowup') || this.keyJustPressed('w') || this.keyJustPressed(' ');
    const touchJump = this.touchActive && this.touchY < this.height * 0.5;

    if ((wantJump || touchJump) && this.onGround) {
      this.heroVY = this.jumpForce;
      this.onGround = false;
      playBounce();
    }

    // Duck
    this.ducking = this.keyDown('arrowdown') || this.keyDown('s') || (this.touchActive && this.touchY > this.height * 0.7);

    // Power
    if (this.keyJustPressed('p')) {
      if (this.activatePower()) {
        this.invulnTimer = 5;
        playPowerUp();
        this.callbacks.onMessage(`${this.config.heroName} activated ${this.config.specialPower}!`);
      }
    }

    // Gravity
    if (!this.onGround) {
      this.heroVY += this.gravity * dt;
      // Fast fall when ducking
      if (this.ducking && this.heroVY > 0) {
        this.heroVY += this.gravity * dt * 0.5;
      }
    }

    this.heroY += this.heroVY * dt;

    // Ground collision
    const heroH = this.ducking ? this.heroSize * 0.5 : this.heroSize;
    if (this.heroY + heroH >= this.groundY) {
      this.heroY = this.groundY - heroH;
      this.heroVY = 0;
      this.onGround = true;
    }

    // Distance/score
    this.distance += this.scrollSpeed * dt;
    this.setScore(Math.floor(this.distance / 10));

    // Spawn obstacles
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const minGap = Math.max(0.8, 2 - this.distance * 0.0002);
      this.spawnTimer = minGap + Math.random() * 1.5;

      if (Math.random() < 0.6) {
        // Ground obstacle
        const h = 30 + Math.random() * 30;
        this.obstacles.push({
          x: this.width + 50,
          y: this.groundY - h,
          w: 30 + Math.random() * 20,
          h,
          type: 'ground',
        });
      } else {
        // Air obstacle (duck under)
        this.obstacles.push({
          x: this.width + 50,
          y: this.groundY - this.heroSize * 0.7 - 20,
          w: 40 + Math.random() * 30,
          h: 25,
          type: 'air',
        });
      }
    }

    // Spawn coins
    this.coinSpawnTimer -= dt;
    if (this.coinSpawnTimer <= 0) {
      this.coinSpawnTimer = 0.8 + Math.random() * 1.2;
      const pattern = Math.random();
      if (pattern < 0.5) {
        // Arc of coins
        for (let i = 0; i < 3; i++) {
          this.coins.push({
            x: this.width + 50 + i * 45,
            y: this.groundY - 80 - Math.sin(i / 2 * Math.PI) * 50,
            collected: false,
          });
        }
      } else {
        // Line of coins
        const cy = this.groundY - 50 - Math.random() * 80;
        for (let i = 0; i < 4; i++) {
          this.coins.push({
            x: this.width + 50 + i * 35,
            y: cy,
            collected: false,
          });
        }
      }
    }

    // Move obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      this.obstacles[i].x -= this.scrollSpeed * dt;
      if (this.obstacles[i].x < -60) {
        this.obstacles.splice(i, 1);
      }
    }

    // Move coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      this.coins[i].x -= this.scrollSpeed * dt;
      if (this.coins[i].x < -30) {
        this.coins.splice(i, 1);
      }
    }

    // Collision with obstacles
    this.invulnTimer -= dt;
    const heroLeft = this.heroX - this.heroSize / 3;
    const heroRight = this.heroX + this.heroSize / 3;
    const heroTop = this.heroY;
    const heroBottom = this.heroY + heroH;

    for (const o of this.obstacles) {
      if (this.collides(
        heroLeft, heroTop, heroRight - heroLeft, heroBottom - heroTop,
        o.x, o.y, o.w, o.h
      )) {
        if (this.invulnTimer > 0 || this.powerActive) {
          // Destroy obstacle while powered
          this.addParticles(o.x, o.y, '💥', 5, 150);
          o.x = -100;
          this.addScore(50);
        } else {
          // Game over
          this.shake(0.5);
          playDie();
          playLose();
          this.addParticles(this.heroX, this.heroY, '💥', 10, 200);
          this.setLives(0);
          this.endGame(false);
          return;
        }
      }
    }

    // Coin collection
    for (const c of this.coins) {
      if (c.collected) continue;
      if (this.collidesCircle(this.heroX, this.heroY + heroH / 2, this.heroSize / 2, c.x, c.y, 15)) {
        c.collected = true;
        this.addScore(25);
        playCollect();
        this.addParticles(c.x, c.y, this.config.collectibleEmoji, 3, 80);
      }
    }

    // Move ground tiles
    for (let i = 0; i < this.groundTiles.length; i++) {
      this.groundTiles[i] -= this.scrollSpeed * dt;
      if (this.groundTiles[i] < -40) {
        this.groundTiles[i] += this.groundTiles.length * 40;
      }
    }
  }

  render() {
    // Ground
    this.ctx.fillStyle = 'rgba(255,255,255,0.08)';
    this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    // Ground line
    this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.stroke();

    // Ground details
    this.ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    for (const gx of this.groundTiles) {
      this.ctx.beginPath();
      this.ctx.moveTo(gx, this.groundY + 10);
      this.ctx.lineTo(gx + 20, this.groundY + 25);
      this.ctx.stroke();
    }

    // Draw coins
    for (const c of this.coins) {
      if (c.collected) continue;
      const bobY = Math.sin(this.frame * 0.1 + c.x * 0.05) * 4;
      this.drawEmoji(this.config.collectibleEmoji, c.x, c.y + bobY, 20);
    }

    // Draw obstacles
    for (const o of this.obstacles) {
      if (o.type === 'ground') {
        // Draw as villain emoji stack
        const count = Math.ceil(o.h / 30);
        for (let i = 0; i < count; i++) {
          this.drawEmoji(
            this.config.villainEmoji,
            o.x + o.w / 2,
            o.y + i * 30 + 15,
            28
          );
        }
      } else {
        // Air obstacle
        this.drawEmoji(this.config.villainEmoji, o.x + o.w / 2, o.y + o.h / 2, 30);
        // Warning line
        this.ctx.strokeStyle = 'rgba(255,100,100,0.2)';
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(o.x, o.y + o.h);
        this.ctx.lineTo(o.x + o.w, o.y + o.h);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    }

    // Draw hero
    const heroH = this.ducking ? this.heroSize * 0.5 : this.heroSize;
    const heroDrawY = this.heroY + heroH / 2;

    if (this.powerActive || this.invulnTimer > 0) {
      this.ctx.shadowColor = '#ffdd00';
      this.ctx.shadowBlur = 20;
    }

    this.ctx.save();
    this.ctx.translate(this.heroX, heroDrawY);
    if (this.ducking) {
      this.ctx.scale(1.2, 0.6);
    }
    // Lean forward slightly when running
    if (this.onGround && !this.ducking) {
      this.ctx.rotate(Math.sin(this.frame * 0.3) * 0.08);
    }
    this.drawEmoji(this.config.heroEmoji, 0, 0, this.heroSize);
    this.ctx.restore();
    this.ctx.shadowBlur = 0;

    // Running particles
    if (this.onGround && this.frame % 8 === 0) {
      this.addParticles(this.heroX - 15, this.groundY - 5, '💨', 1, 40);
    }

    // Speed indicator
    const speedPct = (this.scrollSpeed - 250) / (this.maxSpeed - 250);
    this.drawText(
      `💨 ${Math.floor(this.scrollSpeed / 10)} mph`,
      this.width - 80,
      30,
      14,
      speedPct > 0.7 ? '#ff4444' : '#ffffff'
    );

    // Distance
    this.drawText(
      `${Math.floor(this.distance)}m`,
      this.width / 2,
      30,
      20,
      '#ffffff'
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
