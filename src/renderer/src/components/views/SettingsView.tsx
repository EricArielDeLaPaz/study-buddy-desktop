// src/renderer/src/components/views/SettingsView.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { playChime, ChimeType } from '../../utils/audio';
import { ConfirmModal } from '../common/ConfirmModal';

export type AppearanceMode = 'dark' | 'light' | 'system';

export const THEME_STORAGE_KEY = 'study_buddy_theme_mode';
const CUSTOM_CHIME_STORAGE_KEY = 'study_buddy_custom_chime_v1';

interface CustomAudioChime {
  name: string;
  dataUrl: string;
}

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

// Default to 'system' (Match system) on initial load
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
  // 1. Appearance Card State (Default: Match system)
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

  // 2. Behavior Card State
  const [launchAtStartup, setLaunchAtStartup] = useState<boolean>(true);
  const [soundsEnabled, setSoundsEnabled] = useState<boolean>(true);
  const [selectedChime, setSelectedChime] = useState<ChimeType | 'custom'>(
    'gentle_bell'
  );
  const [customChime, setCustomChime] = useState<CustomAudioChime | null>(
    () => {
      try {
        const raw = localStorage.getItem(CUSTOM_CHIME_STORAGE_KEY);
        return raw ? (JSON.parse(raw) as CustomAudioChime) : null;
      } catch {
        return null;
      }
    }
  );
  const chimeFileInputRef = useRef<HTMLInputElement | null>(null);

  // 3. Account Card State
  const [accountEmail, setAccountEmail] = useState<string>(
    'maya.student@email.com'
  );
  const [accountNotice, setAccountNotice] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    'sign_out' | 'delete_account' | null
  >(null);

  // 4. Alerts Card State
  const [routeRemindersToPhoneOnly, setRouteRemindersToPhoneOnly] =
    useState<boolean>(false);

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

  // Play chime automatically when any chime option is clicked
  const handleSelectAndPlayChime = (chimeId: ChimeType | 'custom') => {
    setSelectedChime(chimeId);
    if (!soundsEnabled) return;

    if (chimeId === 'custom' && customChime?.dataUrl) {
      try {
        const audio = new Audio(customChime.dataUrl);
        audio.volume = 0.65;
        audio.play().catch(() => {
          playChime('gentle_bell');
        });
      } catch {
        playChime('gentle_bell');
      }
    } else if (chimeId !== 'custom') {
      playChime(chimeId);
    }
  };

  // Import custom local audio file via "Upload Chime"
  const handleUploadChimeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const uploaded: CustomAudioChime = {
          name: file.name.replace(/\.(mp3|wav|ogg|m4a)$/i, ''),
          dataUrl: reader.result,
        };
        setCustomChime(uploaded);
        setSelectedChime('custom');
        try {
          localStorage.setItem(
            CUSTOM_CHIME_STORAGE_KEY,
            JSON.stringify(uploaded)
          );
        } catch {
          // Ignore quota error
        }

        if (soundsEnabled) {
          try {
            const audio = new Audio(uploaded.dataUrl);
            audio.volume = 0.65;
            audio.play().catch(() => {});
          } catch {
            // Ignore audio playback error
          }
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConfirmAccountAction = () => {
    if (confirmAction === 'sign_out') {
      setAccountNotice('Signed out of maya.student@email.com');
    } else if (confirmAction === 'delete_account') {
      setAccountEmail('Account scheduled for deletion');
      setAccountNotice('Your account and cloud profile have been removed.');
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6 text-white font-sans">
      {/* Header */}
      <div>
        <h2 className="font-display text-[22px] font-bold tracking-tight text-white">
          Settings
        </h2>
        <p className="mt-1 text-[13px] text-[#9490A8]">
          Configure appearance, startup & chime behavior, account access, and alert routing.
        </p>
      </div>

      {/* 4 Dedicated Cards Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* 1. APPEARANCE CARD */}
        <div className="col-span-6 flex flex-col justify-between rounded-2xl border border-[#2E2A45] bg-[#1A1829] p-5">
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
            <p className="mt-1 text-[12.5px] text-[#9490A8]">
              Choose your workspace color theme or sync with your operating system.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2.5">
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
                      ? 'border-[#7C3AED] bg-[#A594F9] text-[#12111A] font-bold shadow-sm'
                      : 'border-[#2E2A45] bg-[#120F1D] text-[#C4B5FD] hover:border-[#52438F] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. BEHAVIOR CARD */}
        <div className="col-span-6 flex flex-col gap-4 rounded-2xl border border-[#2E2A45] bg-[#1A1829] p-5">
          <h3 className="text-[15px] font-bold text-white">Behavior</h3>

          {/* Launch at startup toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13.5px] font-semibold text-white">
                Launch at startup
              </p>
              <p className="text-[12px] text-[#9490A8]">
                Open Mambo when you sign in
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={launchAtStartup}
              onClick={() => setLaunchAtStartup((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                launchAtStartup ? 'bg-[#A594F9]' : 'bg-[#2E2A45]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-[#12111A] transition-transform ${
                  launchAtStartup ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Sounds toggle */}
          <div className="flex items-center justify-between border-t border-[#2E2A45] pt-3">
            <div>
              <p className="text-[13.5px] font-semibold text-white">Sounds</p>
              <p className="text-[12px] text-[#9490A8]">
                Soft chime with reminders
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={soundsEnabled}
              onClick={() => setSoundsEnabled((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                soundsEnabled ? 'bg-[#A594F9]' : 'bg-[#2E2A45]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-[#12111A] transition-transform ${
                  soundsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Audio Chime Selector (Plays automatically on click + Upload Chime button) */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2E2A45] pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'gentle_bell', label: 'Gentle Bell' },
                  { id: 'break_start', label: 'Break Triad' },
                  { id: 'alert', label: 'Nudge Pulse' },
                ] as const
              ).map((tone) => {
                const active = selectedChime === tone.id;
                return (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => handleSelectAndPlayChime(tone.id)}
                    className={`rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition cursor-pointer ${
                      active
                        ? 'border-[#7C3AED] bg-[#A594F9] text-[#12111A] font-bold'
                        : 'border-[#2E2A45] bg-[#120F1D] text-[#C4B5FD] hover:border-[#52438F] hover:text-white'
                    }`}
                  >
                    {tone.label}
                  </button>
                );
              })}

              {customChime && (
                <button
                  type="button"
                  onClick={() => handleSelectAndPlayChime('custom')}
                  className={`rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition cursor-pointer max-w-[130px] truncate ${
                    selectedChime === 'custom'
                      ? 'border-[#7C3AED] bg-[#A594F9] text-[#12111A] font-bold'
                      : 'border-[#2E2A45] bg-[#120F1D] text-[#C4B5FD] hover:border-[#52438F] hover:text-white'
                  }`}
                >
                  ♪ {customChime.name}
                </button>
              )}
            </div>

            {/* Upload Custom Chime Button */}
            <div>
              <input
                ref={chimeFileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.m4a"
                onChange={handleUploadChimeFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => chimeFileInputRef.current?.click()}
                className="rounded-xl border border-[#52438F] bg-[#2A244D] px-3 py-1.5 text-[12px] font-semibold text-[#C4B5FD] hover:bg-[#A594F9] hover:text-[#12111A] transition cursor-pointer"
              >
                Upload Chime
              </button>
            </div>
          </div>
        </div>

        {/* 3. ACCOUNT CARD */}
        <div className="col-span-6 flex flex-col justify-between rounded-2xl border border-[#2E2A45] bg-[#1A1829] p-5">
          <div>
            <h3 className="text-[15px] font-bold text-white">Account</h3>
            <p className="mt-1.5 text-[13px] font-medium text-[#C4B5FD]">
              Signed in as <span className="font-semibold text-white">{accountEmail}</span>
            </p>
            {accountNotice && (
              <p className="mt-1.5 text-[12px] font-semibold text-[#4ADE80]">
                ✓ {accountNotice}
              </p>
            )}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setConfirmAction('sign_out')}
              className="rounded-xl border border-[#2E2A45] bg-[#232136] px-4 py-2 text-[12.5px] font-semibold text-white hover:border-[#52438F] hover:bg-[#2A244D] transition cursor-pointer"
            >
              Sign out
            </button>

            <button
              type="button"
              onClick={() => setConfirmAction('delete_account')}
              className="rounded-xl bg-[#FF6584]/20 text-[#FF6584] border border-[#FF6584]/30 hover:bg-[#FF6584]/30 px-4 py-2 text-[12.5px] font-semibold transition cursor-pointer"
            >
              Delete account
            </button>
          </div>
        </div>

        {/* 4. ALERTS CARD */}
        <div className="col-span-6 flex flex-col justify-between rounded-2xl border border-[#2E2A45] bg-[#1A1829] p-5">
          <div>
            <h3 className="text-[15px] font-bold text-white">Alerts</h3>
            <p className="mt-1 text-[12.5px] text-[#9490A8]">
              Control how Mambo delivers nudges when you are actively working on your computer.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-[#2E2A45] bg-[#120F1D] p-3.5">
            <div className="pr-3">
              <p className="text-[13.5px] font-semibold text-white">
                Route reminders to phone only
              </p>
              <p className="mt-0.5 text-[12px] text-[#9490A8]">
                Reminders go to your phone only when computer is in use.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={routeRemindersToPhoneOnly}
              onClick={() =>
                setRouteRemindersToPhoneOnly((prev) => !prev)
              }
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                routeRemindersToPhoneOnly ? 'bg-[#A594F9]' : 'bg-[#2E2A45]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-[#12111A] transition-transform ${
                  routeRemindersToPhoneOnly ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Universal Destructive Action Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmAction !== null}
        title={
          confirmAction === 'delete_account'
            ? 'Delete Study Buddy Account?'
            : 'Sign Out of Study Buddy?'
        }
        description={
          confirmAction === 'delete_account'
            ? 'This will permanently delete maya.student@email.com, your earned companion progression, and custom presets. This action cannot be undone.'
            : 'You will be signed out of maya.student@email.com. Your local Notepad notes and timers will remain saved on this device.'
        }
        confirmLabel={
          confirmAction === 'delete_account' ? 'Delete account' : 'Sign out'
        }
        onConfirm={handleConfirmAccountAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
};

export default SettingsView;