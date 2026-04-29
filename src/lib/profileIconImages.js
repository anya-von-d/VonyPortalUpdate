// Tapback Memoji images — 58 PNGs from GitHub
const MEMOJI_BASE = 'https://raw.githubusercontent.com/Wimell/Tapback-Memojis/main/src/public/images/avatars/v1/';
export const PROFILE_ICON_IMAGES = Array.from({ length: 58 }, (_, i) => `${MEMOJI_BASE}${i + 1}.png`);

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
  return url.includes('Tapback-Memojis') || url.includes('/images/profileIcons/');
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
