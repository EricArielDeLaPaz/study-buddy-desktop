// src/renderer/src/components/views/SettingsView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';

export type AppearanceMode = 'dark' | 'light' | 'system';
type DefaultDisplayMode = 'dashboard' | 'companion_only' | 'compact_hud';

export const THEME_STORAGE_KEY = 'study_buddy_theme_mode';

export function applyThemeToDocument(mode: AppearanceMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches;

  const resolvedTheme =
    mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;

  root.classList.remove('dark', 'light');
  root.classList.add(resolvedTheme);
  root.setAttribute('data-theme', resolvedTheme);
}

export const SettingsView: React.FC = () => {
  const { scratchpad, togglePhoneConnection, toggleSyncStatus } = useApp();

  const [appearance, setAppearance] = useState<AppearanceMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppearanceMode;
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        return saved;
      }
    } catch {
      // Fall back to dark default
    }
    return 'dark';
  });

  const [displayMode, setDisplayMode] =
    useState<DefaultDisplayMode>('dashboard');

  const [launchAtLogin, setLaunchAtLogin] = useState<boolean>(true);
  const [startMinimized, setStartMinimized] = useState<boolean>(false);
  const [strictLockoutTimer, setStrictLockoutTimer] = useState<boolean>(false);
  const [hideKeepOpenInStrict, setHideKeepOpenInStrict] =
    useState<boolean>(true);

  const handleSelectAppearance = useCallback((nextMode: AppearanceMode) => {
    setAppearance(nextMode);
    applyThemeToDocument(nextMode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextMode);
    } catch {
      // Ignore storage error
    }
  }, []);

  // Apply theme on mount and listen for OS theme changes when set to 'system'
  useEffect(() => {
    applyThemeToDocument(appearance);

    if (appearance !== 'system' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => applyThemeToDocument('system');
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [appearance]);

  return (
    <div className="flex flex-col gap-5 p-6 text-white font-sans">
      <div>
        <h2 className="font-display text-[22px] font-bold tracking-tight text-white">
          Application Settings
        </h2>
        <p className="mt-1 text-[13px] text-[#9E97B8]">
          Manage appearance tokens, startup behavior, iPhone companion sync, and strict intervention locks.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Left Column: Appearance, Display Mode, Startup */}
        <div className="col-span-6 flex flex-col gap-4 rounded-2xl border border-[#2C253E] bg-[#181424] p-5">
          {/* Appearance Toggles (Dark, Light, Match system) */}
          <div>
            <h3 className="text-[14px] font-bold text-white">Appearance</h3>
            <p className="mt-0.5 text-[11.5px] text-[#9E97B8]">
              Switch between Dark mode, Light mode, or match your system appearance.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { id: 'dark', label: 'Dark' },
                { id: 'light', label: 'Light' },
                { id: 'system', label: 'Match system' },
              ].map((opt) => {
                const isSelected = appearance === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      handleSelectAppearance(opt.id as AppearanceMode)
                    }
                    className={`rounded-xl border py-2 text-[12.5px] font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'border-[#A594F9] bg-[#A594F9] text-[#171329] font-bold shadow-sm'
                        : 'border-[#2C253E] bg-[#120F1D] text-[#9E97B8] hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-[#262038]" />

          {/* Default Display Mode */}
          <div>
            <h3 className="text-[14px] font-bold text-white">
              Default Display Mode
            </h3>
            <div className="mt-2.5 flex flex-col gap-2">
              {[
                {
                  id: 'dashboard',
                  title: 'Full Studio Dashboard + Floating Overlays',
                },
                {
                  id: 'companion_only',
                  title: 'Transparent Desktop Companion Only',
                },
                {
                  id: 'compact_hud',
                  title: 'Minimal Companion + Notepad',
                },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() =>
                    setDisplayMode(mode.id as DefaultDisplayMode)
                  }
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium transition cursor-pointer ${
                    displayMode === mode.id
                      ? 'border-[#A594F9] bg-[#261E42] text-white'
                      : 'border-[#2C253E] bg-[#120F1D] text-[#9E97B8]'
                  }`}
                >
                  <span>{mode.title}</span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      displayMode === mode.id
                        ? 'bg-[#A594F9]'
                        : 'bg-[#2C253E]'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <hr className="border-[#262038]" />

          {/* Startup Behavior */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[14px] font-bold text-white">
              Startup Behavior
            </h3>

            <label className="flex items-center justify-between text-[12.5px] text-[#E2DFF0] cursor-pointer">
              <span>Launch Study Buddy automatically at login</span>
              <input
                type="checkbox"
                checked={launchAtLogin}
                onChange={(e) => setLaunchAtLogin(e.target.checked)}
                className="h-4 w-4 accent-[#A594F9]"
              />
            </label>

            <label className="flex items-center justify-between text-[12.5px] text-[#E2DFF0] cursor-pointer">
              <span>Start collapsed to floating Mambo dock</span>
              <input
                type="checkbox"
                checked={startMinimized}
                onChange={(e) => setStartMinimized(e.target.checked)}
                className="h-4 w-4 accent-[#A594F9]"
              />
            </label>
          </div>
        </div>

        {/* Right Column: Mobile Companion Sync & Strict Blocking Options */}
        <div className="col-span-6 flex flex-col gap-4 rounded-2xl border border-[#2C253E] bg-[#181424] p-5">
          {/* Mobile Sync Card */}
          <div className="rounded-xl border border-[#342C4C] bg-[#120F1D] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    scratchpad.phoneConnected
                      ? 'bg-[#4ADE80]'
                      : 'bg-[#6E678A]'
                  }`}
                />
                <span className="text-[14px] font-bold text-white">
                  {scratchpad.phoneConnected
                    ? 'iPhone connected'
                    : 'Phone not connected'}
                </span>
              </div>

              <span className="rounded-full bg-[#0E362D] px-2.5 py-0.5 text-[11px] font-semibold text-[#4ADE80]">
                {scratchpad.syncStatus === 'synced'
                  ? 'Cloud Synced'
                  : 'Offline · saved locally'}
              </span>
            </div>

            <p className="mt-2 text-[12px] text-[#9E97B8]">
              Syncs your Notepad notes, active focus timers, and hydration streaks with the Study Buddy iOS companion app in real time.
            </p>

            <div className="mt-3.5 flex items-center gap-2.5">
              <button
                type="button"
                onClick={togglePhoneConnection}
                className="rounded-lg border border-[#3B3354] bg-[#1E192D] px-3 py-1.5 text-[12px] font-medium text-[#EAE6F8] hover:bg-[#29223D] transition cursor-pointer"
              >
                {scratchpad.phoneConnected
                  ? 'Disconnect iPhone'
                  : 'Reconnect iPhone'}
              </button>

              <button
                type="button"
                onClick={toggleSyncStatus}
                className="rounded-lg border border-[#3B3354] bg-[#1E192D] px-3 py-1.5 text-[12px] font-medium text-[#A594F9] hover:bg-[#29223D] transition cursor-pointer"
              >
                Toggle Cloud / Local Mode
              </button>
            </div>
          </div>

          {/* Strict Blocking Options */}
          <div className="flex flex-col gap-3 rounded-xl border border-[#342C4C] bg-[#120F1D] p-4">
            <h3 className="text-[14px] font-bold text-white">
              Strict Blocking Options
            </h3>
            <p className="text-[11.5px] text-[#9E97B8]">
              Reinforce self-control when Mambo detects a blocked app or website.
            </p>

            <label className="mt-1 flex items-center justify-between text-[12.5px] text-[#E2DFF0] cursor-pointer">
              <span>Hide &ldquo;Keep open [App]&rdquo; button in Strict Mode</span>
              <input
                type="checkbox"
                checked={hideKeepOpenInStrict}
                onChange={(e) => setHideKeepOpenInStrict(e.target.checked)}
                className="h-4 w-4 accent-[#A594F9]"
              />
            </label>

            <label className="flex items-center justify-between text-[12.5px] text-[#E2DFF0] cursor-pointer">
              <span>Require 10-second reflection delay before bypassing</span>
              <input
                type="checkbox"
                checked={strictLockoutTimer}
                onChange={(e) => setStrictLockoutTimer(e.target.checked)}
                className="h-4 w-4 accent-[#A594F9]"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;