import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { LEVELS } from '../levels.js';
import { Oly } from '../player/Oly.js';
import { startMusic, toggleMusicMute, isMusicMuted } from '../audio.js';
import { buildFaceTexture } from '../faceFromPhoto.js';
import { loadFaceConfig } from '../faceConfig.js';
import { isTouchPlay, setTouchPlayMode, refreshGameScale, resetGameShell } from '../mobile.js';
import { mountVirtualStick, mountJumpButton } from '../touchControls.js';
import { openFaceTune } from '../faceTune.js';
import { unlockLetterForLevel } from '../olyLetters.js';
import { Puppy } from '../npc/Puppy.js';

const MAX_HEARTS = 5;
const STAND_ABOVE_PLATFORM = 4;
/** Extra life every N points (stars, crystals, stomps, bonuses). */
const HEART_SCORE_STEP = 5000;

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
    this._gameOverShown = false;
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
    if (isTouchPlay()) setTouchPlayMode(true);
    this.level = LEVELS[this.levelIndex];
    this.heartsAtLevelStart = this.hearts;
    this.paused = false;
    this.finished = false;
    /* On mobile, start further right so Oly isn't behind the stick */
    const spawnPadX = isTouchPlay() ? 120 : 0;
    this.spawn = {
      x: this.level.spawn.x + spawnPadX,
      y: this.level.spawn.y,
    };
    this.lastSafe = { ...this.spawn };
    this.voidHandling = false;
    this.voidGraceUntil = 0;
    this.nextHeartAt = Math.floor(this.score / HEART_SCORE_STEP) * HEART_SCORE_STEP + HEART_SCORE_STEP;

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
    this.puppies = [];
    (this.level.npcs || []).forEach((npc) => {
      if (npc.type !== 'puppy') return;
      const pup = new Puppy(this, npc);
      if (npc.rideMover != null) {
        pup.attachTo(this.movers.getChildren()[npc.rideMover]);
      }
      this.puppies.push(pup);
    });

    const goalKey = this.level.crown.key || 'crown-goal';
    this.crown = this.physics.add.sprite(this.level.crown.x, this.level.crown.y, goalKey);
    this.crown.body.setAllowGravity(false);
    if (goalKey === 'doll-goal') {
      this.crown.setOrigin(0.5, 1);
      this.crown.setDisplaySize(72, 80);
      const bw = 40;
      const bh = 56;
      this.crown.body.setSize(bw, bh);
      this.crown.body.setOffset((this.crown.width - bw) / 2, this.crown.height - bh);
    }
    this.tweens.add({ targets: this.crown, y: this.crown.y - 10, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.oly = new Oly(this, this.spawn.x, this.spawn.y);
    this.cameras.main.startFollow(this.oly.sprite, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(80, 60);
    /* Raise + shift right so Oly sits clear of overlaid touch controls */
    if (isTouchPlay()) this.cameras.main.setFollowOffset(96, -48);
    this.input.keyboard.addCapture('SPACE,UP,LEFT,RIGHT');

    this.physics.add.collider(this.oly.sprite, this.solids);
    this.physics.add.collider(this.oly.sprite, this.movers);
    this.physics.add.overlap(this.oly.sprite, this.starGroup, (_, star) => this.takeStar(star));
    this.physics.add.overlap(this.oly.sprite, this.crystalGroup, (_, cry) => this.takeCrystal(cry));
    this.physics.add.overlap(this.oly.sprite, this.enemies, (_o, bat) => this.hitEnemy(bat));
    this.physics.add.overlap(this.oly.sprite, this.crown, () => this.winLevel());

    this.input.addPointer(3);
    this.bindExitButton();
    this.buildHud();
    this.buildTouch();
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
      this.unbindMobileHud();
      this.destroyTouch();
      this.puppies?.forEach((p) => p.destroy());
      this.puppies = [];
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
    const body = plat.body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setVelocity(0, 0);
    body.moves = false;
    plat.axis = m.axis === 'y' ? 'y' : 'x';
    plat.patrolSpeed = m.speed ?? 110;
    plat.dir = 1;
    plat.carryDx = 0;
    plat.carryDy = 0;
    if (plat.axis === 'y') {
      plat.minY = (m.minY ?? m.y) + 10;
      plat.maxY = (m.maxY ?? m.y) + 10;
      plat.minX = plat.x;
      plat.maxX = plat.x;
    } else {
      plat.minX = m.minX + m.w / 2;
      plat.maxX = m.maxX + m.w / 2;
      plat.minY = plat.y;
      plat.maxY = plat.y;
    }
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
    /* Hitbox solo del cuerpo (no alas) — evita golpes “fantasma” */
    bat.body.setSize(20, 18);
    bat.body.setOffset(16, 9);
    bat.minX = def.minX;
    bat.maxX = def.maxX;
    bat.speed = def.speed ?? 90;
    bat.dir = 1;
    bat.baseY = def.y;
    bat.erratic = def.erratic === true || def.mode === 'erratic';
    bat.phase = Math.random() * Math.PI * 2;
    bat.bobAmp = def.bobAmp ?? (bat.erratic ? 22 : 0);
    bat.bobFreq = def.bobFreq ?? (2.2 + Math.random() * 1.1);
    if (def.minY != null) bat.minY = def.minY;
    if (def.maxY != null) bat.maxY = def.maxY;
    return bat;
  }

  buildHud() {
    const touch = isTouchPlay();
    this.heartIcons = [];
    for (let i = 0; i < MAX_HEARTS; i += 1) {
      const h = this.add.image(24 + i * 32, 24, 'heart').setScrollFactor(0).setDepth(20);
      if (touch) h.setVisible(false);
      this.heartIcons.push(h);
    }

    this.scoreLabel = this.add.text(WIDTH - 20, 12, 'Puntos', {
      fontFamily: 'Fredoka, Arial', fontSize: 15, color: '#5b2b16',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(20);
    this.scoreText = this.add.text(WIDTH - 20, 28, String(this.score), {
      fontFamily: 'Fredoka, Arial', fontSize: 26, color: '#5b2b16',
      stroke: '#ffd76a', strokeThickness: 5,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(20);

    if (touch) {
      this.scoreLabel.setVisible(false);
      this.scoreText.setVisible(false);
    }

    this.levelText = this.add.text(WIDTH / 2, touch ? 52 : 22, this.level.title, {
      fontFamily: 'Fredoka, Arial', fontSize: touch ? 20 : 26, color: '#fff7fb',
      stroke: '#5b2b16', strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
    this.hint = this.add.text(WIDTH / 2, touch ? 78 : 52, this.level.hint, {
      fontFamily: 'Fredoka, Arial', fontSize: 16, color: '#5b2b16',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
    this.time.delayedCall(4000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 500 }));

    if (!touch) {
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
    if (touch) this.pauseBtn.setVisible(false);

    if (!touch) {
      this.muteBtn = this.add.text(WIDTH - 68, 58, isMusicMuted() ? '🔇' : '🔊', {
        fontFamily: 'Arial', fontSize: 18,
      }).setScrollFactor(0).setDepth(21).setInteractive({ useHandCursor: true });
      this.muteBtn.on('pointerdown', () => {
        const muted = toggleMusicMute();
        this.muteBtn.setText(muted ? '🔇' : '🔊');
      });
    }

    this.refreshHearts();
    this.bindMobileHud();
  }

  bindMobileHud() {
    this.mobileHud = document.getElementById('mobile-hud');
    this.mobileHudHearts = document.getElementById('mobile-hud-hearts');
    this.mobileHudScore = document.getElementById('mobile-hud-score-value');
    if (!this.mobileHud || !isTouchPlay()) return;
    this.mobileHud.classList.add('open');
    this.syncMobileHud();
  }

  unbindMobileHud() {
    if (this.mobileHud) this.mobileHud.classList.remove('open');
    this.mobileHud = null;
    this.mobileHudHearts = null;
    this.mobileHudScore = null;
  }

  syncMobileHud() {
    if (!this.mobileHud || !isTouchPlay()) return;
    if (this.mobileHudHearts) {
      const count = Math.max(3, this.hearts);
      let html = '';
      for (let i = 0; i < count; i += 1) {
        html += `<span class="mh-heart${i < this.hearts ? '' : ' empty'}" aria-hidden="true">♥</span>`;
      }
      this.mobileHudHearts.innerHTML = html;
    }
    if (this.mobileHudScore) this.mobileHudScore.textContent = String(this.score);
  }

  refreshHearts() {
    this.heartIcons.forEach((icon, i) => {
      icon.setTexture(i < this.hearts ? 'heart' : 'heart-empty');
      icon.setVisible(!isTouchPlay() && i < Math.max(3, this.hearts));
    });
    this.syncMobileHud();
  }

  buildTouch() {
    if (!isTouchPlay()) return;
    this.buildHtmlTouch();
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
    this.unbindMobileHud();
    this.destroyTouch();
    resetGameShell(this.game);
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
      () => { if (this.oly) this.oly.releaseJump(); },
    );

    this.applyCameraInset();
    refreshGameScale(this.game);
    this.time.delayedCall(50, () => refreshGameScale(this.game));
    this.time.delayedCall(250, () => refreshGameScale(this.game));
  }

  destroyTouch() {
    if (this.unmountStick) this.unmountStick();
    if (this.unmountJump) this.unmountJump();
    this.unmountStick = null;
    this.unmountJump = null;
    this.touchBar = null;
    if (this.oly) this.oly.setTouchDir(0);
    document.getElementById('touch')?.classList.remove('open');
    setTouchPlayMode(false);
    if (this.onCameraResize) {
      this.scale.off('resize', this.onCameraResize);
      this.onCameraResize = null;
    }
    const cam = this.cameras.main;
    if (cam) {
      cam.setViewport(0, 0, WIDTH, HEIGHT);
      cam.setFollowOffset(0, 0);
    }
    refreshGameScale(this.game);
  }

  applyCameraInset() {
    const cam = this.cameras.main;
    if (this.onCameraResize) this.scale.off('resize', this.onCameraResize);
    this.onCameraResize = () => {
      cam.setViewport(0, 0, WIDTH, HEIGHT);
      cam.setFollowOffset(96, -48);
    };
    this.onCameraResize();
    this.scale.on('resize', this.onCameraResize);
  }

  addScore(points, x, y, { grantHearts = true } = {}) {
    this.score += points;
    if (this.scoreText) this.scoreText.setText(String(this.score));
    this.syncMobileHud();
    if (grantHearts) this.checkScoreHearts(x, y);
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

  checkScoreHearts(x, y) {
    let gained = 0;
    while (this.hearts < MAX_HEARTS && this.score >= this.nextHeartAt) {
      this.hearts += 1;
      this.nextHeartAt += HEART_SCORE_STEP;
      gained += 1;
    }
    if (!gained) return;
    this.refreshHearts();
    this.sound.play('win', { volume: 0.45 });
    this.showLifeToast(gained);

    const label = gained > 1
      ? `¡+${gained} VIDAS!  ${this.score} pts`
      : `¡VIDA EXTRA!  ${this.score} pts`;

    const banner = this.add.text(WIDTH / 2, HEIGHT * 0.28, label, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 18,
      color: '#ffea00',
      stroke: '#ff006e',
      strokeThickness: 8,
      align: 'center',
      backgroundColor: '#1a0033cc',
      padding: { x: 16, y: 12 },
    }).setOrigin(0.5).setDepth(60).setScrollFactor(0).setAlpha(0).setScale(0.6);

    this.tweens.add({
      targets: banner,
      alpha: 1,
      scale: 1,
      duration: 320,
      ease: 'Back.out',
    });
    this.tweens.add({
      targets: banner,
      alpha: 0,
      y: HEIGHT * 0.22,
      duration: 700,
      delay: 1600,
      ease: 'Sine.in',
      onComplete: () => banner.destroy(),
    });

    const pop = this.add.text(WIDTH / 2, HEIGHT * 0.42, gained > 1 ? `+${gained} ♥` : '+1 ♥', {
      fontFamily: 'Fredoka, Arial',
      fontSize: 42,
      color: '#ff6b8a',
      stroke: '#fff7fb',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(61).setScrollFactor(0);
    this.tweens.add({
      targets: pop,
      y: HEIGHT * 0.32,
      scale: 1.35,
      alpha: 0,
      duration: 1100,
      ease: 'Sine.out',
      onComplete: () => pop.destroy(),
    });
  }

  showLifeToast(gained = 1) {
    const el = document.getElementById('life-toast');
    if (!el) return;
    el.textContent = gained > 1 ? `¡+${gained} VIDAS!` : '¡VIDA EXTRA!';
    el.classList.add('open');
    clearTimeout(this._lifeToastTimer);
    this._lifeToastTimer = setTimeout(() => {
      el.classList.remove('open');
    }, 2200);
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

  isStomp(bat) {
    const body = this.oly.body;
    const batBody = bat.body;
    if (!body || !batBody) return false;

    const feetY = body.bottom;
    const batTop = batBody.top;
    const batMid = batBody.center.y;
    const batBottom = batBody.bottom;

    /* Zona amplia encima / cabeza del murciélago */
    const inHeadZone = feetY >= batTop - 40 && feetY <= batBottom - 2;
    const fromAbove = feetY <= batMid + 26
      || body.center.y <= batMid + 10
      || this.oly.y <= bat.y + 8;

    const falling = body.velocity.y > 5 || body.deltaY() > 0.5;
    /* Caída lenta o aterrizaje encima (sin exigir mucha velocidad) */
    const landingOnHead = inHeadZone && fromAbove && body.velocity.y >= -30;

    return (fromAbove && falling) || landingOnHead;
  }

  hitEnemy(bat) {
    if (!bat.active || this.finished || bat.getData('stomped')) return;
    const protectedFromHit = this.oly.invuln > 0 || this.oly.stompProtect > 0;
    if (protectedFromHit && !this.isStomp(bat)) return;

    if (this.isStomp(bat)) {
      bat.setData('stomped', true);
      bat.disableBody(true, true);
      this.oly.sprite.setVelocityY(-340);
      this.oly.celebrateStomp();
      this.sound.play('stomp', { volume: 0.45 });
      this.addScore(150, bat.x, bat.y);
      this.burst(bat.x, bat.y, 0xc77dff);
      return;
    }
    if (this.oly.hurt()) this.loseHeart();
  }

  findSafeRespawn(x, refY = this.lastSafe.y) {
    const platforms = [
      ...this.level.solids.map((s) => ({ x: s.x, y: s.y, w: s.w, top: s.y })),
      ...this.level.pads.map((p) => ({ x: p.x, y: p.y, w: p.w, top: p.y })),
    ];
    /* Live mover positions — last gold pad you stood on */
    this.movers?.children?.iterate((plat) => {
      if (!plat?.body) return;
      const w = plat.body.width || plat.displayWidth || 90;
      platforms.push({
        x: plat.x - w / 2,
        y: plat.body.top,
        w,
        top: plat.body.top,
      });
    });

    let best = { ...this.level.spawn };
    let bestScore = Infinity;
    for (const plat of platforms) {
      if (x < plat.x - 48 || x > plat.x + plat.w + 48) continue;
      const standY = plat.top - STAND_ABOVE_PLATFORM;
      const standX = Phaser.Math.Clamp(x, plat.x + 18, plat.x + plat.w - 18);
      const score = Math.abs(standY - refY) + Math.abs(standX - x) * 0.1;
      if (score < bestScore) {
        bestScore = score;
        best = { x: standX, y: standY };
      }
    }
    return best;
  }

  respawnOly(preferredX = this.lastSafe?.x) {
    const anchorX = preferredX ?? this.lastSafe?.x ?? this.level.spawn.x;
    const anchorY = this.lastSafe?.y ?? this.level.spawn.y;
    const safe = this.findSafeRespawn(anchorX, anchorY);
    this.lastSafe = { ...safe };
    const body = this.oly.body;
    if (body?.reset) {
      body.reset(safe.x, safe.y);
    } else {
      this.oly.setPosition(safe.x, safe.y);
      body?.setVelocity(0, 0);
    }
    this.oly.setPosition(safe.x, safe.y);
    body?.setVelocity(0, 0);
    body?.setAcceleration?.(0, 0);
    this.oly.wantJump = false;
    this.oly.jumping = false;
    this.voidHandling = false;
    this.voidGraceUntil = this.time.now + 500;
  }

  loseHeart() {
    this.tookDamageThisLevel = true;
    this.hearts -= 1;
    this.refreshHearts();
    if (this.hearts <= 0) {
      this.time.delayedCall(200, () => this.gameOver());
    } else {
      this.time.delayedCall(200, () => this.respawnOly());
    }
  }

  fallIntoVoid() {
    if (this.finished || !this.oly) return;

    /* During grace after a rescue, keep snapping up instead of re-triggering damage */
    if (this.time.now < (this.voidGraceUntil || 0)) {
      this.respawnOly();
      return;
    }
    if (this.voidHandling) return;
    this.voidHandling = true;

    if (this.oly.invuln <= 0) {
      this.oly.invuln = 1000;
      this.tookDamageThisLevel = true;
      this.hearts -= 1;
      this.refreshHearts();
      if (this.hearts <= 0) {
        this.gameOver();
        return;
      }
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

  gameOver() {
    if (this.finished && this._gameOverShown) return;
    this.finished = true;
    this._gameOverShown = true;
    this.physics.pause();
    this.unbindExitButton();
    this.unbindMobileHud();
    this.destroyTouch();

    try {
      const best = Number(localStorage.getItem('oly-best-score') || 0);
      if (this.score > best) localStorage.setItem('oly-best-score', String(this.score));
    } catch {
      /* ignore */
    }

    this.showBanner('GAME OVER', () => {
      this.hideBanner();
      resetGameShell(this.game);
      this.scene.start('menu');
    }, 'Menú principal', { gameOver: true });
  }

  winLevel() {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    this.sound.play('win', { volume: 0.5 });

    const last = this.levelIndex >= LEVELS.length - 1;
    let bonus = 500;
    if (!this.tookDamageThisLevel) bonus += 300;
    /* Última corona: suma puntos pero no da vida (el juego termina) */
    const heartsBefore = this.hearts;
    this.addScore(bonus, null, null, { grantHearts: !last });
    const gainedLifeFromCrown = !last && this.hearts > heartsBefore;

    try {
      const best = Number(localStorage.getItem('oly-best-score') || 0);
      if (this.score > best) localStorage.setItem('oly-best-score', String(this.score));
    } catch {
      /* ignore */
    }

    const { index, unlocked, justCompleted } = unlockLetterForLevel(this.levelIndex);
    this.unbindExitButton();
    this.unbindMobileHud();
    this.destroyTouch();

    const goReveal = () => {
      this.scene.start('letterReveal', {
        revealIndex: index,
        unlocked,
        justCompleted,
        finale: last,
        preview: false,
        score: this.score,
        continueData: last
          ? { toMenu: true, score: this.score }
          : { level: this.levelIndex + 1, score: this.score, hearts: this.hearts },
      });
    };

    if (gainedLifeFromCrown) {
      this.time.delayedCall(2200, goReveal);
    } else {
      goReveal();
    }
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
    el.classList.toggle('game-over', options.gameOver === true);
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
    if (el) {
      el.classList.remove('open');
      el.classList.remove('game-over');
    }
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
    this.oly.face.setTexture('oly-face');
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
    this.updateMovers(dt);
    this.carryOlyOnMovers();
    this.puppies?.forEach((p) => p.update(t, dt, this.oly.x));

    this.enemies.children.iterate((bat) => {
      if (!bat || !bat.active) return;
      const sec = dt / 1000;
      if (bat.erratic) {
        bat.phase += sec;
        const nx = bat.x + bat.dir * bat.speed * sec;
        let ny = bat.baseY
          + Math.sin(bat.phase * bat.bobFreq) * bat.bobAmp
          + Math.sin(bat.phase * bat.bobFreq * 1.55 + 1.1) * (bat.bobAmp * 0.35);
        if (bat.minY != null && bat.maxY != null) {
          ny = Phaser.Math.Clamp(ny, bat.minY, bat.maxY);
        }
        bat.setPosition(nx, ny);
        if (bat.x > bat.maxX) { bat.dir = -1; bat.setFlipX(true); bat.x = bat.maxX; }
        if (bat.x < bat.minX) { bat.dir = 1; bat.setFlipX(false); bat.x = bat.minX; }
        return;
      }
      bat.x += bat.dir * bat.speed * sec;
      if (bat.x > bat.maxX) { bat.dir = -1; bat.setFlipX(true); }
      if (bat.x < bat.minX) { bat.dir = 1; bat.setFlipX(false); }
    });

    if ((this.oly.body.blocked.down || this.oly.body.touching.down)
      && this.oly.y < this.level.worldH) {
      this.voidHandling = false;
      /* Exact foothold — works for moving pads */
      this.lastSafe = { x: this.oly.x, y: this.oly.y };
    }
    if (this.oly.y > this.level.worldH + 20) {
      this.fallIntoVoid();
    }
  }

  updateMovers(dt) {
    this.movers.children.iterate((plat) => {
      if (!plat || !plat.body) return;
      const spd = plat.patrolSpeed || 110;
      if (!plat.dir) plat.dir = 1;

      const prevX = plat.x;
      const prevY = plat.y;

      if (plat.axis === 'y') {
        if (plat.y >= plat.maxY) plat.dir = -1;
        if (plat.y <= plat.minY) plat.dir = 1;
        plat.y += spd * plat.dir * (dt / 1000);
        if (plat.y > plat.maxY) {
          plat.y = plat.maxY;
          plat.dir = -1;
        } else if (plat.y < plat.minY) {
          plat.y = plat.minY;
          plat.dir = 1;
        }
      } else {
        if (plat.x >= plat.maxX) plat.dir = -1;
        if (plat.x <= plat.minX) plat.dir = 1;
        plat.x += spd * plat.dir * (dt / 1000);
        if (plat.x > plat.maxX) {
          plat.x = plat.maxX;
          plat.dir = -1;
        } else if (plat.x < plat.minX) {
          plat.x = plat.minX;
          plat.dir = 1;
        }
      }

      plat.carryDx = plat.x - prevX;
      plat.carryDy = plat.y - prevY;

      if (plat.body.updateFromGameObject) plat.body.updateFromGameObject();
      else {
        plat.body.position.x = plat.x - plat.body.halfWidth;
        plat.body.position.y = plat.y - plat.body.halfHeight;
      }
    });
  }

  isOlyOnMover(plat) {
    const body = this.oly?.body;
    if (!body || !plat?.body) return false;
    if (!(body.blocked.down || body.touching.down)) return false;
    if (body.velocity.y < -40) return false;
    const feet = body.bottom;
    const top = plat.body.top;
    const slack = plat.axis === 'y' ? 14 : 10;
    if (feet > top + slack || feet < top - 8) return false;
    if (body.right <= plat.body.left + 4 || body.left >= plat.body.right - 4) return false;
    return true;
  }

  carryOlyOnMovers() {
    if (!this.oly) return;
    this.movers.children.iterate((plat) => {
      if (!plat || (!plat.carryDx && !plat.carryDy) || !this.isOlyOnMover(plat)) return;
      this.oly.sprite.x += plat.carryDx;
      this.oly.sprite.y += plat.carryDy;
      if (this.oly.shadow) {
        this.oly.shadow.setPosition(this.oly.sprite.x, this.oly.sprite.y + 2);
      }
    });
  }
}
