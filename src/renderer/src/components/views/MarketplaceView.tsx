// src/renderer/src/components/views/MarketplaceView.tsx
import React, { useState } from 'react';
import {
  COMPANION_LEVEL_ROSTER,
  CompanionMiniAvatar,
} from './ProgressView';
import {
  ChibiCompanion,
  ChibiCompanionMode,
} from '../companion/ChibiCompanion';
import {
  loadUserBuddyPresets,
  USER_BUDDY_PRESETS_STORAGE_KEY,
  UserBuddyPreset,
} from './BuddyStudioView';
import { playChime } from '../../utils/audio';

type MarketplaceFilter = 'All' | 'Study' | 'Calm' | 'Fun' | 'Minimal' | 'Warm';
type PresetApplyMode = 'create_new' | 'override_current';
type AnimationCategoryKey = 'Idle' | 'Reminder' | 'Success' | 'Status';
type ShareableTag = 'Study' | 'Calm' | 'Fun' | 'Minimal' | 'Warm';

interface CommunityPreset {
  id: string;
  title: string;
  author: string;
  tags: ShareableTag[];
  description: string;
  downloads: string;
  previewMode: ChibiCompanionMode;
}

const INITIAL_COMMUNITY_PRESETS: CommunityPreset[] = [
  {
    id: 'preset-cozy-library',
    title: 'Cozy Library',
    author: '@hana_ux',
    tags: ['Study', 'Warm'],
    description:
      'Warm mahogany desk tones, page-flipping study idle loop, and gentle teacup hydration nudges.',
    downloads: '4.2k',
    previewMode: 'idle_studying',
  },
  {
    id: 'preset-neon-night',
    title: 'Neon Night',
    author: '@synth_mambo',
    tags: ['Fun', 'Study'],
    description:
      'Velvet synthwave glow with high-contrast intervention alerts and energetic celebration sparkles.',
    downloads: '3.8k',
    previewMode: 'celebrating',
  },
  {
    id: 'preset-forest-focus',
    title: 'Lavender Focus',
    author: '@moss_studio',
    tags: ['Calm', 'Warm'],
    description:
      'Soothing lavender palette designed for low-eye-strain reading blocks and mindful breathing breaks.',
    downloads: '5.1k',
    previewMode: 'hydration',
  },
  {
    id: 'preset-retro-arcade',
    title: 'Retro Arcade',
    author: '@pixel_knight',
    tags: ['Minimal', 'Fun'],
    description:
      'Crisp 16-bit inspired status animations, minimal distraction borders, and classic level-up chimes.',
    downloads: '2.9k',
    previewMode: 'bathroom',
  },
];

const FILTER_PILLS: ReadonlyArray<MarketplaceFilter> = [
  'All',
  'Study',
  'Calm',
  'Fun',
  'Minimal',
  'Warm',
];

const SHAREABLE_TAGS: ReadonlyArray<ShareableTag> = [
  'Study',
  'Calm',
  'Fun',
  'Minimal',
  'Warm',
];

const CATEGORY_TOGGLES: ReadonlyArray<{
  key: AnimationCategoryKey;
  subtitle: string;
}> = [
  { key: 'Idle', subtitle: 'Studying & reading desk loops' },
  { key: 'Reminder', subtitle: 'Water & stretch break animations' },
  { key: 'Success', subtitle: 'Goal completion & XP celebrations' },
  { key: 'Status', subtitle: 'Distraction nudge & sleeping states' },
];

export const MarketplaceView: React.FC = () => {
  const [presets, setPresets] = useState<CommunityPreset[]>(
    INITIAL_COMMUNITY_PRESETS
  );
  const [userActivePresets, setUserActivePresets] = useState<UserBuddyPreset[]>(
    loadUserBuddyPresets
  );

  // Filter strictly to user-created Custom presets for the "Share to Marketplace" modal
  const customOnlyPresets = userActivePresets.filter(
    (preset) => preset.source === 'Custom'
  );

  const [selectedFilter, setSelectedFilter] =
    useState<MarketplaceFilter>('All');
  const [selectedEarnedBuddyId, setSelectedEarnedBuddyId] =
    useState<string>('buddy-lv7');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    INITIAL_COMMUNITY_PRESETS[0].id
  );

  // Right Drawer State
  const [applyMode, setApplyMode] =
    useState<PresetApplyMode>('create_new');
  const [newPresetCustomName, setNewPresetCustomName] =
    useState<string>('Cozy Library Custom');
  const [overrideTargetPresetId, setOverrideTargetPresetId] = useState<string>(
    () => userActivePresets[0]?.id ?? 'preset-mkt-cozy'
  );

  const [selectedCategories, setSelectedCategories] = useState<
    Record<AnimationCategoryKey, boolean>
  >({
    Idle: true,
    Reminder: true,
    Success: true,
    Status: true,
  });

  // "Share your Buddy to Marketplace" Modal State (Filtered strictly to Custom Presets)
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [publishSourcePresetId, setPublishSourcePresetId] = useState<string>(
    () => customOnlyPresets[0]?.id ?? ''
  );
  const [publishTitle, setPublishTitle] = useState<string>(
    () => customOnlyPresets[0]?.name ?? 'Midnight Matcha'
  );
  const [publishTags, setPublishTags] = useState<ShareableTag[]>([
    'Study',
    'Calm',
  ]);
  const [publishDescription, setPublishDescription] = useState<string>('');
  const [publishMode, setPublishMode] =
    useState<ChibiCompanionMode>('idle_studying');

  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  const filteredPresets =
    selectedFilter === 'All'
      ? presets
      : presets.filter((p) => p.tags.includes(selectedFilter));

  const activePreset =
    presets.find((p) => p.id === selectedPresetId) ?? presets[0];

  const activeEarnedBuddy =
    COMPANION_LEVEL_ROSTER.find((b) => b.id === selectedEarnedBuddyId) ??
    COMPANION_LEVEL_ROSTER[0];

  const handleOpenPublishModal = () => {
    const latestPresets = loadUserBuddyPresets();
    setUserActivePresets(latestPresets);
    const customList = latestPresets.filter((p) => p.source === 'Custom');
    if (customList.length > 0) {
      setPublishSourcePresetId(customList[0].id);
      setPublishTitle(customList[0].name);
      setPublishMode(customList[0].defaultMode);
    }
    setIsPublishModalOpen(true);
  };

  const handleSelectPreset = (preset: CommunityPreset) => {
    setSelectedPresetId(preset.id);
    setNewPresetCustomName(`${preset.title} Custom`);
    setAppliedBanner(null);
  };

  const toggleCategory = (key: AnimationCategoryKey) => {
    setSelectedCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const togglePublishTag = (tag: ShareableTag) => {
    setPublishTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleApplyPreset = () => {
    playChime('break_start');
    const enabledCount =
      Object.values(selectedCategories).filter(Boolean).length;

    if (applyMode === 'create_new') {
      const createdUserPreset: UserBuddyPreset = {
        id: `preset-mkt-${Date.now()}`,
        name: newPresetCustomName.trim() || activePreset.title,
        source: 'Marketplace',
        accentBg: '#3C3173',
        defaultMode: activePreset.previewMode,
        slots: [
          {
            id: 'slot-idle',
            label: 'Study focus loop',
            slotKey: 'Idle',
            description: `${activePreset.title} focus animation`,
            mode: 'idle_studying',
          },
          {
            id: 'slot-water',
            label: 'Water break',
            slotKey: 'Hydration',
            description: `${activePreset.title} hydration animation`,
            mode: 'hydration',
          },
          {
            id: 'slot-break',
            label: 'Break time stretch',
            slotKey: 'Break',
            description: `${activePreset.title} stretch animation`,
            mode: 'bathroom',
          },
          {
            id: 'slot-alert',
            label: 'Distraction alert',
            slotKey: 'Alert',
            description: `${activePreset.title} alert animation`,
            mode: 'intervention',
          },
        ],
      };
      const updated = [createdUserPreset, ...userActivePresets];
      setUserActivePresets(updated);
      setOverrideTargetPresetId(createdUserPreset.id);
      try {
        localStorage.setItem(
          USER_BUDDY_PRESETS_STORAGE_KEY,
          JSON.stringify(updated)
        );
      } catch {
        // Ignore storage error
      }
      setAppliedBanner(
        `Created preset "${createdUserPreset.name}" (${enabledCount} categories active)`
      );
    } else {
      const targetObj = userActivePresets.find(
        (p) => p.id === overrideTargetPresetId
      );
      const targetName = targetObj?.name || 'Selected Preset';
      const updated = userActivePresets.map((p) =>
        p.id === overrideTargetPresetId
          ? {
              ...p,
              name: `${activePreset.title} (${p.source})`,
              defaultMode: activePreset.previewMode,
            }
          : p
      );
      setUserActivePresets(updated);
      try {
        localStorage.setItem(
          USER_BUDDY_PRESETS_STORAGE_KEY,
          JSON.stringify(updated)
        );
      } catch {
        // Ignore storage error
      }
      setAppliedBanner(
        `Overwrote "${targetName}" with "${activePreset.title}" (${enabledCount} categories active)`
      );
    }
  };

  const handlePublishBuddy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishTitle.trim() || customOnlyPresets.length === 0) return;

    const created: CommunityPreset = {
      id: `preset-custom-${Date.now()}`,
      title: publishTitle.trim(),
      author: '@you',
      tags: publishTags.length > 0 ? publishTags : ['Study'],
      description:
        publishDescription.trim() ||
        `Custom Mambo companion configuration created by @you.`,
      downloads: '1',
      previewMode: publishMode,
    };

    setPresets((prev) => [created, ...prev]);
    setSelectedPresetId(created.id);
    setPublishDescription('');
    setIsPublishModalOpen(false);
    playChime('gentle_bell');
    setAppliedBanner(
      `Published "${created.title}" to the Community Marketplace!`
    );
  };

  return (
    <div className="relative flex h-full flex-col gap-5 p-6 text-white font-sans">
      {/* Top Header with "Add to Marketplace" Action Button */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-[22px] font-bold tracking-tight text-white">
            Companion Marketplace
          </h2>
          <p className="mt-1 text-[13px] text-[#9E97B8]">
            Pair your earned Mambo companions with community animation packs or publish your own custom creation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {appliedBanner && (
            <div className="rounded-full border border-[#A594F9]/50 bg-[#261E42] px-3.5 py-1.5 text-[11.5px] font-semibold text-[#C4B5FD]">
              ✓ {appliedBanner}
            </div>
          )}

          <button
            type="button"
            onClick={handleOpenPublishModal}
            className="flex items-center gap-2 rounded-xl bg-[#A594F9] px-4 py-2 text-[12.5px] font-bold text-[#171329] shadow-md hover:bg-[#B5A7FA] transition cursor-pointer shrink-0"
          >
            <span>+ Add to Marketplace</span>
          </button>
        </div>
      </div>

      {/* Three-Column Marketplace Grid */}
      <div className="grid flex-1 grid-cols-12 gap-4 min-h-0">
        {/* LEFT PANEL: Earned Buddies List */}
        <div className="col-span-3 flex flex-col rounded-2xl border border-[#2C253E] bg-[#181424] p-4">
          <div className="flex items-center justify-between border-b border-[#262038] pb-3">
            <h3 className="text-[14px] font-bold text-white">
              Earned buddies
            </h3>
            <span className="rounded-full bg-[#261E42] px-2 py-0.5 text-[10.5px] font-semibold text-[#A594F9]">
              {COMPANION_LEVEL_ROSTER.filter((b) => b.unlocked).length} /{' '}
              {COMPANION_LEVEL_ROSTER.length}
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-2 overflow-y-auto scrollbar-thin">
            {COMPANION_LEVEL_ROSTER.map((buddy) => {
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
                        buddy.unlocked ? 'text-[#C4B5FD]' : 'text-[#8E87A8]'
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

        {/* CENTER PANEL: Marketplace Grid (Strict Purple/Indigo Palette) */}
        <div className="col-span-5 flex flex-col rounded-2xl border border-[#2C253E] bg-[#181424] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#262038] pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {FILTER_PILLS.map((pill) => {
                const active = selectedFilter === pill;
                return (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => setSelectedFilter(pill)}
                    className={`rounded-full px-3 py-1 text-[11.5px] font-semibold transition cursor-pointer ${
                      active
                        ? 'bg-[#A594F9] text-[#171329]'
                        : 'bg-[#141020] text-[#9E97B8] hover:bg-[#261E42] hover:text-white'
                    }`}
                  >
                    {pill}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-3 overflow-y-auto scrollbar-thin">
            {filteredPresets.map((preset) => {
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
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#A594F9]">
                        {preset.author}
                      </span>
                      <span className="text-[10.5px] font-medium text-[#9E97B8]">
                        ⬇ {preset.downloads}
                      </span>
                    </div>

                    <div className="my-3 flex justify-center">
                      <ChibiCompanion
                        mode={preset.previewMode}
                        size="sm"
                        showStateBadge={false}
                      />
                    </div>

                    <p className="text-[14px] font-bold text-white">
                      {preset.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#9E97B8]">
                      {preset.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: Preset Details Drawer */}
        <div className="col-span-4 flex flex-col justify-between rounded-2xl border border-[#4E4187] bg-[#181424] p-4">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between border-b border-[#262038] pb-3">
              <div>
                <h3 className="text-[15px] font-bold text-white">
                  {activePreset.title}
                </h3>
                <p className="text-[11.5px] text-[#9E97B8]">
                  Base buddy:{' '}
                  <span className="font-semibold text-[#C4B5FD]">
                    {activeEarnedBuddy.name}
                  </span>
                </p>
              </div>
            </div>

            {/* Preset Apply Mode Options */}
            <div className="flex flex-col gap-2">
              <span className="text-[11.5px] font-semibold text-[#E2DFF0]">
                Preset Action
              </span>

              <button
                type="button"
                onClick={() => setApplyMode('create_new')}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-[12px] font-semibold transition cursor-pointer ${
                  applyMode === 'create_new'
                    ? 'border-[#A594F9] bg-[#261E42] text-white'
                    : 'border-[#2C253E] bg-[#141020] text-[#9E97B8] hover:text-white'
                }`}
              >
                <span>Create new preset</span>
                <span
                  className={`h-3 w-3 rounded-full border ${
                    applyMode === 'create_new'
                      ? 'border-white bg-[#A594F9]'
                      : 'border-[#5A5373]'
                  }`}
                />
              </button>

              {applyMode === 'create_new' && (
                <input
                  type="text"
                  value={newPresetCustomName}
                  onChange={(e) => setNewPresetCustomName(e.target.value)}
                  placeholder="Enter new preset name..."
                  className="rounded-xl border border-[#4E4187] bg-[#0E0B16] px-3 py-1.5 text-[12px] text-white placeholder-[#5A5373] focus:border-[#A594F9] focus:outline-none select-text"
                />
              )}

              <button
                type="button"
                onClick={() => setApplyMode('override_current')}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-[12px] font-semibold transition cursor-pointer ${
                  applyMode === 'override_current'
                    ? 'border-[#A594F9] bg-[#261E42] text-white'
                    : 'border-[#2C253E] bg-[#141020] text-[#9E97B8] hover:text-white'
                }`}
              >
                <span>Override current preset</span>
                <span
                  className={`h-3 w-3 rounded-full border ${
                    applyMode === 'override_current'
                      ? 'border-white bg-[#A594F9]'
                      : 'border-[#5A5373]'
                  }`}
                />
              </button>

              {applyMode === 'override_current' && (
                <div className="flex flex-col gap-1 pt-0.5">
                  <label className="text-[11px] font-medium text-[#9E97B8]">
                    Select active preset to replace:
                  </label>
                  <select
                    value={overrideTargetPresetId}
                    onChange={(e) => setOverrideTargetPresetId(e.target.value)}
                    className="w-full rounded-xl border border-[#4E4187] bg-[#0E0B16] px-3 py-2 text-[12px] font-semibold text-white focus:border-[#A594F9] focus:outline-none cursor-pointer"
                  >
                    {userActivePresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name} ({preset.source})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Category Toggles: Idle, Reminder, Success, Status */}
            <div className="flex flex-col gap-2">
              <span className="text-[11.5px] font-semibold text-[#E2DFF0]">
                Animation Category Toggles
              </span>

              {CATEGORY_TOGGLES.map((item) => {
                const isChecked = selectedCategories[item.key];
                return (
                  <div
                    key={item.key}
                    onClick={() => toggleCategory(item.key)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 transition cursor-pointer ${
                      isChecked
                        ? 'border-[#4E4187] bg-[#221D33]'
                        : 'border-[#2C253E] bg-[#0E0B16] opacity-60'
                    }`}
                  >
                    <div>
                      <p className="text-[12.5px] font-bold text-white">
                        {item.key}
                      </p>
                      <p className="text-[10.5px] text-[#9E97B8]">
                        {item.subtitle}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={isChecked}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCategory(item.key);
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                        isChecked ? 'bg-[#A594F9]' : 'bg-[#2C253E]'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-[#171329] transition-transform ${
                          isChecked ? 'translate-x-4' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyPreset}
            className="mt-4 w-full rounded-xl bg-[#A594F9] py-2.5 px-4 text-[13px] font-bold text-[#171329] shadow-md hover:bg-[#B5A7FA] active:scale-[0.99] transition cursor-pointer"
          >
            {applyMode === 'create_new'
              ? 'Create & Equip Preset'
              : 'Replace Selected Preset'}
          </button>
        </div>
      </div>

      {/* Share your Buddy to Marketplace Overlay Modal (Filtered ONLY to Custom Presets) */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={handlePublishBuddy}
            className="w-[440px] rounded-[24px] border border-[#4E4187] bg-[#181424] p-5 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-[#2C253E] pb-3">
              <div>
                <h3 className="font-display text-[17px] font-bold text-white">
                  Share your Buddy to Marketplace
                </h3>
                <p className="text-[11.5px] text-[#9E97B8]">
                  Only user-created Custom presets can be shared publicly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#261E42] text-[#C4B5FD] hover:bg-[#A594F9] hover:text-[#171329] transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 1. Custom-Only Preset Selection Dropdown Positioned Above Title */}
            <div>
              <label className="block text-[12px] font-semibold text-[#E2DFF0]">
                Select Custom Preset to Share
              </label>
              {customOnlyPresets.length > 0 ? (
                <select
                  value={publishSourcePresetId}
                  onChange={(e) => {
                    const chosenId = e.target.value;
                    setPublishSourcePresetId(chosenId);
                    const found = customOnlyPresets.find(
                      (p) => p.id === chosenId
                    );
                    if (found) {
                      setPublishTitle(found.name);
                      setPublishMode(found.defaultMode);
                    }
                  }}
                  className="mt-1.5 w-full rounded-xl border border-[#4E4187] bg-[#0E0B16] px-3 py-2 text-[12.5px] font-semibold text-white focus:border-[#A594F9] focus:outline-none cursor-pointer"
                >
                  {customOnlyPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} (Custom)
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-1.5 rounded-xl border border-[#4E4187] bg-[#261E42]/60 px-3 py-2 text-[12px] text-[#C4B5FD]">
                  No custom presets found. Create a custom buddy in the Buddy tab first!
                </div>
              )}
            </div>

            {/* 2. Preset Title Input Field */}
            <div>
              <label className="block text-[12px] font-semibold text-[#E2DFF0]">
                Preset Title
              </label>
              <input
                type="text"
                required
                value={publishTitle}
                onChange={(e) => setPublishTitle(e.target.value)}
                placeholder="e.g., Midnight Matcha Mambo"
                className="mt-1.5 w-full rounded-xl border border-[#4E4187] bg-[#0E0B16] px-3 py-2 text-[13px] text-white placeholder-[#5A5373] focus:border-[#A594F9] focus:outline-none select-text"
              />
            </div>

            {/* 3. Multi-Select Category Tags */}
            <div>
              <span className="block text-[12px] font-semibold text-[#E2DFF0]">
                Best Used For (Select Tags)
              </span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SHAREABLE_TAGS.map((tag) => {
                  const selected = publishTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => togglePublishTag(tag)}
                      className={`rounded-full border px-3 py-1 text-[11.5px] font-semibold transition cursor-pointer ${
                        selected
                          ? 'border-[#A594F9] bg-[#A594F9] text-[#171329]'
                          : 'border-[#2C253E] bg-[#0E0B16] text-[#9E97B8] hover:border-[#4E4187] hover:text-white'
                      }`}
                    >
                      {selected ? `✓ ${tag}` : tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Description */}
            <div>
              <label className="block text-[12px] font-semibold text-[#E2DFF0]">
                Description
              </label>
              <textarea
                rows={3}
                value={publishDescription}
                onChange={(e) => setPublishDescription(e.target.value)}
                placeholder="Describe your custom Mambo companion theme and animations..."
                className="mt-1.5 w-full resize-none rounded-xl border border-[#4E4187] bg-[#0E0B16] p-2.5 text-[12.5px] text-white placeholder-[#5A5373] focus:border-[#A594F9] focus:outline-none select-text"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2C253E]">
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="rounded-xl border border-[#4E4187] bg-[#141020] px-4 py-2 text-[12.5px] font-semibold text-[#C4B5FD] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={customOnlyPresets.length === 0}
                className="rounded-xl bg-[#A594F9] px-4 py-2 text-[12.5px] font-bold text-[#171329] hover:bg-[#B5A7FA] disabled:opacity-50 cursor-pointer"
              >
                Publish Preset
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MarketplaceView;