// ── Tapback Memojis (1–58, excluding #43 — face mask) ──────────────────────
const TAPBACK_BASE = 'https://raw.githubusercontent.com/Wimell/Tapback-Memojis/main/src/public/images/avatars/v1/';
const tapbackUrls = [
  ...Array.from({ length: 42 }, (_, i) => `${TAPBACK_BASE}${i + 1}.png`),  // 1–42
  ...Array.from({ length: 15 }, (_, i) => `${TAPBACK_BASE}${i + 44}.png`), // 44–58
];

// ── alohe/memojis — memo_ series (35 Apple Memoji-style, transparent PNGs) ─
const ALOHE_BASE = 'https://raw.githubusercontent.com/alohe/memojis/main/png/';
const aloheUrls = Array.from({ length: 35 }, (_, i) => `${ALOHE_BASE}memo_${i + 1}.png`);

// Combined pool: 57 Tapback + 35 alohe = 92 memojis
export const PROFILE_ICON_IMAGES = [...tapbackUrls, ...aloheUrls];

/** Pick a random memoji URL */
export function getRandomProfileIcon() {
  return PROFILE_ICON_IMAGES[Math.floor(Math.random() * PROFILE_ICON_IMAGES.length)];
}

/** Pick a deterministic memoji for a given userId (stable across sessions) */
export function getIconForUser(userId) {
  if (!userId) return getRandomProfileIcon();
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return PROFILE_ICON_IMAGES[Math.abs(hash) % PROFILE_ICON_IMAGES.length];
}

/** Returns true if the given URL is one of our memoji or legacy profile icon PNGs */
export function isProfileIconImage(url) {
  if (!url) return false;
  return url.includes('Tapback-Memojis') || url.includes('/images/profileIcons/') || url.includes('alohe/memojis');
}

/**
 * Returns true if the user needs a profile icon assigned.
 * Covers: null/empty, SVG data-URIs (old system), and ui-avatars.com fallbacks.
 */
export function needsProfileIcon(url) {
  if (!url) return true;
  if (url.startsWith('data:image/svg+xml')) return true;
  if (url.includes('ui-avatars.com')) return true;
  return false;
}
