const STICK_RADIUS = 52;
const DEAD_ZONE = 14;

export function mountVirtualStick(container, onDir) {
  const base = container.querySelector('[data-stick-base]');
  const knob = container.querySelector('[data-stick-knob]');
  if (!base || !knob) return () => {};

  let activePointer = null;
  let centerX = 0;
  let centerY = 0;

  const reset = () => {
    activePointer = null;
    knob.style.transform = 'translate(-50%, -50%)';
    onDir(0);
  };

  const updateCenter = () => {
    const r = base.getBoundingClientRect();
    centerX = r.left + r.width / 2;
    centerY = r.top + r.height / 2;
  };

  const move = (clientX, clientY) => {
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, STICK_RADIUS);
    const angle = Math.atan2(dy, dx);
    const nx = Math.cos(angle) * clamped;
    const ny = Math.sin(angle) * clamped;
    knob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;

    let dir = 0;
    if (Math.abs(dx) > DEAD_ZONE) dir = dx < 0 ? -1 : 1;
    onDir(dir);
  };

  const onDown = (ev) => {
    ev.preventDefault();
    updateCenter();
    activePointer = ev.pointerId;
    if (base.setPointerCapture) base.setPointerCapture(ev.pointerId);
    move(ev.clientX, ev.clientY);
  };

  const onMove = (ev) => {
    if (activePointer !== ev.pointerId) return;
    ev.preventDefault();
    move(ev.clientX, ev.clientY);
  };

  const onUp = (ev) => {
    if (activePointer !== ev.pointerId) return;
    reset();
  };

  base.addEventListener('pointerdown', onDown);
  base.addEventListener('pointermove', onMove);
  base.addEventListener('pointerup', onUp);
  base.addEventListener('pointercancel', onUp);
  base.addEventListener('lostpointercapture', reset);

  return () => {
    base.removeEventListener('pointerdown', onDown);
    base.removeEventListener('pointermove', onMove);
    base.removeEventListener('pointerup', onUp);
    base.removeEventListener('pointercancel', onUp);
    base.removeEventListener('lostpointercapture', reset);
    reset();
  };
}

export function mountJumpButton(btn, onJump) {
  if (!btn) return () => {};

  const jump = (ev) => {
    ev.preventDefault();
    onJump();
  };

  btn.addEventListener('pointerdown', jump);
  return () => btn.removeEventListener('pointerdown', jump);
}
