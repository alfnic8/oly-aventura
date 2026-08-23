import { buildFaceTexture } from './faceFromPhoto.js';
import { loadFaceConfig, saveFaceConfig, resetFaceConfig } from './faceConfig.js';

const STEP = 1;
const FINE = 0.5;
const RATIO = 0.01;
const EXIT_DELAY_MS = 450;

function fmt(n) {
  return Number(n.toFixed(3));
}

function lines(cfg) {
  return [
    'AJUSTE DE CARA — personaje quieto',
    `Posición  ←→ ↑↓  (${cfg.spriteX}, ${cfg.spriteY})`,
    `Tamaño    + / -  (${cfg.spriteSize})`,
    `Recorte ↑↓  Q/E  top=${cfg.cropTop}`,
    `Recorte +/- A/D  size=${cfg.cropSize}`,
    `Zoom      Z/X    scale=${cfg.drawScale}`,
    `Foto ↑↓   W/S    offY=${cfg.drawOffsetY}`,
    `Foto ←→   J/L    offX=${cfg.drawOffsetX}`,
    'ENTER guardar · R reset · C copiar consola',
    'F9 o ESC = volver',
  ];
}

function rebuild(scene, oly, cfg) {
  buildFaceTexture(scene, 'oly-face-photo-src', 'oly-face', cfg);
  oly.face.setTexture('oly-face');
  oly.applyFaceLayout(cfg);
}

export function mountFaceTune(scene, oly, options = {}) {
  const { startActive = false, onExit } = options;
  let active = startActive || new URLSearchParams(window.location.search).get('faceTune') === '1';
  let cfg = loadFaceConfig();
  const openedAt = Date.now();

  oly.applyFaceLayout(cfg);
  rebuild(scene, oly, cfg);

  const panel = scene.add.text(12, 12, lines(cfg).join('\n'), {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#ffe38a',
    backgroundColor: '#1a0828cc',
    padding: { x: 10, y: 8 },
  }).setScrollFactor(0).setDepth(200).setVisible(active);

  const exitTune = () => {
    if (Date.now() - openedAt < EXIT_DELAY_MS) return;
    if (onExit) onExit();
    else {
      active = false;
      panel.setVisible(false);
    }
  };

  const bump = (key, delta, fine = false) => {
    const n = fine ? FINE : STEP;
    const r = fine ? RATIO / 2 : RATIO;
    if (key === 'spriteX') cfg.spriteX = fmt(cfg.spriteX + delta * n);
    if (key === 'spriteY') cfg.spriteY = fmt(cfg.spriteY + delta * n);
    if (key === 'spriteSize') cfg.spriteSize = fmt(Math.max(20, cfg.spriteSize + delta * n));
    if (key === 'cropTop') cfg.cropTop = fmt(Math.max(0, Math.min(0.45, cfg.cropTop + delta * r)));
    if (key === 'cropSize') cfg.cropSize = fmt(Math.max(0.35, Math.min(0.95, cfg.cropSize + delta * r)));
    if (key === 'drawScale') cfg.drawScale = fmt(Math.max(0.8, Math.min(2, cfg.drawScale + delta * r * 2)));
    if (key === 'drawOffsetY') cfg.drawOffsetY = fmt(cfg.drawOffsetY + delta * r);
    if (key === 'drawOffsetX') cfg.drawOffsetX = fmt(cfg.drawOffsetX + delta * r);
    rebuild(scene, oly, cfg);
    panel.setText(lines(cfg).join('\n'));
  };

  const onKey = (event) => {
    if (event.code === 'F9' || event.code === 'Escape') {
      event.preventDefault();
      exitTune();
      return;
    }
    if (!active) return;

    const fine = event.shiftKey;
    const map = {
      ArrowLeft: ['spriteX', -1],
      ArrowRight: ['spriteX', 1],
      ArrowUp: ['spriteY', -1],
      ArrowDown: ['spriteY', 1],
      Equal: ['spriteSize', 1],
      Minus: ['spriteSize', -1],
      KeyQ: ['cropTop', -1],
      KeyE: ['cropTop', 1],
      KeyA: ['cropSize', -1],
      KeyD: ['cropSize', 1],
      KeyZ: ['drawScale', -1],
      KeyX: ['drawScale', 1],
      KeyW: ['drawOffsetY', -1],
      KeyS: ['drawOffsetY', 1],
      KeyJ: ['drawOffsetX', -1],
      KeyL: ['drawOffsetX', 1],
    };
    const action = map[event.code];
    if (action) {
      event.preventDefault();
      bump(action[0], action[1], fine);
      return;
    }

    if (event.code === 'Enter') {
      saveFaceConfig(cfg);
      console.log('Cara guardada:', JSON.stringify(cfg, null, 2));
      panel.setText(`${lines(cfg).join('\n')}\n\n¡Guardado!`);
      return;
    }
    if (event.code === 'KeyR') {
      cfg = resetFaceConfig();
      rebuild(scene, oly, cfg);
      panel.setText(`${lines(cfg).join('\n')}\n\nValores reseteados.`);
      return;
    }
    if (event.code === 'KeyC') {
      const json = JSON.stringify(cfg, null, 2);
      console.log(json);
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(json);
      panel.setText(`${lines(cfg).join('\n')}\n\nCopiado en consola.`);
    }
  };

  scene.input.keyboard.on('keydown', onKey);
  scene.events.once('shutdown', () => scene.input.keyboard.off('keydown', onKey));

  if (active) {
    console.log('Modo ajuste de cara estático. F9 o ESC para volver.');
  }
}

export function openFaceTune(scene, returnTo = 'menu') {
  const payload = { returnTo };
  if (returnTo === 'game') {
    payload.gameSnapshot = {
      level: scene.levelIndex,
      score: scene.score,
      hearts: scene.hearts,
    };
  }
  scene.scene.start('faceTune', payload);
}
