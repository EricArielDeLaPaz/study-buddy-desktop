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
import { playChime } from '../../utils/audio';

type MarketplaceFilter = 'All' | 'Study' | 'Calm' | 'Fun' | 'Minimal';
type PresetApplyMode = 'create_new' | 'override_current';
type AnimationCategoryKey = 'Idle' | 'Reminder' | 'Success' | 'Status';

interface CommunityPreset {
  id: string;
  title: string;
  author: string;
  category: Exclude<MarketplaceFilter, 'All'>;
  description: string;
  downloads: string;
  accentHex: string;
  badgeText: string;
  previewMode: ChibiCompanionMode;
  includedCategories: AnimationCategoryKey[];
}

const COMMUNITY_PRESETS: ReadonlyArray<CommunityPreset> = [
  {
    id: 'preset-cozy-library',
    title: 'Cozy Library',
    author: '@hana_ux',
    category: 'Study',
    description:
      'Warm mahogany desk tones, page-flipping study idle loop, and gentle teacup hydration nudges.',
    downloads: '4.2k',
    accentHex: '#4C3073',
    badgeText: 'Study · Warm',
    previewMode: 'idle_studying',
    includedCategories: ['Idle', 'Reminder', 'Success', 'Status'],
  },
  {
    id: 'preset-neon-night',
    title: 'Neon Night',
    author: '@synth_mambo',
    category: 'Fun',
    description:
      'Cyberpunk synthwave glow with high-contrast intervention alerts and energetic celebration sparkles.',
    downloads: '3.8k',
    accentHex: '#1E3A8A',
    badgeText: 'Fun · Synth',
    previewMode: 'celebrating',
    includedCategories: ['Idle', 'Reminder', 'Success', 'Status'],
  },
  {
    id: 'preset-forest-focus',
    title: 'Forest Focus',
    author: '@moss_studio',
    category: 'Calm',
    description:
      'Botanical emerald palette designed for low-eye-strain reading blocks and mindful breathing breaks.',
    downloads: '5.1k',
    accentHex: '#065F46',
    badgeText: 'Calm · Botanical',
    previewMode: 'hydration',
    includedCategories: ['Idle', 'Reminder', 'Success'],
  },
  {
    id: 'preset-retro-arcade',
    title: 'Retro Arcade',
    author: '@pixel_knight',
    category: 'Minimal',
    description:
      'Crisp 16-bit inspired status badges, minimal distraction borders, and classic level-up chimes.',
    downloads: '2.9k',
    accentHex: '#581C87',
    badgeText: 'Minimal · Arcade',
    previewMode: 'bathroom',
    includedCategories: ['Idle', 'Reminder', 'Status'],
  },
];

const FILTER_PILLS: ReadonlyArray<MarketplaceFilter> = [
  'All',
  'Study',
  'Calm',
  'Fun',
  'Minimal',
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
  const [selectedFilter, setSelectedFilter] =
    useState<MarketplaceFilter>('All');
  const [selectedEarnedBuddyId, setSelectedEarnedBuddyId] =
    useState<string>('buddy-lv7');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    COMMUNITY_PRESETS[0].id
  );
  const [applyMode, setApplyMode] =
    useState<PresetApplyMode>('create_new');
  const [newPresetCustomName, setNewPresetCustomName] =
    useState<string>('Cozy Library Custom');
  const [selectedCategories, setSelectedCategories] = useState<
    Record<AnimationCategoryKey, boolean>
  >({
    Idle: true,
    Reminder: true,
    Success: true,
    Status: true,
  });
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  const filteredPresets =
    selectedFilter === 'All'
      ? COMMUNITY_PRESETS
      : COMMUNITY_PRESETS.filter((p) => p.category === selectedFilter);

  const activePreset =
    COMMUNITY_PRESETS.find((p) => p.id === selectedPresetId) ??
    COMMUNITY_PRESETS[0];

  const activeEarnedBuddy =
    COMPANION_LEVEL_ROSTER.find((b) => b.id === selectedEarnedBuddyId) ??
    COMPANION_LEVEL_ROSTER[0];

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

  const handleApplyPreset = () => {
    playChime('break_start');
    const enabledCount =
      Object.values(selectedCategories).filter(Boolean).length;
    const actionDescription =
      applyMode === 'create_new'
        ? `Created "${newPresetCustomName.trim() || activePreset.title}"`
        : `Overrode current preset with "${activePreset.title}"`;

    setAppliedBanner(
      `${actionDescription} (${enabledCount} categories applied to ${activeEarnedBuddy.name})`
    );
  };

  return (
    <div className="flex h-full flex-col gap-5 p-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight text-white">
            Companion Marketplace
          </h2>
          <p className="mt-1 text-[13px] text-[#9E97B8]">
            Pair your earned Mambo companions with community animation packs and theme presets.
          </p>
        </div>

        {appliedBanner && (
          <div className="rounded-full border border-[#34D399]/50 bg-[#0E362D] px-4 py-1.5 text-[12px] font-semibold text-[#6EE7B7]">
            ✓ {appliedBanner}
          </div>
        )}
      </div>

      {/* Three-Column Marketplace Grid */}
      <div className="grid flex-1 grid-cols-12 gap-4 min-h-0">
        {/* LEFT PANEL: Earned Buddies List */}
        <div className="col-span-3 flex flex-col rounded-2xl border border-[#2C253E] bg-[#181424] p-4">
          <div className="flex items-center justify-between border-b border-[#262038] pb-3">
            <h3 className="text-[14px] font-bold text-white">
              Earned buddies
            </h3>
            <span className="rounded-full bg-[#241E36] px-2 py-0.5 text-[10.5px] font-semibold text-[#A594F9]">
              3 / 5
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-2 overflow-y-auto">
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
                      ? 'border-[#2A233D] bg-[#120F1D] hover:bg-[#1E192E] cursor-pointer'
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
                        buddy.unlocked ? 'text-[#4ADE80]' : 'text-[#8E87A8]'
                      }`}
                    >
                      {buddy.unlocked ? `Lv. ${buddy.level} · Ready` : `Locked 🔒 Lv. ${buddy.level}`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTER PANEL: Marketplace Grid & Filter Pills */}
        <div className="col-span-5 flex flex-col rounded-2xl border border-[#2C253E] bg-[#181424] p-4">
          {/* Filter Pills */}
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
                        : 'bg-[#120F1D] text-[#9E97B8] hover:text-white'
                    }`}
                  >
                    {pill}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2x2 Community Presets Grid */}
          <div className="mt-3.5 grid grid-cols-2 gap-3 overflow-y-auto">
            {filteredPresets.map((preset) => {
              const isSelected = preset.id === activePreset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                    isSelected
                      ? 'border-[#A594F9] bg-[#261E42] shadow-[0_8px_24px_rgba(165,148,249,0.16)]'
                      : 'border-[#2A233D] bg-[#120F1D] hover:border-[#433864] hover:bg-[#1B162B]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        style={{ backgroundColor: preset.accentHex }}
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white"
                      >
                        {preset.badgeText}
                      </span>
                      <span className="text-[10.5px] font-medium text-[#8E87A8]">
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
                    <p className="text-[11px] font-medium text-[#A594F9]">
                      by {preset.author}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-[#9E97B8]">
                      {preset.description}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1 pt-2 border-t border-[#241E36]">
                    {preset.includedCategories.map((cat) => (
                      <span
                        key={cat}
                        className="rounded bg-[#1B162A] px-1.5 py-0.5 text-[9.5px] font-medium text-[#C4B5FD]"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: Preset Details Drawer */}
        <div className="col-span-4 flex flex-col justify-between rounded-2xl border border-[#342C4C] bg-[#181424] p-4">
          <div className="flex flex-col gap-3.5">
            {/* Selected Preset Summary Header */}
            <div className="flex items-center justify-between border-b border-[#262038] pb-3">
              <div>
                <h3 className="text-[15px] font-bold text-white">
                  {activePreset.title}
                </h3>
                <p className="text-[11.5px] text-[#9E97B8]">
                  Target buddy:{' '}
                  <span className="font-semibold text-[#C4B5FD]">
                    {activeEarnedBuddy.name}
                  </span>
                </p>
              </div>
              <span className="rounded-full bg-[#261E42] border border-[#4E4187] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#A594F9]">
                {activePreset.category}
              </span>
            </div>

            {/* Preset Apply Mode Options: Create new preset vs Override current preset */}
            <div className="flex flex-col gap-2">
              <span className="text-[11.5px] font-semibold text-[#B8B2CC]">
                Installation Mode
              </span>

              <button
                type="button"
                onClick={() => setApplyMode('create_new')}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-[12px] font-semibold transition cursor-pointer ${
                  applyMode === 'create_new'
                    ? 'border-[#A594F9] bg-[#261E42] text-white'
                    : 'border-[#2A233D] bg-[#120F1D] text-[#9E97B8] hover:text-white'
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
                  placeholder="New preset name..."
                  className="rounded-xl border border-[#322A4B] bg-[#0E0B16] px-3 py-1.5 text-[12px] text-white placeholder-[#5A5373] focus:border-[#A594F9] focus:outline-none select-text"
                />
              )}

              <button
                type="button"
                onClick={() => setApplyMode('override_current')}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-[12px] font-semibold transition cursor-pointer ${
                  applyMode === 'override_current'
                    ? 'border-[#A594F9] bg-[#261E42] text-white'
                    : 'border-[#2A233D] bg-[#120F1D] text-[#9E97B8] hover:text-white'
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
            </div>

            {/* Category Toggles: Idle, Reminder, Success, Status */}
            <div className="flex flex-col gap-2">
              <span className="text-[11.5px] font-semibold text-[#B8B2CC]">
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
                        ? 'border-[#383052] bg-[#161224]'
                        : 'border-[#221C33] bg-[#0F0C18] opacity-60'
                    }`}
                  >
                    <div>
                      <p className="text-[12.5px] font-bold text-white">
                        {item.key}
                      </p>
                      <p className="text-[10.5px] text-[#8E87A8]">
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
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-[#151120] transition-transform ${
                          isChecked ? 'translate-x-4' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Primary Apply CTA */}
          <button
            type="button"
            onClick={handleApplyPreset}
            className="mt-4 w-full rounded-xl bg-[#A594F9] py-2.5 px-4 text-[13px] font-bold text-[#171329] shadow-md hover:bg-[#B5A7FA] active:scale-[0.99] transition cursor-pointer"
          >
            {applyMode === 'create_new'
              ? 'Create & Equip Preset'
              : 'Override Active Preset'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceView;