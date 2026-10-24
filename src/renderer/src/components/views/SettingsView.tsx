// src/renderer/src/components/views/SettingsView.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { playChime, ChimeType } from '../../utils/audio';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  loadDemoDataForDev,
  resetStudyBuddyUserData,
} from '../../utils/storage';

export type AppearanceMode = 'dark' | 'light' | 'system';

export interface SettingsViewProps {
  onOpenOnboarding?: () => void;
}

export const THEME_STORAGE_KEY = 'study_buddy_theme_mode';
const CUSTOM_CHIME_STORAGE_KEY = 'study_buddy_custom_chime_v1';

const IS_DEV_MODE =
  typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);

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

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenOnboarding,
}) => {
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

  // 3. Alerts & Data Reset State
  const [routeRemindersToPhoneOnly, setRouteRemindersToPhoneOnly] =
    useState<boolean>(false);
  const [isResetDataModalOpen, setIsResetDataModalOpen] =
    useState<boolean>(false);
  const [dataStatusNotice, setDataStatusNotice] = useState<string | null>(null);

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

  const handleReopenOnboarding = () => {
    if (onOpenOnboarding) {
      onOpenOnboarding();
    } else {
      window.dispatchEvent(new CustomEvent('study-buddy:open-onboarding'));
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 text-white font-sans">
      <div>
        <h2 className="font-display text-[22px] font-bold tracking-tight text-white">
          Settings
        </h2>
        <p className="mt-1 text-[13px] text-[#9490A8]">
          Configure appearance, startup & chime behavior, account access, and local data.
        </p>
      </div>

      {/* 4 Dedicated Content-Hugging Cards Grid */}
      <div className="grid grid-cols-12 items-start gap-6">
        {/* 1. APPEARANCE CARD */}
        <div className="col-span-6 h-fit flex flex-col gap-3.5 rounded-2xl border border-[#2E2A45] bg-[#1A1829] p-5">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-white">Appearance</h3>
              <span className="rounded-full bg-violet-100 text-violet-800 border border-violet-200/90 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/40 px-2.5 py-0.5 text-[11px] font-medium">
                {appearance === 'system'
                  ? 'Match system'
                  : appearance === 'dark'
                  ? 'Dark'
                  : 'Light'}
              </span>
            </div>
            <p className="mt-1 text-[12.5px] text-[#9490A8]">
              Choose your workspace color theme or match your operating system.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
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
                  className={`rounded-xl border py-2.5 text-[12.5px] font-semibold transition-all duration-150 ease-out cursor-pointer ${
                    isSelected
                      ? 'border-violet-600 bg-violet-600 !text-white font-bold shadow-sm hover:bg-violet-700 hover:shadow-md hover:shadow-violet-500/20 active:scale-[0.98]'
                      : 'border-[#2E2A45] bg-[#120F1D] text-[#C4B5FD] hover:bg-violet-50 hover:border-violet-300 hover:text-violet-900 dark:hover:bg-violet-900/40 dark:hover:border-violet-600/60 dark:hover:text-white active:scale-[0.98]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. BEHAVIOR CARD */}
        <div className="col-span-6 h-fit flex flex-col gap-3.5 rounded-2xl border border-[#2E2A45] bg-[#1A1829] p-5">
          <h3 className="text-[15px] font-bold text-white">Behavior</h3>

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
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-150 ease-out cursor-pointer ${
                launchAtStartup ? 'bg-violet-600' : 'bg-[#2E2A45]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  launchAtStartup ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

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
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-150 ease-out cursor-pointer ${
                soundsEnabled ? 'bg-violet-600' : 'bg-[#2E2A45]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  soundsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

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
                    className={`rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-all duration-150 ease-out cursor-pointer ${
                      active
                        ? 'border-violet-600 bg-violet-600 !text-white font-bold shadow-sm hover:bg-violet-700 active:scale-[0.98]'
                        : 'border-[#2E2A45] bg-[#120F1D] text-[#C4B5FD] hover:bg-violet-50 hover:border-violet-300 hover:text-violet-900 dark:hover:bg-violet-900/40 dark:hover:border-violet-600/60 dark:hover:text-white active:scale-[0.98]'
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
                  className={`rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-all duration-150 ease-out cursor-pointer max-w-[130px] truncate ${
                    selectedChime === 'custom'
                      ? 'border-violet-600 bg-violet-600 !text-white font-bold shadow-sm hover:bg-violet-700 active:scale-[0.98]'
                      : 'border-[#2E2A45] bg-[#120F1D] text-[#C4B5FD] hover:bg-violet-50 hover:border-violet-300 hover:text-violet-900 dark:hover:bg-violet-900/40 dark:hover:border-violet-600/60 dark:hover:text-white active:scale-[0.98]'
                  }`}
                >
                  ♪ {customChime.name}
                </button>
              )}
            </div>

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
                className="rounded-xl border border-[#52438F] bg-[#2A244D] px-3 py-1.5 text-[12px] font-semibold text-[#C4B5FD] hover:bg-violet-50 hover:border-violet-300 hover:text-violet-900 dark:hover:bg-violet-900/40 dark:hover:border-violet-600/60 dark:hover:text-white active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer"
              >
                Upload Chime
              </button>
            </div>
          </div>
        </div>

        {/* 3. ACCOUNT & LOCAL DATA CARD (Stage 1 Tester + Stage 5 Reset + Stage 9 Reopen Onboarding) */}
        <div className="col-span-6 h-fit flex flex-col gap-4 rounded-2xl border border-[#2E2A45] bg-[#1A1829] p-5">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-white">Account</h3>
              <span className="rounded-full bg-violet-100 text-violet-800 border border-violet-200/90 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/40 px-2.5 py-0.5 text-[11px] font-semibold">
                Tester
              </span>
            </div>
            <p className="mt-1.5 text-[13px] font-medium text-[#C4B5FD]">
              Signed in as{' '}
              <span className="font-semibold text-white">Tester</span> (
              <span className="font-semibold text-white">tester@email.com</span>
              )
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled
              title="Accounts arrive with the mobile app"
              className="rounded-xl border border-[#2E2A45] bg-[#232136] px-4 py-2 text-[12.5px] font-semibold text-white opacity-45 cursor-not-allowed"
            >
              Sign out
            </button>

            <button
              type="button"
              disabled
              title="Accounts arrive with the mobile app"
              className="rounded-xl bg-rose-100 text-rose-800 border border-rose-300 dark:bg-[#FF6584]/20 dark:text-[#FF6584] dark:border-[#FF6584]/30 px-4 py-2 text-[12.5px] font-semibold opacity-45 cursor-not-allowed"
            >
              Delete account
            </button>

            {/* Stage 9: Reopen Tester Onboarding Tour */}
            <button
              type="button"
              onClick={handleReopenOnboarding}
              className="rounded-xl border border-[#52438F] bg-[#2A244D] px-3.5 py-2 text-[12px] font-semibold text-[#C4B5FD] hover:bg-violet-50 hover:border-violet-300 hover:text-violet-900 dark:hover:bg-violet-900/40 dark:hover:border-violet-600/60 dark:hover:text-white active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer"
            >
              Reopen tester onboarding
            </button>
          </div>

          {/* Stage 5: "Reset my data" & Dev-only "Load demo data" */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2E2A45] pt-3.5">
            <div>
              <p className="text-[13px] font-semibold text-white">
                Local study data
              </p>
              <p className="text-[11.5px] text-[#9490A8]">
                {dataStatusNotice ??
                  'Clears progress, schedule, reminders & rules (keeps Notepad & theme).'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {IS_DEV_MODE && (
                <button
                  type="button"
                  onClick={() => {
                    loadDemoDataForDev();
                    setDataStatusNotice('Loaded demo data (dev mode)');
                  }}
                  className="rounded-xl border border-[#52438F] bg-[#2A244D] px-3 py-1.5 text-[12px] font-semibold text-[#C4B5FD] hover:bg-violet-600 hover:!text-white transition-all duration-150 ease-out cursor-pointer"
                >
                  Load demo data
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsResetDataModalOpen(true)}
                className="rounded-xl bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50 dark:hover:bg-rose-900/60 px-3.5 py-1.5 text-[12px] font-semibold transition-all duration-150 ease-out cursor-pointer"
              >
                Reset my data
              </button>
            </div>
          </div>
        </div>

        {/* 4. ALERTS CARD */}
        <div className="col-span-6 h-fit flex flex-col gap-3.5 rounded-2xl border border-[#2E2A45] bg-[#1A1829] p-5">
          <div>
            <h3 className="text-[15px] font-bold text-white">Alerts</h3>
            <p className="mt-1 text-[12.5px] text-[#9490A8]">
              Control how Mambo delivers nudges when you are actively working on your computer.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[#2E2A45] bg-[#120F1D] p-3.5">
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
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-150 ease-out cursor-pointer ${
                routeRemindersToPhoneOnly ? 'bg-violet-600' : 'bg-[#2E2A45]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  routeRemindersToPhoneOnly ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Resetting Local Study Data */}
      <ConfirmModal
        isOpen={isResetDataModalOpen}
        title="Reset My Study Buddy Data?"
        description="This will clear your saved progress history, schedule blocks, reminders, and app rules on this device. Your Notepad notes, theme, and Tester account will not be cleared."
        confirmLabel="Reset my data"
        onConfirm={() => {
          resetStudyBuddyUserData();
          setDataStatusNotice('Study data reset to a clean profile.');
        }}
        onCancel={() => setIsResetDataModalOpen(false)}
      />
    </div>
  );
};

export default SettingsView;
