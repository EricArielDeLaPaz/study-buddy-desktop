// src/renderer/src/components/views/SettingsView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { playChime, ChimeType } from '../../utils/audio';

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

// Initialize theme to 'system' (Match system) immediately on module load if not overridden
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppearanceMode;
    applyThemeToDocument(
      saved === 'dark' || saved === 'light' || saved === 'system'
        ? saved
        : 'system'
    );
  } catch {
    applyThemeToDocument('system');
  }
}

export const SettingsView: React.FC = () => {
  const { scratchpad, exportScratchpadToMarkdown } = useApp();

  // Default to 'system' (Match system) on initial load
  const [appearance, setAppearance] = useState<AppearanceMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppearanceMode;
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        return saved;
      }
    } catch {
      // Fall back to Match system
    }
    return 'system';
  });

  const [displayMode, setDisplayMode] =
    useState<DefaultDisplayMode>('dashboard');

  // Card 3: Audio & Companion Chimes State
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [selectedChime, setSelectedChime] =
    useState<ChimeType>('gentle_bell');

  // Card 4: Account & Cloud Sync State
  const [lastSyncedLabel, setLastSyncedLabel] =
    useState<string>('Synced automatically upon login');

  const handleSelectAppearance = useCallback((nextMode: AppearanceMode) => {
    setAppearance(nextMode);
    applyThemeToDocument(nextMode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextMode);
    } catch {
      // Ignore storage error
    }
  }, []);

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
          Customize your theme appearance, default workspace layout, audio chimes, and cloud backup.
        </p>
      </div>

      {/* 4 Clean Cards Grid */}
      <div className="grid grid-cols-12 gap-5">
        {/* Card 1: Appearance */}
        <div className="col-span-6 flex flex-col justify-between rounded-2xl border border-[#2C253E] bg-[#181424] p-5">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-white">Appearance</h3>
              <span className="rounded-full bg-[#2A244D] px-2.5 py-0.5 text-[11px] font-semibold text-[#C4B5FD]">
                {appearance === 'system'
                  ? 'Match system'
                  : appearance === 'dark'
                  ? 'Dark'
                  : 'Light'}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-[#9E97B8]">
              Switch between Dark mode, AA high-contrast Light mode, or match your OS theme automatically.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
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
                  className={`rounded-xl border py-2.5 text-[12.5px] font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'border-[#7C3AED] bg-[#A594F9] text-[#141324] font-bold shadow-sm'
                      : 'border-[#2C253E] bg-[#120F1D] text-[#9E97B8] hover:border-[#52438F] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Card 2: Default Display Mode */}
        <div className="col-span-6 flex flex-col justify-between rounded-2xl border border-[#2C253E] bg-[#181424] p-5">
          <div>
            <h3 className="text-[15px] font-bold text-white">
              Default Display Mode
            </h3>
            <p className="mt-1 text-[12px] text-[#9E97B8]">
              Choose how Study Buddy opens when launching a new study session.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2">
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
                    ? 'border-[#7C3AED] bg-[#2A244D] text-[#C4B5FD] font-semibold'
                    : 'border-[#2C253E] bg-[#120F1D] text-[#9E97B8] hover:text-white'
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

        {/* Card 3: Audio & Companion Chimes */}
        <div className="col-span-6 flex flex-col justify-between rounded-2xl border border-[#2C253E] bg-[#181424] p-5">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-white">
                Audio & Companion Chimes
              </h3>
              <button
                type="button"
                role="switch"
                aria-checked={audioEnabled}
                onClick={() => setAudioEnabled((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  audioEnabled ? 'bg-[#A594F9]' : 'bg-[#2C253E]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-[#141324] transition-transform ${
                    audioEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="mt-1 text-[12px] text-[#9E97B8]">
              Synthesized harmonic Web Audio cues when hydration, break, or nudge overlays appear.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {[
                { id: 'gentle_bell', label: 'Gentle Bell' },
                { id: 'break_start', label: 'Break Triad' },
                { id: 'alert', label: 'Nudge Pulse' },
              ].map((tone) => {
                const active = selectedChime === tone.id;
                return (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => setSelectedChime(tone.id as ChimeType)}
                    className={`rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition cursor-pointer ${
                      active
                        ? 'border-[#7C3AED] bg-[#2A244D] text-[#C4B5FD]'
                        : 'border-[#2C253E] bg-[#120F1D] text-[#9E97B8] hover:text-white'
                    }`}
                  >
                    {tone.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                if (audioEnabled) playChime(selectedChime);
              }}
              className="rounded-xl bg-[#A594F9] px-3.5 py-1.5 text-[12px] font-bold text-[#141324] hover:bg-[#B8A9FA] transition cursor-pointer shrink-0"
            >
              Test Chime
            </button>
          </div>
        </div>

        {/* Card 4: Account & Automatic Cloud Sync */}
        <div className="col-span-6 flex flex-col justify-between rounded-2xl border border-[#2C253E] bg-[#181424] p-5">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-white">
                Cloud Sync & Notepad Backup
              </h3>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0E362D] px-2.5 py-0.5 text-[11px] font-semibold text-[#4ADE80]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" />
                {scratchpad.syncStatus === 'synced'
                  ? 'Cloud Synced'
                  : 'Local Backup'}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-[#9E97B8]">
              Cross-device sync occurs automatically upon login across desktop and mobile.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#262038] pt-3.5">
            <span className="text-[11.5px] font-medium text-[#9E97B8]">
              {lastSyncedLabel}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setLastSyncedLabel(
                    `Synced at ${new Date().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  )
                }
                className="rounded-xl border border-[#52438F] bg-[#2A244D] px-3 py-1.5 text-[12px] font-semibold text-[#C4B5FD] hover:bg-[#3C3173] transition cursor-pointer"
              >
                Sync Now
              </button>

              <button
                type="button"
                onClick={exportScratchpadToMarkdown}
                className="rounded-xl border border-[#2C253E] bg-[#120F1D] px-3 py-1.5 text-[12px] font-semibold text-[#E2DFF0] hover:border-[#52438F] transition cursor-pointer"
              >
                Export .md
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;