// PNG profile icon images from /public/images/profileIcons/
// Files: 5.png through 22.png (18 total)
export const PROFILE_ICON_IMAGES = Array.from({ length: 18 }, (_, i) => `/images/profileIcons/${i + 5}.png`);

/** Pick a random icon URL */
export function getRandomProfileIcon() {
  return PROFILE_ICON_IMAGES[Math.floor(Math.random() * PROFILE_ICON_IMAGES.length)];
}

/** Pick a deterministic icon for a given userId (stable across sessions) */
export function getIconForUser(userId) {
  if (!userId) return getRandomProfileIcon();
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return PROFILE_ICON_IMAGES[Math.abs(hash) % PROFILE_ICON_IMAGES.length];
}

/** Returns true if the given URL is one of our profile icon PNGs */
export function isProfileIconImage(url) {
  if (!url) return false;
  return PROFILE_ICON_IMAGES.some(img => url === img || url.endsWith(img));
}

/**
 * Returns true if the user needs a profile icon assigned.
 * Covers: null/empty, SVG data-URIs (old icon system), and ui-avatars.com fallbacks.
 */
export function needsProfileIcon(url) {
  if (!url) return true;
  if (url.startsWith('data:image/svg+xml')) return true;
  if (url.includes('ui-avatars.com')) return true;
  return false;
}
