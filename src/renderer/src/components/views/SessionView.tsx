// src/renderer/src/components/views/SessionView.tsx
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ChibiCompanion } from '../companion/ChibiCompanion';
import { playChime } from '../../utils/audio';

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
    resetFocusTimer,
    skipFocusBlock,
  } = useApp();

  const [selectedPreset, setSelectedPreset] =
    useState<SessionPreset['id']>('quick');
  const [breakDurationMinutes, setBreakDurationMinutes] = useState<number>(5);
  const [studyGoal, setStudyGoal] = useState<string>(
    'Complete Chapter 4 cellular respiration synthesis notes'
  );
  const [goalCompletedToast, setGoalCompletedToast] = useState<string | null>(
    null
  );

  // Live session bonus seconds added via +30s / +1m / +5m quick increments
  const [bonusFocusSeconds, setBonusFocusSeconds] = useState<number>(0);

  const isFocusing = sessionStatus === 'focusing';
  const effectiveTimeRemaining = Math.max(
    0,
    focusTimeRemaining + bonusFocusSeconds
  );

  const handleSelectPreset = (preset: SessionPreset) => {
    setSelectedPreset(preset.id);
    setBonusFocusSeconds(0);
    setFocusTargetMinutes(preset.focusMinutes);
    setBreakDurationMinutes(preset.breakMinutes);
  };

  const handleQuickAddActiveSessionTime = (secondsToAdd: number) => {
    setBonusFocusSeconds((prev) => prev + secondsToAdd);
    playChime('gentle_bell');
  };

  const handleEndStudyGoal = () => {
    const finishedGoal = studyGoal.trim() || 'Current study goal';
    pauseFocusSession();
    resetFocusTimer();
    setBonusFocusSeconds(0);
    setStudyGoal('');
    playChime('break_start');
    setGoalCompletedToast(`Completed: "${finishedGoal}"`);
    window.setTimeout(() => {
      setGoalCompletedToast(null);
    }, 4000);
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

  return (
    <div className="flex flex-col gap-6 p-6 text-white font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-[22px] font-bold tracking-tight text-white">
            Focus Session
          </h2>
          <p className="mt-1 text-[13px] text-[#9E97B8]">
            Choose a cadence, set your study goal, and let Mambo guard your flow.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-[#2A244D] border border-[#52438F] px-4 py-1.5 text-[12.5px]">
          <span
            className={`h-2 w-2 rounded-full ${
              isFocusing ? 'bg-[#4ADE80] animate-pulse' : 'bg-[#FBBF24]'
            }`}
          />
          <span className="font-display font-semibold tabular-nums text-[#E2DFF0]">
            {isFocusing ? 'Active Session' : 'Session Paused'} ·{' '}
            {formatClock(effectiveTimeRemaining)}
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
                  ? 'border-[#A594F9] bg-[#2A244D] shadow-[0_8px_24px_rgba(165,148,249,0.16)]'
                  : 'border-[#2C253E] bg-[#181424] hover:border-[#52438F] hover:bg-[#221D33]'
              }`}
            >
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${
                  isSelected
                    ? 'bg-[#A594F9] text-[#12111A]'
                    : 'bg-[#232136] text-[#9E97B8]'
                }`}
              >
                {preset.badge}
              </span>
              <div className="mt-3">
                <p className="font-display text-[15px] font-bold text-white">
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
        {/* Left Column: Current Study Goal, Lower Controls Row & Action Footer */}
        <div className="col-span-7 flex flex-col gap-5 rounded-2xl border border-[#2C253E] bg-[#181424] p-5">
          {/* Current Study Goal Input */}
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="study-goal-input"
                className="block text-sm font-semibold tracking-wide text-[#C4B5FD]"
              >
                Current Study Goal
              </label>
              {goalCompletedToast && (
                <span className="text-[12px] font-semibold text-[#4ADE80]">
                  ✓ {goalCompletedToast}
                </span>
              )}
            </div>

            <input
              id="study-goal-input"
              type="text"
              value={studyGoal}
              onChange={(e) => setStudyGoal(e.target.value)}
              placeholder="What are you working on right now?"
              className="mt-2 w-full rounded-xl border border-[#342C4C] bg-[#0E0B16] px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#9490A8] focus:border-[#A594F9] focus:outline-none select-text"
            />
          </div>

          <hr className="border-[#2C253E]" />

          {/* Lower Row: Standalone "Skip to Break" & "End Goal" buttons directly to the left of "Break length" & "Water reminder" */}
          <div className="grid grid-cols-3 gap-3.5 items-stretch">
            {/* Column 1: Standalone Buttons (No Enclosing Container Card) */}
            <div className="flex flex-col justify-center gap-2.5">
              <button
                type="button"
                onClick={skipFocusBlock}
                className="w-full flex-1 rounded-xl border border-[#3B3354] bg-[#232136] px-3.5 py-2.5 text-[13px] font-semibold text-white hover:border-[#7C3AED] hover:bg-[#2A244D] transition cursor-pointer"
              >
                Skip to Break
              </button>

              <button
                type="button"
                onClick={handleEndStudyGoal}
                className="w-full flex-1 rounded-xl border border-[#52438F] bg-[#2A244D] px-3.5 py-2.5 text-[13px] font-semibold text-[#C4B5FD] hover:bg-[#A594F9] hover:text-[#12111A] transition cursor-pointer"
              >
                End Goal
              </button>
            </div>

            {/* Column 2: Break Length Card (Accessible Typography: text-sm font-semibold tracking-wide) */}
            <div className="flex flex-col justify-between rounded-xl border border-[#2C253E] bg-[#120F1D] p-3.5">
              <span className="text-sm font-semibold tracking-wide text-[#C4B5FD]">
                Break length
              </span>
              <div className="mt-2.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => adjustBreakMinutes(-1)}
                  aria-label="Decrease break length"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#261E42] text-white hover:bg-[#3C3173] transition cursor-pointer font-bold"
                >
                  −
                </button>
                <span className="font-display text-[16px] font-bold tabular-nums text-white">
                  {breakDurationMinutes}m
                </span>
                <button
                  type="button"
                  onClick={() => adjustBreakMinutes(1)}
                  aria-label="Increase break length"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#261E42] text-white hover:bg-[#3C3173] transition cursor-pointer font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Column 3: Water Reminder Card (Accessible Typography: text-sm font-semibold tracking-wide) */}
            <div className="flex flex-col justify-between rounded-xl border border-[#2C253E] bg-[#120F1D] p-3.5">
              <span className="text-sm font-semibold tracking-wide text-[#C4B5FD]">
                Water reminder
              </span>
              <div className="mt-2.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => adjustHydrationCadence(-5)}
                  aria-label="Decrease water reminder interval"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#261E42] text-white hover:bg-[#3C3173] transition cursor-pointer font-bold"
                >
                  −
                </button>
                <span className="font-display text-[16px] font-bold tabular-nums text-white">
                  {hydrationIntervalMinutes}m
                </span>
                <button
                  type="button"
                  onClick={() => adjustHydrationCadence(5)}
                  aria-label="Increase water reminder interval"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#261E42] text-white hover:bg-[#3C3173] transition cursor-pointer font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Action Footer: Content-Hugged Pause/Start Button + +30s / +1m / +5m Buttons */}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={isFocusing ? pauseFocusSession : startFocusSession}
              className="w-auto px-6 py-2.5 rounded-xl bg-[#A594F9] text-[14px] font-bold text-[#12111A] shadow-lg transition hover:bg-[#B8A9FA] active:scale-[0.99] cursor-pointer"
            >
              {isFocusing ? 'Pause Focus Session' : 'Start Focus Session'}
            </button>

            <div className="flex items-center gap-2">
              {[
                { label: '+30s', secs: 30 },
                { label: '+1m', secs: 60 },
                { label: '+5m', secs: 300 },
              ].map((inc) => (
                <button
                  key={inc.label}
                  type="button"
                  onClick={() => handleQuickAddActiveSessionTime(inc.secs)}
                  className="rounded-xl border border-[#52438F] bg-[#2A244D] px-3.5 py-2.5 text-[12.5px] font-bold text-[#C4B5FD] hover:bg-[#A594F9] hover:text-[#12111A] active:scale-95 transition cursor-pointer"
                >
                  {inc.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Companion Preview Card */}
        <div className="col-span-5 flex flex-col items-center justify-between rounded-2xl border border-[#2C253E] bg-[#181424] p-5">
          <div className="w-full flex items-center justify-between text-[12px] text-[#9E97B8]">
            <span className="font-semibold text-[#E2DFF0]">
              Companion Preview
            </span>
            <span className="rounded-full bg-[#2A244D] px-2.5 py-0.5 text-[11px] font-semibold text-[#C4B5FD]">
              {SESSION_PRESETS.find((p) => p.id === selectedPreset)?.title}
            </span>
          </div>

          <div className="my-3">
            <ChibiCompanion
              mode={isFocusing ? 'idle_studying' : 'celebrating'}
              size="md"
              showStateBadge={false}
            />
          </div>

          <div className="w-full rounded-xl bg-[#3C3173] border border-[#52438F] p-3 text-center">
            <p className="font-display text-[13px] font-medium text-white truncate">
              &ldquo;{studyGoal || 'Ready to focus when you are!'}&rdquo;
            </p>
            <p className="mt-1 text-[11.5px] font-medium text-[#C4B5FD]">
              {focusTargetMinutes} min focus · {breakDurationMinutes} min break
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionView;