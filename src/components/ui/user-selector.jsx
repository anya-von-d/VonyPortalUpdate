import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Search, Check, Star, Plus } from "lucide-react";
import UserAvatar from "@/components/ui/UserAvatar";

export function UserSelector({
  users = [],
  value,
  onSelect,
  placeholder = "Choose a person...",
  onAddFriends,
  showAddFriends = false,
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const ref = useRef(null);
  const searchRef = useRef(null);

  // Click-outside to close (no overlay – avoids swallowing item clicks)
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus the search box whenever the panel opens
  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 40);
    }
  }, [open]);

  const safeUsers = Array.isArray(users) ? users : [];
  const selectedUser = safeUsers.find(u => u && u.username === value) || null;

  const filteredUsers = searchTerm.trim()
    ? safeUsers.filter(u => {
        if (!u) return false;
        const q = searchTerm.toLowerCase();
        return (
          u.username?.toLowerCase().includes(q) ||
          u.full_name?.toLowerCase().includes(q)
        );
      })
    : safeUsers;

  const handleSelect = (username) => {
    onSelect(value === username ? '' : username);
    setOpen(false);
    setSearchTerm('');
  };

  const isActive = !!selectedUser;

  return (
    <div ref={ref} style={{ position: 'relative', fontFamily: "'DM Sans', sans-serif" }}>
      {/* ── Pill trigger ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '8px 12px', borderRadius: 10,
          border: `1px solid ${isActive ? 'rgba(3,172,234,0.35)' : 'rgba(0,0,0,0.08)'}`,
          background: isActive ? 'rgba(3,172,234,0.06)' : 'white',
          fontSize: 13, fontWeight: isActive ? 500 : 400,
          color: isActive ? '#1A1918' : '#9B9A98',
          cursor: 'pointer', textAlign: 'left',
          fontFamily: "'DM Sans', sans-serif",
          transition: 'border-color 0.15s, background 0.15s',
          boxSizing: 'border-box',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = 'rgba(0,0,0,0.18)'; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; }}
      >
        {selectedUser ? (
          <UserAvatar
            name={selectedUser.full_name || selectedUser.username}
            src={selectedUser.profile_picture_url || selectedUser.avatar_url}
            size={22}
          />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C7C6C4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        )}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedUser
            ? (selectedUser.full_name || selectedUser.username)?.replace(' (You)', '')
            : placeholder}
        </span>
        <ChevronDown
          size={14}
          style={{
            flexShrink: 0, opacity: 0.45,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.18s',
          }}
        />
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          minWidth: 220, zIndex: 200,
          background: 'white', borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}>
          {/* Search box */}
          <div style={{ padding: '8px 8px 4px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#C7C6C4', pointerEvents: 'none' }} />
              <input
                ref={searchRef}
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search..."
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '7px 10px 7px 28px', borderRadius: 8,
                  border: '1px solid rgba(0,0,0,0.07)', background: '#fafafa',
                  fontSize: 12, color: '#1A1918', outline: 'none',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
            </div>
          </div>

          {/* Options list */}
          <div style={{ maxHeight: 240, overflowY: 'auto', padding: '4px 6px' }}>
            {filteredUsers.length === 0 && !showAddFriends ? (
              <div style={{ padding: '12px 10px', textAlign: 'center', fontSize: 12, color: '#9B9A98' }}>
                {searchTerm ? 'No matches found' : 'No friends yet 👋'}
              </div>
            ) : (
              filteredUsers.map(u => {
                if (!u || !u.username) return null;
                const isSelected = value === u.username;
                return (
                  <div
                    key={u.username}
                    onMouseDown={e => { e.preventDefault(); handleSelect(u.username); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 8px', borderRadius: 9, cursor: 'pointer',
                      background: isSelected ? 'rgba(3,172,234,0.08)' : 'transparent',
                      transition: 'background 0.1s',
                      userSelect: 'none',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(3,172,234,0.08)' : 'transparent'; }}
                  >
                    <UserAvatar
                      name={u.full_name || u.username}
                      src={u.profile_picture_url || u.avatar_url}
                      size={28}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(u.full_name || u.username)?.replace(' (You)', '')}
                      </div>
                      <div style={{ fontSize: 11, color: '#9B9A98' }}>@{u.username?.replace(' (you)', '')}</div>
                    </div>
                    {u.is_starred && <Star size={12} style={{ flexShrink: 0, color: '#F59E0B', fill: '#F59E0B' }} />}
                    {isSelected && <Check size={13} style={{ flexShrink: 0, color: '#03ACEA' }} />}
                  </div>
                );
              })
            )}

            {showAddFriends && (
              <div
                onMouseDown={e => { e.preventDefault(); setOpen(false); setSearchTerm(''); onAddFriends?.(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 8px', borderRadius: 9, cursor: 'pointer',
                  marginTop: filteredUsers.length > 0 ? 2 : 0,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#03ACEA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Plus size={13} color="white" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#03ACEA' }}>Add more friends</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
