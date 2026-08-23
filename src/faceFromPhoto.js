/**
 * Recorta la foto de Oly con máscara circular (llena el círculo amarillo).
 */
import Phaser from 'phaser';
import { FACE_DEFAULTS } from './faceConfig.js';

function applyCircleEdge(ctx, size, cx, cy, r) {
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const i = (y * size + x) * 4;
      if (dist > r) {
        d[i + 3] = 0;
      } else if (dist > r - 2) {
        const fade = (r - dist) / 2;
        d[i + 3] = Math.floor(d[i + 3] * Math.max(0, fade));
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

export function buildFaceTexture(scene, sourceKey, targetKey = 'oly-face', cfg = FACE_DEFAULTS) {
  if (!scene.textures.exists(sourceKey)) return false;

  const src = scene.textures.get(sourceKey).getSourceImage();
  const size = 128;
  const cx = size / 2 + cfg.maskOffsetX * size;
  const cy = size / 2 + cfg.maskOffsetY * size;
  const r = size * cfg.maskRadius;

  if (scene.textures.exists(targetKey)) scene.textures.remove(targetKey);
  const tex = scene.textures.createCanvas(targetKey, size, size);
  const ctx = tex.getContext();

  const sw = src.width;
  const sh = src.height;
  const cropSize = Math.min(sw, sh * cfg.cropSize);
  const sx = sw * cfg.cropCenterX - cropSize / 2;
  const sy = sh * cfg.cropTop;

  const drawSize = size * cfg.drawScale;
  const offsetX = (size - drawSize) / 2 + cfg.drawOffsetX * size;
  const offsetY = (size - drawSize) / 2 + cfg.drawOffsetY * size;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(src, sx, sy, cropSize, cropSize, offsetX, offsetY, drawSize, drawSize);
  ctx.restore();
  applyCircleEdge(ctx, size, cx, cy, r);

  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return true;
}
