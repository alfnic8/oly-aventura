import Phaser from 'phaser';

const DISPLAY_H = 34;
const FRAME_H = 148;
const SIT_DISPLAY_H = 42;
const NEAR_PX = 120;

const BARK_LINES = [
  '¡Guau!',
  '¡Soy Negrito!',
  '¡Vamos por la corona!',
  '¡Guau guau!',
];

/**
 * Negrito — garden/level puppy. Walks, sits, or rides a moving platform.
 */
export class Puppy {
  constructor(scene, def) {
    this.scene = scene;
    this.mode = def.mode === 'sit' ? 'sit' : 'walk';
    this.minX = def.minX ?? def.x - 80;
    this.maxX = def.maxX ?? def.x + 80;
    this.speed = def.speed ?? 55;
    this.dir = 1;
    this.lines = def.lines ?? BARK_LINES;
    this.lineIndex = 0;
    this.near = false;
    this.bubbleUntil = 0;
    this.ridePlat = null;

    const startX = def.x ?? 0;
    const startY = def.y ?? 400;

    if (this.mode === 'sit') {
      this.displayH = SIT_DISPLAY_H;
      const texH = scene.textures.get('puppy-sit').getSourceImage().height || 334;
      this.baseScale = SIT_DISPLAY_H / texH;
      this.sprite = scene.add.image(startX, startY, 'puppy-sit');
      this.sprite.setOrigin(0.5, 1);
      this.sprite.setScale(this.baseScale);
      this.sprite.setDepth(4);
    } else {
      this.displayH = DISPLAY_H;
      this.baseScale = DISPLAY_H / FRAME_H;
      this.sprite = scene.add.sprite(startX, startY, 'puppy-walk', 0);
      this.sprite.setOrigin(0.5, 1);
      this.sprite.setScale(this.baseScale);
      this.sprite.setDepth(4);
      this.sprite.play('puppy-walk-anim');
      this.sprite.setFlipX(true);
    }

    this.bubble = scene.add.text(startX, startY - this.displayH - 8, '', {
      fontFamily: 'Fredoka, Arial',
      fontSize: 15,
      color: '#fff7fb',
      stroke: '#5b2b16',
      strokeThickness: 5,
      padding: { x: 2, y: 2 },
    }).setOrigin(0.5, 1).setDepth(25).setAlpha(0);
  }

  /** Sit on a live mover (horizontal or vertical). */
  attachTo(plat) {
    this.ridePlat = plat || null;
    this.syncToRide();
  }

  syncToRide() {
    const plat = this.ridePlat;
    if (!plat?.body) return;
    this.sprite.x = plat.x;
    this.sprite.y = plat.body.top;
  }

  update(t, dt, olyX) {
    if (this.ridePlat) {
      this.syncToRide();
    } else if (this.mode === 'walk') {
      const step = this.speed * (dt / 1000) * this.dir;
      this.sprite.x += step;
      if (this.sprite.x >= this.maxX) {
        this.sprite.x = this.maxX;
        this.dir = -1;
      } else if (this.sprite.x <= this.minX) {
        this.sprite.x = this.minX;
        this.dir = 1;
      }
      this.sprite.setFlipX(this.dir > 0);
    }

    const dist = Math.abs(olyX - this.sprite.x);
    const nowNear = dist < NEAR_PX;
    if (nowNear && !this.near) {
      this.say(t);
    }
    this.near = nowNear;

    if (t < this.bubbleUntil) {
      this.bubble.setPosition(this.sprite.x, this.sprite.y - this.displayH - 6);
      this.bubble.setAlpha(1);
    } else if (this.bubble.alpha > 0) {
      this.bubble.setAlpha(Math.max(0, this.bubble.alpha - dt / 250));
    }
  }

  say(t) {
    const line = this.lines[this.lineIndex % this.lines.length];
    this.lineIndex += 1;
    this.bubble.setText(line);
    this.bubbleUntil = t + 2600;
    this.bubble.setAlpha(1);
    this.scene.sound.play('bark', { volume: 0.55 });
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: this.baseScale * 1.08,
      scaleX: this.baseScale,
      duration: 120,
      yoyo: true,
    });
  }

  destroy() {
    this.sprite?.destroy();
    this.bubble?.destroy();
  }
}
