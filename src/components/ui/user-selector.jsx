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
    <div className="relative">
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={searchTerm || (selectedUser ? `${selectedUser.full_name} (@${selectedUser.username})` : '')}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (selectedUser) {
              setSearchTerm('');
            }
          }}
          className="pr-10"
        />
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false);
              setSearchTerm('');
            }}
          />
          <Card className="absolute top-full left-0 right-0 z-20 mt-1 max-h-64 overflow-auto shadow-lg border-0 rounded-xl bg-white">
            {filteredUsers.length === 0 && !showAddFriends ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                {searchTerm ? 'No friends found' : 'No friends yet. Add friends to send loan offers.'}
              </div>
            ) : (
              <div className="py-1">
                {filteredUsers.map((user, index) => {
                  if (!user || !user.username) return null;
                  const isSelected = value === user.username;
                  const bgColors = ['#D0ED6F', '#83F384', '#6EE8B5'];

                  return (
                    <div
                      key={user.username}
                      className="flex items-center gap-3 px-3 py-2.5 mx-2 my-1 rounded-xl cursor-pointer hover:opacity-90 transition-all duration-200"
                      style={{ backgroundColor: isSelected ? bgColors[index % 3] : bgColors[index % 3] }}
                      onClick={() => handleSelect(user.username)}
                    >
                      {/* Profile Picture */}
                      <img
                        src={user.profile_picture_url || user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=DBFFEB&color=0A1A10&size=32`}
                        alt={user.full_name || 'User'}
                        className="w-9 h-9 rounded-full flex-shrink-0"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=User&background=DBFFEB&color=0A1A10&size=32`;
                        }}
                      />

                      {/* Name and Username on one line */}
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="font-semibold text-[#0A1A10] text-[14px] truncate">
                          {user.full_name || 'Unknown User'}
                        </span>
                        <span className="text-xs text-slate-500 truncate">
                          @{user.username}
                        </span>
                      </div>

                      {/* Star icon */}
                      <Star
                        className={`w-4 h-4 flex-shrink-0 ${
                          user.is_starred
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-slate-300'
                        }`}
                      />

                      {/* Check if selected */}
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#00A86B] flex-shrink-0" />
                      )}
                    </div>
                  );
                })}

                {/* Add Friends Option */}
                {showAddFriends && (
                  <div
                    className="flex items-center gap-3 px-3 py-2.5 mx-2 my-1 rounded-xl cursor-pointer hover:opacity-90 transition-all duration-200 bg-[#DBFFEB]"
                    onClick={handleAddFriends}
                  >
                    <div className="w-9 h-9 rounded-full bg-[#00A86B] flex items-center justify-center flex-shrink-0">
                      <Plus className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-[#00A86B] text-[14px]">
                      Add more friends
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Show Add Friends even when no results */}
            {filteredUsers.length === 0 && showAddFriends && (
              <div className="py-1">
                <div className="p-3 text-center text-slate-500 text-sm">
                  {searchTerm ? 'No friends found' : 'No friends yet'}
                </div>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 mx-2 my-1 rounded-xl cursor-pointer hover:opacity-90 transition-all duration-200 bg-[#DBFFEB]"
                  onClick={handleAddFriends}
                >
                  <div className="w-9 h-9 rounded-full bg-[#00A86B] flex items-center justify-center flex-shrink-0">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-[#00A86B] text-[14px]">
                    Add more friends
                  </span>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
