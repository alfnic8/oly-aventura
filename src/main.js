import Phaser from 'phaser';
import { WIDTH, HEIGHT } from './config.js';
import { isIOS, bindMuteButtons } from './audio.js';
import { registerPwaServiceWorker, setupPwaInstall } from './pwa.js';
import { refreshGameScale } from './mobile.js';
import { BootScene } from './scenes/BootScene.js';
import { CreditsScene } from './scenes/CreditsScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { FaceTuneScene } from './scenes/FaceTuneScene.js';
import { LetterRevealScene } from './scenes/LetterRevealScene.js';

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
  audio: { disableWebAudio: isIOS() },
  scene: [BootScene, CreditsScene, MenuScene, GameScene, FaceTuneScene, LetterRevealScene],
};

const game = new Phaser.Game(config);
window.__olyGame = game;
localStorage.removeItem('oly-music-muted');
bindMuteButtons();
registerPwaServiceWorker();
setupPwaInstall();

const refreshScale = () => refreshGameScale(game);
window.addEventListener('resize', refreshScale);
window.addEventListener('orientationchange', () => setTimeout(refreshScale, 280));
