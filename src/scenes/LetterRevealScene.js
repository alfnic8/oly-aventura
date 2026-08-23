import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { OLY_WORD, getUnlockedLetters } from '../olyLetters.js';

export class LetterRevealScene extends Phaser.Scene {
  constructor() {
    super('letterReveal');
  }

  init(data) {
    this.revealIndex = data.revealIndex ?? 0;
    this.unlocked = data.unlocked ?? getUnlockedLetters();
    this.preview = data.preview === true;
    this.continueData = data.continueData ?? null;
    this.done = false;
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0014');
    this.cameras.main.fadeIn(200, 10, 0, 20);

    const g = this.add.graphics().setDepth(0);
    g.fillGradientStyle(0x0a0014, 0x0a0014, 0x2a1040, 0x1a0033, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);

    this.titleText = this.add.text(WIDTH / 2, 48, this.preview ? 'VISTA PREVIA' : '¡NUEVA LETRA!', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 16,
      color: '#ffea00',
    }).setOrigin(0.5).setDepth(2);

    const letter = OLY_WORD[this.revealIndex] ?? 'O';
    this.subText = this.add.text(WIDTH / 2, 88, `Conseguiste la "${letter}"`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 12,
      color: '#00f5ff',
    }).setOrigin(0.5).setDepth(2);

    this.wordRoot = this.add.container(WIDTH / 2, HEIGHT * 0.48).setDepth(3);
    this.slots = [];
    const gap = 140;

    OLY_WORD.forEach((ch, i) => {
      const x = (i - 1) * gap;
      const slot = this.add.text(x, 0, ch, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 96,
        color: '#2a1040',
        stroke: '#5b2b16',
        strokeThickness: 6,
      }).setOrigin(0.5).setAlpha(0.45);

      const filled = this.add.text(x, 0, ch, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 96,
        color: '#ffd76a',
        stroke: '#ff006e',
        strokeThickness: 10,
      }).setOrigin(0.5);

      const already = this.unlocked[i] && i !== this.revealIndex;
      const isNew = i === this.revealIndex;
      if (already) {
        filled.setAlpha(1).setScale(1);
      } else if (isNew) {
        filled.setAlpha(0).setScale(2.4).setY(-120);
      } else {
        filled.setAlpha(0);
      }

      this.wordRoot.add([slot, filled]);
      this.slots.push({ slot, filled, x, ch });
    });

    const complete = this.unlocked.every(Boolean);
    const neu = this.slots[this.revealIndex];
    if (neu) {
      this.tweens.add({
        targets: neu.filled,
        alpha: 1,
        scale: 1,
        y: 0,
        duration: 700,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: neu.filled,
            scale: { from: 1.12, to: 1 },
            duration: 220,
            yoyo: true,
            repeat: 1,
          });
          this.sparkle(WIDTH / 2 + neu.x, HEIGHT * 0.48);
          if (complete) this.playCompleteZoom();
        },
      });
    } else if (complete) {
      this.playCompleteZoom();
    }

    const tip = this.preview
      ? 'Tocá para cerrar'
      : 'Tocá para continuar';
    this.tipText = this.add.text(WIDTH / 2, HEIGHT - 42, tip, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 10,
      color: '#fff7fb',
    }).setOrigin(0.5).setDepth(4).setAlpha(0.85);

    this.time.delayedCall(complete ? 1600 : 500, () => {
      this.input.once('pointerdown', () => this.finish());
      this.input.keyboard?.once('keydown-SPACE', () => this.finish());
      this.input.keyboard?.once('keydown-ENTER', () => this.finish());
    });
  }

  playCompleteZoom() {
    this.titleText.setText('¡OLY COMPLETA!');
    this.subText.setText('¡Lo lograste!');
    this.subText.setColor('#ffea00');

    // Empieza cerca de la palabra y hace zoom out para celebrar
    this.cameras.main.setZoom(1.55);
    this.cameras.main.centerOn(WIDTH / 2, HEIGHT * 0.48);

    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1,
      duration: 1100,
      ease: 'Sine.out',
      onUpdate: () => {
        this.cameras.main.centerOn(WIDTH / 2, HEIGHT * 0.48);
      },
      onComplete: () => {
        this.cameras.main.centerOn(WIDTH / 2, HEIGHT / 2);
      },
    });

    this.tweens.add({
      targets: this.wordRoot,
      scale: { from: 1, to: 1.08 },
      duration: 500,
      yoyo: true,
      ease: 'Sine.inOut',
    });

    this.slots.forEach((s, i) => {
      this.time.delayedCall(80 * i, () => this.sparkle(WIDTH / 2 + s.x, HEIGHT * 0.48));
    });
  }

  sparkle(x, y) {
    for (let i = 0; i < 12; i += 1) {
      const star = this.add.text(x, y, '★', {
        fontFamily: 'Arial',
        fontSize: Phaser.Math.Between(14, 22),
        color: i % 2 ? '#ffea00' : '#ff006e',
      }).setOrigin(0.5).setDepth(5);
      const ang = (Math.PI * 2 * i) / 12;
      this.tweens.add({
        targets: star,
        x: x + Math.cos(ang) * Phaser.Math.Between(60, 110),
        y: y + Math.sin(ang) * Phaser.Math.Between(40, 90),
        alpha: 0,
        scale: 0.2,
        duration: 700,
        ease: 'Sine.out',
        onComplete: () => star.destroy(),
      });
    }
  }

  finish() {
    if (this.done) return;
    this.done = true;
    if (this.preview) {
      this.scene.start('menu');
      return;
    }
    const next = this.continueData;
    if (!next || next.toMenu) {
      this.scene.start('menu');
      return;
    }
    this.scene.start('game', {
      level: next.level,
      score: next.score,
      hearts: next.hearts,
    });
  }
}
