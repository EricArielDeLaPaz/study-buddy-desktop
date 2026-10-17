// src/renderer/src/components/views/BuddyStudioView.tsx
import React, { useState, useEffect, useRef } from 'react';
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

export type CustomSlotKey = 'Idle' | 'Hydration' | 'Break' | 'Alert' | string;

export interface CustomSlotUpload {
  fileName: string;
  dataUrl: string;
}

export interface BuddyAnimationSlotConfig {
  id: string;
  label: string;
  slotKey: CustomSlotKey;
  description: string;
  mode: ChibiCompanionMode;
  reminderTrigger?: string;
  uploadedAnimation?: CustomSlotUpload;
}

export interface UserBuddyPreset {
  id: string;
  name: string;
  source: 'Marketplace' | 'Custom';
  accentBg: string;
  defaultMode: ChibiCompanionMode;
  slotUploads?: Partial<Record<CustomSlotKey, CustomSlotUpload>>;
  slots?: BuddyAnimationSlotConfig[];
}

export interface ActiveCompanionSelection {
  id: string;
  name: string;
  kind: 'progression' | 'Marketplace' | 'Custom';
  slots: BuddyAnimationSlotConfig[];
}

export const USER_BUDDY_PRESETS_STORAGE_KEY = 'study_buddy_user_presets_v2';
export const ACTIVE_COMPANION_STORAGE_KEY = 'study_buddy_active_companion_v1';

export const DEFAULT_ANIMATION_SLOTS: BuddyAnimationSlotConfig[] = [
  {
    id: 'slot-study-focus',
    label: 'Study focus loop',
    slotKey: 'Idle',
    description: 'Calm breathing float & natural blink cycle',
    mode: 'idle_studying',
    reminderTrigger: 'None',
  },
  {
    id: 'slot-water-break',
    label: 'Water break',
    slotKey: 'Hydration',
    description: 'Sipping tumbler gesture with rising droplets',
    mode: 'hydration',
    reminderTrigger: 'Drink Water',
  },
  {
    id: 'slot-break-stretch',
    label: 'Break time stretch',
    slotKey: 'Break',
    description: 'Relaxed waving posture for 10m breaks',
    mode: 'bathroom',
    reminderTrigger: 'Bathroom Break',
  },
  {
    id: 'slot-distraction-alert',
    label: 'Distraction alert',
    slotKey: 'Alert',
    description: 'Cautionary posture & pulse ring for app nudges',
    mode: 'intervention',
    reminderTrigger: 'App Rules Nudge',
  },
];

export const DEFAULT_USER_BUDDY_PRESETS: UserBuddyPreset[] = [
  {
    id: 'preset-mkt-cozy',
    name: 'Cozy Library',
    source: 'Marketplace',
    accentBg: '#2B2353',
    defaultMode: 'idle_studying',
    slots: DEFAULT_ANIMATION_SLOTS,
  },
  {
    id: 'preset-mkt-lavender',
    name: 'Lavender Focus',
    source: 'Marketplace',
    accentBg: '#3C3173',
    defaultMode: 'hydration',
    slots: DEFAULT_ANIMATION_SLOTS,
  },
  {
    id: 'preset-custom-night',
    name: 'Midnight Matcha',
    source: 'Custom',
    accentBg: '#4C2E85',
    defaultMode: 'celebrating',
    slots: [
      {
        id: 'custom-slot-1',
        label: 'Matcha Sipping Loop',
        slotKey: 'Hydration',
        description: 'Custom iced matcha hydration animation',
        mode: 'hydration',
        reminderTrigger: 'Drink Water',
        uploadedAnimation: {
          fileName: 'matcha-sip-loop.webm',
          dataUrl: '',
        },
      },
      {
        id: 'custom-slot-2',
        label: 'Cozy Desk Stretch',
        slotKey: 'Break',
        description: 'Custom shoulder roll animation',
        mode: 'bathroom',
        reminderTrigger: 'Stretch',
        uploadedAnimation: {
          fileName: 'cozy-desk-stretch.webm',
          dataUrl: '',
        },
      },
      {
        id: 'custom-slot-3',
        label: 'Late Night Coding Idle',
        slotKey: 'Idle',
        description: 'Custom lo-fi study loop',
        mode: 'idle_studying',
        reminderTrigger: 'None',
        uploadedAnimation: {
          fileName: 'night-coding-idle.webm',
          dataUrl: '',
        },
      },
    ],
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
    // Fall back to defaults
  }
  return DEFAULT_USER_BUDDY_PRESETS;
}

export function loadActiveCompanionSelection(): ActiveCompanionSelection {
  try {
    const raw = localStorage.getItem(ACTIVE_COMPANION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ActiveCompanionSelection;
      if (parsed && parsed.id && Array.isArray(parsed.slots)) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse error
  }
  return {
    id: 'buddy-lv7',
    name: 'Round Glasses Mambo',
    kind: 'progression',
    slots: DEFAULT_ANIMATION_SLOTS,
  };
}

const BUBBLE_COLORS = [
  { name: 'Deep Mambo Purple', hex: '#2B2353' },
  { name: 'Mambo Indigo', hex: '#3C3173' },
  { name: 'Royal Violet', hex: '#4C2E85' },
  { name: 'Deep Amethyst', hex: '#5B21B6' },
  { name: 'Rose Berry', hex: '#491D2E' },
] as const;

const PREVIEW_MODE_BADGE_LABELS: Record<ChibiCompanionMode, string> = {
  idle_studying: 'Studying · Focused',
  hydration: 'Reminder · Drinking water',
  bathroom: 'Reminder · Stretch & Break',
  intervention: 'Status · Nudge Alert',
  celebrating: 'Great Job · Celebrating!',
};

const REMINDER_LINKAGE_OPTIONS = [
  'None',
  'Drink Water',
  'Bathroom Break',
  'Posture Check',
  'Stretch',
  'App Rules Nudge',
] as const;

export const BuddyStudioView: React.FC = () => {
  const unlockedProgressionBuddies = COMPANION_LEVEL_ROSTER.filter(
    (item) => item.unlocked
  );

  const [userPresets, setUserPresets] = useState<UserBuddyPreset[]>(
    loadUserBuddyPresets
  );
  const [selectedCardId, setSelectedCardId] = useState<string>(() => {
    return loadActiveCompanionSelection().id;
  });

  const [slots, setSlots] = useState<BuddyAnimationSlotConfig[]>(() => {
    return loadActiveCompanionSelection().slots;
  });

  const [selectedSlotId, setSelectedSlotId] = useState<string>(
    () => loadActiveCompanionSelection().slots[0]?.id ?? DEFAULT_ANIMATION_SLOTS[0].id
  );
  const [previewMode, setPreviewMode] =
    useState<ChibiCompanionMode>('idle_studying');
  const [bubbleColor, setBubbleColor] = useState<string>('#2B2353');
  const [sampleSpeech, setSampleSpeech] = useState<string>(
    "Wohoo good job so far, don't forget to rehydrate!"
  );

  // Edit / Add Animation State Slot Modal
  const [isSlotModalOpen, setIsSlotModalOpen] = useState<boolean>(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotFormLabel, setSlotFormLabel] = useState<string>('');
  const [slotFormKey, setSlotFormKey] = useState<string>('Custom');
  const [slotFormDesc, setSlotFormDesc] = useState<string>('');
  const [slotFormReminder, setSlotFormReminder] = useState<string>('None');
  const [slotFormUpload, setSlotFormUpload] = useState<
    CustomSlotUpload | undefined
  >(undefined);

  // Custom Figma Dropdown State inside EditSlotModal
  const [isReminderDropdownOpen, setIsReminderDropdownOpen] =
    useState<boolean>(false);
  const reminderDropdownRef = useRef<HTMLDivElement | null>(null);

  // Create Custom Buddy Overlay Modal State
  const [isCustomStudioOpen, setIsCustomStudioOpen] = useState<boolean>(false);
  const [customBuddyName, setCustomBuddyName] = useState<string>('');
  const [customModalSlots, setCustomModalSlots] = useState<
    BuddyAnimationSlotConfig[]
  >(() =>
    DEFAULT_ANIMATION_SLOTS.map((s) => ({
      ...s,
      id: `modal-${s.id}`,
      uploadedAnimation: undefined,
    }))
  );
  const [newModalSlotName, setNewModalSlotName] = useState<string>('');
  const [newModalSlotDesc, setNewModalSlotDesc] = useState<string>('');

  // Listen for external companion updates (e.g., redirected from MarketplaceView)
  useEffect(() => {
    const handleSyncFromMarketplace = () => {
      const latestPresets = loadUserBuddyPresets();
      const latestActive = loadActiveCompanionSelection();
      setUserPresets(latestPresets);
      setSelectedCardId(latestActive.id);
      if (latestActive.slots && latestActive.slots.length > 0) {
        setSlots(latestActive.slots);
        setSelectedSlotId(latestActive.slots[0].id);
        setPreviewMode(latestActive.slots[0].mode);
      }
    };
    window.addEventListener(
      'study-buddy:companion-updated',
      handleSyncFromMarketplace
    );
    return () => {
      window.removeEventListener(
        'study-buddy:companion-updated',
        handleSyncFromMarketplace
      );
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        reminderDropdownRef.current &&
        !reminderDropdownRef.current.contains(e.target as Node)
      ) {
        setIsReminderDropdownOpen(false);
      }
    }
    if (isReminderDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isReminderDropdownOpen]);

  const activeUserPreset = userPresets.find((p) => p.id === selectedCardId);
  const activeProgressionBuddy = unlockedProgressionBuddies.find(
    (b) => b.id === selectedCardId
  );

  useEffect(() => {
    const activeSelection: ActiveCompanionSelection = {
      id: selectedCardId,
      name:
        activeUserPreset?.name ||
        activeProgressionBuddy?.name ||
        'Round Glasses Mambo',
      kind: activeUserPreset ? activeUserPreset.source : 'progression',
      slots,
    };

    try {
      localStorage.setItem(
        ACTIVE_COMPANION_STORAGE_KEY,
        JSON.stringify(activeSelection)
      );
    } catch {
      // Ignore storage error
    }
  }, [selectedCardId, slots, activeUserPreset, activeProgressionBuddy]);

  useEffect(() => {
    try {
      localStorage.setItem(
        USER_BUDDY_PRESETS_STORAGE_KEY,
        JSON.stringify(userPresets)
      );
    } catch {
      // Ignore storage error
    }
  }, [userPresets]);

  const handleSelectUnlockedBuddy = (item: CompanionRosterUnlock) => {
    setSelectedCardId(item.id);
    setSlots(DEFAULT_ANIMATION_SLOTS);
    setSelectedSlotId(DEFAULT_ANIMATION_SLOTS[0].id);
    setPreviewMode('idle_studying');
    setBubbleColor('#2B2353');
    playChime('gentle_bell');
  };

  const handleSelectUserPreset = (preset: UserBuddyPreset) => {
    setSelectedCardId(preset.id);
    const presetSlots =
      preset.slots && preset.slots.length > 0
        ? preset.slots
        : DEFAULT_ANIMATION_SLOTS;
    setSlots(presetSlots);
    setSelectedSlotId(presetSlots[0].id);
    setPreviewMode(preset.defaultMode);
    setBubbleColor(preset.accentBg || '#2B2353');
    playChime('gentle_bell');
  };

  const handleOpenEditSlotModal = (slot: BuddyAnimationSlotConfig) => {
    setEditingSlotId(slot.id);
    setSlotFormLabel(slot.label);
    setSlotFormKey(slot.slotKey);
    setSlotFormDesc(slot.description);
    const normalizedTrigger =
      !slot.reminderTrigger || slot.reminderTrigger.startsWith('None')
        ? 'None'
        : slot.reminderTrigger;
    setSlotFormReminder(normalizedTrigger);
    setSlotFormUpload(slot.uploadedAnimation);
    setIsReminderDropdownOpen(false);
    setIsSlotModalOpen(true);
  };

  const handleOpenAddSlotModal = () => {
    setEditingSlotId(null);
    setSlotFormLabel('');
    setSlotFormKey('Custom');
    setSlotFormDesc('');
    setSlotFormReminder('None');
    setSlotFormUpload(undefined);
    setIsReminderDropdownOpen(false);
    setIsSlotModalOpen(true);
  };

  const handleSlotModalFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSlotFormUpload({
          fileName: file.name,
          dataUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveSlotModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotFormLabel.trim()) return;

    const updatedSlot: BuddyAnimationSlotConfig = {
      id: editingSlotId ?? `slot-${Date.now()}`,
      label: slotFormLabel.trim(),
      slotKey: slotFormKey.trim() || 'Custom',
      description:
        slotFormDesc.trim() || 'Custom animation sequence linked to reminder',
      mode:
        slotFormReminder === 'Drink Water'
          ? 'hydration'
          : slotFormReminder === 'App Rules Nudge'
          ? 'intervention'
          : slotFormReminder.includes('Break') ||
            slotFormReminder.includes('Stretch')
          ? 'bathroom'
          : 'idle_studying',
      reminderTrigger: slotFormReminder,
      uploadedAnimation: slotFormUpload,
    };

    const nextSlots = editingSlotId
      ? slots.map((s) => (s.id === editingSlotId ? updatedSlot : s))
      : [...slots, updatedSlot];

    setSlots(nextSlots);
    setSelectedSlotId(updatedSlot.id);

    if (activeUserPreset) {
      setUserPresets((prev) =>
        prev.map((p) =>
          p.id === activeUserPreset.id ? { ...p, slots: nextSlots } : p
        )
      );
    }

    setIsSlotModalOpen(false);
    playChime('gentle_bell');
  };

  const handleCustomModalSlotUpload = (
    slotId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomModalSlots((prev) =>
          prev.map((s) =>
            s.id === slotId
              ? {
                  ...s,
                  uploadedAnimation: {
                    fileName: file.name,
                    dataUrl: reader.result as string,
                  },
                }
              : s
          )
        );
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddExtraSlotInCustomModal = () => {
    if (!newModalSlotName.trim()) return;
    const added: BuddyAnimationSlotConfig = {
      id: `modal-custom-${Date.now()}`,
      label: newModalSlotName.trim(),
      slotKey: newModalSlotName.trim(),
      description:
        newModalSlotDesc.trim() || 'Custom user-defined animation state slot',
      mode: 'celebrating',
      reminderTrigger: 'None',
    };
    setCustomModalSlots((prev) => [...prev, added]);
    setNewModalSlotName('');
    setNewModalSlotDesc('');
  };

  const handleSaveCustomBuddy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customBuddyName.trim()) return;

    const created: UserBuddyPreset = {
      id: `preset-custom-${Date.now()}`,
      name: customBuddyName.trim(),
      source: 'Custom',
      accentBg: '#2B2353',
      defaultMode: 'idle_studying',
      slots: customModalSlots,
    };

    setUserPresets((prev) => [created, ...prev]);
    setSelectedCardId(created.id);
    setSlots(customModalSlots);
    setSelectedSlotId(customModalSlots[0]?.id ?? '');
    setCustomBuddyName('');
    setIsCustomStudioOpen(false);
    playChime('break_start');
  };

  const currentlySelectedSlot =
    slots.find((s) => s.id === selectedSlotId) ?? slots[0];
  const isCustomBuddyActive = activeUserPreset?.source === 'Custom';
  const hasUploadedAnimationInCurrentSlot = Boolean(
    currentlySelectedSlot?.uploadedAnimation?.dataUrl
  );

  return (
    <div className="flex flex-col gap-5 p-6 text-white font-sans">
      {/* Header with "+ Create Custom Buddy" Primary Purple Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-[22px] font-bold tracking-tight text-white">
            Buddy Companion Studio
          </h2>
          <p className="mt-1 text-[13px] text-[#9490A8]">
            Choose an unlocked companion or preset, customize animation state slots, or create your own custom buddy.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCustomStudioOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-violet-600 !text-white px-4 py-2 text-[12.5px] font-bold hover:bg-violet-700 hover:shadow-md hover:shadow-violet-500/20 active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer shrink-0"
        >
          <span>+ Create Custom Buddy</span>
        </button>
      </div>

      {/* Horizontally Scrollable Companion Roster */}
      <div className="overflow-x-auto flex flex-nowrap py-1 gap-4">
        {/* 1. Unlocked Progression Buddies */}
        {unlockedProgressionBuddies.map((item) => {
          const isSelected = selectedCardId === item.id;
          const statusCopy =
            item.level === 1
              ? 'Starting buddy'
              : `Unlocked at Lv ${item.level}`;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectUnlockedBuddy(item)}
              className={`shrink-0 min-w-fit flex items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-all duration-150 ease-out cursor-pointer ${
                isSelected
                  ? 'border-violet-500 bg-[#2A244D] shadow-[0_8px_24px_rgba(165,148,249,0.18)]'
                  : 'border-[#2C253E] bg-[#181424] hover:bg-violet-50 hover:border-violet-300 dark:hover:bg-violet-900/40 dark:hover:border-violet-600/60 active:scale-[0.98]'
              }`}
            >
              <CompanionMiniAvatar
                accessory={item.accessory}
                unlocked={true}
                accentBg={item.accentBg}
              />

              <div className="pr-1">
                <p className="text-[13.5px] font-bold text-white whitespace-nowrap">
                  {item.name}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-[#4ADE80] whitespace-nowrap">
                  {statusCopy}
                </p>
              </div>
            </button>
          );
        })}

        {/* 2. User Presets */}
        {userPresets.map((preset) => {
          const isSelected = selectedCardId === preset.id;
          const isCustom = preset.source === 'Custom';
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectUserPreset(preset)}
              className={`shrink-0 min-w-fit flex items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-all duration-150 ease-out cursor-pointer ${
                isSelected
                  ? 'border-violet-500 bg-[#2A244D] shadow-[0_8px_24px_rgba(165,148,249,0.18)]'
                  : 'border-[#2C253E] bg-[#181424] hover:bg-violet-50 hover:border-violet-300 dark:hover:bg-violet-900/40 dark:hover:border-violet-600/60 active:scale-[0.98]'
              }`}
            >
              <CompanionMiniAvatar
                accessory={isCustom ? 'glasses' : 'scholar'}
                unlocked={true}
                accentBg={preset.accentBg}
              />

              <div className="pr-1">
                <p className="text-[13.5px] font-bold text-white whitespace-nowrap">
                  {preset.name}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-[#C4B5FD] whitespace-nowrap">
                  {preset.slots?.length ?? 4} animation slots
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
          {/* Companion Avatar + High-Contrast "Studying · Focused" Status Pill */}
          <div className="flex flex-col items-center">
            {hasUploadedAnimationInCurrentSlot ? (
              <div className="relative flex h-[200px] w-[200px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#52438F] bg-[#0D0B14] p-3">
                <img
                  src={currentlySelectedSlot?.uploadedAnimation?.dataUrl}
                  alt={currentlySelectedSlot?.label}
                  className="h-36 w-36 object-contain"
                />
              </div>
            ) : isCustomBuddyActive &&
              !currentlySelectedSlot?.uploadedAnimation?.fileName ? (
              <div className="relative flex h-[200px] w-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#52438F] bg-[#0E0B16] p-5 text-center">
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#A594F9"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="4" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <p className="mt-2.5 text-[12.5px] font-bold text-white">
                  {currentlySelectedSlot?.label || 'Empty Animation Slot'}
                </p>
                <p className="mt-1 text-[11px] text-[#9490A8]">
                  Click the edit pencil on this slot to upload a WebM, GIF, or SVG.
                </p>
              </div>
            ) : (
              <ChibiCompanion
                mode={previewMode}
                size="lg"
                showStateBadge={false}
              />
            )}

            {/* High-Contrast Status Pill Directly Under Mambo */}
            <div className="mt-3 text-center">
              <span className="inline-block bg-violet-100/90 text-violet-950 border border-violet-300 dark:bg-violet-950/80 dark:text-violet-200 dark:border-violet-700/60 font-semibold px-3 py-1 rounded-full text-xs shadow-sm">
                {PREVIEW_MODE_BADGE_LABELS[previewMode]}
              </span>
            </div>
          </div>

          {/* Live Speech Bubble Preview (Crisp White Text on Dark Purple #2B2353 Bubble — WCAG AA > 4.5:1) */}
          <div className="w-full mt-4">
            <div
              className="mx-auto h-0 w-0"
              style={{
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderBottom: `8px solid ${bubbleColor || '#2B2353'}`,
              }}
            />
            <div
              style={{
                backgroundColor: bubbleColor || '#2B2353',
                color: '#FFFFFF',
              }}
              className="font-display rounded-xl bg-[#2B2353] px-4 py-3 text-center text-[14px] !text-white font-medium drop-shadow-sm shadow-inner transition-colors"
            >
              {sampleSpeech}
            </div>
          </div>

          {/* Speech Bubble Color Selector */}
          <div className="mt-5 flex w-full items-center justify-between border-t border-[#262038] pt-4">
            <span className="text-[12px] font-medium text-[#C4B5FD]">
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
                  className={`h-6 w-6 rounded-full border-2 transition-all duration-150 ease-out cursor-pointer ${
                    bubbleColor === c.hex
                      ? 'border-white scale-110 shadow-sm'
                      : 'border-transparent opacity-75 hover:opacity-100 hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Animation State Slots */}
        <div className="col-span-6 flex flex-col justify-between rounded-2xl border border-[#2C253E] bg-[#181424] p-5">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-white">
                  Animation State Slots
                </h3>
                <p className="mt-0.5 text-[12px] text-[#9490A8]">
                  Click a slot to preview or click the pencil icon to edit & link to reminders.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddSlotModal}
                className="rounded-xl border border-[#52438F] bg-[#2A244D] px-3 py-1.5 text-[11.5px] font-semibold text-[#C4B5FD] hover:bg-violet-50 hover:border-violet-300 hover:text-violet-900 dark:hover:bg-violet-900/40 dark:hover:border-violet-600/60 dark:hover:text-white active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer shrink-0"
              >
                + Add Animation State Slot
              </button>
            </div>

            <div className="mt-4 flex max-h-[270px] flex-col gap-2.5 overflow-y-auto pr-1">
              {slots.map((slot) => {
                const isSelected = selectedSlotId === slot.id;
                const uploadedName = slot.uploadedAnimation?.fileName;

                return (
                  <div
                    key={slot.id}
                    onClick={() => {
                      setSelectedSlotId(slot.id);
                      setPreviewMode(slot.mode);
                      playChime('gentle_bell');
                    }}
                    className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition-all duration-150 ease-out cursor-pointer ${
                      isSelected
                        ? 'border-violet-500 bg-[#2A244D]'
                        : 'border-[#2C253E] bg-[#141020] hover:bg-violet-50 hover:border-violet-300 dark:hover:bg-violet-900/40 dark:hover:border-violet-600/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#3B3256] bg-[#0E0B16] text-[#A594F9]">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13.5px] font-bold text-white truncate">
                            {slot.label}
                          </p>
                          <span className="rounded bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 px-2 py-0.5 text-[10px] font-semibold">
                            {slot.slotKey}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11.5px] text-[#9490A8] truncate">
                          {uploadedName
                            ? `Animation: ${uploadedName}`
                            : slot.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${
                          isSelected
                            ? 'bg-violet-600 !text-white'
                            : 'bg-violet-100/80 text-violet-900 dark:bg-[#241E36] dark:text-[#9490A8]'
                        }`}
                      >
                        {isSelected ? 'Playing' : 'Preview'}
                      </span>

                      {/* Pencil Edit Icon Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditSlotModal(slot);
                        }}
                        title={`Edit ${slot.label}`}
                        aria-label={`Edit ${slot.label}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg p-1.5 border border-violet-200 dark:border-[#3B3256] bg-violet-50/70 dark:bg-[#1A1528] text-violet-600 hover:bg-violet-100 hover:text-violet-800 dark:text-violet-400 dark:hover:bg-violet-900/50 dark:hover:text-violet-300 active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer"
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 border-t border-[#262038] pt-3.5">
            <label className="block text-[11.5px] font-medium text-[#9490A8]">
              Test Bubble Copy
            </label>
            <input
              type="text"
              value={sampleSpeech}
              onChange={(e) => setSampleSpeech(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#322A4B] bg-[#0E0B16] px-3 py-2 text-[12.5px] text-white focus:border-violet-500 focus:outline-none select-text"
            />
          </div>
        </div>
      </div>

      {/* Edit / Add Animation State Slot Modal */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveSlotModal}
            className="w-[450px] rounded-[24px] border border-[#52438F] bg-[#181424] p-5 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-[#2C253E] pb-3">
              <div>
                <h3 className="font-display text-[17px] font-bold text-white">
                  {editingSlotId
                    ? 'Edit Animation State Slot'
                    : 'Add Animation State Slot'}
                </h3>
                <p className="text-[11.5px] text-[#9490A8]">
                  Configure slot name, animation file, and reminder linkage.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSlotModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2A244D] text-[#C4B5FD] hover:bg-violet-600 hover:!text-white transition-all duration-150 ease-out cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#E2DFF0]">
                Slot Name
              </label>
              <input
                type="text"
                required
                value={slotFormLabel}
                onChange={(e) => setSlotFormLabel(e.target.value)}
                placeholder="e.g., Eye Rest Blink, Deep Breath Loop..."
                className="mt-1.5 w-full rounded-xl border border-[#52438F] bg-[#0E0B16] px-3 py-2 text-[13px] text-white placeholder-[#9490A8] focus:border-violet-500 focus:outline-none select-text"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#E2DFF0]">
                Description
              </label>
              <input
                type="text"
                value={slotFormDesc}
                onChange={(e) => setSlotFormDesc(e.target.value)}
                placeholder="Describe when this animation plays..."
                className="mt-1.5 w-full rounded-xl border border-[#52438F] bg-[#0E0B16] px-3 py-2 text-[12.5px] text-white placeholder-[#9490A8] focus:border-violet-500 focus:outline-none select-text"
              />
            </div>

            {/* Standardized Figma Dropdown Component for Reminder Linkage Trigger */}
            <div className="relative" ref={reminderDropdownRef}>
              <label className="block text-[12px] font-semibold text-[#E2DFF0]">
                Reminder Linkage Trigger
              </label>
              <button
                type="button"
                onClick={() => setIsReminderDropdownOpen((prev) => !prev)}
                className="mt-1.5 flex w-full items-center justify-between rounded-xl border border-[#52438F] bg-[#0E0B16] px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-white hover:border-violet-500 transition-all duration-150 ease-out cursor-pointer"
              >
                <span>{slotFormReminder}</span>
                <span className="text-[11px] text-[#9490A8]">
                  {isReminderDropdownOpen ? '▴' : '▾'}
                </span>
              </button>

              {isReminderDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-[#52438F] bg-[#232136] p-1.5 shadow-xl">
                  {REMINDER_LINKAGE_OPTIONS.map((opt) => {
                    const isSelected = slotFormReminder === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setSlotFormReminder(opt);
                          setIsReminderDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12px] transition-all duration-150 ease-out cursor-pointer ${
                          isSelected
                            ? 'bg-violet-600 !text-white font-semibold'
                            : 'text-[#E2DFF0] hover:bg-violet-50 hover:text-violet-900 dark:hover:bg-violet-900/40 dark:hover:text-white'
                        }`}
                      >
                        <span>{opt}</span>
                        {isSelected && (
                          <span className="text-[11px] !text-white">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#2C253E] bg-[#141020] p-3">
              <div className="min-w-0 pr-2">
                <span className="text-[12px] font-bold text-white">
                  Animation File (WebM / GIF / SVG)
                </span>
                <p className="text-[11px] text-[#9490A8] truncate">
                  {slotFormUpload
                    ? `✓ ${slotFormUpload.fileName}`
                    : 'No custom animation uploaded yet'}
                </p>
              </div>
              <label className="shrink-0 rounded-xl bg-violet-600 !text-white px-3.5 py-1.5 text-[11.5px] font-bold hover:bg-violet-700 hover:shadow-md hover:shadow-violet-500/20 active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer">
                <span>Upload Animation</span>
                <input
                  type="file"
                  accept=".webm,.gif,.svg,.png,.webp,image/*,video/webm"
                  onChange={handleSlotModalFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2C253E]">
              <button
                type="button"
                onClick={() => setIsSlotModalOpen(false)}
                className="rounded-xl border border-[#52438F] bg-[#141020] px-4 py-2 text-[12.5px] font-semibold text-[#C4B5FD] hover:bg-violet-50 hover:border-violet-300 hover:text-violet-900 dark:hover:bg-violet-900/40 dark:hover:border-violet-600/60 dark:hover:text-white active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-violet-600 !text-white px-4 py-2 text-[12.5px] font-bold hover:bg-violet-700 hover:shadow-md hover:shadow-violet-500/20 active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer"
              >
                Save Slot
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Custom Buddy Studio Modal */}
      {isCustomStudioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveCustomBuddy}
            className="flex max-h-[600px] w-[520px] flex-col overflow-hidden rounded-[24px] border border-[#52438F] bg-[#181424] p-5 shadow-2xl gap-4"
          >
            <div className="flex items-center justify-between border-b border-[#2C253E] pb-3">
              <div>
                <h3 className="font-display text-[17px] font-bold text-white">
                  Create Custom Buddy
                </h3>
                <p className="text-[11.5px] text-[#9490A8]">
                  Upload animations for default state slots or add custom slots for your reminders.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomStudioOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2A244D] text-[#C4B5FD] hover:bg-violet-600 hover:!text-white transition-all duration-150 ease-out cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#E2DFF0]">
                Custom Buddy Name
              </label>
              <input
                type="text"
                required
                value={customBuddyName}
                onChange={(e) => setCustomBuddyName(e.target.value)}
                placeholder="e.g., Starlight Mambo, Cozy Pixel Companion..."
                className="mt-1.5 w-full rounded-xl border border-[#52438F] bg-[#0E0B16] px-3 py-2 text-[13px] text-white placeholder-[#9490A8] focus:border-violet-500 focus:outline-none select-text"
              />
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
              <span className="text-[12px] font-semibold text-[#E2DFF0]">
                Animation State Slots ({customModalSlots.length})
              </span>

              {customModalSlots.map((slot) => {
                const uploaded = slot.uploadedAnimation;
                return (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between rounded-xl border border-[#2C253E] bg-[#141020] px-3.5 py-2.5"
                  >
                    <div className="min-w-0 pr-3">
                      <span className="text-[12.5px] font-bold text-white">
                        {slot.label}
                      </span>
                      <p className="text-[11px] text-[#9490A8] truncate">
                        {uploaded?.fileName
                          ? `✓ ${uploaded.fileName}`
                          : slot.description}
                      </p>
                    </div>

                    <label className="shrink-0 rounded-lg border border-[#52438F] bg-violet-600 !text-white px-3 py-1.5 text-[11.5px] font-semibold hover:bg-violet-700 hover:shadow-md hover:shadow-violet-500/20 active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer">
                      <span>
                        {uploaded?.fileName
                          ? 'Replace Animation'
                          : 'Upload Animation'}
                      </span>
                      <input
                        type="file"
                        accept=".svg,.gif,.webm,.png,.webp,image/*,video/webm"
                        onChange={(e) =>
                          handleCustomModalSlotUpload(slot.id, e)
                        }
                        className="hidden"
                      />
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-[#342C4C] bg-[#120F1D] p-3">
              <span className="block text-[11.5px] font-semibold text-[#C4B5FD]">
                + Add Additional Animation Slot
              </span>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={newModalSlotName}
                  onChange={(e) => setNewModalSlotName(e.target.value)}
                  placeholder="Slot Name (e.g., Eye Rest)"
                  className="flex-1 rounded-lg border border-[#322A4B] bg-[#0E0B16] px-2.5 py-1.5 text-[12px] text-white placeholder-[#9490A8] focus:border-violet-500 focus:outline-none select-text"
                />
                <input
                  type="text"
                  value={newModalSlotDesc}
                  onChange={(e) => setNewModalSlotDesc(e.target.value)}
                  placeholder="Description..."
                  className="flex-1 rounded-lg border border-[#322A4B] bg-[#0E0B16] px-2.5 py-1.5 text-[12px] text-white placeholder-[#9490A8] focus:border-violet-500 focus:outline-none select-text"
                />
                <button
                  type="button"
                  onClick={handleAddExtraSlotInCustomModal}
                  className="shrink-0 rounded-lg border border-[#52438F] bg-[#2A244D] px-3 py-1.5 text-[11.5px] font-bold text-[#C4B5FD] hover:bg-violet-50 hover:border-violet-300 hover:text-violet-900 dark:hover:bg-violet-900/40 dark:hover:border-violet-600/60 dark:hover:text-white active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer"
                >
                  + Add Slot
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2C253E]">
              <button
                type="button"
                onClick={() => setIsCustomStudioOpen(false)}
                className="rounded-xl border border-[#52438F] bg-[#141020] px-4 py-2 text-[12.5px] font-semibold text-[#C4B5FD] hover:bg-violet-50 hover:border-violet-300 hover:text-violet-900 dark:hover:bg-violet-900/40 dark:hover:border-violet-600/60 dark:hover:text-white active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-violet-600 !text-white px-4 py-2 text-[12.5px] font-bold hover:bg-violet-700 hover:shadow-md hover:shadow-violet-500/20 active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer"
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