// ── Profile icon palette ───────────────────────────────────────────────────
// Light pastel backgrounds + darker/brighter symbol in a round bubble.
// All 25 icons are hand-drawn SVGs (no emoji reliance, renders identically
// across every device/platform).

export const ICON_OPTIONS = [
  { id: 'bolt',     bg: '#D9EAF4', fg: '#03ACEA',
    svg: '<path d="M72 22 L38 72 L58 72 L52 106 L90 54 L68 54 L80 22 Z" fill="#03ACEA"/>' },

  { id: 'sun',      bg: '#FDE8CC', fg: '#EF8A2E',
    svg: '<circle cx="64" cy="64" r="18" fill="#EF8A2E"/><g stroke="#EF8A2E" stroke-width="7" stroke-linecap="round"><line x1="64" y1="22" x2="64" y2="36"/><line x1="64" y1="92" x2="64" y2="106"/><line x1="22" y1="64" x2="36" y2="64"/><line x1="92" y1="64" x2="106" y2="64"/><line x1="35" y1="35" x2="45" y2="45"/><line x1="83" y1="83" x2="93" y2="93"/><line x1="35" y1="93" x2="45" y2="83"/><line x1="83" y1="45" x2="93" y2="35"/></g>' },

  { id: 'leaf',     bg: '#D7ECDC', fg: '#3DA76A',
    svg: '<path d="M34 94 C34 56 56 34 98 34 C98 76 76 94 34 94 Z" fill="#3DA76A"/><path d="M38 90 L86 42" stroke="#D7ECDC" stroke-width="4" stroke-linecap="round"/>' },

  { id: 'star',     bg: '#E5DAF0', fg: '#8158C7',
    svg: '<path d="M64 20 L74 52 L108 52 L80 72 L90 104 L64 84 L38 104 L48 72 L20 52 L54 52 Z" fill="#8158C7"/>' },

  { id: 'heart',    bg: '#F7DAE1', fg: '#E25A7A',
    svg: '<path d="M64 102 C64 102 26 80 26 54 C26 40 38 28 52 28 C60 28 64 34 64 44 C64 34 68 28 76 28 C90 28 102 40 102 54 C102 80 64 102 64 102 Z" fill="#E25A7A"/>' },

  { id: 'sparkle',  bg: '#FAEDC6', fg: '#E5A826',
    svg: '<path d="M64 18 L70 58 L110 64 L70 70 L64 110 L58 70 L18 64 L58 58 Z" fill="#E5A826"/>' },

  { id: 'cloud',    bg: '#DAE6F0', fg: '#5AA3D6',
    svg: '<path d="M44 88 C28 88 22 72 32 62 C28 50 42 40 54 46 C58 36 74 34 82 44 C94 38 110 50 104 66 C114 70 112 88 96 88 Z" fill="#5AA3D6"/>' },

  { id: 'tree',     bg: '#DDE8D8', fg: '#6A9A4F',
    svg: '<path d="M64 20 L90 58 L80 58 L98 86 L72 86 L72 100 L56 100 L56 86 L30 86 L48 58 L38 58 Z" fill="#6A9A4F"/>' },

  { id: 'flower',   bg: '#F4DDE0', fg: '#C97088',
    svg: '<g fill="#C97088"><circle cx="64" cy="36" r="15"/><circle cx="64" cy="92" r="15"/><circle cx="36" cy="64" r="15"/><circle cx="92" cy="64" r="15"/></g><circle cx="64" cy="64" r="11" fill="#F4DDE0"/>' },

  { id: 'flame',    bg: '#FCDDD3', fg: '#E36142',
    svg: '<path d="M64 20 C80 40 90 52 90 72 C90 88 78 104 64 104 C50 104 38 88 38 72 C38 58 54 58 54 44 C54 38 58 32 64 20 Z" fill="#E36142"/>' },

  { id: 'moon',     bg: '#E0DEF2', fg: '#6C6CC4',
    svg: '<path d="M90 26 C64 30 48 52 48 76 C48 92 60 106 78 106 C66 102 60 90 60 76 C60 54 74 36 90 26 Z" fill="#6C6CC4"/>' },

  { id: 'wave',     bg: '#CFE8E6', fg: '#2F9D9A',
    svg: '<path d="M18 56 C32 38 46 74 64 56 C82 38 96 74 110 56" stroke="#2F9D9A" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M18 86 C32 68 46 104 64 86 C82 68 96 104 110 86" stroke="#2F9D9A" stroke-width="9" fill="none" stroke-linecap="round"/>' },

  { id: 'crown',    bg: '#F5E6B8', fg: '#D4A017',
    svg: '<path d="M22 82 L34 42 L56 66 L64 28 L72 66 L94 42 L106 82 Z" fill="#D4A017"/><rect x="24" y="86" width="80" height="10" rx="3" fill="#D4A017"/>' },

  { id: 'anchor',   bg: '#D6DEEC', fg: '#4A6AA3',
    svg: '<g fill="none" stroke="#4A6AA3" stroke-width="7" stroke-linecap="round"><circle cx="64" cy="30" r="7"/><line x1="64" y1="40" x2="64" y2="100"/><line x1="48" y1="54" x2="80" y2="54"/><path d="M26 70 C26 92 44 104 64 104 C84 104 102 92 102 70"/></g>' },

  { id: 'sprout',   bg: '#E4E5CC', fg: '#7D8A3A',
    svg: '<line x1="64" y1="58" x2="64" y2="104" stroke="#7D8A3A" stroke-width="7" stroke-linecap="round"/><path d="M64 62 C40 62 28 48 28 32 C48 32 64 46 64 62 Z" fill="#7D8A3A"/><path d="M64 62 C88 62 100 48 100 32 C80 32 64 46 64 62 Z" fill="#7D8A3A"/>' },

  { id: 'diamond',  bg: '#DCE1F4', fg: '#6474CC',
    svg: '<path d="M38 32 L90 32 L108 56 L64 108 L20 56 Z" fill="#6474CC"/><path d="M20 56 L108 56 M38 32 L52 56 L64 108 L76 56 L90 32" stroke="#DCE1F4" stroke-width="3" fill="none"/>' },

  { id: 'peace',    bg: '#F0E1ED', fg: '#A557A2',
    svg: '<circle cx="64" cy="64" r="38" fill="none" stroke="#A557A2" stroke-width="7"/><line x1="64" y1="26" x2="64" y2="102" stroke="#A557A2" stroke-width="7"/><line x1="64" y1="64" x2="36" y2="92" stroke="#A557A2" stroke-width="7"/><line x1="64" y1="64" x2="92" y2="92" stroke="#A557A2" stroke-width="7"/>' },

  { id: 'droplet',  bg: '#D1EBF0', fg: '#2FA5C2',
    svg: '<path d="M64 18 C64 18 34 52 34 78 C34 94 48 106 64 106 C80 106 94 94 94 78 C94 52 64 18 64 18 Z" fill="#2FA5C2"/>' },

  { id: 'clover',   bg: '#D9ECDB', fg: '#4FA768',
    svg: '<g fill="#4FA768"><circle cx="44" cy="44" r="16"/><circle cx="84" cy="44" r="16"/><circle cx="44" cy="84" r="16"/><circle cx="84" cy="84" r="16"/></g><rect x="60" y="86" width="8" height="18" rx="3" fill="#4FA768"/>' },

  { id: 'coffee',   bg: '#F3E4D2', fg: '#A6794A',
    svg: '<path d="M28 40 L90 40 L86 90 C86 98 80 104 72 104 L46 104 C38 104 32 98 32 90 Z" fill="#A6794A"/><path d="M90 54 C102 54 106 62 106 72 C106 82 102 88 90 88" fill="none" stroke="#A6794A" stroke-width="7"/>' },

  { id: 'feather',  bg: '#FBE3CD', fg: '#E1814A',
    svg: '<path d="M100 30 C76 30 52 42 40 66 C32 80 30 94 30 104 L42 104 L56 84 C68 84 86 74 94 58 C102 48 102 38 100 30 Z" fill="#E1814A"/><line x1="30" y1="104" x2="68" y2="60" stroke="#FBE3CD" stroke-width="3"/>' },

  { id: 'fish',     bg: '#CEE9E5', fg: '#33A596',
    svg: '<path d="M26 64 C42 40 72 40 86 64 C72 88 42 88 26 64 Z" fill="#33A596"/><path d="M86 52 L108 42 L108 86 L86 76 Z" fill="#33A596"/><circle cx="48" cy="58" r="4" fill="#CEE9E5"/>' },

  { id: 'key',      bg: '#E5DCF0', fg: '#9A6FC4',
    svg: '<circle cx="42" cy="64" r="18" fill="none" stroke="#9A6FC4" stroke-width="7"/><line x1="60" y1="64" x2="106" y2="64" stroke="#9A6FC4" stroke-width="7" stroke-linecap="round"/><line x1="94" y1="64" x2="94" y2="80" stroke="#9A6FC4" stroke-width="7" stroke-linecap="round"/><line x1="78" y1="64" x2="78" y2="80" stroke="#9A6FC4" stroke-width="7" stroke-linecap="round"/>' },

  { id: 'cherry',   bg: '#F7D9DC', fg: '#D85470',
    svg: '<g fill="#D85470"><circle cx="42" cy="88" r="16"/><circle cx="84" cy="88" r="16"/></g><path d="M42 72 C50 48 76 30 98 22" fill="none" stroke="#D85470" stroke-width="6" stroke-linecap="round"/><path d="M84 72 C78 54 84 36 98 22" fill="none" stroke="#D85470" stroke-width="6" stroke-linecap="round"/>' },

  { id: 'mountain', bg: '#D5ECDB', fg: '#4B9A6B',
    svg: '<path d="M12 100 L46 46 L62 74 L78 50 L116 100 Z" fill="#4B9A6B"/><path d="M38 68 L46 54 L54 68 Z" fill="#D5ECDB"/><path d="M72 62 L78 52 L84 62 Z" fill="#D5ECDB"/>' },
];

// Build a data-URI SVG for storage in profile_picture_url.
// Renders as a full circle (bg) with the symbol centered on top.
export const generateIconUrl = (icon) => {
  if (!icon) return null;
  const inner = icon.svg || '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128"><circle cx="64" cy="64" r="64" fill="${icon.bg}"/>${inner}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

// Small inline-render helper — returns markup string for dangerouslySetInnerHTML.
// Used inside buttons whose own background already provides the pastel circle.
export const iconInnerSvg = (icon) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">${icon.svg || ''}</svg>`;
