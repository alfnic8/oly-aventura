export const OLY_WORD = ['O', 'L', 'Y'];
/* v2: wipe old test unlocks that showed L/Y early */
const STORAGE_KEY = 'oly-letters-unlocked-v2';

export function getUnlockedLetters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [false, false, false];
    const arr = JSON.parse(raw);
    return OLY_WORD.map((_, i) => Boolean(arr[i]));
  } catch {
    return [false, false, false];
  }
}

export function setUnlockedLetters(flags) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flags.map(Boolean)));
  } catch {
    /* ignore */
  }
}

/** Unlock the letter for a completed level index (0=O, 1=L, 2=Y). */
export function unlockLetterForLevel(levelIndex) {
  const flags = getUnlockedLetters();
  const i = Math.max(0, Math.min(OLY_WORD.length - 1, levelIndex));
  const wasComplete = flags.every(Boolean);
  flags[i] = true;
  setUnlockedLetters(flags);
  const justCompleted = !wasComplete && flags.every(Boolean);
  return { letter: OLY_WORD[i], index: i, unlocked: flags, justCompleted };
}

export function resetLetters() {
  setUnlockedLetters([false, false, false]);
}
