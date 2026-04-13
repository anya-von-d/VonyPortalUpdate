import React from "react";

// Medium blue/purple palette — deterministic per name
const AVATAR_COLORS = [
  '#5B6EE8', // blue-indigo
  '#7C5CBF', // medium purple
  '#4F86C6', // slate blue
  '#8B5CF6', // violet
  '#6366F1', // indigo
  '#7C3AED', // deep violet
  '#4A90D9', // sky blue
  '#9061EA', // lavender purple
];

function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * UserAvatar — shows a colored initial avatar, or a photo if the user has set one.
 *
 * Props:
 *   name    {string}           — full name or username (used for initial + color)
 *   src     {string|null}      — profile picture URL (optional)
 *   size    {number}           — pixel size (default 32)
 *   radius  {string|number}    — border-radius (default '50%')
 *   style   {object}           — extra style overrides on the container
 *   fontSize {number}          — override font size for the initial
 */
export default function UserAvatar({ name, src, size = 32, radius = '50%', style, fontSize }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  const color = getAvatarColor(name);
  const computedFontSize = fontSize || Math.round(size * 0.38);

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: radius,
      background: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      overflow: 'hidden',
      ...style,
    }}>
      {src
        ? <img src={src} alt={name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: computedFontSize, fontWeight: 700, color: 'white', lineHeight: 1, userSelect: 'none', fontFamily: "'DM Sans', sans-serif" }}>{initial}</span>
      }
    </div>
  );
}
