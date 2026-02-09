import { GameConfig, GameCallbacks } from './types';
import { BaseGame } from './engine';
import { playBounce, playScore, playDie, playPowerUp, playCollect, playWin, playLose } from './sounds';

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
  color: string;
  hits: number;
  hasVillain: boolean;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface FallingItem {
  x: number;
  y: number;
  vy: number;
  type: 'collect' | 'multiball' | 'wide';
}

export class BreakoutGame extends BaseGame {
  private paddleX = 0;
  private paddleW = 100;
  private paddleH = 14;
  private paddleSpeed = 450;

  private balls: Ball[] = [];
  private ballSpeed = 350;

  private blocks: Block[] = [];
  private fallingItems: FallingItem[] = [];
  private totalBlocks = 0;

  private launched = false;
  private mouseX = -1;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseClick: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement, config: GameConfig, callbacks: GameCallbacks) {
    super(canvas, config, callbacks);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseClick = this.onMouseClick.bind(this);
  }

  getInstructions(): string {
    return '⬅️➡️/Mouse Move  |  Space Launch  |  🅿️ Power (Multi-Ball)';
  }

  setup() {
    this.lives = 3;
    this.setLives(3);
    this.setScore(0);
    this.launched = false;
    this.balls = [];
    this.fallingItems = [];

    this.paddleW = Math.max(80, this.width * 0.12);
    this.paddleX = this.width / 2;

    this.generateBlocks();
    this.resetBall();

    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('click', this.boundMouseClick);
  }

  private onMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
  }

  private onMouseClick() {
    if (!this.launched) {
      this.launchBall();
    }
  }

  cleanup() {
    super.cleanup();
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('click', this.boundMouseClick);
  }

  private generateBlocks() {
    this.blocks = [];
    const cols = Math.floor((this.width - 40) / 55);
    const rows = 5;
    const blockW = (this.width - 40) / cols;
    const blockH = 24;
    const startY = 50;
    const colors = ['#ff4466', '#ff8844', '#ffcc44', '#44cc88', '#4488ff'];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const hasVillain = Math.random() < 0.3;
        this.blocks.push({
          x: 20 + col * blockW,
          y: startY + row * (blockH + 4),
          w: blockW - 3,
          h: blockH,
          alive: true,
          color: colors[row % colors.length],
          hits: row < 2 ? 2 : 1,
          hasVillain,
        });
      }
    }
    this.totalBlocks = this.blocks.length;
  }

  private resetBall() {
    this.balls = [{
      x: this.paddleX,
      y: this.height - 60,
      vx: 0,
      vy: 0,
      radius: 8,
    }];
    this.launched = false;
  }

  private launchBall() {
    if (this.launched) return;
    this.launched = true;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    this.balls[0].vx = Math.cos(angle) * this.ballSpeed;
    this.balls[0].vy = Math.sin(angle) * this.ballSpeed;
    playBounce();
  }

  update(dt: number) {
    const paddleY = this.height - 45;

    // Paddle movement
    if (this.mouseX >= 0) {
      const diff = this.mouseX - this.paddleX;
      this.paddleX += diff * 8 * dt;
    }

    if (this.touchActive) {
      const diff = this.touchX - this.paddleX;
      this.paddleX += diff * 8 * dt;
    }

    if (this.keyDown('arrowleft') || this.keyDown('a')) {
      this.paddleX -= this.paddleSpeed * dt;
    }
    if (this.keyDown('arrowright') || this.keyDown('d')) {
      this.paddleX += this.paddleSpeed * dt;
    }

    const currentPaddleW = this.powerActive ? this.paddleW * 1.5 : this.paddleW;
    this.paddleX = Math.max(currentPaddleW / 2, Math.min(this.width - currentPaddleW / 2, this.paddleX));

    // Launch
    if (this.keyJustPressed(' ')) {
      if (!this.launched) {
        this.launchBall();
      }
    }

    // Power
    if (this.keyJustPressed('p')) {
      if (this.activatePower()) {
        // Multi-ball!
        const currentBalls = [...this.balls];
        for (const b of currentBalls) {
          if (b.vx === 0 && b.vy === 0) continue;
          this.balls.push({
            x: b.x,
            y: b.y,
            vx: b.vx * 0.7 + this.ballSpeed * 0.3,
            vy: b.vy,
            radius: b.radius,
          });
          this.balls.push({
            x: b.x,
            y: b.y,
            vx: b.vx * 0.7 - this.ballSpeed * 0.3,
            vy: b.vy,
            radius: b.radius,
          });
        }
        playPowerUp();
        this.callbacks.onMessage(`${this.config.heroName} activated ${this.config.specialPower}!`);
      }
    }

    // Ball on paddle before launch
    if (!this.launched && this.balls.length > 0) {
      this.balls[0].x = this.paddleX;
      this.balls[0].y = paddleY - this.paddleH / 2 - this.balls[0].radius;
      return;
    }

    // Update balls
    for (let bi = this.balls.length - 1; bi >= 0; bi--) {
      const ball = this.balls[bi];
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // Wall bounces
      if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = Math.abs(ball.vx);
        playBounce();
      }
      if (ball.x + ball.radius > this.width) {
        ball.x = this.width - ball.radius;
        ball.vx = -Math.abs(ball.vx);
        playBounce();
      }
      if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy = Math.abs(ball.vy);
        playBounce();
      }

      // Bottom - lose ball
      if (ball.y > this.height + 20) {
        this.balls.splice(bi, 1);
        continue;
      }

      // Paddle collision
      if (
        ball.vy > 0 &&
        ball.y + ball.radius >= paddleY - this.paddleH / 2 &&
        ball.y - ball.radius <= paddleY + this.paddleH / 2 &&
        ball.x >= this.paddleX - currentPaddleW / 2 - ball.radius &&
        ball.x <= this.paddleX + currentPaddleW / 2 + ball.radius
      ) {
        const hitPos = (ball.x - this.paddleX) / (currentPaddleW / 2);
        const angle = hitPos * Math.PI * 0.35 - Math.PI / 2;
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
        ball.y = paddleY - this.paddleH / 2 - ball.radius;
        playBounce();
      }

      // Block collision
      for (const block of this.blocks) {
        if (!block.alive) continue;

        if (this.collides(
          ball.x - ball.radius, ball.y - ball.radius, ball.radius * 2, ball.radius * 2,
          block.x, block.y, block.w, block.h
        )) {
          block.hits--;
          if (block.hits <= 0) {
            block.alive = false;
            const points = block.hasVillain ? 20 : 10;
            this.addScore(points);
            playScore();
            this.addParticles(
              block.x + block.w / 2,
              block.y + block.h / 2,
              block.hasVillain ? this.config.villainEmoji : '✨',
              4,
              120
            );

            // Maybe drop item
            if (Math.random() < 0.2) {
              const types: FallingItem['type'][] = ['collect', 'multiball', 'wide'];
              this.fallingItems.push({
                x: block.x + block.w / 2,
                y: block.y + block.h,
                vy: 120,
                type: types[Math.floor(Math.random() * types.length)],
              });
            }
          } else {
            playBounce();
          }

          // Determine bounce direction
          const ballCenterX = ball.x;
          const ballCenterY = ball.y;
          const blockCenterX = block.x + block.w / 2;
          const blockCenterY = block.y + block.h / 2;
          const dx = ballCenterX - blockCenterX;
          const dy = ballCenterY - blockCenterY;

          if (Math.abs(dx / block.w) > Math.abs(dy / block.h)) {
            ball.vx = Math.abs(ball.vx) * Math.sign(dx);
          } else {
            ball.vy = Math.abs(ball.vy) * Math.sign(dy);
          }
          break;
        }
      }
    }

    // All balls lost
    if (this.balls.length === 0) {
      this.lives--;
      this.setLives(this.lives);
      this.shake(0.3);
      playDie();

      if (this.lives <= 0) {
        playLose();
        this.endGame(false);
        return;
      }
      this.callbacks.onMessage(`Ball lost! ${this.lives} lives left`);
      this.resetBall();
    }

    // Falling items
    for (let i = this.fallingItems.length - 1; i >= 0; i--) {
      const item = this.fallingItems[i];
      item.y += item.vy * dt;

      if (item.y > this.height + 20) {
        this.fallingItems.splice(i, 1);
        continue;
      }

      // Catch with paddle
      if (
        item.y >= paddleY - 15 &&
        item.y <= paddleY + 15 &&
        item.x >= this.paddleX - currentPaddleW / 2 &&
        item.x <= this.paddleX + currentPaddleW / 2
      ) {
        this.fallingItems.splice(i, 1);
        playCollect();

        switch (item.type) {
          case 'collect':
            this.addScore(100);
            this.addParticles(item.x, item.y, this.config.collectibleEmoji, 6, 100);
            break;
          case 'multiball':
            if (this.balls.length > 0) {
              const b = this.balls[0];
              this.balls.push({
                x: b.x,
                y: b.y,
                vx: -b.vx,
                vy: b.vy,
                radius: b.radius,
              });
              this.addParticles(item.x, item.y, '🔴', 4, 100);
            }
            break;
          case 'wide':
            this.powerActive = true;
            this.powerTimer = Math.max(this.powerTimer, 8);
            this.addParticles(item.x, item.y, '⚡', 4, 100);
            break;
        }
      }
    }

    // Win condition
    const aliveBlocks = this.blocks.filter(b => b.alive).length;
    if (aliveBlocks === 0) {
      playWin();
      this.addScore(500);
      this.endGame(true);
      this.addParticles(this.width / 2, this.height / 2, '🎉', 15, 250);
    }
  }

  render() {
    const paddleY = this.height - 45;
    const currentPaddleW = this.powerActive ? this.paddleW * 1.5 : this.paddleW;

    // Draw blocks
    for (const block of this.blocks) {
      if (!block.alive) continue;

      this.ctx.fillStyle = block.hits > 1 ? block.color : block.color + 'aa';
      this.ctx.beginPath();
      this.ctx.roundRect(block.x, block.y, block.w, block.h, 4);
      this.ctx.fill();

      // Highlight
      this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
      this.ctx.fillRect(block.x + 2, block.y + 1, block.w - 4, 3);

      if (block.hasVillain) {
        this.drawEmoji(this.config.villainEmoji, block.x + block.w / 2, block.y + block.h / 2, 16);
      }
    }

    // Draw falling items
    for (const item of this.fallingItems) {
      const bobY = Math.sin(this.frame * 0.15) * 3;
      let emoji = this.config.collectibleEmoji;
      if (item.type === 'multiball') emoji = '🔴';
      if (item.type === 'wide') emoji = '⚡';
      this.drawEmoji(emoji, item.x, item.y + bobY, 20);
    }

    // Draw paddle
    this.ctx.fillStyle = this.powerActive ? '#ffdd00' : '#4488ff';
    this.ctx.shadowColor = this.powerActive ? '#ffdd00' : '#4488ff';
    this.ctx.shadowBlur = 12;
    this.ctx.beginPath();
    this.ctx.roundRect(
      this.paddleX - currentPaddleW / 2,
      paddleY - this.paddleH / 2,
      currentPaddleW,
      this.paddleH,
      7
    );
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    // Hero emoji on paddle
    this.drawEmoji(this.config.heroEmoji, this.paddleX, paddleY, 22);

    // Draw balls
    for (const ball of this.balls) {
      this.ctx.shadowColor = '#ffffff';
      this.ctx.shadowBlur = 8;
      this.drawEmoji(this.config.projectileEmoji, ball.x, ball.y, ball.radius * 2.5);
      this.ctx.shadowBlur = 0;

      // Trail
      if (ball.vx !== 0 || ball.vy !== 0) {
        this.ctx.globalAlpha = 0.3;
        this.drawEmoji(this.config.projectileEmoji, ball.x - ball.vx * 0.03, ball.y - ball.vy * 0.03, ball.radius * 2);
        this.ctx.globalAlpha = 1;
      }
    }

    // Block count
    const alive = this.blocks.filter(b => b.alive).length;
    this.drawText(
      `🧱 ${alive}/${this.totalBlocks}`,
      this.width - 70,
      30,
      14,
      'rgba(255,255,255,0.6)'
    );

    // Ball count
    if (this.balls.length > 1) {
      this.drawText(`🔴 x${this.balls.length}`, this.width - 70, 52, 13, '#ffffff');
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

    // Launch prompt
    if (!this.launched) {
      this.drawText('Click or press SPACE to launch!', this.width / 2, this.height / 2, 18, '#ffffff');
    }
  }
}
