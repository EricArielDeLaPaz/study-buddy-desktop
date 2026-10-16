// src/renderer/src/components/views/ProgressView.tsx
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

type TimeFilter = 'week' | 'month' | 'all';

interface DailyBar {
  day: string;
  hours: number;
}

export interface CompanionRosterUnlock {
  id: string;
  level: number;
  name: string;
  statusLabel: string;
  unlocked: boolean;
  accentBg: string;
  accessory: 'base' | 'scholar' | 'glasses' | 'lofi' | 'exam';
}

export const COMPANION_LEVEL_ROSTER: ReadonlyArray<CompanionRosterUnlock> = [
  {
    id: 'buddy-lv1',
    level: 1,
    name: 'Mambo',
    statusLabel: 'Unlocked - Starting companion',
    unlocked: true,
    accentBg: '#3C3173',
    accessory: 'base',
  },
  {
    id: 'buddy-lv5',
    level: 5,
    name: 'Scholar Mambo',
    statusLabel: 'Unlocked - Level 5',
    unlocked: true,
    accentBg: '#2E4C80',
    accessory: 'scholar',
  },
  {
    id: 'buddy-lv7',
    level: 7,
    name: 'Round Glasses Mambo',
    statusLabel: 'Unlocked - Level 7',
    unlocked: true,
    accentBg: '#4C2E85',
    accessory: 'glasses',
  },
  {
    id: 'buddy-lv8',
    level: 8,
    name: 'Study Night Lo-Fi',
    statusLabel: 'Locked 🔒 - Unlocks at Level 8',
    unlocked: false,
    accentBg: '#1F2437',
    accessory: 'lofi',
  },
  {
    id: 'buddy-lv10',
    level: 10,
    name: 'Exam Week Mambo',
    statusLabel: 'Locked 🔒 - Unlocks at Level 10',
    unlocked: false,
    accentBg: '#2A1E33',
    accessory: 'exam',
  },
];

/**
 * Renders a stylized mini vector character avatar icon for each Mambo unlock tier.
 */
export const CompanionMiniAvatar: React.FC<{
  accessory: CompanionRosterUnlock['accessory'];
  unlocked: boolean;
  accentBg: string;
}> = ({ accessory, unlocked, accentBg }) => {
  return (
    <div
      style={{ backgroundColor: accentBg }}
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
        unlocked ? 'border-[#A594F9]/60' : 'border-[#342C4C] opacity-60'
      }`}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Head */}
        <circle
          cx="18"
          cy="19"
          r="11"
          fill="#FFE4D6"
          stroke="#241C3D"
          strokeWidth="1.8"
        />
        {/* Hair */}
        <path
          d="M7 17C7 10.5 11.8 7 18 7C24.2 7 29 10.5 29 17C26.5 14.5 23.5 14 21 15.2C19 13.5 17 13.5 15 15.2C12.5 14 9.5 14.5 7 17Z"
          fill="#3B305E"
        />
        {/* Eyes */}
        <circle cx="14" cy="19.5" r="1.4" fill="#241C3D" />
        <circle cx="22" cy="19.5" r="1.4" fill="#241C3D" />

        {/* Tier-specific Accessories */}
        {accessory === 'scholar' && (
          /* Graduation Mortarboard Cap */
          <g>
            <polygon points="18,3 6,8 18,12 30,8" fill="#1E1B4B" />
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

        {accessory === 'glasses' && (
          /* Signature Round Glasses */
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

        {accessory === 'lofi' && (
          /* Over-ear Lo-Fi Headphones */
          <g>
            <path
              d="M6.5 19C6.5 11.5 11.5 6.5 18 6.5C24.5 6.5 29.5 11.5 29.5 19"
              stroke="#60A5FA"
              strokeWidth="2.2"
               strokeLinecap="round"
            />
            <rect x="4.5" y="16" width="3.5" height="7" rx="1.7" fill="#60A5FA" />
            <rect x="28" y="16" width="3.5" height="7" rx="1.7" fill="#60A5FA" />
          </g>
        )}

        {accessory === 'exam' && (
          /* Determination Headband */
          <g>
            <rect x="7.5" y="12.5" width="21" height="3" rx="1.5" fill="#F43F5E" />
            <circle cx="18" cy="14" r="1.5" fill="#FFFFFF" />
          </g>
        )}

        {/* Smile */}
        <path
          d="M15.5 23.5C16.5 24.8 19.5 24.8 20.5 23.5"
          stroke="#241C3D"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

const WEEKLY_DATA: Record<TimeFilter, DailyBar[]> = {
  week: [
    { day: 'Mon', hours: 3.2 },
    { day: 'Tue', hours: 4.5 },
    { day: 'Wed', hours: 2.8 },
    { day: 'Thu', hours: 5.1 },
    { day: 'Fri', hours: 4.0 },
    { day: 'Sat', hours: 1.8 },
    { day: 'Sun', hours: 2.4 },
  ],
  month: [
    { day: 'Mon', hours: 3.8 },
    { day: 'Tue', hours: 4.2 },
    { day: 'Wed', hours: 3.5 },
    { day: 'Thu', hours: 4.9 },
    { day: 'Fri', hours: 3.7 },
    { day: 'Sat', hours: 2.2 },
    { day: 'Sun', hours: 2.6 },
  ],
  all: [
    { day: 'Mon', hours: 4.1 },
    { day: 'Tue', hours: 4.6 },
    { day: 'Wed', hours: 3.9 },
    { day: 'Thu', hours: 5.2 },
    { day: 'Fri', hours: 4.1 },
    { day: 'Sat', hours: 2.5 },
    { day: 'Sun', hours: 2.9 },
  ],
};

export const ProgressView: React.FC = () => {
  const { sessionStats } = useApp();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');

  // Editable Daily Study Goal State
  const [dailyGoalHours, setDailyGoalHours] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('study_buddy_daily_goal_hours');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!Number.isNaN(parsed) && parsed >= 0.5 && parsed <= 16) {
          return parsed;
        }
      }
    } catch {
      // Fall back to 4.0h
    }
    return 4.0;
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
    try {
      localStorage.setItem('study_buddy_daily_goal_hours', String(clamped));
    } catch {
      // Ignore storage error
    }
  };

  const stepGoalDraft = (delta: number) => {
    const current = parseFloat(goalDraft) || dailyGoalHours;
    const next = Math.max(0.5, Math.min(16, +(current + delta).toFixed(1)));
    setGoalDraft(next.toFixed(1));
  };

  const bars = WEEKLY_DATA[timeFilter];
  const maxHours = Math.max(...bars.map((b) => b.hours), dailyGoalHours, 6);

  const liveBonusHours = +(sessionStats.totalFocusMinutes / 60).toFixed(1);
  const totalHoursDisplay =
    timeFilter === 'week'
      ? (23.8 + liveBonusHours).toFixed(1)
      : timeFilter === 'month'
      ? (94.5 + liveBonusHours).toFixed(1)
      : (312.0 + liveBonusHours).toFixed(1);

  const totalSessionsDisplay =
    (timeFilter === 'week' ? 32 : timeFilter === 'month' ? 128 : 419) +
    sessionStats.breaksCompleted;

  return (
    <div className="flex flex-col gap-5 p-6 text-white">
      {/* Top Header & Time Filter Pills */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight text-white">
            Study Progress & Analytics
          </h2>
          <p className="mt-1 text-[13px] text-[#9E97B8]">
            Track deep focus hours, hydration consistency, and Mambo companion XP.
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
                    ? 'bg-[#A594F9] text-[#171329]'
                    : 'text-[#9E97B8] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-[#2C253E] bg-[#181424] p-4">
          <span className="text-[12px] font-medium text-[#9E97B8]">
            Study hours
          </span>
          <p className="mt-2 text-[26px] font-bold tabular-nums text-white">
            {totalHoursDisplay}h
          </p>
          <span className="mt-1 inline-block text-[11px] font-medium text-[#4ADE80]">
            +14% vs last period
          </span>
        </div>

        <div className="rounded-2xl border border-[#2C253E] bg-[#181424] p-4">
          <span className="text-[12px] font-medium text-[#9E97B8]">
            Sessions completed
          </span>
          <p className="mt-2 text-[26px] font-bold tabular-nums text-white">
            {totalSessionsDisplay}
          </p>
          <span className="mt-1 inline-block text-[11px] font-medium text-[#A594F9]">
            {sessionStats.hydrationCount} water check-ins today
          </span>
        </div>

        <div className="rounded-2xl border border-[#2C253E] bg-[#181424] p-4">
          <span className="text-[12px] font-medium text-[#9E97B8]">
            Streak
          </span>
          <p className="mt-2 text-[26px] font-bold tabular-nums text-white">
            12 days
          </p>
          <span className="mt-1 inline-block text-[11px] font-medium text-[#FBBF24]">
            🔥 Personal best: 19 days
          </span>
        </div>

        <div className="rounded-2xl border border-[#2C253E] bg-[#181424] p-4">
          <span className="text-[12px] font-medium text-[#9E97B8]">
            Reminders done %
          </span>
          <p className="mt-2 text-[26px] font-bold tabular-nums text-white">
            92%
          </p>
          <span className="mt-1 inline-block text-[11px] font-medium text-[#60A5FA]">
            Hydration & posture top-rated
          </span>
        </div>
      </div>

      {/* Weekly Bar Chart + Level / XP Unlocks Grid */}
      <div className="grid grid-cols-12 gap-5">
        {/* Mon-Sun Bar Chart with Editable Daily Goal */}
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

            {/* Editable Daily Goal Pill */}
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
              <div className="flex items-center gap-1.5 rounded-xl border border-[#A594F9] bg-[#141022] px-2.5 py-1 text-[11.5px]">
                <button
                  type="button"
                  onClick={() => stepGoalDraft(-0.5)}
                  className="flex h-5 w-5 items-center justify-center rounded bg-[#261E42] font-bold text-white hover:bg-[#382D61] cursor-pointer"
                >
                  −
                </button>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="16"
                  value={goalDraft}
                  onChange={(e) => setGoalDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveGoal();
                    if (e.key === 'Escape') setIsEditingGoal(false);
                  }}
                  className="w-12 bg-transparent text-center font-bold tabular-nums text-white focus:outline-none select-text"
                />
                <span className="text-[10.5px] text-[#9E97B8]">h/d</span>
                <button
                  type="button"
                  onClick={() => stepGoalDraft(0.5)}
                  className="flex h-5 w-5 items-center justify-center rounded bg-[#261E42] font-bold text-white hover:bg-[#382D61] cursor-pointer"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={handleSaveGoal}
                  className="ml-1 rounded-md bg-[#A594F9] px-2 py-0.5 text-[10.5px] font-bold text-[#171329] hover:bg-[#B5A7FA] cursor-pointer"
                >
                  Save
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 flex h-48 items-end justify-between gap-3 px-2 pt-4 border-b border-[#262038]">
            {bars.map((item) => {
              const heightPercent = Math.round((item.hours / maxHours) * 100);
              const metGoal = item.hours >= dailyGoalHours;
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

          <div className="mt-2.5 flex items-center justify-between px-2 text-[11.5px] font-medium text-[#8E87A8]">
            {bars.map((item) => (
              <span key={item.day} className="flex-1 text-center">
                {item.day}
              </span>
            ))}
          </div>
        </div>

        {/* Level / XP Progress Bar & Full 5-Tier Companion Unlocks */}
        <div className="col-span-5 flex flex-col justify-between rounded-2xl border border-[#2C253E] bg-[#181424] p-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-[#3C3173] px-3 py-0.5 text-[11.5px] font-bold text-white">
                Level 7 · Scholar
              </span>
              <span className="text-[12px] font-semibold tabular-nums text-[#A594F9]">
                2,450 / 3,000 XP
              </span>
            </div>

            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-[#0E0B16] border border-[#2B2440]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#A594F9]"
                style={{ width: '82%' }}
              />
            </div>
            <p className="mt-1.5 text-[11.5px] text-[#8E87A8]">
              550 XP until Level 8 (unlocks &ldquo;Study Night Lo-Fi&rdquo;)
            </p>
          </div>

          {/* All 5 Level-Based Companion Unlocks with Character Icons */}
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-bold text-[#E2DFF0]">
                Companion Unlocks
              </span>
              <span className="text-[11px] font-medium text-[#A594F9]">
                3 / 5 Unlocked
              </span>
            </div>

            {COMPANION_LEVEL_ROSTER.map((reward) => (
              <div
                key={reward.id}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 transition ${
                  reward.unlocked
                    ? 'border-[#322A4B] bg-[#120F1D]'
                    : 'border-[#221C33] bg-[#0E0B17] opacity-75'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CompanionMiniAvatar
                    accessory={reward.accessory}
                    unlocked={reward.unlocked}
                    accentBg={reward.accentBg}
                  />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-white truncate">
                      {reward.name}
                    </p>
                    <p
                      className={`text-[10.5px] font-medium truncate ${
                        reward.unlocked ? 'text-[#4ADE80]' : 'text-[#8E87A8]'
                      }`}
                    >
                      {reward.statusLabel}
                    </p>
                  </div>
                </div>

                <span
                  className={`ml-2 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    reward.unlocked
                      ? 'bg-[#261E42] text-[#C4B5FD]'
                      : 'bg-[#1A1528] text-[#6E678A]'
                  }`}
                >
                  Lv. {reward.level}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressView;