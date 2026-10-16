// src/renderer/src/components/views/SessionView.tsx
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ChibiCompanion } from '../companion/ChibiCompanion';

interface SessionPreset {
  id: 'quick' | 'standard' | 'deep' | 'custom';
  title: string;
  subtitle: string;
  focusMinutes: number;
  breakMinutes: number;
  badge: string;
}

const SESSION_PRESETS: ReadonlyArray<SessionPreset> = [
  {
    id: 'quick',
    title: 'Quick 25/5',
    subtitle: '25 min focus · 5 min break',
    focusMinutes: 25,
    breakMinutes: 5,
    badge: 'Pomodoro',
  },
  {
    id: 'standard',
    title: 'Standard 45/5',
    subtitle: '45 min focus · 5 min break',
    focusMinutes: 45,
    breakMinutes: 5,
    badge: 'Balanced',
  },
  {
    id: 'deep',
    title: 'Deep 60/10',
    subtitle: '60 min focus · 10 min break',
    focusMinutes: 60,
    breakMinutes: 10,
    badge: 'Deep Work',
  },
  {
    id: 'custom',
    title: 'Custom',
    subtitle: 'Tailor your focus & break blocks',
    focusMinutes: 35,
    breakMinutes: 7,
    badge: 'Flexible',
  },
];

const GOAL_CATEGORIES = ['Reading', 'Homework', 'Exam prep', 'Writing'] as const;

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const SessionView: React.FC = () => {
  const {
    sessionStatus,
    focusTimeRemaining,
    focusTargetMinutes,
    hydrationIntervalMinutes,
    setFocusTargetMinutes,
    setHydrationIntervalMinutes,
    startFocusSession,
    pauseFocusSession,
    skipFocusBlock,
  } = useApp();

  const [selectedPreset, setSelectedPreset] =
    useState<SessionPreset['id']>('quick');
  const [breakDurationMinutes, setBreakDurationMinutes] = useState<number>(5);
  const [studyGoal, setStudyGoal] = useState<string>(
    'Complete Chapter 4 cellular respiration synthesis notes'
  );
  const [selectedCategory, setSelectedCategory] =
    useState<string>('Exam prep');

  const handleSelectPreset = (preset: SessionPreset) => {
    setSelectedPreset(preset.id);
    setFocusTargetMinutes(preset.focusMinutes);
    setBreakDurationMinutes(preset.breakMinutes);
  };

  const adjustFocusMinutes = (delta: number) => {
    setSelectedPreset('custom');
    setFocusTargetMinutes(Math.max(5, Math.min(180, focusTargetMinutes + delta)));
  };

  const adjustBreakMinutes = (delta: number) => {
    setSelectedPreset('custom');
    setBreakDurationMinutes((prev) => Math.max(1, Math.min(60, prev + delta)));
  };

  const adjustHydrationCadence = (delta: number) => {
    setHydrationIntervalMinutes(
      Math.max(10, Math.min(120, hydrationIntervalMinutes + delta))
    );
  };

  const isFocusing = sessionStatus === 'focusing';

  return (
    <div className="flex flex-col gap-6 p-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight text-white">
            Focus Session
          </h2>
          <p className="mt-1 text-[13px] text-[#9E97B8]">
            Choose a cadence, set your study goal, and let Mambo guard your flow.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-[#1C172B] border border-[#322A4B] px-4 py-1.5 text-[12.5px]">
          <span
            className={`h-2 w-2 rounded-full ${
              isFocusing ? 'bg-[#4ADE80] animate-pulse' : 'bg-[#FBBF24]'
            }`}
          />
          <span className="font-semibold tabular-nums text-[#E2DFF0]">
            {isFocusing ? 'Active Session' : 'Session Paused'} ·{' '}
            {formatClock(focusTimeRemaining)}
          </span>
        </div>
      </div>

      {/* 4 Session Preset Cards */}
      <div className="grid grid-cols-4 gap-3.5">
        {SESSION_PRESETS.map((preset) => {
          const isSelected = selectedPreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`flex flex-col items-start justify-between rounded-2xl border p-4 text-left transition cursor-pointer ${
                isSelected
                  ? 'border-[#A594F9] bg-[#261E42] shadow-[0_8px_24px_rgba(165,148,249,0.16)]'
                  : 'border-[#2C253E] bg-[#181424] hover:border-[#423861] hover:bg-[#1E192D]'
              }`}
            >
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${
                  isSelected
                    ? 'bg-[#A594F9] text-[#171329]'
                    : 'bg-[#251F38] text-[#9E97B8]'
                }`}
              >
                {preset.badge}
              </span>
              <div className="mt-3">
                <p className="text-[15px] font-bold text-white">
                  {preset.title}
                </p>
                <p className="mt-1 text-[11.5px] text-[#9E97B8]">
                  {preset.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Two-Column Setup Grid */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left Column: Study Goal Input, Category Pills & Timer Steppers */}
        <div className="col-span-7 flex flex-col gap-5 rounded-2xl border border-[#2C253E] bg-[#181424] p-5">
          {/* Study Goal Section */}
          <div>
            <label
              htmlFor="study-goal-input"
              className="block text-[13px] font-semibold text-[#E2DFF0]"
            >
              Current Study Goal
            </label>
            <input
              id="study-goal-input"
              type="text"
              value={studyGoal}
              onChange={(e) => setStudyGoal(e.target.value)}
              placeholder="What are you working on right now?"
              className="mt-2 w-full rounded-xl border border-[#342C4C] bg-[#0E0B16] px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#5A5373] focus:border-[#A594F9] focus:outline-none select-text"
            />

            {/* Quick Category Pills */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11.5px] text-[#8E87A8] mr-1">
                Category:
              </span>
              {GOAL_CATEGORIES.map((category) => {
                const active = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-full px-3 py-1 text-[11.5px] font-medium transition cursor-pointer ${
                      active
                        ? 'bg-[#A594F9] text-[#171329] font-semibold'
                        : 'bg-[#221C35] text-[#C4B5FD] hover:bg-[#2E2647]'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-[#262038]" />

          {/* Timer Steppers (+ / -) */}
          <div className="grid grid-cols-3 gap-3.5">
            {/* Focus Duration Stepper */}
            <div className="flex flex-col justify-between rounded-xl border border-[#2A233D] bg-[#120F1D] p-3.5">
              <span className="text-[11.5px] font-medium text-[#9E97B8]">
                Focus duration
              </span>
              <div className="mt-2.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => adjustFocusMinutes(-5)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241E36] text-white hover:bg-[#352C50] transition cursor-pointer font-bold"
                >
                  −
                </button>
                <span className="text-[15px] font-bold tabular-nums text-white">
                  {focusTargetMinutes}m
                </span>
                <button
                  type="button"
                  onClick={() => adjustFocusMinutes(5)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241E36] text-white hover:bg-[#352C50] transition cursor-pointer font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Break Duration Stepper */}
            <div className="flex flex-col justify-between rounded-xl border border-[#2A233D] bg-[#120F1D] p-3.5">
              <span className="text-[11.5px] font-medium text-[#9E97B8]">
                Break length
              </span>
              <div className="mt-2.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => adjustBreakMinutes(-1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241E36] text-white hover:bg-[#352C50] transition cursor-pointer font-bold"
                >
                  −
                </button>
                <span className="text-[15px] font-bold tabular-nums text-white">
                  {breakDurationMinutes}m
                </span>
                <button
                  type="button"
                  onClick={() => adjustBreakMinutes(1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241E36] text-white hover:bg-[#352C50] transition cursor-pointer font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Hydration Cadence Stepper */}
            <div className="flex flex-col justify-between rounded-xl border border-[#2A233D] bg-[#120F1D] p-3.5">
              <span className="text-[11.5px] font-medium text-[#9E97B8]">
                Water reminder
              </span>
              <div className="mt-2.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => adjustHydrationCadence(-5)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241E36] text-white hover:bg-[#352C50] transition cursor-pointer font-bold"
                >
                  −
                </button>
                <span className="text-[15px] font-bold tabular-nums text-white">
                  {hydrationIntervalMinutes}m
                </span>
                <button
                  type="button"
                  onClick={() => adjustHydrationCadence(5)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241E36] text-white hover:bg-[#352C50] transition cursor-pointer font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Primary Start Session CTA Row */}
          <div className="mt-auto flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={isFocusing ? pauseFocusSession : startFocusSession}
              className="flex-1 rounded-xl bg-[#A594F9] py-3 px-5 text-[14px] font-bold text-[#171329] shadow-lg transition hover:bg-[#B6A8FA] active:scale-[0.99] cursor-pointer"
            >
              {isFocusing ? 'Pause Focus Session' : 'Start Focus Session'}
            </button>

            <button
              type="button"
              onClick={skipFocusBlock}
              className="rounded-xl border border-[#3B3354] bg-[#211B32] py-3 px-4 text-[13px] font-semibold text-[#DDD8F3] hover:bg-[#2C2442] transition cursor-pointer"
            >
              Skip to Break
            </button>
          </div>
        </div>

        {/* Right Column: Live Companion Preview Card */}
        <div className="col-span-5 flex flex-col items-center justify-between rounded-2xl border border-[#2C253E] bg-[#181424] p-5">
          <div className="w-full flex items-center justify-between text-[12px] text-[#9E97B8]">
            <span className="font-semibold text-[#E2DFF0]">
              Companion Preview
            </span>
            <span className="rounded-full bg-[#241E36] px-2.5 py-0.5 text-[11px] text-[#A594F9]">
              {selectedCategory}
            </span>
          </div>

          <div className="my-3">
            <ChibiCompanion
              mode={isFocusing ? 'idle_studying' : 'celebrating'}
              size="md"
              showStateBadge={false}
            />
          </div>

          <div className="w-full rounded-xl bg-[#261E42] border border-[#3E3268] p-3 text-center">
            <p className="text-[12.5px] font-medium text-[#EAE6F8] truncate">
              &ldquo;{studyGoal || 'Ready to focus when you are!'}&rdquo;
            </p>
            <p className="mt-1 text-[11px] text-[#A594F9]">
              {focusTargetMinutes} min focus · {breakDurationMinutes} min break
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionView;