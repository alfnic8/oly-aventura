/** Valores por defecto para recorte y posición de la cara de Oly. */
export const FACE_DEFAULTS = {
  cropTop: 0.14,
  cropSize: 0.72,
  cropCenterX: 0.5,
  drawScale: 1.38,
  drawOffsetX: -0.02,
  drawOffsetY: -0.16,
  maskRadius: 0.5,
  maskOffsetX: 0,
  maskOffsetY: 0,
  spriteX: 0,
  spriteY: -44,
  spriteSize: 35,
  crownX: 0,
  crownY: -63,
};

const STORAGE_KEY = 'oly-face-config-v5';

export function loadFaceConfig() {
  try {
    localStorage.removeItem('oly-face-config');
    localStorage.removeItem('oly-face-config-v2');
    localStorage.removeItem('oly-face-config-v3');
    localStorage.removeItem('oly-face-config-v4');
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...FACE_DEFAULTS };
    return { ...FACE_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...FACE_DEFAULTS };
  }
}

export function saveFaceConfig(cfg) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    return true;
  } catch (err) {
    console.warn('No se pudo guardar la cara:', err);
    return false;
  }
}

export function resetFaceConfig() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('oly-face-config');
  localStorage.removeItem('oly-face-config-v2');
  localStorage.removeItem('oly-face-config-v3');
  localStorage.removeItem('oly-face-config-v4');
  return { ...FACE_DEFAULTS };
}
