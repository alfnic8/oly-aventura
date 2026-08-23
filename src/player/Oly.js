import Phaser from 'phaser';

export class Oly {
  constructor(scene, x, y) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, 'oly-hit');
    this.sprite.setVisible(false);
    this.sprite.setSize(26, 52);
    this.sprite.setOffset(3, 2);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setMaxVelocity(240, 700);
    this.sprite.setDragX(1600);

    this.shadow = scene.add.ellipse(0, 24, 34, 10, 0x000000, 0.18);
    this.bodySpr = scene.add.image(0, -14, 'oly-body');
    this.halo = scene.add.circle(4, -40, 17, 0xffe38a, 0);
    this.halo.setStrokeStyle(3, 0xffd76a, 0.85);
    this.face = scene.add.image(4, -40, 'oly-face');
    this.face.setDisplaySize(36, 36);
    this.crown = scene.add.image(5, -54, 'oly-crown');

    this.view = scene.add.container(x, y, [this.shadow, this.bodySpr, this.halo, this.face, this.crown]);
    this.view.setDepth(5);
    this.view.setScale(1, 1);

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys('W,A,S,D');
    this.speed = 220;
    this.jumpSpeed = -560;
    this.touchDir = 0;
    this.wantJump = false;
    this.coyote = 0;
    this.invuln = 0;
    this.facing = 1;
    this.bob = 0;
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
  get body() { return this.sprite.body; }
  get active() { return this.sprite.active; }

  setPosition(x, y) {
    this.sprite.setPosition(x, y);
    this.view.setPosition(x, y);
  }

  setTouchDir(dir) {
    this.touchDir = dir;
  }

  requestJump() {
    this.wantJump = true;
  }

  update(_, dt) {
    this.view.setPosition(this.sprite.x, this.sprite.y);

    const onFloor = this.body.blocked.down || this.body.touching.down;
    this.coyote = onFloor ? 80 : Math.max(0, this.coyote - dt);
    this.invuln = Math.max(0, this.invuln - dt);

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

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.W) ||
      this.wantJump;
    this.wantJump = false;

    if (jumpPressed && this.coyote > 0) {
      this.sprite.setVelocityY(this.jumpSpeed);
      this.coyote = 0;
      this.scene.sound.play('jump', { volume: 0.4 });
    }

    this.bob += dt * 0.012;
    const bounce = onFloor && dir !== 0 ? Math.sin(this.bob) * 2 : 0;
    this.bodySpr.y = -14 + bounce;
    this.face.setPosition(4, -40 + bounce);
    this.halo.setPosition(4, -40 + bounce);
    this.crown.setPosition(5, -54 + bounce);

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
