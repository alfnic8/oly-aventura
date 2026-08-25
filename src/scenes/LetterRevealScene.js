import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { OLY_WORD, getUnlockedLetters } from '../olyLetters.js';
import { resetGameShell } from '../mobile.js';

export class LetterRevealScene extends Phaser.Scene {
  constructor() {
    super('letterReveal');
  }

  init(data) {
    this.revealIndex = data.revealIndex ?? 0;
    this.unlocked = data.unlocked ?? getUnlockedLetters();
    this.justCompleted = data.justCompleted === true;
    this.finale = data.finale === true || data.continueData?.toMenu === true;
    this.preview = data.preview === true;
    this.continueData = data.continueData ?? null;
    this.score = Number(data.score ?? data.continueData?.score ?? 0) || 0;
    this.done = false;
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0014');
    this.cameras.main.fadeIn(200, 10, 0, 20);

    const g = this.add.graphics().setDepth(0);
    g.fillGradientStyle(0x0a0014, 0x0a0014, 0x2a1040, 0x1a0033, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);

    const letter = OLY_WORD[this.revealIndex] ?? 'O';
    /* Finale whenever last level ends, or first time the word completes */
    const celebrate = this.preview
      ? this.unlocked.every(Boolean)
      : (this.justCompleted || this.finale);

    this.titleText = this.add.text(
      WIDTH / 2,
      48,
      this.preview ? 'VISTA PREVIA' : (celebrate ? '¡OLY COMPLETA!' : '¡NUEVA LETRA!'),
      {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 16,
        color: '#ffea00',
      },
    ).setOrigin(0.5).setDepth(2);

    this.subText = this.add.text(
      WIDTH / 2,
      88,
      celebrate ? '¡Lo lograste!' : `Conseguiste la "${letter}"`,
      {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 12,
        color: celebrate ? '#ffea00' : '#00f5ff',
      },
    ).setOrigin(0.5).setDepth(2);

    this.wordRoot = this.add.container(WIDTH / 2, HEIGHT * 0.42).setDepth(3);
    this.slots = [];
    const gap = 140;

    OLY_WORD.forEach((ch, i) => {
      const x = (i - 1) * gap;
      const isNew = i === this.revealIndex;
      const known = celebrate
        ? !isNew
        : (!isNew && i < this.revealIndex && this.unlocked[i]);
      const locked = !isNew && !known;

      const slotGlyph = locked ? '?' : ch;
      const slot = this.add.text(x, 0, slotGlyph, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: locked ? 72 : 96,
        color: '#2a1040',
        stroke: '#5b2b16',
        strokeThickness: 6,
      }).setOrigin(0.5).setAlpha(locked ? 0.55 : 0.35);

      const filled = this.add.text(x, 0, ch, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 96,
        color: '#ffd76a',
        stroke: '#ff006e',
        strokeThickness: 10,
      }).setOrigin(0.5);

      if (known) {
        filled.setAlpha(1).setScale(1);
        slot.setVisible(false);
      } else if (isNew) {
        filled.setAlpha(0).setScale(2.4).setY(-120);
      } else {
        filled.setAlpha(0);
      }

      this.wordRoot.add([slot, filled]);
      this.slots.push({ slot, filled, x, ch });
    });

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
          neu.slot.setVisible(false);
          this.tweens.add({
            targets: neu.filled,
            scale: { from: 1.12, to: 1 },
            duration: 220,
            yoyo: true,
            repeat: 1,
          });
          this.sparkle(WIDTH / 2 + neu.x, HEIGHT * 0.42);
          if (celebrate) this.playCompleteZoom();
        },
      });
    } else if (celebrate) {
      this.playCompleteZoom();
    }

    const tip = this.preview
      ? 'Tocá para cerrar'
      : 'Tocá para continuar';
    this.tipText = this.add.text(WIDTH / 2, HEIGHT - 18, tip, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 10,
      color: '#fff7fb',
    }).setOrigin(0.5).setDepth(8).setAlpha(0.85);

    this.time.delayedCall(celebrate ? 2200 : 500, () => {
      this.input.once('pointerdown', () => this.finish());
      this.input.keyboard?.once('keydown-SPACE', () => this.finish());
      this.input.keyboard?.once('keydown-ENTER', () => this.finish());
    });
  }

  playCompleteZoom() {
    this.titleText.setText('¡OLY COMPLETA!');
    this.subText.setText('¡Lo lograste!');
    this.subText.setColor('#ffea00');

    this.cameras.main.setZoom(1.35);
    this.cameras.main.centerOn(WIDTH / 2, HEIGHT * 0.42);

    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1,
      duration: 900,
      ease: 'Sine.out',
      onUpdate: () => {
        this.cameras.main.centerOn(WIDTH / 2, HEIGHT * 0.42);
      },
      onComplete: () => {
        this.cameras.main.centerOn(WIDTH / 2, HEIGHT / 2);
        this.spawnCelebratePuppy();
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
      this.time.delayedCall(80 * i, () => this.sparkle(WIDTH / 2 + s.x, HEIGHT * 0.42));
    });
  }

  spawnCelebratePuppy() {
    let best = this.score;
    try {
      const prev = Number(localStorage.getItem('oly-best-score') || 0);
      if (this.score > prev) {
        localStorage.setItem('oly-best-score', String(this.score));
        best = this.score;
      } else {
        best = Math.max(prev, this.score);
      }
    } catch {
      best = this.score;
    }
    const isRecord = this.score > 0 && this.score >= best;

    /* Fixed to camera so zoom never hides Negrito / score */
    const groundY = HEIGHT * 0.78;
    const pupX = WIDTH / 2 - 48;
    const babyX = WIDTH / 2 + 56;
    const pupScale = 0.4;
    let matchH = 0;

    if (this.textures.exists('puppy-sit')) {
      const pupTex = this.textures.get('puppy-sit').getSourceImage();
      matchH = (pupTex.height || 334) * pupScale;
      const pup = this.add.image(pupX, groundY, 'puppy-sit')
        .setOrigin(0.5, 1)
        .setDepth(20)
        .setScrollFactor(0)
        .setAlpha(0)
        .setScale(pupScale);
      this.tweens.add({
        targets: pup,
        alpha: 1,
        y: HEIGHT * 0.76,
        duration: 500,
        ease: 'Back.out',
      });
      this.tweens.add({
        targets: pup,
        scaleX: { from: pupScale, to: pupScale * 1.1 },
        scaleY: { from: pupScale, to: pupScale * 0.925 },
        duration: 360,
        yoyo: true,
        repeat: 3,
        delay: 400,
        ease: 'Sine.inOut',
      });
    }

    if (this.textures.exists('doll-goal')) {
      const dollTex = this.textures.get('doll-goal').getSourceImage();
      const dollH = dollTex.height || 96;
      const dollW = dollTex.width || 86;
      const h = matchH || dollH * pupScale;
      const w = dollW * (h / dollH);
      const baby = this.add.image(babyX, groundY, 'doll-goal')
        .setOrigin(0.5, 1)
        .setDepth(20)
        .setScrollFactor(0)
        .setAlpha(0)
        .setDisplaySize(w, h);
      this.tweens.add({
        targets: baby,
        alpha: 1,
        y: HEIGHT * 0.76,
        duration: 500,
        delay: 80,
        ease: 'Back.out',
      });
      this.tweens.add({
        targets: baby,
        displayWidth: { from: w, to: w * 1.08 },
        displayHeight: { from: h, to: h * 0.92 },
        duration: 360,
        yoyo: true,
        repeat: 3,
        delay: 480,
        ease: 'Sine.inOut',
      });
    }

    const bark = this.add.text(WIDTH / 2, HEIGHT * 0.52, '¡Bien hecho, lo lograste!', {
      fontFamily: 'Fredoka, Arial',
      fontSize: 24,
      color: '#ffea00',
      stroke: '#5b2b16',
      strokeThickness: 6,
      align: 'center',
    }).setOrigin(0.5).setDepth(21).setScrollFactor(0).setAlpha(0);
    this.tweens.add({
      targets: bark,
      alpha: 1,
      duration: 400,
      delay: 200,
      yoyo: true,
      hold: 1400,
    });

    const scoreLine = this.add.text(
      WIDTH / 2,
      HEIGHT * 0.88,
      isRecord
        ? `Puntos: ${this.score}   ¡NUEVO RÉCORD!`
        : `Puntos: ${this.score}   Récord: ${best}`,
      {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 12,
        color: isRecord ? '#ffea00' : '#fff7fb',
        stroke: '#5b2b16',
        strokeThickness: 5,
        align: 'center',
      },
    ).setOrigin(0.5).setDepth(21).setScrollFactor(0).setAlpha(0);
    this.tweens.add({
      targets: scoreLine,
      alpha: 1,
      duration: 400,
      delay: 300,
    });

    try {
      this.sound.play('bark', { volume: 0.6 });
    } catch {
      /* ignore */
    }
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
      resetGameShell(this.game);
      this.scene.start('menu');
      return;
    }
    const next = this.continueData;
    if (!next || next.toMenu) {
      resetGameShell(this.game);
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
