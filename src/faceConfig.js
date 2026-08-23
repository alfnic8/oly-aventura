/** Valores por defecto para recorte y posición de la cara de Oly. */
export const FACE_DEFAULTS = {
  cropTop: 0.02,
  cropSize: 0.72,
  cropCenterX: 0.5,
  drawScale: 1.42,
  drawOffsetX: 0,
  drawOffsetY: 0.02,
  maskRadius: 0.5,
  maskOffsetX: 0,
  maskOffsetY: 0,
  spriteX: 4,
  spriteY: -41,
  spriteSize: 34,
  crownX: 5,
  crownY: -56,
};

const STORAGE_KEY = 'oly-face-config-v2';

export function loadFaceConfig() {
  try {
    localStorage.removeItem('oly-face-config');
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...FACE_DEFAULTS };
    return { ...FACE_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...FACE_DEFAULTS };
  }
}

export function saveFaceConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function resetFaceConfig() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('oly-face-config');
  return { ...FACE_DEFAULTS };
}
