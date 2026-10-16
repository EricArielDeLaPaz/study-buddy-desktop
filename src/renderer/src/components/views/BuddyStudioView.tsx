// src/renderer/src/components/views/BuddyStudioView.tsx
import React, { useState, useEffect } from 'react';
import {
  ChibiCompanion,
  ChibiCompanionMode,
} from '../companion/ChibiCompanion';
import {
  COMPANION_LEVEL_ROSTER,
  CompanionMiniAvatar,
  CompanionRosterUnlock,
} from './ProgressView';
import { playChime } from '../../utils/audio';

export type CustomSlotKey = 'Idle' | 'Hydration' | 'Break' | 'Alert';

export interface CustomSlotUpload {
  fileName: string;
  dataUrl: string;
}

export interface UserBuddyPreset {
  id: string;
  name: string;
  source: 'Marketplace' | 'Custom';
  accentBg: string;
  defaultMode: ChibiCompanionMode;
  slotUploads?: Partial<Record<CustomSlotKey, CustomSlotUpload>>;
}

export const USER_BUDDY_PRESETS_STORAGE_KEY = 'study_buddy_user_presets_v1';

export const DEFAULT_USER_BUDDY_PRESETS: UserBuddyPreset[] = [
  {
    id: 'preset-mkt-cozy',
    name: 'Cozy Library',
    source: 'Marketplace',
    accentBg: '#4C3073',
    defaultMode: 'idle_studying',
  },
  {
    id: 'preset-mkt-forest',
    name: 'Forest Focus',
    source: 'Marketplace',
    accentBg: '#065F46',
    defaultMode: 'hydration',
  },
  {
    id: 'preset-custom-night',
    name: 'Midnight Matcha',
    source: 'Custom',
    accentBg: '#1E3A8A',
    defaultMode: 'celebrating',
    slotUploads: {
      Idle: { fileName: 'matcha-idle-loop.svg', dataUrl: '' },
      Hydration: { fileName: 'coconut-matcha-sip.svg', dataUrl: '' },
    },
  },
];

export function loadUserBuddyPresets(): UserBuddyPreset[] {
  try {
    const raw = localStorage.getItem(USER_BUDDY_PRESETS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserBuddyPreset[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage read error
  }
  return DEFAULT_USER_BUDDY_PRESETS;
}

const BUBBLE_COLORS = [
  { name: 'Mambo Indigo', hex: '#3C3173' },
  { name: 'Midnight Blue', hex: '#1E3A8A' },
  { name: 'Emerald Calm', hex: '#065F46' },
  { name: 'Plum Berry', hex: '#581C87' },
  { name: 'Rose Alert', hex: '#7F1D1D' },
] as const;

const ANIMATION_CATEGORIES: ReadonlyArray<{
  label: string;
  slotKey: CustomSlotKey;
  description: string;
  mode: ChibiCompanionMode;
}> = [
  {
    label: 'Study focus loop',
    slotKey: 'Idle',
    description: 'Calm breathing float & natural blink cycle',
    mode: 'idle_studying',
  },
  {
    label: 'Water break',
    slotKey: 'Hydration',
    description: 'Sipping tumbler gesture with rising droplets',
    mode: 'hydration',
  },
  {
    label: 'Break time stretch',
    slotKey: 'Break',
    description: 'Relaxed waving posture for 10m breaks',
    mode: 'bathroom',
  },
  {
    label: 'Distraction alert',
    slotKey: 'Alert',
    description: 'Cautionary posture & pulse ring for app nudges',
    mode: 'intervention',
  },
];

const CUSTOM_SLOTS: ReadonlyArray<CustomSlotKey> = [
  'Idle',
  'Hydration',
  'Break',
  'Alert',
];

export const BuddyStudioView: React.FC = () => {
  // Filter progression roster strictly to Unlocked Progression Buddies
  const unlockedProgressionBuddies = COMPANION_LEVEL_ROSTER.filter(
    (item) => item.unlocked
  );

  const [userPresets, setUserPresets] = useState<UserBuddyPreset[]>(
    loadUserBuddyPresets
  );
  const [selectedCardId, setSelectedCardId] = useState<string>('buddy-lv7');
  const [previewMode, setPreviewMode] =
    useState<ChibiCompanionMode>('idle_studying');
  const [bubbleColor, setBubbleColor] = useState<string>('#3C3173');
  const [sampleSpeech, setSampleSpeech] = useState<string>(
    "Wohoo good job so far, don't forget to rehydrate!"
  );

  // Create Custom Buddy Studio Modal State
  const [isCustomStudioOpen, setIsCustomStudioOpen] = useState<boolean>(false);
  const [customBuddyName, setCustomBuddyName] = useState<string>('');
  const [customSlotFiles, setCustomSlotFiles] = useState<
    Partial<Record<CustomSlotKey, CustomSlotUpload>>
  >({});

  useEffect(() => {
    try {
      localStorage.setItem(
        USER_BUDDY_PRESETS_STORAGE_KEY,
        JSON.stringify(userPresets)
      );
    } catch {
      // Ignore quota error
    }
  }, [userPresets]);

  const activeUserPreset = userPresets.find((p) => p.id === selectedCardId);

  const activeSlotKey: CustomSlotKey =
    previewMode === 'hydration'
      ? 'Hydration'
      : previewMode === 'bathroom'
      ? 'Break'
      : previewMode === 'intervention'
      ? 'Alert'
      : 'Idle';

  const customPreviewArtwork =
    activeUserPreset?.slotUploads?.[activeSlotKey]?.dataUrl;

  const handleSelectUnlockedBuddy = (item: CompanionRosterUnlock) => {
    setSelectedCardId(item.id);
    setBubbleColor(item.accentBg);
    playChime('gentle_bell');
  };

  const handleSelectUserPreset = (preset: UserBuddyPreset) => {
    setSelectedCardId(preset.id);
    setPreviewMode(preset.defaultMode);
    setBubbleColor(preset.accentBg);
    playChime('gentle_bell');
  };

  const handleSlotFileUpload = (
    slot: CustomSlotKey,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomSlotFiles((prev) => ({
          ...prev,
          [slot]: {
            fileName: file.name,
            dataUrl: reader.result as string,
          },
        }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveCustomBuddy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customBuddyName.trim()) return;

    const created: UserBuddyPreset = {
      id: `preset-custom-${Date.now()}`,
      name: customBuddyName.trim(),
      source: 'Custom',
      accentBg: '#3C3173',
      defaultMode: 'idle_studying',
      slotUploads: customSlotFiles,
    };

    setUserPresets((prev) => [created, ...prev]);
    setSelectedCardId(created.id);
    setCustomBuddyName('');
    setCustomSlotFiles({});
    setIsCustomStudioOpen(false);
    playChime('break_start');
  };

  return (
    <div className="flex flex-col gap-5 p-6 text-white">
      {/* Header with "Create Custom Buddy" CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight text-white">
            Buddy Companion Studio
          </h2>
          <p className="mt-1 text-[13px] text-[#9E97B8]">
            Choose an unlocked progression buddy, equip a Marketplace or Custom preset, or import your own slot artwork.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCustomStudioOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-[#A594F9] px-4 py-2 text-[12.5px] font-bold text-[#171329] shadow-md hover:bg-[#B5A7FA] transition cursor-pointer"
        >
          <span>+ Create Custom Buddy</span>
        </button>
      </div>

      {/* Section 1: Unlocked Progression Buddies + User Presets (Marketplace / Custom) */}
      <div className="grid grid-cols-6 gap-3">
        {/* 1. Unlocked Progression Buddies Only */}
        {unlockedProgressionBuddies.map((item) => {
          const isSelected = selectedCardId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectUnlockedBuddy(item)}
              className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                isSelected
                  ? 'border-[#A594F9] bg-[#261E42] shadow-md'
                  : 'border-[#2C253E] bg-[#181424] hover:border-[#423861]'
              }`}
            >
              <div className="flex items-center justify-between">
                <CompanionMiniAvatar
                  accessory={item.accessory}
                  unlocked={true}
                  accentBg={item.accentBg}
                />
                <span className="rounded-full bg-[#3C3173] px-2 py-0.5 text-[10px] font-bold text-[#E2DFF0]">
                  Lv. {item.level}
                </span>
              </div>

              <div className="mt-3">
                <p className="text-[13px] font-bold text-white truncate">
                  {item.name}
                </p>
                <p className="mt-0.5 text-[10.5px] font-medium text-[#4ADE80] truncate">
                  Unlocked
                </p>
              </div>
            </button>
          );
        })}

        {/* 2. User Presets (Labeled with Marketplace or Custom) */}
        {userPresets.map((preset) => {
          const isSelected = selectedCardId === preset.id;
          const isCustom = preset.source === 'Custom';
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectUserPreset(preset)}
              className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                isSelected
                  ? 'border-[#A594F9] bg-[#261E42] shadow-md'
                  : 'border-[#2C253E] bg-[#181424] hover:border-[#423861]'
              }`}
            >
              <div className="flex items-center justify-between">
                <CompanionMiniAvatar
                  accessory={isCustom ? 'glasses' : 'scholar'}
                  unlocked={true}
                  accentBg={preset.accentBg}
                />
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isCustom
                      ? 'bg-[#0E362D] text-[#4ADE80] border border-[#17594A]'
                      : 'bg-[#2A2244] text-[#C4B5FD] border border-[#4E4187]'
                  }`}
                >
                  {preset.source}
                </span>
              </div>

              <div className="mt-3">
                <p className="text-[13px] font-bold text-white truncate">
                  {preset.name}
                </p>
                <p className="mt-0.5 text-[10.5px] font-medium text-[#9E97B8] truncate">
                  {preset.source} Preset
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left: Live Companion Stage & Speech Bubble Color Selector */}
        <div className="col-span-6 flex flex-col items-center justify-between rounded-2xl border border-[#2C253E] bg-[#181424] p-6">
          {customPreviewArtwork ? (
            <div className="relative flex h-[220px] w-[220px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#4E4187] bg-[#0D0B14] p-3">
              <img
                src={customPreviewArtwork}
                alt={activeUserPreset?.name}
                className="h-36 w-36 object-contain"
              />
              <span className="mt-2 rounded-full bg-[#261E42] px-3 py-0.5 text-[11px] font-semibold text-[#A594F9]">
                Custom {activeSlotKey} Artwork
              </span>
            </div>
          ) : (
            <ChibiCompanion mode={previewMode} size="lg" />
          )}

          {/* Live Speech Bubble Preview */}
          <div className="w-full mt-4">
            <div
              className="mx-auto h-0 w-0"
              style={{
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderBottom: `8px solid ${bubbleColor}`,
              }}
            />
            <div
              style={{ backgroundColor: bubbleColor }}
              className="rounded-xl px-4 py-3 text-center text-[13px] font-semibold text-white shadow-inner transition-colors"
            >
              {sampleSpeech}
            </div>
          </div>

          {/* Speech Bubble Color Selector */}
          <div className="mt-5 flex w-full items-center justify-between border-t border-[#262038] pt-4">
            <span className="text-[12px] font-medium text-[#B8B2CC]">
              Speech bubble color:
            </span>
            <div className="flex items-center gap-2">
              {BUBBLE_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setBubbleColor(c.hex)}
                  title={c.name}
                  style={{ backgroundColor: c.hex }}
                  className={`h-6 w-6 rounded-full border-2 transition cursor-pointer ${
                    bubbleColor === c.hex
                      ? 'border-white scale-110'
                      : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Animation Category List */}
        <div className="col-span-6 flex flex-col justify-between rounded-2xl border border-[#2C253E] bg-[#181424] p-5">
          <div>
            <h3 className="text-[15px] font-bold text-white">
              Animation State Slots
            </h3>
            <p className="mt-0.5 text-[12px] text-[#9E97B8]">
              Click any slot to preview Mambo&apos;s vector posture or uploaded custom animation.
            </p>

            <div className="mt-4 flex flex-col gap-2.5">
              {ANIMATION_CATEGORIES.map((anim) => {
                const isSelected = previewMode === anim.mode;
                const uploadedFile =
                  activeUserPreset?.slotUploads?.[anim.slotKey]?.fileName;

                return (
                  <button
                    key={anim.label}
                    type="button"
                    onClick={() => {
                      setPreviewMode(anim.mode);
                      playChime('gentle_bell');
                    }}
                    className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-[#A594F9] bg-[#261E42]'
                        : 'border-[#2A233D] bg-[#120F1D] hover:bg-[#1D182E]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[13.5px] font-bold text-white">
                          {anim.label}
                        </p>
                        <span className="rounded bg-[#1F1A30] px-2 py-0.5 text-[10px] font-semibold text-[#A594F9]">
                          {anim.slotKey} Slot
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11.5px] text-[#8E87A8]">
                        {uploadedFile
                          ? `Custom asset: ${uploadedFile}`
                          : anim.description}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${
                        isSelected
                          ? 'bg-[#A594F9] text-[#171329]'
                          : 'bg-[#241E36] text-[#9E97B8]'
                      }`}
                    >
                      {isSelected ? 'Playing' : 'Preview'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Preview Phrase Input */}
          <div className="mt-4 border-t border-[#262038] pt-3.5">
            <label className="block text-[11.5px] font-medium text-[#9E97B8]">
              Test Bubble Copy
            </label>
            <input
              type="text"
              value={sampleSpeech}
              onChange={(e) => setSampleSpeech(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#322A4B] bg-[#0E0B16] px-3 py-2 text-[12.5px] text-white focus:border-[#A594F9] focus:outline-none select-text"
            />
          </div>
        </div>
      </div>

      {/* Create Custom Buddy Studio Modal */}
      {isCustomStudioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveCustomBuddy}
            className="w-[480px] rounded-2xl border border-[#4E4187] bg-[#1A1626] p-5 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-[#2C253E] pb-3">
              <div>
                <h3 className="text-[16px] font-bold text-white">
                  Create Custom Buddy
                </h3>
                <p className="text-[11.5px] text-[#9E97B8]">
                  Import custom vector SVG, GIF, or WebM animations for each state slot.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomStudioOpen(false)}
                className="text-[#8E87A8] hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#B8B2CC]">
                Custom Buddy Name
              </label>
              <input
                type="text"
                required
                value={customBuddyName}
                onChange={(e) => setCustomBuddyName(e.target.value)}
                placeholder="e.g., Hollow Cavern Knight, Pixel Mambo..."
                className="mt-1.5 w-full rounded-xl border border-[#322A4B] bg-[#0E0B16] px-3 py-2 text-[13px] text-white placeholder-[#5A5373] focus:border-[#A594F9] focus:outline-none select-text"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-[12px] font-medium text-[#B8B2CC]">
                State Slot Artwork / Animation Uploads
              </span>

              {CUSTOM_SLOTS.map((slot) => {
                const uploaded = customSlotFiles[slot];
                return (
                  <div
                    key={slot}
                    className="flex items-center justify-between rounded-xl border border-[#2E2744] bg-[#120F1D] px-3.5 py-2.5"
                  >
                    <div>
                      <span className="text-[12.5px] font-bold text-white">
                        {slot} Slot
                      </span>
                      <p className="text-[11px] text-[#8E87A8]">
                        {uploaded
                          ? `✓ ${uploaded.fileName}`
                          : 'No custom file uploaded (uses Mambo vector default)'}
                      </p>
                    </div>

                    <label className="rounded-lg border border-[#4E4187] bg-[#261E42] px-3 py-1.5 text-[11.5px] font-semibold text-[#E2DFF0] hover:bg-[#35295B] transition cursor-pointer">
                      <span>{uploaded ? 'Replace File' : 'Upload Artwork'}</span>
                      <input
                        type="file"
                        accept=".svg,.gif,.webm,.png,.webp,image/*"
                        onChange={(e) => handleSlotFileUpload(slot, e)}
                        className="hidden"
                      />
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262038]">
              <button
                type="button"
                onClick={() => setIsCustomStudioOpen(false)}
                className="rounded-xl border border-[#383052] bg-[#120F1D] px-4 py-2 text-[12.5px] font-semibold text-[#B8B2CC] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#A594F9] px-4 py-2 text-[12.5px] font-bold text-[#171329] hover:bg-[#B5A7FA] cursor-pointer"
              >
                Save Custom Buddy
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default BuddyStudioView;