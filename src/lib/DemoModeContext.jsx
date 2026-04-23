import React, { createContext, useContext, useEffect, useState } from 'react';

const DemoModeContext = createContext({ isDemoMode: false, toggleDemoMode: () => {} });

const STORAGE_KEY = 'vony_demo_mode';

export const DemoModeProvider = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });

  const toggleDemoMode = () => {
    const next = !isDemoMode;
    try { localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false'); } catch {}
    setIsDemoMode(next);
    // Reload so all pages re-fetch with or without demo data
    setTimeout(() => window.location.reload(), 60);
  };

  useEffect(() => {
    // Keep other tabs in sync
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setIsDemoMode(e.newValue === 'true');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <DemoModeContext.Provider value={{ isDemoMode, toggleDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
};

export const useDemoMode = () => useContext(DemoModeContext);

// Synchronous helper usable outside React (entities/all.js)
export const isDemoModeActive = () => {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
};
