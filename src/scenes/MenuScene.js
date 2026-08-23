import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { enterLandscapePlay } from '../mobile.js';
import { unlockAudio, playBgm } from '../audio.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create() {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x1a1028).setOrigin(0);

    const photo = this.add.image(WIDTH * 0.72, HEIGHT * 0.52, 'oly-portada');
    photo.setScale(HEIGHT / photo.height * 1.08);

    this.add.rectangle(0, 0, 560, HEIGHT, 0x140a22, 0.62).setOrigin(0);

    this.portada = document.getElementById('portada');
    this.btn = document.getElementById('btn-jugar');
    this.portada.classList.add('open');
    this.started = false;
    this.onJugar = () => this.startGame();
    this.btn.addEventListener('click', this.onJugar);
    this.events.once('shutdown', () => this.hidePortada());

    this.playIntro();
    this.sound.once('unlocked', () => this.playIntro());
    this.portada.addEventListener('pointerdown', (ev) => {
      if (ev.target && ev.target.id === 'btn-jugar') return;
      unlockAudio(this);
      this.playIntro();
    });
  }

  playIntro() {
    if (this.started) return;
    if (this.sound.getAllPlaying().some((s) => s.key === 'intro')) return;
    unlockAudio(this);
    playBgm(this, { menu: true });
  }

  hidePortada() {
    if (this.btn && this.onJugar) this.btn.removeEventListener('click', this.onJugar);
    if (this.portada) this.portada.classList.remove('open');
  }

  async startGame() {
    if (this.started) return;
    this.started = true;
    await unlockAudio(this);
    await enterLandscapePlay();
    this.hidePortada();
    playBgm(this, { menu: false });
    this.sound.play('click', { volume: 0.35 });
    this.scene.start('game', { level: 0 });
  }
}
