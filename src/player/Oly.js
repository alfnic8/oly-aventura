import Phaser from 'phaser';

const IDLE_DANCE_MS = 5000;
const FRAME_H = 128;
const DISPLAY_H = 84;

export class Oly {
  constructor(scene, x, y, options = {}) {
    this.scene = scene;
    this.staticPreview = options.static === true;

    if (this.staticPreview) {
      this.sprite = scene.add.sprite(x, y, 'oly-anim', 0);
      this.sprite.setOrigin(0.5, 1);
      this.fitDisplay();
      this.sprite.body = {
        blocked: { down: true },
        touching: { down: true },
        velocity: { x: 0, y: 0 },
        setAllowGravity() {},
        setVelocity() {},
        setVelocityX() {},
        setVelocityY() {},
      };
    } else {
      this.sprite = scene.physics.add.sprite(x, y, 'oly-anim', 0);
      this.sprite.setOrigin(0.5, 1);
      const scale = DISPLAY_H / FRAME_H;
      this.baseScale = scale;
      this.sprite.setScale(scale);
      const bw = 40;
      const bh = 90;
      this.sprite.setSize(bw, bh);
      this.sprite.setOffset((96 - bw) / 2, FRAME_H - bh - 4);
      this.sprite.setCollideWorldBounds(true);
      this.sprite.setMaxVelocity(240, 700);
      this.sprite.setDragX(1600);
    }

    this.shadow = scene.add.ellipse(x, y + 2, 36, 10, 0x000000, 0.2).setDepth(4);
    this.view = this.sprite;
    this.sprite.setDepth(5);

    // Compat stubs for face-tune / old callers
    this.face = { setTexture() {}, setDisplaySize() {}, setPosition() {} };
    this.faceCfg = {};

    this.cursors = this.staticPreview ? null : scene.input.keyboard.createCursorKeys();
    this.wasd = this.staticPreview ? null : scene.input.keyboard.addKeys('W,A,S,D');
    this.speed = 220;
    this.jumpSpeed = -560;
    this.jumpCutMult = 0.42;
    this.touchDir = 0;
    this.wantJump = false;
    this.jumpHeld = false;
    this.jumping = false;
    this.coyote = 0;
    this.invuln = 0;
    this.stompProtect = 0;
    this.baseScale = DISPLAY_H / FRAME_H;
    this.facing = 1;
    this.idleMs = 0;
    this.dancing = false;
    this.danceT = 0;
    this.animState = '';

    if (!this.staticPreview && this.sprite.anims) {
      this.playAnim('oly-idle');
    }
  }

  fitDisplay() {
    this.baseScale = DISPLAY_H / FRAME_H;
    this.sprite.setScale(this.baseScale);
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
  get body() { return this.sprite.body; }
  get active() { return this.sprite.active; }

  applyFaceLayout() {
    /* full-body sprites; face overlay no longer used */
  }

  setPosition(x, y) {
    this.sprite.setPosition(x, y);
    if (this.shadow) this.shadow.setPosition(x, y + 2);
  }

  setTouchDir(dir) {
    this.touchDir = dir;
  }

  requestJump() {
    this.wantJump = true;
    this.jumpHeld = true;
  }

  releaseJump() {
    this.jumpHeld = false;
  }

  playAnim(key) {
    if (!this.sprite.anims || this.animState === key) return;
    if (!this.scene.anims.exists(key)) return;
    this.animState = key;
    this.sprite.anims.play(key, true);
  }

  stopDance() {
    this.dancing = false;
    this.danceT = 0;
    this.idleMs = 0;
    this.sprite.setAngle(0);
    this.fitDisplay();
    this.shadow?.setScale(1, 1);
  }

  update(_, dt) {
    if (this.staticPreview) {
      if (this.shadow) this.shadow.setPosition(this.sprite.x, this.sprite.y + 2);
      return;
    }

    if (this.shadow) this.shadow.setPosition(this.sprite.x, this.sprite.y + 2);

    const onFloor = this.body.blocked.down || this.body.touching.down;
    this.coyote = onFloor ? 80 : Math.max(0, this.coyote - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.stompProtect = Math.max(0, this.stompProtect - dt);
    if (onFloor) this.jumping = false;

    let dir = this.touchDir;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dir = -1;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) dir = 1;

    const keyJumpDown =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.W);
    const keyJumpHeld =
      this.cursors.up.isDown ||
      this.cursors.space.isDown ||
      this.wasd.W.isDown;

    const jumpPressed = keyJumpDown || this.wantJump;
    this.wantJump = false;
    const jumpHeld = keyJumpHeld || this.jumpHeld;
    const hasInput = dir !== 0 || jumpPressed || jumpHeld;

    if (hasInput || !onFloor || this.invuln > 0) {
      if (this.dancing) this.stopDance();
      else this.idleMs = 0;
    } else {
      this.idleMs += dt;
      if (!this.dancing && this.idleMs >= IDLE_DANCE_MS) {
        this.dancing = true;
        this.danceT = 0;
      }
    }

    if (dir !== 0) {
      this.sprite.setVelocityX(dir * this.speed);
      this.facing = dir;
    } else if (onFloor) {
      this.sprite.setVelocityX(0);
    }

    if (jumpPressed && this.coyote > 0) {
      this.sprite.setVelocityY(this.jumpSpeed);
      this.coyote = 0;
      this.jumping = true;
      this.scene.sound.play('jump', { volume: 0.4 });
    }

    if (this.jumping && !jumpHeld && this.body.velocity.y < -40) {
      this.sprite.setVelocityY(this.body.velocity.y * this.jumpCutMult);
      this.jumping = false;
    }
    if (this.body.velocity.y >= 0) this.jumping = false;

    // Animaciones: caminata mira a la derecha; izquierda se voltea
    if (!onFloor || this.jumping || this.body.velocity.y < -40) {
      this.playAnim('oly-jump');
      this.sprite.setFlipX(this.facing < 0);
    } else if (dir !== 0) {
      this.playAnim('oly-walk');
      this.sprite.setFlipX(dir < 0);
    } else if (this.dancing) {
      this.danceT += dt;
      const t = this.danceT * 0.005;
      const hop = Math.abs(Math.sin(t * 2.4));
      this.playAnim('oly-walk');
      this.sprite.setFlipX(Math.sin(t) < 0);
      this.sprite.setAngle(Math.sin(t * 1.2) * 4);
      this.shadow?.setScale(1 + hop * 0.1, 1);
    } else {
      this.playAnim('oly-idle');
      this.sprite.setFlipX(this.facing < 0);
      this.sprite.setAngle(0);
    }

    const flicker = this.invuln > 0 && Math.floor(this.invuln / 80) % 2 === 0;
    this.sprite.setAlpha(flicker ? 0.35 : 1);
  }

  /** Brief grow + no flicker (stomp success, not damage). */
  celebrateStomp() {
    this.stompProtect = Math.max(this.stompProtect, 380);
    const s = this.baseScale || (DISPLAY_H / FRAME_H);
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setScale(s);
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: s * 1.28,
      scaleY: s * 1.28,
      duration: 100,
      yoyo: true,
      ease: 'Back.out',
    });
  }

  hurt() {
    if (this.invuln > 0 || this.stompProtect > 0) return false;
    if (this.dancing) this.stopDance();
    this.invuln = 900;
    this.sprite.setVelocityY(-240);
    this.sprite.setVelocityX(-this.facing * 140);
    this.scene.sound.play('hurt', { volume: 0.45 });
    return true;
  }
}
