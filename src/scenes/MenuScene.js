import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { LEVELS } from '../levels.js';
import { enterLandscapePlay } from '../mobile.js';
import { unlockAudio, startMusic, bindAutoMusic } from '../audio.js';
import { OLY_WORD } from '../olyLetters.js';

const SECRET_HOLD_MS = 900;

/** Shared AbortControllers so DOM listeners don't stack when MenuScene restarts. */
const menuDomSignals = {
  jugar: null,
  close: null,
  secret: null,
  keys: null,
  audio: null,
};

function resetSignal(key) {
  if (menuDomSignals[key]) menuDomSignals[key].abort();
  menuDomSignals[key] = new AbortController();
  return menuDomSignals[key].signal;
}

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create() {
    this.drawArcadeBg();
    this.drawCoverPhoto();

    this.portada = document.getElementById('portada');
    this.btn = document.getElementById('btn-jugar');
    this.levelPick = document.getElementById('level-pick');
    this.levelPickList = document.getElementById('level-pick-list');
    this.letterPreviewList = document.getElementById('letter-preview-list');
    this.levelPickClose = document.getElementById('level-pick-close');
    this.secretBtn = document.getElementById('btn-secret-levels');
    this.portada.classList.add('open');
    this.started = false;
    this.secretTimer = null;

    this.unbindMenuDom();

    this.onJugar = () => this.startGame(0);
    this.onJugarTouch = (ev) => {
      ev.preventDefault();
      this.startGame(0);
    };
    const jugarSig = resetSignal('jugar');
    this.btn.addEventListener('click', this.onJugar, { signal: jugarSig });
    this.btn.addEventListener('touchstart', this.onJugarTouch, { passive: false, signal: jugarSig });

    this.buildLevelPick();
    this.buildLetterPreview();
    this.bindSecretLevelPick();
    this.onLevelKey = (ev) => {
      if (this.started || !this.portada?.classList.contains('open')) return;
      const n = Number(ev.key);
      if (n >= 1 && n <= LEVELS.length) {
        ev.preventDefault();
        this.startGame(n - 1);
      } else if (ev.key === 'l' || ev.key === 'L') {
        this.openLevelPick();
      }
    };
    window.addEventListener('keydown', this.onLevelKey, { signal: resetSignal('keys') });

    this.events.once('shutdown', () => this.hidePortada());

    bindAutoMusic(this);
    this.onAudioTap = (ev) => {
      if (ev.target?.closest?.('#btn-jugar, [data-mute-btn], #btn-secret-levels, #level-pick')) return;
      startMusic(this, { menu: true });
    };
    const audioSig = resetSignal('audio');
    this.portada.addEventListener('touchstart', this.onAudioTap, { passive: true, signal: audioSig });
    this.portada.addEventListener('pointerdown', this.onAudioTap, { signal: audioSig });
  }

  unbindMenuDom() {
    Object.keys(menuDomSignals).forEach((key) => {
      if (menuDomSignals[key]) {
        menuDomSignals[key].abort();
        menuDomSignals[key] = null;
      }
    });
  }

  buildLevelPick() {
    if (!this.levelPickList) return;
    this.levelPickList.innerHTML = '';
    LEVELS.forEach((level, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = `${i + 1}. ${level.title}`;
      btn.addEventListener('click', () => this.startGame(i));
      this.levelPickList.appendChild(btn);
    });
    this.onLevelPickClose = () => this.closeLevelPick();
    this.levelPickClose?.addEventListener('click', this.onLevelPickClose, { signal: resetSignal('close') });
  }

  buildLetterPreview() {
    if (!this.letterPreviewList) return;
    this.letterPreviewList.querySelectorAll('button').forEach((btn) => btn.remove());
    OLY_WORD.forEach((ch, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = `Ver letra ${ch}`;
      btn.addEventListener('click', () => this.previewLetter(i));
      this.letterPreviewList.appendChild(btn);
    });
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.textContent = 'Ver OLY completa';
    allBtn.addEventListener('click', () => this.previewLetter(2, [true, true, true]));
    this.letterPreviewList.appendChild(allBtn);
  }

  previewLetter(index, unlockedOverride = null) {
    if (this.started) return;
    this.started = true;
    const unlocked = unlockedOverride ?? OLY_WORD.map((_, i) => i <= index);
    this.closeLevelPick();
    this.hidePortada();
    this.scene.start('letterReveal', {
      revealIndex: index,
      unlocked,
      preview: true,
    });
  }

  bindSecretLevelPick() {
    if (!this.secretBtn) return;
    const clear = () => {
      if (this.secretTimer) {
        clearTimeout(this.secretTimer);
        this.secretTimer = null;
      }
    };
    const arm = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      clear();
      this.secretTimer = setTimeout(() => {
        this.secretTimer = null;
        this.openLevelPick();
      }, SECRET_HOLD_MS);
    };
    this.onSecretDown = arm;
    this.onSecretUp = clear;
    this.onSecretLeave = clear;
    const secretSig = resetSignal('secret');
    this.secretBtn.addEventListener('pointerdown', this.onSecretDown, { signal: secretSig });
    this.secretBtn.addEventListener('pointerup', this.onSecretUp, { signal: secretSig });
    this.secretBtn.addEventListener('pointerleave', this.onSecretLeave, { signal: secretSig });
    this.secretBtn.addEventListener('pointercancel', this.onSecretUp, { signal: secretSig });
  }

  openLevelPick() {
    if (this.started || !this.levelPick) return;
    this.levelPick.classList.add('open');
    this.levelPick.setAttribute('aria-hidden', 'false');
  }

  closeLevelPick() {
    if (!this.levelPick) return;
    this.levelPick.classList.remove('open');
    this.levelPick.setAttribute('aria-hidden', 'true');
  }

  drawCoverPhoto() {
    const key = 'oly-portada';
    if (this.textures.exists(key)) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const photo = this.add.image(WIDTH * 0.72, HEIGHT * 0.5, key);
    const maxH = HEIGHT * 0.9;
    const maxW = WIDTH * 0.36;
    const scale = Math.min(maxH / photo.height, maxW / photo.width);
    photo.setScale(scale);
    photo.setAlpha(0.22);
    photo.setTint(0xff88cc);

    const frame = this.add.rectangle(WIDTH * 0.72, HEIGHT * 0.5, photo.displayWidth + 16, photo.displayHeight + 16);
    frame.setStrokeStyle(4, 0xff006e, 0.5);
    frame.setFillStyle(0x000000, 0);
    frame.setDepth(-1);
  }

  drawArcadeBg() {
    const g = this.add.graphics().setDepth(-5);
    g.fillGradientStyle(0x0a0014, 0x0a0014, 0x1a0033, 0x0d0020, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);

    const grid = this.add.graphics().setDepth(-4).setAlpha(0.35);
    grid.lineStyle(1, 0x00f5ff, 0.2);
    for (let x = 0; x < WIDTH; x += 40) {
      grid.lineBetween(x, HEIGHT * 0.55, x + (WIDTH - x) * 0.3, HEIGHT);
    }
    for (let y = HEIGHT * 0.55; y < HEIGHT; y += 24) {
      grid.lineBetween(0, y, WIDTH, y);
    }

    for (let i = 0; i < 12; i += 1) {
      const star = this.add.text(
        Phaser.Math.Between(20, WIDTH - 20),
        Phaser.Math.Between(20, HEIGHT - 80),
        '★',
        { fontFamily: 'Arial', fontSize: Phaser.Math.Between(10, 18), color: '#ffea00' },
      ).setAlpha(Phaser.Math.FloatBetween(0.2, 0.7)).setDepth(-3);
      this.tweens.add({
        targets: star,
        alpha: { from: star.alpha, to: star.alpha * 0.3 },
        duration: Phaser.Math.Between(600, 1400),
        yoyo: true,
        repeat: -1,
      });
    }
  }

  hidePortada() {
    if (this.secretTimer) {
      clearTimeout(this.secretTimer);
      this.secretTimer = null;
    }
    this.unbindMenuDom();
    this.closeLevelPick();
    if (this.portada) this.portada.classList.remove('open');
  }

  startGame(levelIndex = 0) {
    if (this.started) return;
    this.started = true;

    const level = Math.max(0, Math.min(LEVELS.length - 1, Number(levelIndex) || 0));
    unlockAudio(this);
    startMusic(this, { menu: false });
    this.hidePortada();
    this.sound.play('click', { volume: 0.35 });
    this.scene.start('game', { level, score: 0, hearts: 3 });

    enterLandscapePlay().then(() => {
      startMusic(this, { menu: false });
    }).catch(() => {});
  }
}
