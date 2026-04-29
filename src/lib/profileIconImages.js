const TB = 'https://raw.githubusercontent.com/Wimell/Tapback-Memojis/main/src/public/images/avatars/v1/';
const AL = 'https://raw.githubusercontent.com/alohe/memojis/main/png/';

// Tapback 1–58, excluding: #7 (cap), #21 (cowboy hat+sunglasses), #22 (beanie),
//   #29 (kufi cap), #35 (baseball cap), #43 (face mask)
const TAPBACK_KEEP = [
  1,2,3,4,5,6,8,9,10,11,12,13,14,15,16,17,18,19,20,
  23,24,25,26,27,28,30,31,32,33,34,
  36,37,38,39,40,41,42,
  44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,
];

// alohe memo_1–35, keeping only: no hat, no sunglasses, no mask, no visible hands.
// Kept: 2,6,10(hijab),12,13,16(turban),20,21,27,28(hijab),33,34,35
const ALOHE_KEEP = [2, 6, 10, 12, 13, 16, 20, 21, 27, 28, 33, 34, 35];

export const PROFILE_ICON_IMAGES = [
  ...TAPBACK_KEEP.map(n => `${TB}${n}.png`),
  ...ALOHE_KEEP.map(n => `${AL}memo_${n}.png`),
];

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
