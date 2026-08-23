import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { Oly } from '../player/Oly.js';
import { mountFaceTune } from '../faceTune.js';

function hideGameUi() {
  ['portada', 'banner', 'btn-exit-game', 'touch'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('open');
    if (id === 'portada') el.classList.remove('open');
  });
}

export class FaceTuneScene extends Phaser.Scene {
  constructor() {
    super('faceTune');
  }

  init(data) {
    this.returnTo = data.returnTo ?? 'menu';
    this.gameSnapshot = data.gameSnapshot ?? null;
  }

  create() {
    hideGameUi();
    this.cameras.main.setBackgroundColor('#9b7fd4');

    const g = this.add.graphics().setDepth(0);
    g.fillGradientStyle(0x9b7fd4, 0x9b7fd4, 0xc4a8ff, 0xc4a8ff, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);

    const groundY = HEIGHT * 0.62;
    this.add.rectangle(WIDTH / 2, groundY + 28, WIDTH, 56, 0x5fe0d8).setDepth(1);

    try {
      this.oly = new Oly(this, WIDTH / 2, groundY - 8, { static: true });
      this.oly.view.setDepth(10);

      mountFaceTune(this, this.oly, {
        startActive: true,
        onExit: () => this.exit(),
      });
    } catch (err) {
      console.error('FaceTuneScene', err);
      this.add.text(WIDTH / 2, HEIGHT / 2, `Error al cargar ajuste:\n${err.message}`, {
        fontFamily: 'Arial',
        fontSize: 18,
        color: '#ffffff',
        align: 'center',
      }).setOrigin(0.5).setDepth(100);
    }

    this.add.text(WIDTH / 2, HEIGHT - 22, 'F9 o ESC = volver', {
      fontFamily: 'Fredoka, Arial',
      fontSize: 16,
      color: '#fff7fb',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
  }

  exit() {
    if (this.returnTo === 'game' && this.gameSnapshot) {
      this.scene.start('game', this.gameSnapshot);
      return;
    }
    this.scene.start('menu');
  }
}
