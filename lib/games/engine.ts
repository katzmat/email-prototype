import { GameConfig, GameCallbacks, WORLD_OPTIONS, WorldType } from './types';

export interface Particle {
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export abstract class BaseGame {
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected config: GameConfig;
  protected callbacks: GameCallbacks;
  protected width: number = 800;
  protected height: number = 600;
  protected keys: Set<string> = new Set();
  protected justPressed: Set<string> = new Set();
  protected score: number = 0;
  protected lives: number = 3;
  protected isRunning: boolean = false;
  protected isGameOver: boolean = false;
  protected frame: number = 0;
  protected particles: Particle[] = [];
  protected lastTime: number = 0;
  protected powerActive: boolean = false;
  protected powerTimer: number = 0;
  protected powerCooldown: number = 0;
  protected shakeTimer: number = 0;
  protected touchX: number = -1;
  protected touchY: number = -1;
  protected touchActive: boolean = false;

  private animFrame: number = 0;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;
  private boundResize: () => void;
  private prevKeys: Set<string> = new Set();

  constructor(canvas: HTMLCanvasElement, config: GameConfig, callbacks: GameCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
    this.callbacks = callbacks;

    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    this.boundTouchStart = this.onTouchStart.bind(this);
    this.boundTouchMove = this.onTouchMove.bind(this);
    this.boundTouchEnd = this.onTouchEnd.bind(this);
    this.boundResize = this.onResize.bind(this);
  }

  abstract setup(): void;
  abstract update(dt: number): void;
  abstract render(): void;
  abstract getInstructions(): string;

  start() {
    this.setupInput();
    this.onResize();
    window.addEventListener('resize', this.boundResize);
    this.setup();
    this.isRunning = true;
    this.isGameOver = false;
    this.lastTime = performance.now();
    this.callbacks.onScore(this.score);
    this.callbacks.onLives(this.lives);
    this.gameLoop(this.lastTime);
  }

  stop() {
    this.isRunning = false;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = 0;
    }
  }

  cleanup() {
    this.stop();
    this.cleanupInput();
    window.removeEventListener('resize', this.boundResize);
  }

  private gameLoop(timestamp: number) {
    if (!this.isRunning) return;

    const rawDt = (timestamp - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05); // cap at 50ms to prevent tunneling
    this.lastTime = timestamp;

    // Track just-pressed keys
    this.justPressed.clear();
    this.keys.forEach(key => {
      if (!this.prevKeys.has(key)) {
        this.justPressed.add(key);
      }
    });
    this.prevKeys = new Set(Array.from(this.keys));

    if (!this.isGameOver) {
      this.update(dt);

      // Power timer
      if (this.powerActive) {
        this.powerTimer -= dt;
        if (this.powerTimer <= 0) {
          this.powerActive = false;
          this.powerTimer = 0;
        }
      }
      if (this.powerCooldown > 0) {
        this.powerCooldown -= dt;
      }

      // Shake timer
      if (this.shakeTimer > 0) {
        this.shakeTimer -= dt;
      }
    }

    // Update particles
    this.updateParticles(dt);

    // Render
    this.ctx.save();
    if (this.shakeTimer > 0) {
      const intensity = this.shakeTimer * 15;
      this.ctx.translate(
        (Math.random() - 0.5) * intensity,
        (Math.random() - 0.5) * intensity
      );
    }
    this.drawBackground();
    this.render();
    this.renderParticles();
    this.ctx.restore();

    this.frame++;
    this.animFrame = requestAnimationFrame(this.gameLoop.bind(this));
  }

  protected drawEmoji(emoji: string, x: number, y: number, size: number) {
    this.ctx.font = `${size}px serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(emoji, x, y);
  }

  protected drawText(text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'center') {
    this.ctx.font = `bold ${size}px "Segoe UI", Arial, sans-serif`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.fillText(text, x + 2, y + 2);
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
  }

  protected drawBackground() {
    const world = WORLD_OPTIONS.find(w => w.type === this.config.worldType) || WORLD_OPTIONS[0];
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, world.bgColor1);
    gradient.addColorStop(1, world.bgColor2);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Ambient particles based on world
    const seed = this.frame * 0.01;
    for (let i = 0; i < 15; i++) {
      const emoji = world.particleEmojis[i % world.particleEmojis.length];
      const x = ((Math.sin(seed + i * 7.3) + 1) / 2) * this.width;
      const y = ((Math.cos(seed + i * 4.1) + 1) / 2) * this.height;
      this.ctx.globalAlpha = 0.15;
      this.drawEmoji(emoji, x, y, 16);
      this.ctx.globalAlpha = 1;
    }
  }

  protected collides(
    ax: number, ay: number, aw: number, ah: number,
    bx: number, by: number, bw: number, bh: number
  ): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  protected collidesCircle(
    ax: number, ay: number, ar: number,
    bx: number, by: number, br: number
  ): boolean {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy < (ar + br) * (ar + br);
  }

  protected addParticles(x: number, y: number, emoji: string, count: number, speed = 150) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const spd = speed * (0.5 + Math.random() * 0.5);
      this.particles.push({
        emoji,
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        size: 12 + Math.random() * 12,
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt; // gravity
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private renderParticles() {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      this.ctx.globalAlpha = alpha;
      this.drawEmoji(p.emoji, p.x, p.y, p.size);
    }
    this.ctx.globalAlpha = 1;
  }

  protected setScore(s: number) {
    this.score = s;
    this.callbacks.onScore(s);
  }

  protected addScore(amount: number) {
    this.score += amount;
    this.callbacks.onScore(this.score);
  }

  protected setLives(l: number) {
    this.lives = l;
    this.callbacks.onLives(l);
  }

  protected endGame(won: boolean) {
    this.isGameOver = true;
    this.callbacks.onGameOver(won, this.score);
  }

  protected activatePower() {
    if (this.powerCooldown > 0 || this.powerActive) return false;
    this.powerActive = true;
    this.powerTimer = 5;
    this.powerCooldown = 15;
    return true;
  }

  protected shake(duration = 0.2) {
    this.shakeTimer = duration;
  }

  private onResize() {
    const parent = this.canvas.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      this.width = rect.width;
      this.height = rect.height;
    }
  }

  private setupInput() {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.boundTouchEnd, { passive: false });
  }

  private cleanupInput() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    this.canvas.removeEventListener('touchstart', this.boundTouchStart);
    this.canvas.removeEventListener('touchmove', this.boundTouchMove);
    this.canvas.removeEventListener('touchend', this.boundTouchEnd);
  }

  private onKeyDown(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    this.keys.add(key);
    // Prevent scrolling with arrow keys and space
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase()) ||
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.key.toLowerCase());
  }

  private onTouchStart(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.touchX = touch.clientX - rect.left;
    this.touchY = touch.clientY - rect.top;
    this.touchActive = true;
  }

  private onTouchMove(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.touchX = touch.clientX - rect.left;
    this.touchY = touch.clientY - rect.top;
  }

  private onTouchEnd(e: TouchEvent) {
    e.preventDefault();
    this.touchActive = false;
    this.touchX = -1;
    this.touchY = -1;
  }

  protected keyDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  protected keyJustPressed(key: string): boolean {
    return this.justPressed.has(key.toLowerCase());
  }
}
