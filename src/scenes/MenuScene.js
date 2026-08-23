import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { enterLandscapePlay } from '../mobile.js';
import { unlockAudio, playBgm, bindAudioResume } from '../audio.js';

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
    this.btn.addEventListener('touchstart', (ev) => {
      ev.preventDefault();
      this.startGame();
    }, { passive: false });
    this.events.once('shutdown', () => this.hidePortada());

    bindAudioResume(this);
    this.onAudioTap = (ev) => {
      if (ev.target && ev.target.id === 'btn-jugar') return;
      unlockAudio(this);
      playBgm(this, { menu: true });
    };
    this.portada.addEventListener('touchstart', this.onAudioTap, { passive: true });
    this.portada.addEventListener('pointerdown', this.onAudioTap);
  }

  hidePortada() {
    if (this.btn && this.onJugar) this.btn.removeEventListener('click', this.onJugar);
    if (this.portada && this.onAudioTap) {
      this.portada.removeEventListener('touchstart', this.onAudioTap);
      this.portada.removeEventListener('pointerdown', this.onAudioTap);
    }
    if (this.portada) this.portada.classList.remove('open');
  }

  startGame() {
    if (this.started) return;
    this.started = true;

    unlockAudio(this);
    playBgm(this, { menu: false });

    enterLandscapePlay().then(() => {
      unlockAudio(this);
      playBgm(this, { menu: false });
      this.hidePortada();
      this.sound.play('click', { volume: 0.35 });
      this.scene.start('game', { level: 0 });
    });
  }
}
