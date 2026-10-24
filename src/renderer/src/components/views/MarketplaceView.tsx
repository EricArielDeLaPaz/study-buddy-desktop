// src/renderer/src/components/views/MarketplaceView.tsx
import React, { useState } from 'react';
import {
  getDynamicCompanionRoster,
  CompanionMiniAvatar,
} from './ProgressView';
import {
  ACTIVE_COMPANION_STORAGE_KEY,
  ActiveCompanionSelection,
  BuddyAnimationSlotConfig,
  loadUserBuddyPresets,
  USER_BUDDY_PRESETS_STORAGE_KEY,
  UserBuddyPreset,
} from './BuddyStudioView';
import {
  ChibiCompanion,
  ChibiCompanionMode,
  CompanionCharacterId,
  animationSlotIdToMode,
  modeToCanonicalSlotKey,
} from '../companion/ChibiCompanion';
import { AnimationSlotId } from '../../types/buddy';
import { playChime } from '../../utils/audio';

export interface MarketplaceViewProps {
  onNavigateToBuddy?: () => void;
}

type PresetApplyMode = 'create_new' | 'override_current';

interface PlaceholderBuddyPreset {
  id: string;
  characterId: CompanionCharacterId;
  title: string;
  creator: 'Study Buddy team';
  tagline: string;
  levelRequired: number;
  previewMode: ChibiCompanionMode;
  mainSlots: ReadonlyArray<{
    slotId: AnimationSlotId;
    label: string;
    mode: ChibiCompanionMode;
    reminderTrigger: string;
  }>;
  extraSlots: ReadonlyArray<{
    slotId: AnimationSlotId;
    label: string;
    mode: ChibiCompanionMode;
    reminderTrigger: string;
  }>;
}

const PLACEHOLDER_MARKETPLACE_BUDDIES: ReadonlyArray<PlaceholderBuddyPreset> = [
  {
    id: 'placeholder-cozy-library',
    characterId: 'cozy_library',
    title: 'Cozy Library',
    creator: 'Study Buddy team',
    tagline:
      'Barnaby the library owl with warm study loops, page-scanning reading, and teacup hydration nudges.',
    levelRequired: 2,
    previewMode: 'idle_studying',
    mainSlots: [
      {
        slotId: 'idle_studying',
        label: 'Idle studying',
        mode: 'idle_studying',
        reminderTrigger: 'None',
      },
      {
        slotId: 'reminder_drinking_water',
        label: 'Drinking water',
        mode: 'hydration',
        reminderTrigger: 'Drink Water',
      },
      {
        slotId: 'reminder_bathroom',
        label: 'Break / stretch',
        mode: 'bathroom',
        reminderTrigger: 'Bathroom Break',
      },
      {
        slotId: 'status_nudge',
        label: 'Nudge',
        mode: 'intervention',
        reminderTrigger: 'App Rules Nudge',
      },
    ],
    extraSlots: [
      {
        slotId: 'idle_reading',
        label: 'Idle reading',
        mode: 'idle_reading',
        reminderTrigger: 'None',
      },
      {
        slotId: 'status_sleeping',
        label: 'Sleeping',
        mode: 'sleeping',
        reminderTrigger: 'None',
      },
    ],
  },
  {
    id: 'placeholder-neon-night',
    characterId: 'neon_night',
    title: 'Neon Night',
    creator: 'Study Buddy team',
    tagline:
      'Byte the synthwave cyber-cat with glowing LED visor expressions for late-night focus sprints.',
    levelRequired: 4,
    previewMode: 'celebrating',
    mainSlots: [
      {
        slotId: 'idle_studying',
        label: 'Idle studying',
        mode: 'idle_studying',
        reminderTrigger: 'None',
      },
      {
        slotId: 'reminder_drinking_water',
        label: 'Drinking water',
        mode: 'hydration',
        reminderTrigger: 'Drink Water',
      },
      {
        slotId: 'reminder_bathroom',
        label: 'Break / stretch',
        mode: 'bathroom',
        reminderTrigger: 'Bathroom Break',
      },
      {
        slotId: 'status_nudge',
        label: 'Nudge',
        mode: 'intervention',
        reminderTrigger: 'App Rules Nudge',
      },
    ],
    extraSlots: [
      {
        slotId: 'idle_reading',
        label: 'Idle reading',
        mode: 'idle_reading',
        reminderTrigger: 'None',
      },
      {
        slotId: 'status_sleeping',
        label: 'Sleeping',
        mode: 'sleeping',
        reminderTrigger: 'None',
      },
    ],
  },
  {
    id: 'placeholder-lavender-focus',
    characterId: 'lavender_focus',
    title: 'Lavender Focus',
    creator: 'Study Buddy team',
    tagline:
      'Mochi the pastel cloud bunny with soothing lavender sprig animations for calm reading blocks.',
    levelRequired: 3,
    previewMode: 'hydration',
    mainSlots: [
      {
        slotId: 'idle_studying',
        label: 'Idle studying',
        mode: 'idle_studying',
        reminderTrigger: 'None',
      },
      {
        slotId: 'reminder_drinking_water',
        label: 'Drinking water',
        mode: 'hydration',
        reminderTrigger: 'Drink Water',
      },
      {
        slotId: 'reminder_bathroom',
        label: 'Break / stretch',
        mode: 'bathroom',
        reminderTrigger: 'Bathroom Break',
      },
      {
        slotId: 'status_nudge',
        label: 'Nudge',
        mode: 'intervention',
        reminderTrigger: 'App Rules Nudge',
      },
    ],
    extraSlots: [
      {
        slotId: 'idle_reading',
        label: 'Idle reading',
        mode: 'idle_reading',
        reminderTrigger: 'None',
      },
      {
        slotId: 'status_sleeping',
        label: 'Sleeping',
        mode: 'sleeping',
        reminderTrigger: 'None',
      },
    ],
  },
  {
    id: 'placeholder-retro-arcade',
    characterId: 'retro_arcade',
    title: 'Retro Arcade',
    creator: 'Study Buddy team',
    tagline:
      'Pip the 16-bit pocket sprout bot with expressive CRT screen animations and classic break cues.',
    levelRequired: 5,
    previewMode: 'bathroom',
    mainSlots: [
      {
        slotId: 'idle_studying',
        label: 'Idle studying',
        mode: 'idle_studying',
        reminderTrigger: 'None',
      },
      {
        slotId: 'reminder_drinking_water',
        label: 'Drinking water',
        mode: 'hydration',
        reminderTrigger: 'Drink Water',
      },
      {
        slotId: 'reminder_bathroom',
        label: 'Break / stretch',
        mode: 'bathroom',
        reminderTrigger: 'Bathroom Break',
      },
      {
        slotId: 'status_nudge',
        label: 'Nudge',
        mode: 'intervention',
        reminderTrigger: 'App Rules Nudge',
      },
    ],
    extraSlots: [
      {
        slotId: 'idle_reading',
        label: 'Idle reading',
        mode: 'idle_reading',
        reminderTrigger: 'None',
      },
      {
        slotId: 'status_sleeping',
        label: 'Sleeping',
        mode: 'sleeping',
        reminderTrigger: 'None',
      },
    ],
  },
];

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  onNavigateToBuddy,
}) => {
  const earnedRoster = getDynamicCompanionRoster();

  const [userActivePresets, setUserActivePresets] = useState<UserBuddyPreset[]>(
    loadUserBuddyPresets
  );

  const [selectedEarnedBuddyId, setSelectedEarnedBuddyId] = useState<string>(
    () => earnedRoster[0]?.id ?? 'buddy-lv1'
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    PLACEHOLDER_MARKETPLACE_BUDDIES[0].id
  );
  const [selectedPreviewSlot, setSelectedPreviewSlot] =
    useState<AnimationSlotId>('idle_studying');

  // Right Drawer State
  const [applyMode, setApplyMode] =
    useState<PresetApplyMode>('create_new');
  const [newPresetCustomName, setNewPresetCustomName] =
    useState<string>('Cozy Library');
  const [overrideTargetPresetId, setOverrideTargetPresetId] = useState<string>(
    () => userActivePresets[0]?.id ?? 'preset-mkt-cozy'
  );

  const activePreset =
    PLACEHOLDER_MARKETPLACE_BUDDIES.find((p) => p.id === selectedPresetId) ??
    PLACEHOLDER_MARKETPLACE_BUDDIES[0];

  const activeEarnedBuddy =
    earnedRoster.find((b) => b.id === selectedEarnedBuddyId) ??
    earnedRoster[0];

  const handleSelectPreset = (preset: PlaceholderBuddyPreset) => {
    setSelectedPresetId(preset.id);
    setNewPresetCustomName(preset.title);
    setSelectedPreviewSlot(preset.mainSlots[0].slotId);
  };

  /**
   * Equips the selected placeholder companion character locally (saving its characterId
   * so the Companion dock and all overlays immediately render that character).
   */
  const handleEquipPlaceholderBuddy = () => {
    playChime('break_start');

    const allSixSlots: BuddyAnimationSlotConfig[] = [
      ...activePreset.mainSlots.map((s) => ({
        id: `${activePreset.id}-${s.slotId}`,
        label: s.label,
        slotKey: modeToCanonicalSlotKey(s.mode),
        description: `${activePreset.title} · ${s.label}`,
        mode: s.mode,
        reminderTrigger: s.reminderTrigger,
      })),
      ...activePreset.extraSlots.map((s) => ({
        id: `${activePreset.id}-${s.slotId}`,
        label: s.label,
        slotKey: modeToCanonicalSlotKey(s.mode),
        description: `${activePreset.title} · ${s.label}`,
        mode: s.mode,
        reminderTrigger: s.reminderTrigger,
      })),
    ];

    let equippedBuddy: UserBuddyPreset;
    let updatedRoster: UserBuddyPreset[];

    if (applyMode === 'create_new') {
      equippedBuddy = {
        id: `preset-mkt-${activePreset.characterId}-${Date.now()}`,
        name: newPresetCustomName.trim() || activePreset.title,
        characterId: activePreset.characterId,
        source: 'Marketplace',
        accentBg: '#2B2353',
        defaultMode: activePreset.previewMode,
        slots: allSixSlots,
      };
      updatedRoster = [equippedBuddy, ...userActivePresets];
    } else {
      const existingTarget =
        userActivePresets.find((p) => p.id === overrideTargetPresetId) ??
        userActivePresets[0];

      equippedBuddy = {
        ...(existingTarget ?? {
          id: `preset-mkt-${activePreset.characterId}-${Date.now()}`,
          source: 'Marketplace' as const,
          accentBg: '#2B2353',
        }),
        name: existingTarget ? existingTarget.name : activePreset.title,
        characterId: activePreset.characterId,
        defaultMode: activePreset.previewMode,
        slots: allSixSlots,
      };

      updatedRoster = userActivePresets.map((p) =>
        p.id === equippedBuddy.id ? equippedBuddy : p
      );
    }

    setUserActivePresets(updatedRoster);

    const activeSelectionPayload: ActiveCompanionSelection = {
      id: equippedBuddy.id,
      name: equippedBuddy.name,
      characterId: activePreset.characterId,
      kind: equippedBuddy.source,
      slots: allSixSlots,
    };

    try {
      localStorage.setItem(
        USER_BUDDY_PRESETS_STORAGE_KEY,
        JSON.stringify(updatedRoster)
      );
      localStorage.setItem(
        ACTIVE_COMPANION_STORAGE_KEY,
        JSON.stringify(activeSelectionPayload)
      );
      window.dispatchEvent(new CustomEvent('study-buddy:companion-updated'));
    } catch {
      // Ignore storage quota error
    }

    if (onNavigateToBuddy) {
      onNavigateToBuddy();
    } else {
      window.dispatchEvent(
        new CustomEvent('study-buddy:navigate-tab', { detail: 'buddy' })
      );
    }
  };

  const detailPreviewMode = animationSlotIdToMode(selectedPreviewSlot);

  return (
    <div className="relative flex h-full flex-col gap-5 p-6 text-white font-sans">
      {/* Top Header with Disabled "Coming soon" Publish Button */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-[22px] font-bold tracking-tight text-white">
            Companion Marketplace (Placeholders)
          </h2>
          <p className="mt-1 text-[13px] text-[#9490A8]">
            Browse the 4 original placeholder companions from the Study Buddy team and equip them locally.
          </p>
        </div>

        <button
          type="button"
          disabled
          title="Community sharing and uploads are coming soon"
          className="flex items-center gap-2 rounded-xl border border-[#2E2A45] bg-[#232136] px-4 py-2 text-[12.5px] font-semibold text-[#9490A8] opacity-55 cursor-not-allowed shrink-0"
        >
          <span>Share Buddy · Coming soon</span>
        </button>
      </div>

      {/* Three-Column Marketplace Grid */}
      <div className="grid flex-1 grid-cols-12 gap-4 min-h-0">
        {/* LEFT PANEL: Unlock Path Buddies */}
        <div className="col-span-3 flex flex-col rounded-2xl border border-[#2C253E] bg-[#181424] p-4">
          <div className="flex items-center justify-between border-b border-[#262038] pb-3">
            <h3 className="text-[14px] font-bold text-white">
              Unlock Path
            </h3>
            <span className="rounded-full bg-[#261E42] px-2 py-0.5 text-[10.5px] font-semibold text-[#A594F9]">
              {earnedRoster.filter((b) => b.unlocked).length} /{' '}
              {earnedRoster.length}
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-2 overflow-y-auto">
            {earnedRoster.map((buddy) => {
              const isSelected = selectedEarnedBuddyId === buddy.id;
              return (
                <button
                  key={buddy.id}
                  type="button"
                  disabled={!buddy.unlocked}
                  onClick={() => setSelectedEarnedBuddyId(buddy.id)}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${
                    isSelected
                      ? 'border-[#A594F9] bg-[#261E42] cursor-pointer'
                      : buddy.unlocked
                      ? 'border-[#2C253E] bg-[#141020] hover:bg-[#221D33] cursor-pointer'
                      : 'border-[#1E192D] bg-[#0E0B16] opacity-55 cursor-not-allowed'
                  }`}
                >
                  <CompanionMiniAvatar
                    accessory={buddy.accessory}
                    unlocked={buddy.unlocked}
                    accentBg={buddy.accentBg}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-bold text-white truncate">
                      {buddy.name}
                    </p>
                    <p
                      className={`text-[10.5px] truncate ${
                        buddy.unlocked ? 'text-[#C4B5FD]' : 'text-[#9490A8]'
                      }`}
                    >
                      {buddy.unlocked
                        ? buddy.level === 1
                          ? 'Starting buddy'
                          : `Unlocked at Lv ${buddy.level}`
                        : `Locked 🔒 Lv. ${buddy.level}`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTER PANEL: 4 Original Animated Placeholder Companions */}
        <div className="col-span-5 flex flex-col rounded-2xl border border-[#2C253E] bg-[#181424] p-4">
          <div className="flex items-center justify-between border-b border-[#262038] pb-3">
            <span className="text-[13px] font-bold text-white">
              4 Placeholder Buddies
            </span>
            <span className="rounded-full bg-violet-100 text-violet-800 border border-violet-200/90 dark:bg-[#2A244D] dark:text-[#C4B5FD] dark:border-[#52438F] px-2.5 py-0.5 text-[11px] font-semibold">
              Study Buddy team
            </span>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-3 overflow-y-auto">
            {PLACEHOLDER_MARKETPLACE_BUDDIES.map((preset) => {
              const isSelected = preset.id === activePreset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                    isSelected
                      ? 'border-[#A594F9] bg-[#261E42] shadow-[0_8px_24px_rgba(165,148,249,0.18)]'
                      : 'border-[#2C253E] bg-[#141020] hover:border-[#4E4187] hover:bg-[#221D33]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="rounded-full bg-violet-100 text-violet-800 border border-violet-200/90 dark:bg-[#2A244D] dark:text-[#C4B5FD] dark:border-[#52438F] px-2 py-0.5 text-[10px] font-semibold">
                        Placeholder
                      </span>
                      <span className="text-[10.5px] font-semibold text-[#9490A8]">
                        Lv. {preset.levelRequired}
                      </span>
                    </div>

                    <div className="my-2.5 flex justify-center">
                      <ChibiCompanion
                        characterId={preset.characterId}
                        mode={preset.previewMode}
                        size="sm"
                        showStateBadge={false}
                        disableGlobalEquipLookup
                      />
                    </div>

                    <p className="text-[14px] font-bold text-white">
                      {preset.title}
                    </p>
                    <p className="text-[11px] font-semibold text-[#A594F9]">
                      {preset.creator}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#9490A8]">
                      {preset.tagline}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: Real Animated Character Preview Across All 6 Modes */}
        <div className="col-span-4 flex flex-col justify-between rounded-2xl border border-[#4E4187] bg-[#181424] p-4 overflow-y-auto">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#262038] pb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-bold text-white">
                    {activePreset.title}
                  </h3>
                  <span className="rounded-full bg-[#2A244D] border border-[#52438F] px-2 py-0.5 text-[10px] font-semibold text-[#C4B5FD]">
                    Placeholder
                  </span>
                </div>
                <p className="text-[11.5px] text-[#9490A8]">
                  Creator: {activePreset.creator} · Base: {activeEarnedBuddy.name}
                </p>
              </div>
            </div>

            {/* Live Animated Character Playing Selected Mode */}
            <div className="flex justify-center py-1">
              <ChibiCompanion
                characterId={activePreset.characterId}
                mode={detailPreviewMode}
                size="md"
                showStateBadge={false}
                disableGlobalEquipLookup
              />
            </div>

            {/* Main Animations (4) */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C4B5FD]">
                Main Animations (4)
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {activePreset.mainSlots.map((slot) => {
                  const active = selectedPreviewSlot === slot.slotId;
                  return (
                    <button
                      key={slot.slotId}
                      type="button"
                      onClick={() => setSelectedPreviewSlot(slot.slotId)}
                      className={`rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-semibold transition cursor-pointer ${
                        active
                          ? 'border-violet-500 bg-violet-600 !text-white'
                          : 'border-[#2C253E] bg-[#141020] text-[#C4B5FD] hover:border-[#52438F]'
                      }`}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Extra Animations (2) */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C4B5FD]">
                Extra Animations (2)
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {activePreset.extraSlots.map((slot) => {
                  const active = selectedPreviewSlot === slot.slotId;
                  return (
                    <button
                      key={slot.slotId}
                      type="button"
                      onClick={() => setSelectedPreviewSlot(slot.slotId)}
                      className={`rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-semibold transition cursor-pointer ${
                        active
                          ? 'border-violet-500 bg-violet-600 !text-white'
                          : 'border-[#2C253E] bg-[#141020] text-[#C4B5FD] hover:border-[#52438F]'
                      }`}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Local Equip Mode */}
            <div className="flex flex-col gap-1.5 border-t border-[#262038] pt-2.5">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setApplyMode('create_new')}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold transition cursor-pointer ${
                    applyMode === 'create_new'
                      ? 'border-[#A594F9] bg-[#261E42] text-white'
                      : 'border-[#2C253E] bg-[#141020] text-[#9490A8]'
                  }`}
                >
                  Create new preset
                </button>
                <button
                  type="button"
                  onClick={() => setApplyMode('override_current')}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold transition cursor-pointer ${
                    applyMode === 'override_current'
                      ? 'border-[#A594F9] bg-[#261E42] text-white'
                      : 'border-[#2C253E] bg-[#141020] text-[#9490A8]'
                  }`}
                >
                  Override preset
                </button>
              </div>

              {applyMode === 'create_new' ? (
                <input
                  type="text"
                  value={newPresetCustomName}
                  onChange={(e) => setNewPresetCustomName(e.target.value)}
                  placeholder="Local preset name..."
                  className="rounded-xl border border-[#4E4187] bg-[#0E0B16] px-3 py-1.5 text-[12px] text-white placeholder-[#9490A8] focus:border-[#A594F9] focus:outline-none select-text"
                />
              ) : (
                <select
                  value={overrideTargetPresetId}
                  onChange={(e) => setOverrideTargetPresetId(e.target.value)}
                  className="w-full rounded-xl border border-[#4E4187] bg-[#0E0B16] px-3 py-1.5 text-[12px] font-semibold text-white focus:border-[#A594F9] focus:outline-none cursor-pointer"
                >
                  {userActivePresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleEquipPlaceholderBuddy}
            className="mt-3 w-full rounded-xl bg-violet-600 !text-white py-2.5 px-4 text-[13px] font-bold shadow-md hover:bg-violet-700 active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer"
          >
            Equip Locally in Buddy Studio
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceView;
