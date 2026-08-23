export function unlockAudio(scene) {
  const { sound } = scene;
  if (sound.locked) sound.unlock();
  const ctx = sound.context;
  if (ctx && ctx.state === 'suspended') return ctx.resume();
  return Promise.resolve();
}

export function playBgm(scene, { menu = false } = {}) {
  const vol = menu ? 0.65 : 0.45;
  const playing = scene.sound.getAllPlaying().find((s) => s.key === 'intro');
  if (playing) {
    playing.setVolume(vol);
    playing.setLoop(true);
    return;
  }
  scene.sound.play('intro', { volume: vol, loop: true });
}

export function pauseBgm(scene) {
  scene.sound.pauseAll();
}

export function resumeBgm(scene) {
  scene.sound.resumeAll();
}

export function stopBgm(scene) {
  scene.sound.stopByKey('intro');
}
