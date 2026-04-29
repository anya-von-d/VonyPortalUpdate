
// Pastel background colours designed for the Tapback memoji set
const MEMOJI_BG_COLORS = [
  '#F794E9', '#A5ED9A', '#87C6ED', '#F9E784', '#FF8FAD',
  '#B5DEFF', '#FFB3C6', '#C8F5E0', '#B8B8FF', '#FFD6A5',
  '#A8DADC', '#FFD3B6', '#D4A5F5', '#CAFFBF', '#FDFFB6',
  '#F0B8D9', '#C9F0D3', '#FFDAB9',
];

// Same pool as profileIconImages.js — Tapback (excluding #43) + alohe memo_
const _TB = 'https://raw.githubusercontent.com/Wimell/Tapback-Memojis/main/src/public/images/avatars/v1/';
const _AL = 'https://raw.githubusercontent.com/alohe/memojis/main/png/';
const MEMOJI_POOL = [
  ...Array.from({ length: 42 }, (_, i) => `${_TB}${i + 1}.png`),
  ...Array.from({ length: 15 }, (_, i) => `${_TB}${i + 44}.png`),
  ...Array.from({ length: 35 }, (_, i) => `${_AL}memo_${i + 1}.png`),
];

function hashStr(str) {
  if (!str) return 0;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = str.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h);
}

/** Pick a memoji URL deterministically from a name */
function getMemojiForName(name) {
  return MEMOJI_POOL[hashStr(name) % MEMOJI_POOL.length];
}

/** Pick a background colour deterministically from a name */
function getBgColorForName(name) {
  return MEMOJI_BG_COLORS[hashStr(name) % MEMOJI_BG_COLORS.length];
}

/**
 * Returns true if the URL is a memoji or legacy icon rather than a real user photo.
 * These should be rendered on a coloured circle, not as a full-bleed cover image.
 */
function isMemojiOrIcon(url) {
  if (!url) return false;
  return (
    url.includes('Tapback-Memojis') ||
    url.includes('alohe/memojis') ||
    url.includes('/images/profileIcons/') ||
    url.includes('ui-avatars.com') ||
    url.startsWith('data:image/svg+xml')
  );
}

/**
 * UserAvatar — shows a Tapback memoji on a pastel circle with a white ring + shadow,
 * or a real uploaded photo if the user has set one.
 *
 * Props:
 *   name     {string}         — full name or username (used for memoji + colour selection)
 *   src      {string|null}    — profile picture URL (optional)
 *   size     {number}         — total pixel size including the white ring (default 32)
 *   radius   {string|number}  — border-radius (default '50%')
 *   style    {object}         — extra style overrides on the outer (white ring) container
 *   fontSize {number}         — unused, kept for API compatibility
 */
export default function UserAvatar({ name, src, size = 32, radius = '50%', style, fontSize: _fontSize }) {
  const bgColor = getBgColorForName(name);

  // A real uploaded photo is any URL that isn't one of our icon types
  const isRealPhoto = src && !isMemojiOrIcon(src);

  // Which memoji to show: prefer an explicitly chosen icon URL, otherwise derive from name
  const memojiSrc = src && (src.includes('Tapback-Memojis') || src.includes('alohe/memojis'))
    ? src
    : getMemojiForName(name);

  // White ring padding scales with avatar size; inner circle fills the rest
  const ring = size < 30 ? 2 : size < 50 ? 2.5 : 3;
  const inner = size - ring * 2;

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: radius,
      padding: ring,
      background: 'white',
      boxShadow: '0 2px 10px rgba(0,0,0,0.13)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      boxSizing: 'border-box',
      ...style,
    }}>
      <div style={{
        width: inner,
        height: inner,
        borderRadius: radius,
        background: isRealPhoto ? '#E5E4E2' : bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {isRealPhoto
          ? <img src={src} alt={name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <img src={memojiSrc} alt={name || ''} style={{ width: '92%', height: '92%', objectFit: 'contain', objectPosition: 'center 8%', pointerEvents: 'none' }} />
        }
      </div>
    </div>
  );
}
