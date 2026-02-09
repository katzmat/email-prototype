import { GameConfig, GameCallbacks } from './types';
import { BaseGame } from './engine';
import { playBounce, playScore, playDie, playPowerUp, playWin, playLose } from './sounds';

export class PongGame extends BaseGame {
  private ballX = 0;
  private ballY = 0;
  private ballVX = 0;
  private ballVY = 0;
  private ballSpeed = 0;
  private ballRadius = 12;

  private paddleW = 16;
  private paddleH = 100;
  private playerY = 0;
  private aiY = 0;
  private playerSpeed = 400;
  private aiSpeed = 250;
  private aiReaction = 0;

  private playerScore = 0;
  private aiScore = 0;
  private winScore = 7;
  private serveTimer = 0;
  private serving = true;
  private rallyCount = 0;

  constructor(canvas: HTMLCanvasElement, config: GameConfig, callbacks: GameCallbacks) {
    super(canvas, config, callbacks);
  }

  getInstructions(): string {
    return '⬆️⬇️ Move Paddle  |  🅿️ Special Power';
  }

  setup() {
    this.playerScore = 0;
    this.aiScore = 0;
    this.setScore(0);
    this.setLives(this.winScore);
    this.playerY = this.height / 2;
    this.aiY = this.height / 2;
    this.serve(1);
  }

  private serve(direction: number) {
    this.ballX = this.width / 2;
    this.ballY = this.height / 2;
    this.ballSpeed = Math.min(this.width, this.height) * 0.5;
    const angle = (Math.random() - 0.5) * Math.PI * 0.5;
    this.ballVX = Math.cos(angle) * direction;
    this.ballVY = Math.sin(angle);
    this.serving = true;
    this.serveTimer = 1;
    this.rallyCount = 0;
  }

  update(dt: number) {
    const paddleMargin = 40;
    this.paddleH = Math.max(60, this.height * 0.15);
    this.ballRadius = Math.max(10, this.width * 0.015);

    // Serve countdown
    if (this.serving) {
      this.serveTimer -= dt;
      if (this.serveTimer <= 0) {
        this.serving = false;
      }
      return;
    }

    // Player input
    if (this.keyDown('arrowup') || this.keyDown('w')) {
      this.playerY -= this.playerSpeed * dt;
    }
    if (this.keyDown('arrowdown') || this.keyDown('s')) {
      this.playerY += this.playerSpeed * dt;
    }

    // Touch input
    if (this.touchActive) {
      const targetY = this.touchY;
      const diff = targetY - this.playerY;
      this.playerY += Math.sign(diff) * Math.min(Math.abs(diff), this.playerSpeed * dt * 1.5);
    }

    // Clamp player
    this.playerY = Math.max(this.paddleH / 2, Math.min(this.height - this.paddleH / 2, this.playerY));

    // Power: bigger paddle
    const activePaddleH = this.powerActive ? this.paddleH * 1.8 : this.paddleH;

    // Special power
    if (this.keyJustPressed('p') || this.keyJustPressed(' ')) {
      if (this.activatePower()) {
        playPowerUp();
        this.callbacks.onMessage(`${this.config.heroName} activated ${this.config.specialPower}!`);
      }
    }

    // AI movement
    const aiTarget = this.ballY + (this.ballVY * (this.width - this.ballX) / Math.max(Math.abs(this.ballVX), 1)) * 0.3;
    const aiDiff = aiTarget - this.aiY;
    const currentAiSpeed = this.aiSpeed + this.rallyCount * 5;
    this.aiY += Math.sign(aiDiff) * Math.min(Math.abs(aiDiff), currentAiSpeed * dt);
    this.aiY = Math.max(this.paddleH / 2, Math.min(this.height - this.paddleH / 2, this.aiY));

    // Ball movement
    const speed = this.ballSpeed + this.rallyCount * 15;
    this.ballX += this.ballVX * speed * dt;
    this.ballY += this.ballVY * speed * dt;

    // Top/bottom bounce
    if (this.ballY - this.ballRadius < 0) {
      this.ballY = this.ballRadius;
      this.ballVY = Math.abs(this.ballVY);
      playBounce();
    }
    if (this.ballY + this.ballRadius > this.height) {
      this.ballY = this.height - this.ballRadius;
      this.ballVY = -Math.abs(this.ballVY);
      playBounce();
    }

    // Player paddle collision
    if (
      this.ballX - this.ballRadius < paddleMargin + this.paddleW &&
      this.ballX + this.ballRadius > paddleMargin &&
      this.ballY > this.playerY - activePaddleH / 2 &&
      this.ballY < this.playerY + activePaddleH / 2 &&
      this.ballVX < 0
    ) {
      const hitPos = (this.ballY - this.playerY) / (activePaddleH / 2);
      const angle = hitPos * Math.PI * 0.35;
      this.ballVX = Math.cos(angle);
      this.ballVY = Math.sin(angle);
      this.ballX = paddleMargin + this.paddleW + this.ballRadius;
      this.rallyCount++;
      playBounce();
      this.addParticles(this.ballX, this.ballY, this.config.collectibleEmoji, 3, 100);
    }

    // AI paddle collision
    if (
      this.ballX + this.ballRadius > this.width - paddleMargin - this.paddleW &&
      this.ballX - this.ballRadius < this.width - paddleMargin &&
      this.ballY > this.aiY - this.paddleH / 2 &&
      this.ballY < this.aiY + this.paddleH / 2 &&
      this.ballVX > 0
    ) {
      const hitPos = (this.ballY - this.aiY) / (this.paddleH / 2);
      const angle = Math.PI + hitPos * Math.PI * 0.35;
      this.ballVX = Math.cos(angle);
      this.ballVY = Math.sin(angle);
      this.ballX = this.width - paddleMargin - this.paddleW - this.ballRadius;
      this.rallyCount++;
      playBounce();
    }

    // Scoring
    if (this.ballX < -this.ballRadius * 2) {
      this.aiScore++;
      this.shake(0.3);
      playDie();
      this.setLives(this.winScore - this.aiScore);
      this.callbacks.onMessage(`${this.config.villainName} scores! ${this.playerScore} - ${this.aiScore}`);
      if (this.aiScore >= this.winScore) {
        playLose();
        this.setScore(this.playerScore);
        this.endGame(false);
      } else {
        this.serve(1);
      }
    }

    if (this.ballX > this.width + this.ballRadius * 2) {
      this.playerScore++;
      playScore();
      this.setScore(this.playerScore);
      this.addParticles(this.width - 50, this.ballY, this.config.collectibleEmoji, 8, 200);
      this.callbacks.onMessage(`${this.config.heroName} scores! ${this.playerScore} - ${this.aiScore}`);
      if (this.playerScore >= this.winScore) {
        playWin();
        this.endGame(true);
      } else {
        this.serve(-1);
      }
    }
  }

  render() {
    const paddleMargin = 40;
    const activePaddleH = this.powerActive ? this.paddleH * 1.8 : this.paddleH;

    // Center line
    this.ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([10, 15]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.width / 2, 0);
    this.ctx.lineTo(this.width / 2, this.height);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Score display
    this.drawText(
      `${this.playerScore}`,
      this.width / 2 - 60,
      50,
      48,
      'rgba(255,255,255,0.4)'
    );
    this.drawText(
      `${this.aiScore}`,
      this.width / 2 + 60,
      50,
      48,
      'rgba(255,255,255,0.4)'
    );

    // Player paddle
    const playerPaddleTop = this.playerY - activePaddleH / 2;
    this.ctx.fillStyle = this.powerActive ? '#ffdd00' : '#4488ff';
    this.ctx.shadowColor = this.powerActive ? '#ffdd00' : '#4488ff';
    this.ctx.shadowBlur = 15;
    this.ctx.beginPath();
    this.ctx.roundRect(paddleMargin, playerPaddleTop, this.paddleW, activePaddleH, 8);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    // Hero emoji on paddle
    this.drawEmoji(this.config.heroEmoji, paddleMargin + this.paddleW / 2, this.playerY, 28);

    // AI paddle
    const aiPaddleTop = this.aiY - this.paddleH / 2;
    this.ctx.fillStyle = '#ff4444';
    this.ctx.shadowColor = '#ff4444';
    this.ctx.shadowBlur = 15;
    this.ctx.beginPath();
    this.ctx.roundRect(this.width - paddleMargin - this.paddleW, aiPaddleTop, this.paddleW, this.paddleH, 8);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    // Villain emoji on paddle
    this.drawEmoji(this.config.villainEmoji, this.width - paddleMargin - this.paddleW / 2, this.aiY, 28);

    // Ball
    if (!this.serving || Math.floor(this.serveTimer * 4) % 2 === 0) {
      this.ctx.shadowColor = '#ffffff';
      this.ctx.shadowBlur = 10;
      this.drawEmoji(this.config.projectileEmoji, this.ballX, this.ballY, this.ballRadius * 2);
      this.ctx.shadowBlur = 0;
    }

    // Serve countdown
    if (this.serving) {
      this.drawText(
        Math.ceil(this.serveTimer).toString(),
        this.width / 2,
        this.height / 2 - 50,
        64,
        '#ffffff'
      );
    }

    // Power cooldown indicator
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
