import Phaser from 'phaser';
import { WIDTH, HEIGHT } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { CreditsScene } from './scenes/CreditsScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#160c24',
  pixelArt: false,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 820 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    fullscreenTarget: document.body,
  },
  input: {
    activePointers: 3,
  },
  audio: { disableWebAudio: false },
  scene: [BootScene, CreditsScene, MenuScene, GameScene],
};

const game = new Phaser.Game(config);
window.__olyGame = game;

const refreshScale = () => game.scale.refresh();
window.addEventListener('resize', refreshScale);
window.addEventListener('orientationchange', () => setTimeout(refreshScale, 280));
