import { GameConfig, GameCallbacks } from './types';
import { BaseGame } from './engine';
import { playBounce, playScore, playDie, playPowerUp, playCollect, playWin, playLose } from './sounds';

interface Platform {
  x: number;
  y: number;
  w: number;
}

interface Enemy {
  x: number;
  y: number;
  startX: number;
  range: number;
  dir: number;
  speed: number;
  alive: boolean;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

export class PlatformerGame extends BaseGame {
  private heroX = 0;
  private heroY = 0;
  private heroVX = 0;
  private heroVY = 0;
  private heroSize = 32;
  private onGround = false;
  private canDoubleJump = false;
  private usedDoubleJump = false;

  private cameraX = 0;
  private platforms: Platform[] = [];
  private enemies: Enemy[] = [];
  private coins: Coin[] = [];
  private flagX = 0;
  private flagY = 0;
  private levelWidth = 0;

  private gravity = 900;
  private jumpForce = -420;
  private moveSpeed = 250;
  private totalCoins = 0;
  private collectedCoins = 0;
  private groundY = 0;
  private invulnTimer = 0;

  constructor(canvas: HTMLCanvasElement, config: GameConfig, callbacks: GameCallbacks) {
    super(canvas, config, callbacks);
  }

  getInstructions(): string {
    return '⬅️➡️ Move  |  ⬆️/Space Jump  |  🅿️ Power (Double Jump)';
  }

  setup() {
    this.lives = 3;
    this.setLives(3);
    this.setScore(0);
    this.collectedCoins = 0;
    this.generateLevel();
    this.heroX = 80;
    this.heroY = this.groundY - this.heroSize;
    this.heroVX = 0;
    this.heroVY = 0;
    this.cameraX = 0;
  }

  private generateLevel() {
    this.platforms = [];
    this.enemies = [];
    this.coins = [];
    this.groundY = this.height - 60;
    this.levelWidth = this.width * 6;

    // Ground platform
    this.platforms.push({ x: 0, y: this.groundY, w: this.levelWidth + 200 });

    // Generate floating platforms
    let px = 200;
    while (px < this.levelWidth - 200) {
      const pw = 80 + Math.random() * 120;
      const py = this.groundY - 80 - Math.random() * (this.height * 0.45);
      this.platforms.push({ x: px, y: py, w: pw });

      // Maybe add enemy on platform
      if (Math.random() < 0.4 && px > 300) {
        this.enemies.push({
          x: px + pw / 2,
          y: py - 28,
          startX: px + 20,
          range: pw - 40,
          dir: 1,
          speed: 60 + Math.random() * 60,
          alive: true,
        });
      }

      // Coins above platform
      const coinCount = 1 + Math.floor(Math.random() * 3);
      for (let c = 0; c < coinCount; c++) {
        this.coins.push({
          x: px + (c + 0.5) * (pw / coinCount),
          y: py - 45 - Math.random() * 30,
          collected: false,
        });
      }

      px += pw + 100 + Math.random() * 150;
    }

    // Coins along the ground
    for (let gx = 150; gx < this.levelWidth - 200; gx += 120 + Math.random() * 100) {
      this.coins.push({
        x: gx,
        y: this.groundY - 55,
        collected: false,
      });
    }

    // Enemies on ground
    for (let ex = 400; ex < this.levelWidth - 300; ex += 350 + Math.random() * 300) {
      this.enemies.push({
        x: ex,
        y: this.groundY - 28,
        startX: ex - 60,
        range: 120,
        dir: Math.random() < 0.5 ? 1 : -1,
        speed: 50 + Math.random() * 50,
        alive: true,
      });
    }

    this.totalCoins = this.coins.length;

    // Flag at end
    this.flagX = this.levelWidth - 150;
    this.flagY = this.groundY - 80;
  }

  update(dt: number) {
    // Horizontal movement
    let moveDir = 0;
    if (this.keyDown('arrowleft') || this.keyDown('a')) moveDir = -1;
    if (this.keyDown('arrowright') || this.keyDown('d')) moveDir = 1;

    // Touch
    if (this.touchActive) {
      if (this.touchX < this.width * 0.3) moveDir = -1;
      else if (this.touchX > this.width * 0.7) moveDir = 1;
    }

    const spd = this.powerActive ? this.moveSpeed * 1.4 : this.moveSpeed;
    this.heroVX = moveDir * spd;

    // Jump
    const wantJump = this.keyJustPressed('arrowup') || this.keyJustPressed('w') || this.keyJustPressed(' ');
    const touchJump = this.touchActive && this.touchY < this.height * 0.4;

    if ((wantJump || touchJump) && this.onGround) {
      this.heroVY = this.jumpForce;
      this.onGround = false;
      this.usedDoubleJump = false;
      playBounce();
    } else if (wantJump && !this.onGround && !this.usedDoubleJump && (this.canDoubleJump || this.powerActive)) {
      this.heroVY = this.jumpForce * 0.85;
      this.usedDoubleJump = true;
      playBounce();
      this.addParticles(this.heroX, this.heroY + this.heroSize, '💨', 3, 80);
    }

    // Power
    if (this.keyJustPressed('p')) {
      if (this.activatePower()) {
        this.canDoubleJump = true;
        playPowerUp();
        this.callbacks.onMessage(`${this.config.heroName} activated ${this.config.specialPower}!`);
      }
    }
    if (!this.powerActive) {
      this.canDoubleJump = false;
    }

    // Gravity
    this.heroVY += this.gravity * dt;

    // Move
    this.heroX += this.heroVX * dt;
    this.heroY += this.heroVY * dt;

    // Platform collision
    this.onGround = false;
    const heroBottom = this.heroY + this.heroSize;
    const heroLeft = this.heroX - this.heroSize / 2;
    const heroRight = this.heroX + this.heroSize / 2;

    for (const p of this.platforms) {
      // Landing on top
      if (
        heroBottom >= p.y &&
        heroBottom <= p.y + 20 &&
        this.heroVY >= 0 &&
        heroRight > p.x &&
        heroLeft < p.x + p.w
      ) {
        this.heroY = p.y - this.heroSize;
        this.heroVY = 0;
        this.onGround = true;
        this.usedDoubleJump = false;
      }
    }

    // World bounds
    if (this.heroX < this.heroSize / 2) this.heroX = this.heroSize / 2;
    if (this.heroX > this.levelWidth) this.heroX = this.levelWidth;

    // Fall off screen
    if (this.heroY > this.height + 50) {
      this.loseLife();
      return;
    }

    // Camera
    const targetCamX = this.heroX - this.width * 0.35;
    this.cameraX += (targetCamX - this.cameraX) * 4 * dt;
    this.cameraX = Math.max(0, Math.min(this.levelWidth - this.width, this.cameraX));

    // Enemy update
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.x += e.dir * e.speed * dt;
      if (e.x > e.startX + e.range) { e.dir = -1; }
      if (e.x < e.startX) { e.dir = 1; }
    }

    // Enemy collision
    this.invulnTimer -= dt;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const ex = e.x;
      const ey = e.y;
      const es = 24;

      if (this.collides(
        heroLeft, this.heroY, this.heroSize, this.heroSize,
        ex - es / 2, ey - es / 2, es, es
      )) {
        // Stomp from above
        if (this.heroVY > 0 && this.heroY + this.heroSize < ey + es / 2) {
          e.alive = false;
          this.heroVY = this.jumpForce * 0.7;
          this.addScore(100);
          playScore();
          this.addParticles(ex, ey, this.config.villainEmoji, 5, 150);
          this.callbacks.onMessage(`${this.config.heroName} squashed ${this.config.villainName}!`);
        } else if (this.invulnTimer <= 0) {
          this.loseLife();
          return;
        }
      }
    }

    // Coin collection
    for (const c of this.coins) {
      if (c.collected) continue;
      const dist = Math.sqrt((this.heroX - c.x) ** 2 + (this.heroY + this.heroSize / 2 - c.y) ** 2);
      if (dist < 30) {
        c.collected = true;
        this.collectedCoins++;
        this.addScore(50);
        playCollect();
        this.addParticles(c.x, c.y, this.config.collectibleEmoji, 4, 80);
      }
    }

    // Flag/win condition
    const distToFlag = Math.abs(this.heroX - this.flagX);
    if (distToFlag < 40 && this.heroY + this.heroSize >= this.flagY) {
      playWin();
      this.addScore(500);
      this.endGame(true);
      this.addParticles(this.flagX, this.flagY, '🎉', 12, 200);
    }
  }

  private loseLife() {
    this.lives--;
    this.setLives(this.lives);
    this.shake(0.4);
    playDie();
    this.addParticles(this.heroX, this.heroY, '💥', 8, 200);

    if (this.lives <= 0) {
      playLose();
      this.endGame(false);
    } else {
      // Respawn
      this.heroX = Math.max(80, this.heroX - 200);
      this.heroY = this.groundY - this.heroSize - 50;
      this.heroVX = 0;
      this.heroVY = 0;
      this.invulnTimer = 2;
      this.callbacks.onMessage(`Ouch! ${this.lives} lives left!`);
    }
  }

  render() {
    this.ctx.save();
    this.ctx.translate(-this.cameraX, 0);

    // Draw platforms
    for (const p of this.platforms) {
      if (p.x + p.w < this.cameraX - 50 || p.x > this.cameraX + this.width + 50) continue;

      // Platform surface
      this.ctx.fillStyle = 'rgba(255,255,255,0.12)';
      this.ctx.beginPath();
      this.ctx.roundRect(p.x, p.y, p.w, 16, 6);
      this.ctx.fill();

      // Platform top highlight
      this.ctx.fillStyle = 'rgba(255,255,255,0.25)';
      this.ctx.fillRect(p.x + 4, p.y, p.w - 8, 4);
    }

    // Draw coins
    for (const c of this.coins) {
      if (c.collected) continue;
      if (c.x < this.cameraX - 50 || c.x > this.cameraX + this.width + 50) continue;
      const bobY = Math.sin(this.frame * 0.08 + c.x * 0.1) * 6;
      this.drawEmoji(this.config.collectibleEmoji, c.x, c.y + bobY, 22);
    }

    // Draw enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.x < this.cameraX - 50 || e.x > this.cameraX + this.width + 50) continue;
      this.ctx.save();
      this.ctx.translate(e.x, e.y);
      if (e.dir < 0) this.ctx.scale(-1, 1);
      this.drawEmoji(this.config.villainEmoji, 0, 0, 28);
      this.ctx.restore();
    }

    // Draw flag
    this.drawEmoji('🏁', this.flagX, this.flagY, 40);
    // Flag pole
    this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(this.flagX, this.flagY - 20);
    this.ctx.lineTo(this.flagX, this.groundY);
    this.ctx.stroke();

    // Draw hero
    const blink = this.invulnTimer > 0 && Math.floor(this.invulnTimer * 8) % 2 === 0;
    if (!blink) {
      const heroDrawX = this.heroX;
      const heroDrawY = this.heroY + this.heroSize / 2;
      this.ctx.save();
      this.ctx.translate(heroDrawX, heroDrawY);
      if (this.heroVX < -1) this.ctx.scale(-1, 1);
      this.drawEmoji(this.config.heroEmoji, 0, 0, this.heroSize);
      this.ctx.restore();

      // Power glow
      if (this.powerActive) {
        this.ctx.shadowColor = '#ffdd00';
        this.ctx.shadowBlur = 20;
        this.drawEmoji('✨', heroDrawX, heroDrawY - 20, 14);
        this.ctx.shadowBlur = 0;
      }
    }

    this.ctx.restore();

    // HUD - coin count
    this.drawText(
      `${this.config.collectibleEmoji} ${this.collectedCoins}/${this.totalCoins}`,
      this.width - 80,
      30,
      18,
      '#ffffff'
    );

    // Progress bar
    const progress = Math.min(1, this.heroX / this.levelWidth);
    this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this.ctx.fillRect(this.width / 2 - 80, 14, 160, 8);
    this.ctx.fillStyle = '#44ff88';
    this.ctx.fillRect(this.width / 2 - 80, 14, 160 * progress, 8);
    this.drawEmoji('🏁', this.width / 2 + 80 + 10, 18, 14);

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
