// src/renderer/src/utils/storage.ts

export const STORAGE_KEYS = {
  DAILY_HISTORY: 'study_buddy_daily_history_v1',
  DAILY_GOAL_HOURS: 'study_buddy_daily_goal_hours',
  REMINDERS: 'study_buddy_reminders_v1',
  SCHEDULE_BLOCKS: 'study_buddy_schedule_blocks_v1',
  SMART_TARGETS: 'study_buddy_smart_targets_v1',
  SMART_ACTIVATION_ENABLED: 'study_buddy_smart_activation_enabled_v1',
  LAST_USED_SESSION: 'study_buddy_last_used_session_v1',
  APP_RULES: 'study_buddy_app_rules_v1',
  SESSION_STATS: 'study_buddy_session_stats',
} as const;

export interface DailyProgressEntry {
  date: string; // YYYY-MM-DD
  focusMinutes: number;
  sessionsCompleted: number;
  hydrationCount: number;
  breaksCompleted: number;
}

export type DailyHistoryMap = Record<string, DailyProgressEntry>;

export interface LastUsedSessionConfig {
  presetId: 'quick' | 'standard' | 'deep' | 'custom';
  presetTitle: string;
  focusMinutes: number;
  breakMinutes: number;
  hydrationIntervalMinutes: number;
}

export const DEFAULT_USUAL_SESSION: LastUsedSessionConfig = {
  presetId: 'quick',
  presetTitle: 'Quick 25/5',
  focusMinutes: 25,
  breakMinutes: 5,
  hydrationIntervalMinutes: 30,
};

export function loadStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota errors
  }
}

export function loadLastUsedSession(): LastUsedSessionConfig {
  const saved = loadStorage<Partial<LastUsedSessionConfig>>(
    STORAGE_KEYS.LAST_USED_SESSION,
    DEFAULT_USUAL_SESSION
  );
  if (
    saved &&
    typeof saved.focusMinutes === 'number' &&
    saved.focusMinutes > 0
  ) {
    return {
      presetId: saved.presetId ?? 'quick',
      presetTitle: saved.presetTitle || `${saved.focusMinutes} minute`,
      focusMinutes: saved.focusMinutes,
      breakMinutes:
        typeof saved.breakMinutes === 'number' ? saved.breakMinutes : 5,
      hydrationIntervalMinutes:
        typeof saved.hydrationIntervalMinutes === 'number'
          ? saved.hydrationIntervalMinutes
          : 30,
    };
  }
  return DEFAULT_USUAL_SESSION;
}

export function saveLastUsedSession(config: LastUsedSessionConfig): void {
  saveStorage(STORAGE_KEYS.LAST_USED_SESSION, config);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('study-buddy:usual-session-updated'));
  }
}

export function formatUsualSessionSummary(
  config: LastUsedSessionConfig = loadLastUsedSession()
): string {
  return `${config.presetTitle} (${config.focusMinutes} min focus / ${config.breakMinutes} min break)`;
}

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function recordDailyProgressDelta(delta: {
  focusMinutes?: number;
  sessionsCompleted?: number;
  hydrationCount?: number;
  breaksCompleted?: number;
}): DailyHistoryMap {
  const today = getLocalDateKey();
  const history = loadStorage<DailyHistoryMap>(STORAGE_KEYS.DAILY_HISTORY, {});
  const existing = history[today] ?? {
    date: today,
    focusMinutes: 0,
    sessionsCompleted: 0,
    hydrationCount: 0,
    breaksCompleted: 0,
  };

  const updated: DailyProgressEntry = {
    date: today,
    focusMinutes: Math.max(0, existing.focusMinutes + (delta.focusMinutes ?? 0)),
    sessionsCompleted: Math.max(
      0,
      existing.sessionsCompleted + (delta.sessionsCompleted ?? 0)
    ),
    hydrationCount: Math.max(
      0,
      existing.hydrationCount + (delta.hydrationCount ?? 0)
    ),
    breaksCompleted: Math.max(
      0,
      existing.breaksCompleted + (delta.breaksCompleted ?? 0)
    ),
  };

  const nextHistory: DailyHistoryMap = {
    ...history,
    [today]: updated,
  };

  saveStorage(STORAGE_KEYS.DAILY_HISTORY, nextHistory);
  window.dispatchEvent(new CustomEvent('study-buddy:data-updated'));
  return nextHistory;
}

export function calculateStreakDays(history: DailyHistoryMap): number {
  let streak = 0;
  const cursor = new Date();

  const todayKey = getLocalDateKey(cursor);
  const todayEntry = history[todayKey];
  const hasActivityToday =
    Boolean(todayEntry) &&
    (todayEntry.sessionsCompleted > 0 || todayEntry.focusMinutes > 0);

  if (!hasActivityToday) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const key = getLocalDateKey(cursor);
    const entry = history[key];
    if (entry && (entry.sessionsCompleted > 0 || entry.focusMinutes > 0)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function calculateLevelAndXP(history: DailyHistoryMap): {
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  totalXP: number;
  progressPercent: number;
} {
  const entries = Object.values(history);
  const totalMinutes = entries.reduce((acc, e) => acc + e.focusMinutes, 0);
  const totalSessions = entries.reduce(
    (acc, e) => acc + e.sessionsCompleted + e.breaksCompleted,
    0
  );

  const totalXP = totalMinutes * 10 + totalSessions * 25;
  const xpPerLevel = 500;
  const level = Math.floor(totalXP / xpPerLevel) + 1;
  const currentLevelXP = totalXP % xpPerLevel;
  const progressPercent = Math.min(
    100,
    Math.round((currentLevelXP / xpPerLevel) * 100)
  );

  return {
    level,
    currentLevelXP,
    nextLevelXP: xpPerLevel,
    totalXP,
    progressPercent,
  };
}

export function resetStudyBuddyUserData(): void {
  if (typeof window === 'undefined') return;
  const keysToClear = [
    STORAGE_KEYS.DAILY_HISTORY,
    STORAGE_KEYS.DAILY_GOAL_HOURS,
    STORAGE_KEYS.REMINDERS,
    STORAGE_KEYS.SCHEDULE_BLOCKS,
    STORAGE_KEYS.SMART_TARGETS,
    STORAGE_KEYS.SMART_ACTIVATION_ENABLED,
    STORAGE_KEYS.LAST_USED_SESSION,
    STORAGE_KEYS.APP_RULES,
    STORAGE_KEYS.SESSION_STATS,
  ];
  keysToClear.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage error
    }
  });
  window.dispatchEvent(new CustomEvent('study-buddy:data-reset'));
  window.dispatchEvent(new CustomEvent('study-buddy:data-updated'));
}

export function loadDemoDataForDev(): void {
  const now = new Date();
  const demoHistory: DailyHistoryMap = {};
  const sampleHours = [2.5, 4.0, 3.2, 4.5, 3.8, 1.5, 3.0];

  for (let i = 0; i < 7; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = getLocalDateKey(d);
    const hrs = sampleHours[i % sampleHours.length];
    const mins = Math.round(hrs * 60);
    demoHistory[key] = {
      date: getLocalDateKey(d),
      focusMinutes: mins,
      sessionsCompleted: Math.max(1, Math.round(hrs * 2)),
      hydrationCount: Math.max(1, Math.round(hrs * 2)),
      breaksCompleted: Math.max(1, Math.round(hrs)),
    };
  }

  saveStorage(STORAGE_KEYS.DAILY_HISTORY, demoHistory);

  saveStorage(STORAGE_KEYS.SCHEDULE_BLOCKS, [
    {
      id: 'sched-demo-1',
      title: 'Morning UX Studio & Wireframing',
      startTime: '09:00',
      endTime: '11:30',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      preset: 'Standard 45/5',
    },
    {
      id: 'sched-demo-2',
      title: 'Afternoon Coursework & Reading',
      startTime: '14:00',
      endTime: '16:00',
      days: ['Mon', 'Wed', 'Fri'],
      preset: 'Quick 25/5',
    },
  ]);

  saveStorage(STORAGE_KEYS.SMART_TARGETS, [
    {
      id: 'sa-demo-1',
      kind: 'app',
      tagName: 'Figma',
      targetPathOrUrl: 'Figma.exe',
      processName: 'figma',
      processNames: ['figma'],
    },
    {
      id: 'sa-demo-2',
      kind: 'website',
      tagName: 'University Canvas',
      targetPathOrUrl: 'canvas.instructure.com',
    },
  ]);

  saveStorage(STORAGE_KEYS.SMART_ACTIVATION_ENABLED, true);

  saveStorage(STORAGE_KEYS.APP_RULES, [
    {
      id: 'rule-demo-youtube',
      kind: 'website',
      targetName: 'YouTube',
      domainOrProcess: 'youtube.com',
      category: 'Video',
      strictBlock: false,
      enabled: true,
    },
    {
      id: 'rule-demo-reddit',
      kind: 'website',
      targetName: 'Reddit',
      domainOrProcess: 'reddit.com',
      category: 'Social',
      strictBlock: false,
      enabled: true,
    },
    {
      id: 'rule-demo-discord',
      kind: 'app',
      targetName: 'Discord',
      domainOrProcess: 'Discord.exe',
      processName: 'discord',
      processNames: ['discord'],
      category: 'Chat',
      strictBlock: true,
      enabled: true,
    },
  ]);

  window.dispatchEvent(new CustomEvent('study-buddy:data-reset'));
  window.dispatchEvent(new CustomEvent('study-buddy:data-updated'));
}
