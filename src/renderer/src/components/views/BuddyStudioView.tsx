// src/renderer/src/components/views/BuddyStudioView.tsx
import React, { useState } from 'react';
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

const BUBBLE_COLORS = [
  { name: 'Mambo Indigo', hex: '#3C3173' },
  { name: 'Midnight Blue', hex: '#1E3A8A' },
  { name: 'Emerald Calm', hex: '#065F46' },
  { name: 'Plum Berry', hex: '#581C87' },
  { name: 'Rose Alert', hex: '#7F1D1D' },
] as const;

const ANIMATION_CATEGORIES: ReadonlyArray<{
  label: string;
  description: string;
  mode: ChibiCompanionMode;
}> = [
  {
    label: 'Study focus loop',
    description: 'Calm breathing float & natural blink cycle',
    mode: 'idle_studying',
  },
  {
    label: 'Break time stretch',
    description: 'Relaxed waving posture for 10m breaks',
    mode: 'bathroom',
  },
  {
    label: 'Water break',
    description: 'Sipping tumbler gesture with rising droplets',
    mode: 'hydration',
  },
  {
    label: 'Great job!',
    description: 'Joyful bounce with twinkling star sparkles',
    mode: 'celebrating',
  },
];

export const BuddyStudioView: React.FC = () => {
  const [selectedBuddyId, setSelectedBuddyId] = useState<string>('buddy-lv7');
  const [previewMode, setPreviewMode] =
    useState<ChibiCompanionMode>('idle_studying');
  const [bubbleColor, setBubbleColor] = useState<string>('#3C3173');
  const [sampleSpeech, setSampleSpeech] = useState<string>(
    "Wohoo good job so far, don't forget to rehydrate!"
  );

  const handleSelectRosterItem = (item: CompanionRosterUnlock) => {
    if (!item.unlocked) return;
    setSelectedBuddyId(item.id);
    setBubbleColor(item.accentBg);
    playChime('gentle_bell');
  };

  return (
    <div className="flex flex-col gap-5 p-6 text-white">
      <div>
        <h2 className="text-[22px] font-bold tracking-tight text-white">
          Buddy Companion Roster & Studio
        </h2>
        <p className="mt-1 text-[13px] text-[#9E97B8]">
          Select an unlocked Mambo persona, customize speech bubble colors, and preview animation loops.
        </p>
      </div>

      {/* 5-Tier Companion Level Roster Row */}
      <div className="grid grid-cols-5 gap-3">
        {COMPANION_LEVEL_ROSTER.map((item) => {
          const isSelected = selectedBuddyId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={!item.unlocked}
              onClick={() => handleSelectRosterItem(item)}
              className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition ${
                isSelected
                  ? 'border-[#A594F9] bg-[#261E42] shadow-md cursor-pointer'
                  : item.unlocked
                  ? 'border-[#2C253E] bg-[#181424] hover:border-[#423861] cursor-pointer'
                  : 'border-[#221C33] bg-[#110E1A] opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <CompanionMiniAvatar
                  accessory={item.accessory}
                  unlocked={item.unlocked}
                  accentBg={item.accentBg}
                />
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    item.unlocked
                      ? 'bg-[#3C3173] text-[#E2DFF0]'
                      : 'bg-[#1D182B] text-[#7D7696]'
                  }`}
                >
                  Lv. {item.level}
                </span>
              </div>

              <div className="mt-3">
                <p className="text-[13px] font-bold text-white truncate">
                  {item.name}
                </p>
                <p
                  className={`mt-0.5 text-[10.5px] font-medium truncate ${
                    item.unlocked ? 'text-[#4ADE80]' : 'text-[#8E87A8]'
                  }`}
                >
                  {item.statusLabel}
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
          <ChibiCompanion mode={previewMode} size="lg" />

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
              Animation Categories
            </h3>
            <p className="mt-0.5 text-[12px] text-[#9E97B8]">
              Click any slot to preview Mambo&apos;s vector posture and expression loop.
            </p>

            <div className="mt-4 flex flex-col gap-2.5">
              {ANIMATION_CATEGORIES.map((anim) => {
                const isSelected = previewMode === anim.mode;
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
                      <p className="text-[13.5px] font-bold text-white">
                        {anim.label}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-[#8E87A8]">
                        {anim.description}
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
    </div>
  );
};

export default BuddyStudioView;