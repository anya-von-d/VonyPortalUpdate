import React, { useState, useEffect } from "react";
import { Search, Check, User as UserIcon, Star, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function UserSelector({ users = [], value, onSelect, placeholder = "Choose a friend...", onAddFriends, showAddFriends = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);

  // Ensure users is always an array
  const safeUsers = Array.isArray(users) ? users : [];

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = safeUsers.filter(user => {
        if (!user || !user.username || !user.full_name) return false;
        const searchLower = searchTerm.toLowerCase();
        return (
          user.username.toLowerCase().includes(searchLower) ||
          user.full_name.toLowerCase().includes(searchLower)
        );
      });
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(safeUsers);
    }
  }, [searchTerm, users]);

  const selectedUser = safeUsers.find(user => user && user.username === value);

  const handleSelect = (username) => {
    if (value === username) {
      // Deselect if clicking the same user
      onSelect('');
    } else {
      onSelect(username);
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleAddFriends = () => {
    setIsOpen(false);
    setSearchTerm('');
    if (onAddFriends) {
      onAddFriends();
    }
  };

  return (
    <div style={{ position: 'relative', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <input
          placeholder={placeholder}
          value={searchTerm || (selectedUser ? `${selectedUser.full_name} (@${selectedUser.username})` : '')}
          onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
          onFocus={() => { setIsOpen(true); if (selectedUser) setSearchTerm(''); }}
          style={{
            width: '100%', boxSizing: 'border-box',
            height: 38, padding: '0 36px 0 12px',
            border: '1px solid rgba(0,0,0,0.12)', borderRadius: 10,
            background: selectedUser ? 'rgba(3,172,234,0.04)' : 'white',
            fontSize: 13, fontWeight: selectedUser ? 500 : 400,
            color: '#1A1918', outline: 'none',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => e.target.style.borderColor = 'rgba(3,172,234,0.4)'}
          onMouseLeave={e => e.target.style.borderColor = selectedUser ? 'rgba(3,172,234,0.4)' : 'rgba(0,0,0,0.12)'}
        />
        <Search size={14} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,0,0,0.28)', pointerEvents: 'none' }} />
      </div>

      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => { setIsOpen(false); setSearchTerm(''); }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
            background: 'white', borderRadius: 12, overflow: 'auto', maxHeight: 256,
            boxShadow: '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
            border: '1px solid rgba(0,0,0,0.08)',
          }}>
            {filteredUsers.length === 0 && !showAddFriends ? (
              <div style={{ padding: '14px 16px', textAlign: 'center', fontSize: 13, color: '#9B9A98' }}>
                {searchTerm ? 'No friends found' : 'No friends yet. Add friends to send loan offers.'}
              </div>
            ) : (
              <div style={{ padding: '4px 0' }}>
                {filteredUsers.map((user) => {
                  if (!user || !user.username) return null;
                  const isSelected = value === user.username;
                  return (
                    <div
                      key={user.username}
                      onClick={() => handleSelect(user.username)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 10px', margin: '2px 6px', borderRadius: 9,
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(3,172,234,0.08)' : 'transparent',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(3,172,234,0.08)' : 'transparent'; }}
                    >
                      <img
                        src={user.profile_picture_url || user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=678AFB&color=fff&size=32`}
                        alt={user.full_name || 'User'}
                        style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0 }}
                        onError={e => { e.target.src = `https://ui-avatars.com/api/?name=User&background=678AFB&color=fff&size=32`; }}
                      />
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name || 'Unknown'}</span>
                        <span style={{ fontSize: 11, color: '#9B9A98', whiteSpace: 'nowrap' }}>@{user.username}</span>
                      </div>
                      {user.is_starred && <Star size={13} style={{ flexShrink: 0, color: '#F59E0B', fill: '#F59E0B' }} />}
                      {isSelected && <Check size={13} style={{ flexShrink: 0, color: '#03ACEA' }} />}
                    </div>
                  );
                })}
                {showAddFriends && filteredUsers.length > 0 && (
                  <div
                    onClick={handleAddFriends}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', margin: '2px 6px', borderRadius: 9, cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#03ACEA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Plus size={14} color="white" />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#03ACEA' }}>Add more friends</span>
                  </div>
                )}
              </div>
            )}
            {filteredUsers.length === 0 && showAddFriends && (
              <div style={{ padding: '4px 0' }}>
                <div style={{ padding: '10px 16px', textAlign: 'center', fontSize: 13, color: '#9B9A98' }}>
                  {searchTerm ? 'No friends found' : 'No friends yet'}
                </div>
                <div
                  onClick={handleAddFriends}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', margin: '2px 6px', borderRadius: 9, cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#03ACEA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Plus size={14} color="white" />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#03ACEA' }}>Add more friends</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
