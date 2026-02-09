let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function tone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.15) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playBounce() {
  tone(400, 0.08, 'square', 0.1);
}

export function playHit() {
  tone(300, 0.1, 'square', 0.12);
}

export function playScore() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  [523, 659, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, now + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.15);
  });
}

export function playDie() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  [400, 300, 200].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, now + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.2);
  });
}

export function playShoot() {
  tone(800, 0.06, 'square', 0.08);
  setTimeout(() => tone(600, 0.06, 'square', 0.06), 30);
}

export function playPowerUp() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  [400, 500, 600, 800, 1000].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, now + i * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.06);
    osc.stop(now + i * 0.06 + 0.12);
  });
}

export function playWin() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, now + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.15);
    osc.stop(now + i * 0.15 + 0.4);
  });
}

export function playLose() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  [400, 350, 300, 200, 150].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, now + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.15);
    osc.stop(now + i * 0.15 + 0.25);
  });
}

export function playCollect() {
  tone(800, 0.05, 'sine', 0.1);
  setTimeout(() => tone(1200, 0.08, 'sine', 0.1), 50);
}
