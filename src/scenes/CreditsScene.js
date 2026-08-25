import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { playVoice } from '../audio.js';

export class CreditsScene extends Phaser.Scene {
  constructor() {
    super('credits');
  }

  create() {
    this.cameras.main.fadeIn(500, 12, 8, 30);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x1a1028).setOrigin(0);

    const photo = this.add.image(WIDTH * 0.70, HEIGHT * 0.52, 'oly-portada');
    const scale = HEIGHT / photo.height * 1.08;
    photo.setScale(scale);

    this.add.rectangle(0, 0, 520, HEIGHT, 0x140a22, 0.55).setOrigin(0);
    this.add.rectangle(WIDTH / 2, HEIGHT - 48, WIDTH, 96, 0x140a22, 0.35);

    for (let i = 0; i < 18; i += 1) {
      const s = this.add.image(Phaser.Math.Between(20, 520), Phaser.Math.Between(20, HEIGHT - 20), 'star');
      s.setScale(Phaser.Math.FloatBetween(0.14, 0.28));
      s.setAlpha(Phaser.Math.FloatBetween(0.35, 0.85));
      this.tweens.add({
        targets: s,
        alpha: { from: 0.25, to: 0.9 },
        duration: Phaser.Math.Between(800, 1800),
        yoyo: true,
        repeat: -1,
      });
    }

    playVoice('start');

    const names = this.add.text(268, 150, 'Tía Ivana y Tío Alfredo', {
      fontFamily: 'Fredoka, Arial',
      fontSize: 28,
      color: '#ffd76a',
      stroke: '#6b2d16',
      strokeThickness: 6,
      align: 'center',
      wordWrap: { width: 460 },
    }).setOrigin(0.5).setAlpha(0);

    const presentan = this.add.text(268, 198, 'presentan', {
      fontFamily: 'Fredoka, Arial',
      fontSize: 22,
      color: '#fff7fb',
    }).setOrigin(0.5).setAlpha(0);

    const title = this.add.text(268, 268, 'El juego de Olympia', {
      fontFamily: 'Fredoka, Arial',
      fontSize: 40,
      color: '#ff9ad5',
      stroke: '#6b2158',
      strokeThickness: 8,
      align: 'center',
      wordWrap: { width: 480 },
    }).setOrigin(0.5).setAlpha(0).setScale(0.85);

    this.tweens.add({ targets: names, alpha: 1, y: names.y - 6, duration: 900, ease: 'Sine.out' });
    this.tweens.add({ targets: presentan, alpha: 1, duration: 800, delay: 650 });
    this.tweens.add({
      targets: title,
      alpha: 1,
      scale: 1,
      duration: 900,
      delay: 1200,
      ease: 'Back.out',
    });

    this.add.text(WIDTH / 2, HEIGHT - 36, 'Tocá o apretá una tecla', {
      fontFamily: 'Fredoka, Arial',
      fontSize: 16,
      color: '#fff7fb',
    }).setOrigin(0.5).setAlpha(0.9);

    this.time.delayedCall(6000, () => this.goMenu());
    this.input.keyboard.once('keydown', () => this.goMenu());
    this.input.once('pointerdown', () => this.goMenu());
    this.leaving = false;
  }

  goMenu() {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(400, 16, 10, 36);
    this.time.delayedCall(420, () => this.scene.start('menu'));
  }
}
