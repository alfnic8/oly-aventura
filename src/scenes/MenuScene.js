import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { enterLandscapePlay } from '../mobile.js';
import { unlockAudio, startMusic, bindAutoMusic } from '../audio.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create() {
    this.drawArcadeBg();
    this.drawCoverPhoto();

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

    bindAutoMusic(this);
    this.onAudioTap = (ev) => {
      if (ev.target?.closest?.('#btn-jugar, [data-mute-btn]')) return;
      startMusic(this, { menu: true });
    };
    this.portada.addEventListener('touchstart', this.onAudioTap, { passive: true });
    this.portada.addEventListener('pointerdown', this.onAudioTap);
  }

  drawCoverPhoto() {
    const key = 'oly-portada';
    if (this.textures.exists(key)) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const photo = this.add.image(WIDTH * 0.72, HEIGHT * 0.5, key);
    const maxH = HEIGHT * 0.9;
    const maxW = WIDTH * 0.36;
    const scale = Math.min(maxH / photo.height, maxW / photo.width);
    photo.setScale(scale);
    photo.setAlpha(0.22);
    photo.setTint(0xff88cc);

    const frame = this.add.rectangle(WIDTH * 0.72, HEIGHT * 0.5, photo.displayWidth + 16, photo.displayHeight + 16);
    frame.setStrokeStyle(4, 0xff006e, 0.5);
    frame.setFillStyle(0x000000, 0);
    frame.setDepth(-1);
  }

  drawArcadeBg() {
    const g = this.add.graphics().setDepth(-5);
    g.fillGradientStyle(0x0a0014, 0x0a0014, 0x1a0033, 0x0d0020, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);

    const grid = this.add.graphics().setDepth(-4).setAlpha(0.35);
    grid.lineStyle(1, 0x00f5ff, 0.2);
    for (let x = 0; x < WIDTH; x += 40) {
      grid.lineBetween(x, HEIGHT * 0.55, x + (WIDTH - x) * 0.3, HEIGHT);
    }
    for (let y = HEIGHT * 0.55; y < HEIGHT; y += 24) {
      grid.lineBetween(0, y, WIDTH, y);
    }

    for (let i = 0; i < 12; i += 1) {
      const star = this.add.text(
        Phaser.Math.Between(20, WIDTH - 20),
        Phaser.Math.Between(20, HEIGHT - 80),
        '★',
        { fontFamily: 'Arial', fontSize: Phaser.Math.Between(10, 18), color: '#ffea00' },
      ).setAlpha(Phaser.Math.FloatBetween(0.2, 0.7)).setDepth(-3);
      this.tweens.add({
        targets: star,
        alpha: { from: star.alpha, to: star.alpha * 0.3 },
        duration: Phaser.Math.Between(600, 1400),
        yoyo: true,
        repeat: -1,
      });
    }
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
    startMusic(this, { menu: false });
    this.hidePortada();
    this.sound.play('click', { volume: 0.35 });
    this.scene.start('game', { level: 0 });

    enterLandscapePlay().then(() => {
      startMusic(this, { menu: false });
    }).catch(() => {});
  }
}
