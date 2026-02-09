export type GameType = 'pong' | 'asteroids' | 'platformer' | 'runner' | 'invaders' | 'breakout';

export interface GameConfig {
  heroName: string;
  heroEmoji: string;
  villainName: string;
  villainEmoji: string;
  worldType: WorldType;
  collectibleEmoji: string;
  specialPower: string;
  projectileEmoji: string;
}

export type WorldType = 'space' | 'underwater' | 'candyland' | 'jungle' | 'volcano' | 'arctic';

export interface GameCallbacks {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onGameOver: (won: boolean, finalScore: number) => void;
  onMessage: (msg: string) => void;
}

export interface EmojiOption {
  emoji: string;
  label: string;
}

export const HERO_OPTIONS: EmojiOption[] = [
  { emoji: '🐶', label: 'Dog' },
  { emoji: '🐱', label: 'Cat' },
  { emoji: '🐉', label: 'Dragon' },
  { emoji: '🤖', label: 'Robot' },
  { emoji: '🍕', label: 'Pizza' },
  { emoji: '🦄', label: 'Unicorn' },
  { emoji: '🦖', label: 'Dinosaur' },
  { emoji: '🐧', label: 'Penguin' },
  { emoji: '🦸', label: 'Superhero' },
  { emoji: '🐸', label: 'Frog' },
  { emoji: '🦊', label: 'Fox' },
  { emoji: '🐙', label: 'Octopus' },
];

export const VILLAIN_OPTIONS: EmojiOption[] = [
  { emoji: '👻', label: 'Ghost' },
  { emoji: '👾', label: 'Alien' },
  { emoji: '🧟', label: 'Zombie' },
  { emoji: '💀', label: 'Skeleton' },
  { emoji: '🐍', label: 'Snake' },
  { emoji: '🦈', label: 'Shark' },
  { emoji: '🧙', label: 'Wizard' },
  { emoji: '🐛', label: 'Bug' },
  { emoji: '🤡', label: 'Clown' },
  { emoji: '💩', label: 'Poop' },
  { emoji: '🎃', label: 'Pumpkin' },
  { emoji: '🦇', label: 'Bat' },
];

export const COLLECTIBLE_OPTIONS: EmojiOption[] = [
  { emoji: '⭐', label: 'Stars' },
  { emoji: '💎', label: 'Diamonds' },
  { emoji: '🍪', label: 'Cookies' },
  { emoji: '❤️', label: 'Hearts' },
  { emoji: '🪙', label: 'Coins' },
  { emoji: '🍬', label: 'Candy' },
  { emoji: '👑', label: 'Crowns' },
  { emoji: '🌈', label: 'Rainbows' },
  { emoji: '🍕', label: 'Pizza' },
  { emoji: '🌮', label: 'Tacos' },
  { emoji: '🧁', label: 'Cupcakes' },
  { emoji: '🔮', label: 'Crystals' },
];

export const POWER_OPTIONS: EmojiOption[] = [
  { emoji: '⚡', label: 'Lightning Speed' },
  { emoji: '🔥', label: 'Fire Blast' },
  { emoji: '❄️', label: 'Freeze Time' },
  { emoji: '🛡️', label: 'Super Shield' },
  { emoji: '💪', label: 'Giant Mode' },
  { emoji: '🌀', label: 'Tornado Spin' },
];

export const PROJECTILE_OPTIONS: EmojiOption[] = [
  { emoji: '🔴', label: 'Energy Ball' },
  { emoji: '💫', label: 'Shooting Star' },
  { emoji: '🥏', label: 'Disc' },
  { emoji: '🧊', label: 'Ice Cube' },
  { emoji: '🔥', label: 'Fireball' },
  { emoji: '💜', label: 'Magic Orb' },
];

export interface WorldOption {
  type: WorldType;
  label: string;
  emoji: string;
  bgColor1: string;
  bgColor2: string;
  particleEmojis: string[];
}

export const WORLD_OPTIONS: WorldOption[] = [
  { type: 'space', label: 'Outer Space', emoji: '🚀', bgColor1: '#0a0a2e', bgColor2: '#1a1a4e', particleEmojis: ['✨', '💫', '⭐'] },
  { type: 'underwater', label: 'Deep Ocean', emoji: '🐠', bgColor1: '#003366', bgColor2: '#006699', particleEmojis: ['🫧', '🐚', '🪸'] },
  { type: 'candyland', label: 'Candy Land', emoji: '🍭', bgColor1: '#ff69b4', bgColor2: '#ff1493', particleEmojis: ['🍬', '🍭', '🧁'] },
  { type: 'jungle', label: 'Wild Jungle', emoji: '🌴', bgColor1: '#0d5e0d', bgColor2: '#1a8a1a', particleEmojis: ['🌿', '🍃', '🌺'] },
  { type: 'volcano', label: 'Lava World', emoji: '🌋', bgColor1: '#8b0000', bgColor2: '#cc3300', particleEmojis: ['🔥', '💥', '☄️'] },
  { type: 'arctic', label: 'Frozen Arctic', emoji: '🏔️', bgColor1: '#b0d4f1', bgColor2: '#e0f0ff', particleEmojis: ['❄️', '🌨️', '⛄'] },
];

export interface GameTemplate {
  type: GameType;
  name: string;
  emoji: string;
  description: string;
  tagline: string;
}

export const GAME_TEMPLATES: GameTemplate[] = [
  {
    type: 'pong',
    name: 'Paddle Battle',
    emoji: '🏓',
    description: 'A classic paddle-and-ball showdown! Bounce the ball past your opponent to score.',
    tagline: 'First to 7 wins!',
  },
  {
    type: 'asteroids',
    name: 'Space Blaster',
    emoji: '☄️',
    description: 'Pilot your ship through a field of floating baddies! Blast them before they get you.',
    tagline: 'Rotate, thrust, and shoot!',
  },
  {
    type: 'platformer',
    name: 'Jump Quest',
    emoji: '🏃',
    description: 'Run, jump, and explore! Hop on platforms, dodge enemies, and collect treasures.',
    tagline: 'Reach the finish flag!',
  },
  {
    type: 'runner',
    name: 'Endless Dash',
    emoji: '💨',
    description: 'Run as far as you can! Jump over obstacles and grab collectibles along the way.',
    tagline: 'How far can you go?',
  },
  {
    type: 'invaders',
    name: 'Invader Attack',
    emoji: '👾',
    description: 'Waves of baddies are descending! Blast them from below before they reach you.',
    tagline: 'Defend Earth!',
  },
  {
    type: 'breakout',
    name: 'Block Smasher',
    emoji: '🧱',
    description: 'Bounce a ball to smash blocks! Clear them all to win. Catch power-ups as they fall.',
    tagline: 'Smash every block!',
  },
];
