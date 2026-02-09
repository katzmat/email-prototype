'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  GameType,
  GameConfig,
  GameCallbacks,
  HERO_OPTIONS,
  VILLAIN_OPTIONS,
  COLLECTIBLE_OPTIONS,
  POWER_OPTIONS,
  PROJECTILE_OPTIONS,
  WORLD_OPTIONS,
  GAME_TEMPLATES,
  WorldType,
} from '@/lib/games/types';
import { BaseGame } from '@/lib/games/engine';
import { PongGame } from '@/lib/games/pong';
import { AsteroidsGame } from '@/lib/games/asteroids';
import { PlatformerGame } from '@/lib/games/platformer';
import { RunnerGame } from '@/lib/games/runner';
import { InvadersGame } from '@/lib/games/invaders';
import { BreakoutGame } from '@/lib/games/breakout';

type Screen = 'welcome' | 'pickGame' | 'customize' | 'playing';

const GAME_MAP: Record<GameType, new (canvas: HTMLCanvasElement, config: GameConfig, callbacks: GameCallbacks) => BaseGame> = {
  pong: PongGame,
  asteroids: AsteroidsGame,
  platformer: PlatformerGame,
  runner: RunnerGame,
  invaders: InvadersGame,
  breakout: BreakoutGame,
};

const SILLY_NAMES = [
  'Captain Noodle', 'Sir Farts-a-Lot', 'Princess Burp', 'Dr. Wiggles',
  'Baron Von Sneeze', 'Count Giggles', 'Lady Wobblebottom', 'Professor Bonkers',
  'Mayor McSquishy', 'King Doodleface', 'Chef Blobfish', 'Admiral Pickles',
  'Duke Bananahead', 'Queen Spaghetti', 'Captain Underpants', 'Dr. Stinkbug',
];

function randomName() {
  return SILLY_NAMES[Math.floor(Math.random() * SILLY_NAMES.length)];
}

function EmojiPicker({
  options,
  selected,
  onSelect,
  size = 'md',
}: {
  options: { emoji: string; label: string }[];
  selected: string;
  onSelect: (emoji: string) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {options.map((opt) => (
        <button
          key={opt.emoji}
          onClick={() => onSelect(opt.emoji)}
          className={`
            flex flex-col items-center rounded-xl transition-all duration-150
            ${size === 'sm' ? 'p-2 min-w-[56px]' : 'p-3 min-w-[72px]'}
            ${
              selected === opt.emoji
                ? 'bg-white/25 scale-110 ring-2 ring-yellow-300 shadow-lg'
                : 'bg-white/8 hover:bg-white/15 hover:scale-105'
            }
          `}
        >
          <span className={size === 'sm' ? 'text-2xl' : 'text-3xl'}>{opt.emoji}</span>
          <span className="text-[10px] text-white/70 mt-1">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function GameCreatorPage() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [selectedGame, setSelectedGame] = useState<GameType>('platformer');
  const [heroName, setHeroName] = useState(randomName());
  const [heroEmoji, setHeroEmoji] = useState('🦖');
  const [villainName, setVillainName] = useState(randomName());
  const [villainEmoji, setVillainEmoji] = useState('👻');
  const [worldType, setWorldType] = useState<WorldType>('space');
  const [collectibleEmoji, setCollectibleEmoji] = useState('⭐');
  const [specialPower, setSpecialPower] = useState('⚡');
  const [projectileEmoji, setProjectileEmoji] = useState('🔴');

  const [gameScore, setGameScore] = useState(0);
  const [gameLives, setGameLives] = useState(3);
  const [gameMessage, setGameMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<BaseGame | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const powerLabel = POWER_OPTIONS.find(p => p.emoji === specialPower)?.label || 'Super Power';

  const startGame = useCallback(() => {
    if (!canvasRef.current) return;

    const config: GameConfig = {
      heroName,
      heroEmoji,
      villainName,
      villainEmoji,
      worldType,
      collectibleEmoji,
      specialPower: powerLabel,
      projectileEmoji,
    };

    const callbacks: GameCallbacks = {
      onScore: (s) => setGameScore(s),
      onLives: (l) => setGameLives(l),
      onGameOver: (won, score) => {
        setGameOver(true);
        setGameWon(won);
        setFinalScore(score);
      },
      onMessage: (msg) => {
        setGameMessage(msg);
        if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
        messageTimerRef.current = setTimeout(() => setGameMessage(''), 3000);
      },
    };

    if (gameRef.current) {
      gameRef.current.cleanup();
    }

    const GameClass = GAME_MAP[selectedGame];
    const game = new GameClass(canvasRef.current, config, callbacks);
    gameRef.current = game;

    setGameScore(0);
    setGameLives(3);
    setGameOver(false);
    setGameWon(false);
    setGameMessage('');

    game.start();
  }, [heroName, heroEmoji, villainName, villainEmoji, worldType, collectibleEmoji, powerLabel, projectileEmoji, selectedGame]);

  useEffect(() => {
    if (screen === 'playing') {
      // Small delay to let canvas mount
      const timer = setTimeout(() => startGame(), 100);
      return () => clearTimeout(timer);
    } else {
      if (gameRef.current) {
        gameRef.current.cleanup();
        gameRef.current = null;
      }
    }
  }, [screen, startGame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameRef.current) {
        gameRef.current.cleanup();
      }
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, []);

  const randomizeAll = () => {
    setHeroName(randomName());
    setHeroEmoji(HERO_OPTIONS[Math.floor(Math.random() * HERO_OPTIONS.length)].emoji);
    setVillainName(randomName());
    setVillainEmoji(VILLAIN_OPTIONS[Math.floor(Math.random() * VILLAIN_OPTIONS.length)].emoji);
    setWorldType(WORLD_OPTIONS[Math.floor(Math.random() * WORLD_OPTIONS.length)].type);
    setCollectibleEmoji(COLLECTIBLE_OPTIONS[Math.floor(Math.random() * COLLECTIBLE_OPTIONS.length)].emoji);
    setSpecialPower(POWER_OPTIONS[Math.floor(Math.random() * POWER_OPTIONS.length)].emoji);
    setProjectileEmoji(PROJECTILE_OPTIONS[Math.floor(Math.random() * PROJECTILE_OPTIONS.length)].emoji);
  };

  // ─── WELCOME SCREEN ──────────────────────────────────
  if (screen === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          <div className="text-8xl mb-4 animate-bounce">🎮</div>
          <h1 className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-cyan-300 mb-4 leading-tight">
            GAME CREATOR
          </h1>
          <p className="text-xl text-white/80 mb-2">
            Build your own silly, wacky, totally bonkers game!
          </p>
          <p className="text-base text-white/50 mb-10">
            Pick a game style, fill in your goofy details, and play!
          </p>
          <button
            onClick={() => setScreen('pickGame')}
            className="
              px-12 py-5 text-2xl font-black rounded-2xl
              bg-gradient-to-r from-yellow-400 to-orange-500
              text-gray-900 shadow-xl shadow-orange-500/30
              hover:scale-110 hover:shadow-2xl hover:shadow-orange-500/40
              active:scale-95
              transition-all duration-200
            "
          >
            LET&apos;S GO!
          </button>
          <div className="mt-8 flex justify-center gap-4 text-4xl opacity-60">
            <span className="animate-pulse">🏓</span>
            <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>☄️</span>
            <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>🏃</span>
            <span className="animate-pulse" style={{ animationDelay: '0.6s' }}>💨</span>
            <span className="animate-pulse" style={{ animationDelay: '0.8s' }}>👾</span>
            <span className="animate-pulse" style={{ animationDelay: '1s' }}>🧱</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── PICK GAME SCREEN ─────────────────────────────────
  if (screen === 'pickGame') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setScreen('welcome')}
            className="text-white/50 hover:text-white/80 mb-4 text-sm transition-colors"
          >
            &larr; Back
          </button>
          <h1 className="text-3xl sm:text-5xl font-black text-center text-white mb-2">
            Pick Your Game!
          </h1>
          <p className="text-center text-white/60 mb-8">Choose the kind of game you want to build</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {GAME_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.type}
                onClick={() => {
                  setSelectedGame(tmpl.type);
                  setScreen('customize');
                }}
                className={`
                  p-6 rounded-2xl text-left transition-all duration-200
                  bg-white/8 hover:bg-white/15 hover:scale-[1.03] hover:shadow-xl
                  border-2 border-transparent hover:border-yellow-300/40
                  active:scale-95
                  group
                `}
              >
                <div className="text-5xl mb-3 group-hover:animate-bounce">{tmpl.emoji}</div>
                <h2 className="text-xl font-bold text-white mb-1">{tmpl.name}</h2>
                <p className="text-sm text-white/60 mb-2">{tmpl.description}</p>
                <p className="text-xs text-yellow-300/80 font-bold">{tmpl.tagline}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── CUSTOMIZE SCREEN ─────────────────────────────────
  if (screen === 'customize') {
    const gameName = GAME_TEMPLATES.find(t => t.type === selectedGame)?.name || '';
    const worldOption = WORLD_OPTIONS.find(w => w.type === worldType);

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setScreen('pickGame')}
            className="text-white/50 hover:text-white/80 mb-4 text-sm transition-colors"
          >
            &larr; Back to games
          </button>

          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-1">
              Design Your {gameName}!
            </h1>
            <p className="text-white/60">Fill in the silly details to make it YOUR game</p>
            <button
              onClick={randomizeAll}
              className="mt-3 px-4 py-2 text-sm rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition-all hover:scale-105"
            >
              🎲 Randomize Everything!
            </button>
          </div>

          <div className="space-y-6">
            {/* Hero Section */}
            <section className="bg-white/5 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-yellow-300 mb-1">🦸 Your Hero</h2>
              <p className="text-sm text-white/50 mb-3">Every game needs a hero! Who will save the day?</p>

              <label className="block mb-3">
                <span className="text-sm text-white/70 mb-1 block">Hero&apos;s name:</span>
                <input
                  type="text"
                  value={heroName}
                  onChange={(e) => setHeroName(e.target.value)}
                  placeholder="Captain Noodle"
                  maxLength={20}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/10 text-white placeholder-white/30 border border-white/10 focus:border-yellow-300/50 focus:outline-none text-lg"
                />
              </label>

              <p className="text-sm text-white/70 mb-2">What kind of creature are they?</p>
              <EmojiPicker options={HERO_OPTIONS} selected={heroEmoji} onSelect={setHeroEmoji} />
            </section>

            {/* Villain Section */}
            <section className="bg-white/5 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-red-300 mb-1">😈 The Villain</h2>
              <p className="text-sm text-white/50 mb-3">Every hero needs a villain! Who&apos;s causing all the trouble?</p>

              <label className="block mb-3">
                <span className="text-sm text-white/70 mb-1 block">Villain&apos;s name:</span>
                <input
                  type="text"
                  value={villainName}
                  onChange={(e) => setVillainName(e.target.value)}
                  placeholder="Dr. Stinkbug"
                  maxLength={20}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/10 text-white placeholder-white/30 border border-white/10 focus:border-red-300/50 focus:outline-none text-lg"
                />
              </label>

              <p className="text-sm text-white/70 mb-2">What kind of baddie are they?</p>
              <EmojiPicker options={VILLAIN_OPTIONS} selected={villainEmoji} onSelect={setVillainEmoji} />
            </section>

            {/* World Section */}
            <section className="bg-white/5 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-cyan-300 mb-1">🌍 The World</h2>
              <p className="text-sm text-white/50 mb-3">Where does this epic adventure take place?</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {WORLD_OPTIONS.map((w) => (
                  <button
                    key={w.type}
                    onClick={() => setWorldType(w.type)}
                    className={`
                      p-3 rounded-xl text-center transition-all duration-150
                      ${
                        worldType === w.type
                          ? 'ring-2 ring-cyan-300 scale-105 shadow-lg'
                          : 'hover:scale-105'
                      }
                    `}
                    style={{
                      background: `linear-gradient(135deg, ${w.bgColor1}, ${w.bgColor2})`,
                    }}
                  >
                    <span className="text-2xl block">{w.emoji}</span>
                    <span className="text-xs text-white/90 font-medium">{w.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Collectibles & Power */}
            <section className="bg-white/5 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-green-300 mb-1">✨ The Good Stuff</h2>
              <p className="text-sm text-white/50 mb-3">What does {heroName || 'your hero'} collect?</p>
              <EmojiPicker options={COLLECTIBLE_OPTIONS} selected={collectibleEmoji} onSelect={setCollectibleEmoji} size="sm" />
            </section>

            <section className="bg-white/5 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-purple-300 mb-1">⚡ Special Power</h2>
              <p className="text-sm text-white/50 mb-3">What&apos;s {heroName || 'your hero'}&apos;s secret weapon?</p>
              <EmojiPicker options={POWER_OPTIONS} selected={specialPower} onSelect={setSpecialPower} size="sm" />
            </section>

            <section className="bg-white/5 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-orange-300 mb-1">💥 Projectile</h2>
              <p className="text-sm text-white/50 mb-3">What does {heroName || 'your hero'} fire at the baddies?</p>
              <EmojiPicker options={PROJECTILE_OPTIONS} selected={projectileEmoji} onSelect={setProjectileEmoji} size="sm" />
            </section>

            {/* Preview */}
            <section className="bg-white/5 rounded-2xl p-5 text-center">
              <h2 className="text-lg font-bold text-white mb-3">Your Game Preview</h2>
              <div
                className="rounded-xl p-6 mb-4 inline-block min-w-[280px]"
                style={{
                  background: `linear-gradient(135deg, ${worldOption?.bgColor1}, ${worldOption?.bgColor2})`,
                }}
              >
                <div className="text-4xl mb-2">
                  {heroEmoji} <span className="text-xl">vs</span> {villainEmoji}
                </div>
                <p className="text-white font-bold text-lg">{heroName || '???'}</p>
                <p className="text-white/60 text-sm">battles</p>
                <p className="text-white font-bold text-lg">{villainName || '???'}</p>
                <p className="text-white/50 text-xs mt-2">
                  in {worldOption?.label || '???'} | Collecting {collectibleEmoji} | Power: {specialPower}
                </p>
              </div>
            </section>

            {/* BUILD BUTTON */}
            <div className="text-center pb-8">
              <button
                onClick={() => setScreen('playing')}
                className="
                  px-12 py-5 text-2xl font-black rounded-2xl
                  bg-gradient-to-r from-green-400 to-emerald-600
                  text-white shadow-xl shadow-green-500/30
                  hover:scale-110 hover:shadow-2xl hover:shadow-green-500/40
                  active:scale-95
                  transition-all duration-200
                  animate-pulse
                "
              >
                🚀 BUILD MY GAME!
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── PLAYING SCREEN ───────────────────────────────────
  if (screen === 'playing') {
    const tmpl = GAME_TEMPLATES.find(t => t.type === selectedGame);
    const worldOption = WORLD_OPTIONS.find(w => w.type === worldType);
    const gameInstance = gameRef.current as BaseGame & { getInstructions?: () => string } | null;
    const instructions = gameInstance?.getInstructions?.() || '';

    return (
      <div
        className="h-screen flex flex-col overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${worldOption?.bgColor1 || '#0a0a2e'}, ${worldOption?.bgColor2 || '#1a1a4e'})`,
        }}
      >
        {/* Top HUD */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/30 shrink-0">
          <button
            onClick={() => setScreen('customize')}
            className="text-white/60 hover:text-white text-sm px-3 py-1 rounded-lg hover:bg-white/10 transition-all"
          >
            &larr; Back
          </button>
          <div className="flex items-center gap-4 text-white">
            <span className="text-lg font-bold">
              {tmpl?.emoji} {heroName}&apos;s {tmpl?.name}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-yellow-300 font-bold text-lg">
              Score: {gameScore}
            </span>
            <span className="text-red-300 font-bold">
              {'❤️'.repeat(Math.max(0, gameLives))}
              {'🖤'.repeat(Math.max(0, 3 - gameLives))}
            </span>
          </div>
        </div>

        {/* Game message */}
        {gameMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 bg-black/60 text-white px-6 py-2 rounded-full text-sm font-bold animate-pulse">
            {gameMessage}
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 relative">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

          {/* Game Over Overlay */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
              <div className="text-center p-8 rounded-3xl bg-white/10 backdrop-blur-md max-w-sm mx-4">
                <div className="text-6xl mb-4">{gameWon ? '🎉' : '💀'}</div>
                <h2 className="text-3xl font-black text-white mb-2">
                  {gameWon ? 'YOU WIN!' : 'GAME OVER'}
                </h2>
                <p className="text-white/70 text-lg mb-1">
                  {gameWon
                    ? `${heroName} defeated ${villainName}!`
                    : `${villainName} won this time...`}
                </p>
                <p className="text-yellow-300 text-2xl font-bold mb-6">
                  Score: {finalScore}
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setGameOver(false);
                      startGame();
                    }}
                    className="px-8 py-3 text-lg font-bold rounded-xl bg-gradient-to-r from-green-400 to-emerald-600 text-white hover:scale-105 transition-all"
                  >
                    🔄 Play Again!
                  </button>
                  <button
                    onClick={() => setScreen('customize')}
                    className="px-8 py-3 text-lg font-bold rounded-xl bg-white/15 text-white hover:bg-white/25 hover:scale-105 transition-all"
                  >
                    ✏️ Change My Game
                  </button>
                  <button
                    onClick={() => setScreen('pickGame')}
                    className="px-8 py-3 text-sm rounded-xl text-white/50 hover:text-white/80 transition-all"
                  >
                    Pick a Different Game
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom controls hint */}
        <div className="text-center py-2 bg-black/30 text-white/40 text-xs shrink-0">
          {instructions}
        </div>
      </div>
    );
  }

  return null;
}
