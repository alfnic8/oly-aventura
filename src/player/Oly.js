import Phaser from 'phaser';
import { loadFaceConfig } from '../faceConfig.js';

export class Oly {
  constructor(scene, x, y, options = {}) {
    this.scene = scene;
    this.faceCfg = loadFaceConfig();
    this.staticPreview = options.static === true;

    if (this.staticPreview) {
      this.sprite = {
        x,
        y,
        active: true,
        body: {
          blocked: { down: true },
          touching: { down: true },
          setAllowGravity() {},
          setVelocity() {},
        },
        setPosition(px, py) {
          this.x = px;
          this.y = py;
        },
        setVisible() {},
        setImmovable() {},
        setCollideWorldBounds() {},
        setSize() {},
        setOffset() {},
        setMaxVelocity() {},
        setDragX() {},
      };
    } else {
      this.sprite = scene.physics.add.sprite(x, y, 'oly-hit');
      this.sprite.setVisible(false);
      this.sprite.setSize(26, 52);
      this.sprite.setOffset(3, 2);
      this.sprite.setCollideWorldBounds(true);
      this.sprite.setMaxVelocity(240, 700);
      this.sprite.setDragX(1600);
    }

    this.shadow = scene.add.ellipse(0, 24, 34, 10, 0x000000, 0.18);
    this.bodySpr = scene.add.image(0, -14, 'oly-body');
    this.halo = scene.add.circle(4, -41, 17, 0xffe38a, 0);
    this.halo.setStrokeStyle(3, 0xffd76a, 0.85);
    this.face = scene.add.image(4, -41, 'oly-face');
    this.crown = scene.add.image(5, -56, 'oly-crown');
    this.applyFaceLayout(this.faceCfg);

    this.view = scene.add.container(x, y, [this.shadow, this.bodySpr, this.halo, this.face, this.crown]);
    this.view.setDepth(5);
    this.view.setScale(1, 1);

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
    this.facing = 1;
    this.bob = 0;
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
  get body() { return this.sprite.body; }
  get active() { return this.sprite.active; }

  applyFaceLayout(cfg = this.faceCfg) {
    this.faceCfg = cfg;
    const s = cfg.spriteSize;
    this.face.setDisplaySize(s, s);
    this.face.setPosition(cfg.spriteX, cfg.spriteY);
    this.halo.setPosition(cfg.spriteX, cfg.spriteY);
    this.halo.radius = s * 0.49;
    const crownX = cfg.crownX ?? cfg.spriteX;
    const crownY = cfg.crownY ?? cfg.spriteY - 15;
    this.crown.setPosition(crownX, crownY);
  }

  setPosition(x, y) {
    this.sprite.setPosition(x, y);
    this.view.setPosition(x, y);
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

  update(_, dt) {
    if (this.staticPreview) return;
    this.view.setPosition(this.sprite.x, this.sprite.y);

    const onFloor = this.body.blocked.down || this.body.touching.down;
    this.coyote = onFloor ? 80 : Math.max(0, this.coyote - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    if (onFloor) this.jumping = false;

    let dir = this.touchDir;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dir = -1;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) dir = 1;

    if (dir !== 0) {
      this.sprite.setVelocityX(dir * this.speed);
      this.facing = dir;
      this.view.setScale(dir, 1);
    } else if (onFloor) {
      this.sprite.setVelocityX(0);
    }

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

    if (jumpPressed && this.coyote > 0) {
      this.sprite.setVelocityY(this.jumpSpeed);
      this.coyote = 0;
      this.jumping = true;
      this.scene.sound.play('jump', { volume: 0.4 });
    }

    // Soltar temprano = salto corto; mantener = altura completa
    if (this.jumping && !jumpHeld && this.body.velocity.y < -40) {
      this.sprite.setVelocityY(this.body.velocity.y * this.jumpCutMult);
      this.jumping = false;
    }
    if (this.body.velocity.y >= 0) this.jumping = false;

    this.bob += dt * 0.012;
    const bounce = onFloor && dir !== 0 ? Math.sin(this.bob) * 2 : 0;
    this.bodySpr.y = -14 + bounce;
    this.face.setPosition(this.faceCfg.spriteX, this.faceCfg.spriteY + bounce);
    this.halo.setPosition(this.faceCfg.spriteX, this.faceCfg.spriteY + bounce);
    this.halo.radius = this.faceCfg.spriteSize * 0.49;
    const crownX = this.faceCfg.crownX ?? this.faceCfg.spriteX;
    const crownY = this.faceCfg.crownY ?? this.faceCfg.spriteY - 15;
    this.crown.setPosition(crownX, crownY + bounce);

    const flicker = this.invuln > 0 && Math.floor(this.invuln / 80) % 2 === 0;
    this.view.setAlpha(flicker ? 0.35 : 1);
  }

  hurt() {
    if (this.invuln > 0) return false;
    this.invuln = 900;
    this.sprite.setVelocityY(-240);
    this.sprite.setVelocityX(-this.facing * 140);
    this.scene.sound.play('hurt', { volume: 0.45 });
    return true;
  }
}
