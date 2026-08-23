import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { LEVELS } from '../levels.js';
import { Oly } from '../player/Oly.js';
import { startMusic, bindAutoMusic, toggleMusicMute, isMusicMuted } from '../audio.js';
import { buildFaceTexture } from '../faceFromPhoto.js';
import { loadFaceConfig } from '../faceConfig.js';
import { isTouchPlay, setTouchPlayMode } from '../mobile.js';
import { mountVirtualStick, mountJumpButton } from '../touchControls.js';
import { openFaceTune } from '../faceTune.js';

const MAX_HEARTS = 5;
const STAND_ABOVE_PLATFORM = 100;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
  }

  init(data) {
    this.levelIndex = data.level ?? 0;
    this.score = data.score ?? 0;
    this.scoreStart = this.score;
    this.hearts = data.hearts ?? 3;
    this.tookDamageThisLevel = false;
  }

  create() {
    try {
      this.buildLevel();
    } catch (err) {
      console.error('GameScene', err);
      this.add.text(WIDTH / 2, HEIGHT / 2, 'Error al cargar el nivel', {
        fontFamily: 'Fredoka, Arial', fontSize: 22, color: '#ffffff',
      }).setOrigin(0.5);
    }
  }

  buildLevel() {
    this.level = LEVELS[this.levelIndex];
    this.heartsAtLevelStart = this.hearts;
    this.paused = false;
    this.finished = false;
    this.spawn = { ...this.level.spawn };
    this.lastSafe = { ...this.level.spawn };
    this.voidHandling = false;

    this.physics.world.setBounds(0, -80, this.level.worldW, this.level.worldH + 220);
    this.cameras.main.setBounds(0, 0, this.level.worldW, this.level.worldH);
    this.cameras.main.fadeIn(120, 16, 10, 36);

    this.drawSky();
    this.solids = this.physics.add.staticGroup();
    this.movers = this.physics.add.group({ allowGravity: false, immovable: true });
    this.starGroup = this.physics.add.group({ allowGravity: false });
    this.crystalGroup = this.physics.add.group({ allowGravity: false });
    this.enemies = this.physics.add.group({ allowGravity: false });

    this.level.solids.forEach((s) => this.makeSolid(s.x, s.y, s.w, s.h, this.level.ground));
    this.level.pads.forEach((p) => this.makeSolid(p.x, p.y, p.w, 20, 'pad'));
    this.level.movers.forEach((m) => this.makeMover(m));
    this.level.stars.forEach(([x, y]) => this.placeCollect(this.starGroup, x, y, 'star', 0.9));
    this.level.crystals.forEach(([x, y]) => this.placeCollect(this.crystalGroup, x, y, 'crystal', 1));
    this.level.enemies.forEach((e) => this.makeEnemy(e));

    this.crown = this.physics.add.sprite(this.level.crown.x, this.level.crown.y, 'crown-goal');
    this.crown.body.setAllowGravity(false);
    this.tweens.add({ targets: this.crown, y: this.crown.y - 10, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.oly = new Oly(this, this.level.spawn.x, this.level.spawn.y);
    this.cameras.main.startFollow(this.oly.sprite, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(80, 60);
    if (isTouchPlay()) this.cameras.main.setFollowOffset(0, 0);
    this.input.keyboard.addCapture('SPACE,UP,LEFT,RIGHT');

    this.physics.add.collider(this.oly.sprite, this.solids);
    this.physics.add.collider(this.oly.sprite, this.movers);
    this.physics.add.overlap(this.oly.sprite, this.starGroup, (_, star) => this.takeStar(star));
    this.physics.add.overlap(this.oly.sprite, this.crystalGroup, (_, cry) => this.takeCrystal(cry));
    this.physics.add.overlap(this.oly.sprite, this.enemies, (_o, bat) => this.hitEnemy(bat));
    this.physics.add.overlap(this.oly.sprite, this.crown, () => this.winLevel());

    this.input.addPointer(3);
    this.buildHud();
    this.buildTouch();
    this.bindExitButton();
    bindAutoMusic(this);
    startMusic(this);
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-F9', () => openFaceTune(this, 'game'));
    this.portraitHold = false;
    this.onOrient = () => this.syncPortraitHold();
    window.addEventListener('orientationchange', this.onOrient);
    window.addEventListener('resize', this.onOrient);
    this.syncPortraitHold();
    this.scene.stop('menu');
    this.scene.stop('credits');
    this.events.once('shutdown', () => {
      this.hideBanner();
      this.unbindExitButton();
      this.destroyTouch();
      window.removeEventListener('orientationchange', this.onOrient);
      window.removeEventListener('resize', this.onOrient);
      if (this.onCameraResize) this.scale.off('resize', this.onCameraResize);
    });
    const portada = document.getElementById('portada');
    if (portada) portada.classList.remove('open');
    this.hideBanner();
  }

  drawSky() {
    const g = this.add.graphics().setScrollFactor(0).setDepth(-10);
    g.fillGradientStyle(this.level.sky[0], this.level.sky[0], this.level.sky[1], this.level.sky[1], 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);
    for (let i = 0; i < 8; i += 1) {
      this.add.image(150 + i * 140, 70 + (i % 3) * 28, 'cloud').setScrollFactor(0.15).setAlpha(0.75).setDepth(-9);
    }
  }

  makeSolid(x, y, w, h, key) {
    const plat = this.add.tileSprite(x + w / 2, y + h / 2, w, h, key);
    this.physics.add.existing(plat, true);
    if (plat.body.updateFromGameObject) plat.body.updateFromGameObject();
    this.solids.add(plat);
    return plat;
  }

  makeMover(m) {
    const plat = this.add.tileSprite(m.x + m.w / 2, m.y + 10, m.w, 20, 'pad');
    this.physics.add.existing(plat);
    plat.body.setAllowGravity(false);
    plat.body.setImmovable(true);
    plat.body.setVelocityX(m.speed ?? 110);
    plat.minX = m.minX + m.w / 2;
    plat.maxX = m.maxX + m.w / 2;
    plat.patrolSpeed = m.speed ?? 110;
    this.movers.add(plat);
    return plat;
  }

  placeCollect(group, x, y, key, scale) {
    const s = group.create(x, y, key);
    s.setScale(scale);
    s.body.setAllowGravity(false);
    s.body.setSize(Math.max(22, s.displayWidth), Math.max(22, s.displayHeight));
    this.tweens.add({
      targets: s,
      y: y - 8,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    if (key === 'star') {
      this.tweens.add({ targets: s, angle: 360, duration: 2400, repeat: -1 });
    }
  }

  makeEnemy(def) {
    const bat = this.enemies.create(def.x, def.y, 'bat-0');
    bat.play('bat-fly');
    bat.body.setAllowGravity(false);
    bat.body.setSize(28, 20);
    bat.minX = def.minX;
    bat.maxX = def.maxX;
    bat.speed = def.speed ?? 90;
    bat.dir = 1;
    return bat;
  }

  buildHud() {
    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(20);
    this.heartIcons = [];
    const heartsX = isTouchPlay() ? 88 : 24;
    for (let i = 0; i < MAX_HEARTS; i += 1) {
      const h = this.add.image(heartsX + i * 32, 24, 'heart');
      this.heartIcons.push(h);
      this.hud.add(h);
    }
    this.refreshHearts();
    this.scoreLabel = this.add.text(WIDTH - 20, 12, 'Puntos', {
      fontFamily: 'Fredoka, Arial', fontSize: 15, color: '#5b2b16',
    }).setOrigin(1, 0);
    this.scoreText = this.add.text(WIDTH - 20, 28, String(this.score), {
      fontFamily: 'Fredoka, Arial', fontSize: 26, color: '#5b2b16',
      stroke: '#ffd76a', strokeThickness: 5,
    }).setOrigin(1, 0);
    this.levelText = this.add.text(WIDTH / 2, 22, this.level.title, {
      fontFamily: 'Fredoka, Arial', fontSize: 26, color: '#fff7fb',
      stroke: '#5b2b16', strokeThickness: 6,
    }).setOrigin(0.5);
    this.hint = this.add.text(WIDTH / 2, 52, this.level.hint, {
      fontFamily: 'Fredoka, Arial', fontSize: 16, color: '#5b2b16',
    }).setOrigin(0.5);
    this.hud.add([this.scoreLabel, this.scoreText, this.levelText, this.hint]);
    this.time.delayedCall(4000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 500 }));

    if (!isTouchPlay()) {
      this.keysHint = this.add.text(WIDTH / 2, HEIGHT - 18, '← → mover · ESPACIO saltar · ESC pausa', {
        fontFamily: 'Fredoka, Arial', fontSize: 14, color: '#fff7fb',
        backgroundColor: 'rgba(22, 12, 36, 0.55)',
        padding: { x: 8, y: 3 },
      }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(21).setAlpha(0.85);
      this.time.delayedCall(5000, () => this.tweens.add({ targets: this.keysHint, alpha: 0, duration: 600 }));
    }

    this.pauseBtn = this.add.text(WIDTH - 20, 58, 'II', {
      fontFamily: 'Fredoka, Arial', fontSize: 16, color: '#5b2b16', backgroundColor: '#ffd76a',
      padding: { x: 7, y: 3 },
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(21).setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerdown', () => this.togglePause());

    if (!isTouchPlay()) {
      this.muteBtn = this.add.text(WIDTH - 68, 58, isMusicMuted() ? '🔇' : '🔊', {
        fontFamily: 'Arial', fontSize: 18,
      }).setScrollFactor(0).setDepth(21).setInteractive({ useHandCursor: true });
      this.muteBtn.on('pointerdown', () => {
        const muted = toggleMusicMute();
        this.muteBtn.setText(muted ? '🔇' : '🔊');
      });
    }
  }

  refreshHearts() {
    this.heartIcons.forEach((icon, i) => {
      icon.setTexture(i < this.hearts ? 'heart' : 'heart-empty');
      icon.setVisible(i < Math.max(3, this.hearts));
    });
  }

  buildTouch() {
    if (!isTouchPlay()) return;
    this.buildHtmlTouch();
    this.applyCameraInset();
  }

  bindExitButton() {
    this.exitBtn = document.getElementById('btn-exit-game');
    if (!this.exitBtn) return;
    this.exitBtn.classList.add('open');
    this.onExitClick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      this.confirmExit();
    };
    this.exitBtn.addEventListener('click', this.onExitClick);
  }

  unbindExitButton() {
    if (this.exitBtn && this.onExitClick) {
      this.exitBtn.removeEventListener('click', this.onExitClick);
    }
    if (this.exitBtn) this.exitBtn.classList.remove('open');
    this.exitBtn = null;
    this.onExitClick = null;
  }

  confirmExit() {
    if (this.finished) return;
    this.paused = true;
    this.physics.pause();
    this.showBanner('¿Salir al menú?', () => {
      this.paused = false;
      this.hideBanner();
      this.physics.resume();
    }, 'Seguir jugando', {
      quitLabel: 'Salir',
      onQuit: () => this.exitToMenu(),
    });
  }

  exitToMenu() {
    this.finished = true;
    this.paused = false;
    this.hideBanner();
    this.unbindExitButton();
    this.destroyTouch();
    this.scene.start('menu');
  }

  buildHtmlTouch() {
    this.touchBar = document.getElementById('touch');
    if (!this.touchBar) return;
    this.touchBar.classList.add('open');
    setTouchPlayMode(true);

    this.unmountStick = mountVirtualStick(this.touchBar, (dir) => {
      if (this.oly) this.oly.setTouchDir(dir);
    });
    this.unmountJump = mountJumpButton(
      document.getElementById('touch-jump'),
      () => { if (this.oly) this.oly.requestJump(); },
    );

    this.time.delayedCall(0, () => {
      this.scale.refresh();
      this.applyCameraInset();
    });
  }

  destroyTouch() {
    if (this.unmountStick) this.unmountStick();
    if (this.unmountJump) this.unmountJump();
    this.unmountStick = null;
    this.unmountJump = null;
    if (this.touchBar) this.touchBar.classList.remove('open');
    this.touchBar = null;
    if (this.oly) this.oly.setTouchDir(0);
    setTouchPlayMode(false);
    const cam = this.cameras.main;
    if (cam) {
      cam.setViewport(0, 0, this.scale.width, this.scale.height);
      cam.setFollowOffset(0, 0);
    }
    this.scale.refresh();
  }

  applyCameraInset() {
    const cam = this.cameras.main;
    this.onCameraResize = () => {
      const w = this.scale.width;
      const h = this.scale.height;
      cam.setViewport(0, 0, w, h);
      cam.setFollowOffset(0, 0);
    };
    this.onCameraResize();
    this.scale.on('resize', this.onCameraResize);
  }

  addScore(points, x, y) {
    this.score += points;
    if (this.scoreText) this.scoreText.setText(String(this.score));
    if (x == null) return;
    const pop = this.add.text(x, y, `+${points}`, {
      fontFamily: 'Fredoka, Arial',
      fontSize: 22,
      color: '#ffd76a',
      stroke: '#5b2b16',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: pop,
      y: y - 42,
      alpha: 0,
      duration: 700,
      ease: 'Sine.out',
      onComplete: () => pop.destroy(),
    });
  }

  takeStar(star) {
    if (!star.active) return;
    star.disableBody(true, true);
    this.addScore(100, star.x, star.y);
    this.sound.play('star', { volume: 0.4 });
    this.burst(star.x, star.y, 0xffd76a);
  }

  takeCrystal(cry) {
    if (!cry.active) return;
    cry.disableBody(true, true);
    this.addScore(250, cry.x, cry.y);
    this.sound.play('crystal', { volume: 0.45 });
    this.burst(cry.x, cry.y, 0x7ef0ff);
  }

  burst(x, y, color) {
    for (let i = 0; i < 8; i += 1) {
      const p = this.add.image(x, y, 'spark').setTint(color);
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-30, 30),
        y: y + Phaser.Math.Between(-30, 30),
        alpha: 0,
        duration: 380,
        onComplete: () => p.destroy(),
      });
    }
  }

  hitEnemy(bat) {
    if (!bat.active || this.finished) return;
    const stomp = this.oly.body.velocity.y > 60 && this.oly.y < bat.y - 4;
    if (stomp) {
      bat.disableBody(true, true);
      this.oly.sprite.setVelocityY(-280);
      this.sound.play('stomp', { volume: 0.45 });
      this.addScore(150, bat.x, bat.y);
      this.burst(bat.x, bat.y, 0xc77dff);
      return;
    }
    if (this.oly.hurt()) this.loseHeart();
  }

  findSafeRespawn(x, refY = this.lastSafe.y) {
    const platforms = [
      ...this.level.solids.map((s) => ({ x: s.x, y: s.y, w: s.w })),
      ...this.level.pads.map((p) => ({ x: p.x, y: p.y, w: p.w })),
    ];
    let best = { ...this.level.spawn };
    let bestScore = Infinity;
    for (const plat of platforms) {
      if (x < plat.x - 20 || x > plat.x + plat.w + 20) continue;
      const standY = plat.y - STAND_ABOVE_PLATFORM;
      const standX = Phaser.Math.Clamp(x, plat.x + 24, plat.x + plat.w - 24);
      const score = Math.abs(standY - refY) + Math.abs(standX - x) * 0.15;
      if (score < bestScore) {
        bestScore = score;
        best = { x: standX, y: standY };
      }
    }
    return best;
  }

  respawnOly(preferredX = this.lastSafe.x) {
    const safe = this.findSafeRespawn(preferredX, this.lastSafe.y);
    this.lastSafe = { ...safe };
    this.oly.setPosition(safe.x, safe.y);
    this.oly.body.setVelocity(0, 0);
  }

  loseHeart() {
    this.tookDamageThisLevel = true;
    this.hearts -= 1;
    this.refreshHearts();
    if (this.hearts <= 0) {
      this.time.delayedCall(200, () => this.restartLevel('¡Uy! Una vez más'));
    } else {
      this.time.delayedCall(200, () => this.respawnOly());
    }
  }

  fallIntoVoid() {
    if (this.voidHandling || this.finished) return;
    this.voidHandling = true;
    if (this.oly.invuln > 0) {
      this.respawnOly();
      return;
    }
    this.oly.invuln = 900;
    this.tookDamageThisLevel = true;
    this.hearts -= 1;
    this.refreshHearts();
    if (this.hearts <= 0) {
      this.restartLevel('¡Uy! Una vez más');
      return;
    }
    this.respawnOly();
  }

  restartLevel(msg) {
    this.finished = true;
    this.physics.pause();
    this.showBanner(msg, () => {
      this.hideBanner();
      this.scene.restart({ level: this.levelIndex, score: this.scoreStart, hearts: 3 });
    }, 'Seguir');
  }

  winLevel() {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    this.sound.play('win', { volume: 0.5 });

    let heartGain = 1;
    if (!this.tookDamageThisLevel) heartGain += 1;
    const heartsBefore = this.hearts;
    this.hearts = Math.min(MAX_HEARTS, this.hearts + heartGain);
    const heartsGained = this.hearts - heartsBefore;

    const bonus = 500 + this.hearts * 100;
    this.addScore(bonus);
    const last = this.levelIndex >= LEVELS.length - 1;
    try {
      const best = Number(localStorage.getItem('oly-best-score') || 0);
      if (this.score > best) localStorage.setItem('oly-best-score', String(this.score));
    } catch {
      /* ignore */
    }
    const lifeMsg = heartsGained > 1
      ? `¡+${heartsGained} vidas!`
      : heartsGained === 1
        ? '¡+1 vida!'
        : '';
    const msg = last
      ? `¡Olympia es la princesa del castillo!${lifeMsg ? `\n${lifeMsg}` : ''}`
      : `¡Muy bien, Oly! Nivel ${this.levelIndex + 1} listo${lifeMsg ? `\n${lifeMsg}` : ''}`;
    this.showBanner(msg, () => {
      this.hideBanner();
      if (last) {
        this.destroyTouch();
        this.scene.start('menu');
      } else {
        this.scene.restart({ level: this.levelIndex + 1, score: this.score, hearts: this.hearts });
      }
    }, last ? 'Volver al menú' : 'Siguiente nivel');
  }

  showBanner(title, onOk, okLabel = 'Seguir', options = {}) {
    const el = document.getElementById('banner');
    const titleEl = document.getElementById('banner-title');
    const scoreEl = document.getElementById('banner-score');
    const btn = document.getElementById('banner-ok');
    const quitBtn = document.getElementById('banner-quit');
    if (!el || !btn || !titleEl) {
      onOk();
      return;
    }
    this.hideBanner();
    titleEl.textContent = title;
    if (scoreEl) scoreEl.textContent = `Puntos: ${this.score}`;
    btn.textContent = okLabel;
    el.classList.add('open');
    this.bannerOk = onOk;
    this.onBannerClick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (this.bannerOk) this.bannerOk();
    };
    btn.addEventListener('click', this.onBannerClick);

    if (options.onQuit && quitBtn) {
      quitBtn.hidden = false;
      quitBtn.textContent = options.quitLabel || 'Salir al menú';
      this.bannerQuit = options.onQuit;
      this.onBannerQuitClick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (this.bannerQuit) this.bannerQuit();
      };
      quitBtn.addEventListener('click', this.onBannerQuitClick);
    } else if (quitBtn) {
      quitBtn.hidden = true;
    }
  }

  hideBanner() {
    const el = document.getElementById('banner');
    const btn = document.getElementById('banner-ok');
    const quitBtn = document.getElementById('banner-quit');
    if (btn && this.onBannerClick) btn.removeEventListener('click', this.onBannerClick);
    if (quitBtn && this.onBannerQuitClick) quitBtn.removeEventListener('click', this.onBannerQuitClick);
    this.onBannerClick = null;
    this.onBannerQuitClick = null;
    this.bannerOk = null;
    this.bannerQuit = null;
    if (el) el.classList.remove('open');
  }

  isPhonePortrait() {
    return window.matchMedia('(orientation: portrait)').matches && window.innerWidth <= 900;
  }

  syncPortraitHold() {
    if (this.finished) return;
    const portrait = this.isPhonePortrait();
    if (portrait && !this.portraitHold) {
      this.portraitHold = true;
      this.physics.pause();
    } else if (!portrait && this.portraitHold) {
      this.portraitHold = false;
      if (!this.paused) this.physics.resume();
    }
  }

  refreshOlyFace() {
    if (!this.oly) return;
    const cfg = loadFaceConfig();
    buildFaceTexture(this, 'oly-face-photo-src', 'oly-face', cfg);
    this.oly.applyFaceLayout(cfg);
  }

  togglePause() {
    if (this.finished) return;
    if (this.paused) {
      this.paused = false;
      this.hideBanner();
      this.physics.resume();
      return;
    }
    this.paused = true;
    this.physics.pause();
    this.showBanner('Pausa', () => {
      this.paused = false;
      this.hideBanner();
      this.physics.resume();
    }, 'Seguir', {
      quitLabel: 'Salir al menú',
      onQuit: () => this.exitToMenu(),
    });
  }

  update(t, dt) {
    if (this.paused || this.portraitHold || this.finished || !this.oly) return;
    this.oly.update(t, dt);

    this.movers.children.iterate((plat) => {
      if (!plat) return;
      const spd = plat.patrolSpeed || 110;
      if (plat.x > plat.maxX) plat.body.setVelocityX(-spd);
      if (plat.x < plat.minX) plat.body.setVelocityX(spd);
    });
    this.enemies.children.iterate((bat) => {
      if (!bat || !bat.active) return;
      bat.x += bat.dir * bat.speed * (dt / 1000);
      if (bat.x > bat.maxX) { bat.dir = -1; bat.scaleX = -1; }
      if (bat.x < bat.minX) { bat.dir = 1; bat.scaleX = 1; }
    });

    if (this.oly.body.blocked.down || this.oly.body.touching.down) {
      this.voidHandling = false;
      this.lastSafe = this.findSafeRespawn(this.oly.x, this.oly.y);
    }
    if (this.oly.y > this.level.worldH + 20) {
      this.fallIntoVoid();
    }
  }
}
