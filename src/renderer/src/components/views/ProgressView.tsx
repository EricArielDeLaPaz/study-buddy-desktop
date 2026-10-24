// src/renderer/src/components/views/ProgressView.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  calculateLevelAndXP,
  calculateStreakDays,
  DailyHistoryMap,
  getLocalDateKey,
  loadStorage,
  saveStorage,
  STORAGE_KEYS,
} from '../../utils/storage';

type TimeFilter = 'week' | 'month' | 'all';

interface DailyBar {
  day: string;
  dateKey: string;
  hours: number;
}

export type CompanionAccessoryVariant =
  | 'base'
  | 'scholar'
  | 'glasses'
  | 'lofi'
  | 'exam'
  | 'astronaut'
  | 'sensei';

export interface CompanionUnlockDefinition {
  id: string;
  name: string;
  levelRequired: number;
  icon: CompanionAccessoryVariant;
  unlocked: boolean;
  accentBg: string;
  description: string;
  isStartingBuddy?: boolean;
  isPlaceholder?: boolean;
}

export interface CompanionRosterUnlock {
  id: string;
  level: number;
  name: string;
  statusLabel: string;
  unlocked: boolean;
  accentBg: string;
  accessory: CompanionAccessoryVariant;
}

/**
 * Base definitions for starting Mambo + the 4 placeholder Marketplace buddies (Stage 6).
 */
const BASE_COMPANION_UNLOCK_TRACK: ReadonlyArray<
  Omit<CompanionUnlockDefinition, 'unlocked'>
> = [
  {
    id: 'buddy-lv1',
    name: 'Mambo',
    levelRequired: 1,
    icon: 'base',
    accentBg: '#3C3173',
    description: 'Starting companion · Study Buddy team',
    isStartingBuddy: true,
    isPlaceholder: false,
  },
  {
    id: 'placeholder-cozy-library',
    name: 'Cozy Library',
    levelRequired: 2,
    icon: 'scholar',
    accentBg: '#4C2E85',
    description: 'Placeholder reward · Warm study desk companion preset',
    isPlaceholder: true,
  },
  {
    id: 'placeholder-lavender-focus',
    name: 'Lavender Focus',
    levelRequired: 3,
    icon: 'glasses',
    accentBg: '#5B21B6',
    description: 'Placeholder reward · Calm reading & breathing preset',
    isPlaceholder: true,
  },
  {
    id: 'placeholder-neon-night',
    name: 'Neon Night',
    levelRequired: 4,
    icon: 'lofi',
    accentBg: '#34245C',
    description: 'Placeholder reward · Late-night synthwave focus preset',
    isPlaceholder: true,
  },
  {
    id: 'placeholder-retro-arcade',
    name: 'Retro Arcade',
    levelRequired: 5,
    icon: 'exam',
    accentBg: '#3B0764',
    description: 'Placeholder reward · Minimal 16-bit study preset',
    isPlaceholder: true,
  },
];

export function getDynamicProgressionData(): CompanionUnlockDefinition[] {
  const history = loadStorage<DailyHistoryMap>(STORAGE_KEYS.DAILY_HISTORY, {});
  const { level } = calculateLevelAndXP(history);

  return BASE_COMPANION_UNLOCK_TRACK.map((item) => ({
    ...item,
    unlocked: level >= item.levelRequired,
  }));
}

export const COMPANION_PROGRESSION_DATA: ReadonlyArray<CompanionUnlockDefinition> =
  getDynamicProgressionData();

export function getDynamicCompanionRoster(): CompanionRosterUnlock[] {
  return getDynamicProgressionData().map((item) => ({
    id: item.id,
    level: item.levelRequired,
    name: item.name,
    statusLabel: item.unlocked
      ? item.isStartingBuddy
        ? 'Starting buddy'
        : `Unlocked at Lv ${item.levelRequired}`
      : `Placeholder · Unlocks at Lv ${item.levelRequired}`,
    unlocked: item.unlocked,
    accentBg: item.accentBg,
    accessory: item.icon,
  }));
}

export const COMPANION_LEVEL_ROSTER: ReadonlyArray<CompanionRosterUnlock> =
  getDynamicCompanionRoster();

export const CompanionUnlockArtwork: React.FC<{
  icon: CompanionAccessoryVariant;
  unlocked: boolean;
  accentBg: string;
  size?: 'sm' | 'md';
}> = ({ icon, unlocked, accentBg, size = 'md' }) => {
  const boxClasses =
    size === 'md' ? 'h-12 w-12 rounded-2xl' : 'h-9 w-9 rounded-xl';
  const svgSize = size === 'md' ? 34 : 26;

  return (
    <div
      style={{ backgroundColor: accentBg }}
      className={`relative flex shrink-0 items-center justify-center border transition ${boxClasses} ${
        unlocked ? 'border-[#A594F9]/70 shadow-inner' : 'border-[#342C4C]'
      }`}
    >
      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={unlocked ? 'opacity-100' : 'opacity-40 grayscale'}
      >
        <circle
          cx="18"
          cy="19"
          r="11"
          fill="#FFE4D6"
          stroke="#241C3D"
          strokeWidth="1.8"
        />
        <path
          d="M7 17C7 10.5 11.8 7 18 7C24.2 7 29 10.5 29 17C26.5 14.5 23.5 14 21 15.2C19 13.5 17 13.5 15 15.2C12.5 14 9.5 14.5 7 17Z"
          fill="#3B305E"
        />
        <circle cx="14" cy="19.5" r="1.4" fill="#241C3D" />
        <circle cx="22" cy="19.5" r="1.4" fill="#241C3D" />

        {icon === 'scholar' && (
          <g>
            <polygon points="18,3 6,8 18,12 30,8" fill="#2E1065" />
            <line
              x1="27"
              y1="9"
              x2="28"
              y2="15"
              stroke="#FBBF24"
              strokeWidth="1.6"
            />
          </g>
        )}

        {icon === 'glasses' && (
          <g>
            <circle
              cx="14"
              cy="19.5"
              r="3.4"
              stroke="#A594F9"
              strokeWidth="1.5"
            />
            <circle
              cx="22"
              cy="19.5"
              r="3.4"
              stroke="#A594F9"
              strokeWidth="1.5"
            />
            <line
              x1="17.4"
              y1="19.5"
              x2="18.6"
              y2="19.5"
              stroke="#A594F9"
              strokeWidth="1.5"
            />
          </g>
        )}

        {icon === 'lofi' && (
          <g>
            <path
              d="M6.5 19C6.5 11.5 11.5 6.5 18 6.5C24.5 6.5 29.5 11.5 29.5 19"
              stroke="#A594F9"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <rect
              x="4.5"
              y="16"
              width="3.5"
              height="7"
              rx="1.7"
              fill="#A594F9"
            />
            <rect
              x="28"
              y="16"
              width="3.5"
              height="7"
              rx="1.7"
              fill="#A594F9"
            />
          </g>
        )}

        {icon === 'exam' && (
          <g>
            <rect
              x="7.5"
              y="12.5"
              width="21"
              height="3"
              rx="1.5"
              fill="#F472B6"
            />
            <circle cx="18" cy="14" r="1.5" fill="#FFFFFF" />
          </g>
        )}

        <path
          d="M15.5 23.5C16.5 24.8 19.5 24.8 20.5 23.5"
          stroke="#241C3D"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>

      {!unlocked && (
        <span
          title="Locked placeholder reward"
          className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-[#342C4C] bg-[#120F1D] text-[10px] shadow"
        >
          🔒
        </span>
      )}
    </div>
  );
};

export const CompanionMiniAvatar: React.FC<{
  accessory: CompanionRosterUnlock['accessory'];
  unlocked: boolean;
  accentBg: string;
}> = ({ accessory, unlocked, accentBg }) => (
  <CompanionUnlockArtwork
    icon={accessory}
    unlocked={unlocked}
    accentBg={accentBg}
    size="sm"
  />
);

/**
 * Builds the Mon–Sun bar chart for the current week from real saved history.
 */
function buildCurrentWeekBars(history: DailyHistoryMap): DailyBar[] {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 (Sun) .. 6 (Sat)
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  return labels.map((label, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const key = getLocalDateKey(d);
    const mins = history[key]?.focusMinutes ?? 0;
    return {
      day: label,
      dateKey: key,
      hours: +(mins / 60).toFixed(1),
    };
  });
}

export const ProgressView: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [isUnlocksModalOpen, setIsUnlocksModalOpen] = useState<boolean>(false);

  const [history, setHistory] = useState<DailyHistoryMap>(() =>
    loadStorage<DailyHistoryMap>(STORAGE_KEYS.DAILY_HISTORY, {})
  );

  useEffect(() => {
    const refreshHistory = () => {
      setHistory(loadStorage<DailyHistoryMap>(STORAGE_KEYS.DAILY_HISTORY, {}));
    };
    window.addEventListener('study-buddy:data-updated', refreshHistory);
    window.addEventListener('study-buddy:data-reset', refreshHistory);
    return () => {
      window.removeEventListener('study-buddy:data-updated', refreshHistory);
      window.removeEventListener('study-buddy:data-reset', refreshHistory);
    };
  }, []);

  // Editable Daily Study Goal State
  const [dailyGoalHours, setDailyGoalHours] = useState<number>(() => {
    const saved = loadStorage<number>(STORAGE_KEYS.DAILY_GOAL_HOURS, 4.0);
    return typeof saved === 'number' && saved >= 0.5 && saved <= 16
      ? saved
      : 4.0;
  });
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [goalDraft, setGoalDraft] = useState<string>(
    dailyGoalHours.toFixed(1)
  );

  const handleOpenGoalEditor = () => {
    setGoalDraft(dailyGoalHours.toFixed(1));
    setIsEditingGoal(true);
  };

  const handleSaveGoal = () => {
    const parsed = parseFloat(goalDraft);
    const clamped = Number.isNaN(parsed)
      ? 4.0
      : Math.max(0.5, Math.min(16, Math.round(parsed * 2) / 2));
    setDailyGoalHours(clamped);
    setGoalDraft(clamped.toFixed(1));
    setIsEditingGoal(false);
    saveStorage(STORAGE_KEYS.DAILY_GOAL_HOURS, clamped);
  };

  const stepGoalDraft = (delta: number) => {
    const current = parseFloat(goalDraft) || dailyGoalHours;
    const next = Math.max(0.5, Math.min(16, +(current + delta).toFixed(1)));
    setGoalDraft(next.toFixed(1));
  };

  // Compute filtered real metrics
  const filteredMetrics = useMemo(() => {
    const now = new Date();
    const entries = Object.values(history).filter((entry) => {
      if (timeFilter === 'all') return true;
      const entryDate = new Date(`${entry.date}T00:00:00`);
      const diffDays =
        (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
      if (timeFilter === 'week') return diffDays <= 7;
      return diffDays <= 31;
    });

    const focusMinutes = entries.reduce((acc, e) => acc + e.focusMinutes, 0);
    const sessionsCompleted = entries.reduce(
      (acc, e) => acc + e.sessionsCompleted,
      0
    );
    const hydrationCount = entries.reduce(
      (acc, e) => acc + e.hydrationCount,
      0
    );
    const breaksCompleted = entries.reduce(
      (acc, e) => acc + e.breaksCompleted,
      0
    );

    const hasAnyHistory = Object.values(history).some(
      (e) => e.focusMinutes > 0 || e.sessionsCompleted > 0
    );

    return {
      studyHours: (focusMinutes / 60).toFixed(1),
      sessionsCompleted,
      hydrationCount,
      breaksCompleted,
      hasAnyHistory,
    };
  }, [history, timeFilter]);

  const streakDays = useMemo(() => calculateStreakDays(history), [history]);
  const levelInfo = useMemo(() => calculateLevelAndXP(history), [history]);

  const dynamicUnlockTrack = useMemo(
    () =>
      BASE_COMPANION_UNLOCK_TRACK.map((item) => ({
        ...item,
        unlocked: levelInfo.level >= item.levelRequired,
      })),
    [levelInfo.level]
  );

  const bars = useMemo(() => buildCurrentWeekBars(history), [history]);
  const maxHours = Math.max(...bars.map((b) => b.hours), dailyGoalHours, 4);
  const unlockedCount = dynamicUnlockTrack.filter((c) => c.unlocked).length;
  const nextLockedCompanion = dynamicUnlockTrack.find((c) => !c.unlocked);

  return (
    <div className="flex flex-col gap-5 p-6 text-white font-sans">
      {/* Top Header & Time Filter Pills */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-[22px] font-bold tracking-tight text-white">
            Study Progress & Analytics
          </h2>
          <p className="mt-1 text-[13px] text-[#9E97B8]">
            Real focus hours, session streaks, and placeholder companion unlock milestones saved on this device.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-[#2C253E] bg-[#141020] p-1">
          {[
            { id: 'week', label: 'This week' },
            { id: 'month', label: 'Month' },
            { id: 'all', label: 'All time' },
          ].map((tab) => {
            const active = timeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTimeFilter(tab.id as TimeFilter)}
                className={`rounded-full px-3.5 py-1 text-[12px] font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-[#A594F9] text-[#141324]'
                    : 'text-[#9E97B8] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Real Summary Stat Cards */}
      <div className="grid grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-[#2C253E] bg-[#181424] p-4">
          <span className="text-[12px] font-medium text-[#9E97B8]">
            Study hours
          </span>
          <p className="font-display mt-2 text-[26px] font-bold tabular-nums text-white">
            {filteredMetrics.studyHours}h
          </p>
          <span className="mt-1 inline-block text-[11px] font-medium text-[#9490A8]">
            Logged on this device
          </span>
        </div>

        <div className="rounded-2xl border border-[#2C253E] bg-[#181424] p-4">
          <span className="text-[12px] font-medium text-[#9E97B8]">
            Sessions completed
          </span>
          <p className="font-display mt-2 text-[26px] font-bold tabular-nums text-white">
            {filteredMetrics.sessionsCompleted}
          </p>
          <span className="mt-1 inline-block text-[11px] font-medium text-[#A594F9]">
            {filteredMetrics.hydrationCount} water check-ins
          </span>
        </div>

        <div className="rounded-2xl border border-[#2C253E] bg-[#181424] p-4">
          <span className="text-[12px] font-medium text-[#9E97B8]">
            Streak
          </span>
          <p className="font-display mt-2 text-[26px] font-bold tabular-nums text-white">
            {streakDays} {streakDays === 1 ? 'day' : 'days'}
          </p>
          <span className="mt-1 inline-block text-[11px] font-medium text-[#FBBF24]">
            {streakDays > 0
              ? 'Active daily focus streak'
              : 'Complete a session to start'}
          </span>
        </div>

        <div className="rounded-2xl border border-[#2C253E] bg-[#181424] p-4">
          <span className="text-[12px] font-medium text-[#9E97B8]">
            Breaks completed
          </span>
          <p className="font-display mt-2 text-[26px] font-bold tabular-nums text-white">
            {filteredMetrics.breaksCompleted}
          </p>
          <span className="mt-1 inline-block text-[11px] font-medium text-[#C4B5FD]">
            Hydration & stretch breaks
          </span>
        </div>
      </div>

      {/* Weekly Bar Chart + Level / XP Companion Unlocks Card */}
      <div className="grid grid-cols-12 gap-5">
        {/* Mon-Sun Bar Chart with Empty State when there is no history */}
        <div className="col-span-7 flex flex-col justify-between rounded-2xl border border-[#2C253E] bg-[#181424] p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-[15px] font-bold text-white">
                Daily Focus Distribution (Mon–Sun)
              </h3>
              <p className="text-[11.5px] text-[#8E87A8]">
                Hours logged per day across active study blocks
              </p>
            </div>

            {!isEditingGoal ? (
              <div className="flex items-center gap-1.5 rounded-xl border border-[#342C4C] bg-[#241E36] px-3 py-1.5 text-[11.5px] font-semibold text-[#C4B5FD]">
                <span className="tabular-nums">
                  Goal: {dailyGoalHours.toFixed(1)}h / day
                </span>
                <button
                  type="button"
                  onClick={handleOpenGoalEditor}
                  title="Edit daily study hour goal"
                  aria-label="Edit daily study hour goal"
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-md text-[#A594F9] hover:bg-[#352C50] hover:text-white transition cursor-pointer"
                >
                  <svg
                    width="12"
                    height="12"
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
            ) : (
              <div className="flex items-center gap-1.5 rounded-xl border border-[#A594F9] bg-[#141020] px-2.5 py-1 text-[11.5px]">
                <button
                  type="button"
                  onClick={() => stepGoalDraft(-0.5)}
                  aria-label="Decrease daily goal hours"
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2A244D] font-bold text-white hover:bg-[#7C3AED] transition cursor-pointer"
                >
                  −
                </button>
                <input
                  type="text"
                  inputMode="decimal"
                  value={goalDraft}
                  onChange={(e) =>
                    setGoalDraft(e.target.value.replace(/[^0-9.]/g, ''))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveGoal();
                    if (e.key === 'Escape') setIsEditingGoal(false);
                  }}
                  aria-label="Daily goal hours"
                  className="w-11 appearance-none bg-transparent text-center font-bold tabular-nums text-white focus:outline-none select-text"
                />
                <span className="text-[10.5px] text-[#9E97B8]">h/d</span>
                <button
                  type="button"
                  onClick={() => stepGoalDraft(0.5)}
                  aria-label="Increase daily goal hours"
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2A244D] font-bold text-white hover:bg-[#7C3AED] transition cursor-pointer"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={handleSaveGoal}
                  className="ml-1 rounded-md bg-[#A594F9] px-2.5 py-0.5 text-[10.5px] font-bold text-[#141324] hover:bg-[#B8A9FA] cursor-pointer"
                >
                  Save
                </button>
              </div>
            )}
          </div>

          {!filteredMetrics.hasAnyHistory ? (
            <div className="my-4 flex h-44 flex-col items-center justify-center rounded-xl border border-dashed border-[#342C4C] bg-[#141020]/50 px-4 text-center">
              <p className="text-[13.5px] font-semibold text-[#C4B5FD]">
                Complete your first session to see progress here.
              </p>
              <p className="mt-1 text-[11.5px] text-[#9490A8]">
                Focus minutes and completed breaks will automatically populate your daily chart.
              </p>
            </div>
          ) : (
            <div className="mt-6 flex h-48 items-end justify-between gap-3 px-2 pt-4 border-b border-[#262038]">
              {bars.map((item) => {
                const heightPercent = Math.round(
                  (item.hours / maxHours) * 100
                );
                const metGoal =
                  item.hours > 0 && item.hours >= dailyGoalHours;
                return (
                  <div
                    key={item.day}
                    className="flex flex-1 flex-col items-center gap-2 h-full justify-end group"
                  >
                    <span
                      className={`text-[10.5px] font-semibold tabular-nums ${
                        metGoal ? 'text-[#4ADE80]' : 'text-[#B8B2CC]'
                      } group-hover:text-white`}
                    >
                      {item.hours}h
                    </span>
                    <div className="w-full max-w-[36px] rounded-t-xl bg-[#251E3A] h-32 flex items-end overflow-hidden p-0.5">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-lg transition-all duration-300 group-hover:brightness-110 ${
                          metGoal
                            ? 'bg-gradient-to-t from-[#5B4B9A] to-[#4ADE80]'
                            : 'bg-gradient-to-t from-[#6E56CF] to-[#A594F9]'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-2.5 flex items-center justify-between px-2 text-[11.5px] font-medium text-[#8E87A8]">
            {bars.map((item) => (
              <span key={item.day} className="flex-1 text-center">
                {item.day}
              </span>
            ))}
          </div>
        </div>

        {/* Real Level / XP Progress Bar & Stage 6 Placeholder Unlock Track */}
        <div className="col-span-5 flex flex-col justify-between rounded-2xl border border-[#2C253E] bg-[#181424] p-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-[#3C3173] px-3 py-0.5 text-[11.5px] font-bold text-white">
                Level {levelInfo.level} · Study Buddy
              </span>
              <span className="font-display text-[12.5px] font-semibold tabular-nums text-[#A594F9]">
                {levelInfo.currentLevelXP} / {levelInfo.nextLevelXP} XP
              </span>
            </div>

            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-[#0E0B16] border border-[#2B2440]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#A594F9] transition-all duration-300"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11.5px] text-[#8E87A8]">
              {nextLockedCompanion
                ? `${
                    levelInfo.nextLevelXP - levelInfo.currentLevelXP
                  } XP until next level (Placeholder reward "${
                    nextLockedCompanion.name
                  }" at Lv. ${nextLockedCompanion.levelRequired})`
                : 'All 4 placeholder companion rewards unlocked!'}
            </p>
          </div>

          {/* Preview of Companion Unlock Track (Stage 6 Placeholders) */}
          <div className="my-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#E2DFF0]">
                Companion Unlock Track
              </span>
              <span className="rounded-full bg-[#2A244D] px-2 py-0.5 text-[10px] font-semibold text-[#C4B5FD]">
                {unlockedCount} / {dynamicUnlockTrack.length} Unlocked
              </span>
            </div>

            {dynamicUnlockTrack.slice(0, 3).map((buddy) => (
              <div
                key={buddy.id}
                className="flex items-center justify-between rounded-xl border border-[#322A4B] bg-[#120F1D] px-3 py-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CompanionUnlockArtwork
                    icon={buddy.icon}
                    unlocked={buddy.unlocked}
                    accentBg={buddy.accentBg}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[12.5px] font-bold text-white truncate">
                        {buddy.name}
                      </p>
                      {buddy.isPlaceholder && (
                        <span className="rounded bg-[#261E42] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#C4B5FD]">
                          Placeholder
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[10.5px] font-medium truncate ${
                        buddy.unlocked ? 'text-[#4ADE80]' : 'text-[#9490A8]'
                      }`}
                    >
                      {buddy.unlocked
                        ? buddy.isStartingBuddy
                          ? 'Starting buddy'
                          : `Unlocked at Lv ${buddy.levelRequired}`
                        : `Locked · Unlocks at Lv ${buddy.levelRequired}`}
                    </p>
                  </div>
                </div>
                <span className="rounded-md bg-[#261E42] px-2 py-0.5 text-[10px] font-bold text-[#C4B5FD]">
                  Lv. {buddy.levelRequired}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsUnlocksModalOpen(true)}
            className="w-full rounded-xl bg-[#A594F9] py-2.5 px-4 text-[13px] font-bold text-[#141324] shadow-md hover:bg-[#B8A9FA] active:scale-[0.99] transition cursor-pointer"
          >
            View all unlockable companions
          </button>
        </div>
      </div>

      {/* Unlockable Companions Overlay Modal */}
      {isUnlocksModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[560px] w-[520px] flex-col overflow-hidden rounded-[24px] border border-[#52438F] bg-[#181424] text-white shadow-[0_28px_80px_rgba(0,0,0,0.85)]">
            <div className="flex items-center justify-between border-b border-[#2A233D] bg-[#13101E] px-6 py-4">
              <div>
                <h3 className="font-display text-[17px] font-bold tracking-tight text-white">
                  Companion Unlock Track (Placeholders)
                </h3>
                <p className="mt-0.5 text-[12px] text-[#9E97B8]">
                  Current Level: Lv. {levelInfo.level} ({unlockedCount} of{' '}
                  {dynamicUnlockTrack.length} unlocked)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsUnlocksModalOpen(false)}
                aria-label="Close unlocks modal"
                title="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#261E42] border border-[#52438F] text-[#E2DFF0] hover:bg-[#A594F9] hover:text-[#141324] transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              {dynamicUnlockTrack.map((buddy) => {
                const statusText = buddy.unlocked
                  ? buddy.isStartingBuddy
                    ? 'Starting buddy'
                    : `Unlocked at Lv ${buddy.levelRequired}`
                  : `Locked · Unlocks at Lv ${buddy.levelRequired}`;

                return (
                  <div
                    key={buddy.id}
                    className={`flex items-center justify-between rounded-2xl border p-3.5 transition ${
                      buddy.unlocked
                        ? 'border-[#3B3256] bg-[#1F1930]'
                        : 'border-[#251F36] bg-[#120F1C]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <CompanionUnlockArtwork
                        icon={buddy.icon}
                        unlocked={buddy.unlocked}
                        accentBg={buddy.accentBg}
                        size="md"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[14.5px] font-bold text-white truncate">
                            {buddy.name}
                          </p>
                          {buddy.isPlaceholder && (
                            <span className="rounded-full bg-[#261E42] border border-[#52438F] px-2 py-0.5 text-[10px] font-semibold text-[#C4B5FD]">
                              Placeholder
                            </span>
                          )}
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10.5px] font-bold ${
                              buddy.unlocked
                                ? 'bg-[#3C3173] text-[#E2DFF0]'
                                : 'bg-[#1D182B] text-[#7D7696]'
                            }`}
                          >
                            Lv. {buddy.levelRequired}
                          </span>
                        </div>

                        <p
                          className={`mt-0.5 text-[11.5px] font-semibold ${
                            buddy.unlocked
                              ? 'text-[#4ADE80]'
                              : 'text-[#9E97B8]'
                          }`}
                        >
                          {statusText}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-[#7D7696] truncate">
                          {buddy.description}
                        </p>
                      </div>
                    </div>

                    <div className="ml-3 shrink-0">
                      {buddy.unlocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#0E362D] border border-[#17594A] px-2.5 py-1 text-[11px] font-semibold text-[#4ADE80]">
                          ✓ Unlocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#1A1528] border border-[#2C253E] px-2.5 py-1 text-[11px] font-medium text-[#7D7696]">
                          🔒 Lv. {buddy.levelRequired}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressView;
