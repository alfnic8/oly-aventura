import Phaser from 'phaser';
import { createTextures } from '../createTextures.js';
import { buildFaceTexture } from '../faceFromPhoto.js';
import { loadFaceConfig } from '../faceConfig.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    this.load.image('oly-portada', 'assets/oly-portada.png');
    this.load.image('oly-face-photo-src', 'assets/oly-face-photo.png');
    this.load.audio('intro', 'assets/sfx/intro.mp3');
    ['jump', 'star', 'crystal', 'stomp', 'hurt', 'win', 'start', 'click'].forEach((name) => {
      this.load.audio(name, `assets/sfx/${name}.wav`);
    });

    const { width, height } = this.scale;
    const bar = this.add.rectangle(width / 2, height / 2, 280, 16, 0x4b3568);
    const fill = this.add.rectangle(width / 2 - 136, height / 2, 8, 10, 0xffd76a).setOrigin(0, 0.5);
    this.add.text(width / 2, height / 2 - 40, 'Cargando el reino de Oly…', {
      fontFamily: 'Fredoka, Arial',
      fontSize: 22,
      color: '#fff7fb',
    }).setOrigin(0.5);

    this.load.on('progress', (p) => {
      fill.width = 272 * p;
    });
  }

  create() {
    createTextures(this);
    buildFaceTexture(this, 'oly-face-photo-src', 'oly-face', loadFaceConfig());
    if (this.textures.exists('oly-portada')) {
      this.textures.get('oly-portada').setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    if (!this.anims.exists('bat-fly')) {
      this.anims.create({
        key: 'bat-fly',
        frames: [{ key: 'bat-0' }, { key: 'bat-1' }],
        frameRate: 6,
        repeat: -1,
      });
    }
    if (new URLSearchParams(window.location.search).get('faceTune') === '1') {
      this.scene.start('faceTune', { returnTo: 'menu' });
    } else {
      this.scene.start('menu');
    }
  }
}
