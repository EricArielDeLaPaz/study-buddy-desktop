// src/main/index.ts
import { app, shell, BrowserWindow, ipcMain, screen, dialog } from 'electron';
import { join, dirname } from 'path';
import { writeFile, readFile, readdir } from 'fs/promises';
import { execFile, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type OverlayTriggerType = 'hydration' | 'bathroom' | 'intervention';

export interface OverlayTriggerPayload {
  durationSeconds?: number;
  targetAppOrSite?: string;
  targetKind?: 'website' | 'app';
  strictMode?: boolean;
  message?: string;
  dispatchedAtEpochMs?: number;
  mainDetectToDispatchMs?: number;
}

export interface SmartActivationTriggerPayload {
  targetId: string;
  tagName: string;
  kind: 'website' | 'app';
}

interface WatcherAppRule {
  id: string;
  kind?: 'website' | 'app';
  targetName: string;
  domainOrProcess: string;
  processName?: string;
  processNames?: string[];
  bundleId?: string;
  titleKeyword?: string;
  strictBlock: boolean;
  enabled: boolean;
}

interface WatcherSmartTarget {
  id: string;
  kind: 'website' | 'app';
  tagName: string;
  targetPathOrUrl: string;
  processName?: string;
  processNames?: string[];
  bundleId?: string;
  titleKeyword?: string;
}

interface ForegroundWindowInfo {
  pid: number;
  rawProcessName: string;
  bundleId: string;
  processName: string;
  windowTitle: string;
}

interface CapturedMatchTarget {
  ruleId: string;
  targetKey: string;
  targetName: string;
  resolvedKind: 'app' | 'website';
  strictBlock: boolean;
  pid: number;
  rawProcessName: string;
  bundleId: string;
}

interface HelperJsonMessage {
  type: 'change' | 'hb' | 'perm_error';
  pid?: number;
  rawProcessName?: string;
  bundleId?: string;
  windowTitle?: string;
  message?: string;
}

interface InspectedAppTarget {
  canceled?: boolean;
  filePath: string;
  displayName: string;
  processName: string;
  processNames: string[];
  bundleId?: string;
  titleKeyword?: string;
  isLauncherWarning?: boolean;
  warningMessage?: string;
}

interface RunningOpenAppItem {
  pid: number;
  processName: string;
  processNames?: string[];
  rawProcessName: string;
  bundleId?: string;
  windowTitle: string;
  hostKind?: 'chrome_app' | 'store_app' | 'normal';
  hostLabel?: string;
  suggestedTitleKeyword?: string;
}

const IS_DEV =
  Boolean(process.env['ELECTRON_RENDERER_URL']) || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let isAppQuitting = false;

// Stage P6 / P7 / P8 Watcher State
let isFocusSessionRunning = false;
let isSessionActive = false; // true if focusing, paused, or on_break (never start smart activation unless idle)
let isInterventionOverlayActive = false;
let watchedRules: WatcherAppRule[] = [];
let isSmartActivationEnabled = true;
let watchedSmartTargets: WatcherSmartTarget[] = [];

let lastCapturedMatch: CapturedMatchTarget | null = null;
let latestForegroundWindow: ForegroundWindowInfo | null = null;

let watcherChild: ChildProcess | null = null;
let watcherStdoutBuffer = '';
let lastHelperResponseAt = 0;
let watcherWatchdogTimer: NodeJS.Timeout | null = null;
let helperRestartTimestamps: number[] = [];
let isStoppingHelperIntentionally = false;
let macAutomationPermissionNoticeLogged = false;

const WATCHER_HEARTBEAT_TIMEOUT_MS = 5000;
const MAX_RESTARTS_PER_MINUTE = 3;

// App Rule Cooldowns
const cooldownUntilMap = new Map<string, number>();
const NON_STRICT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes for default rules
const STRICT_COOLDOWN_MS = 30 * 1000; // 30 seconds after dismissal for strict rules

// Smart Activation State & Cooldowns
const SMART_CANCEL_COOLDOWN_MS = 60 * 60 * 1000; // 60 minutes when user clicks Cancel
const SMART_RETRIGGER_WINDOW_MS = 30 * 60 * 1000; // 30 minutes if app stays open
const smartCancelCooldownUntilMap = new Map<string, number>();
const smartLastTriggeredAtMap = new Map<string, number>();
const smartTargetClosedSinceTriggerMap = new Map<string, boolean>();
let lastMatchedSmartTargetId: string | null = null;

const KNOWN_BROWSERS = [
  'chrome',
  'google chrome',
  'msedge',
  'microsoft edge',
  'firefox',
  'mozilla firefox',
  'brave',
  'brave browser',
  'safari',
  'arc',
  'opera',
  'vivaldi',
];

const GENERIC_PARENT_FOLDERS = new Set([
  'applications',
  'application',
  'app',
  'apps',
  'bin',
  'binaries',
  'win64',
  'win32',
  'x64',
  'x86',
  'release',
  'debug',
  'contents',
  'macos',
  'resources',
  'local',
  'roaming',
  'appdata',
  'program files',
  'program files (x86)',
  'programs',
  'users',
  'system32',
  'windows',
]);

export function normalizeAppTarget(input: string): { processName: string } {
  let s = (input ?? '').trim();

  while (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }

  s = s.replace(/[\\/]+$/, '');

  if (s.includes('/') || s.includes('\\')) {
    const segments = s.split(/[\\/]+/).filter(Boolean);
    if (segments.length > 0) {
      s = segments[segments.length - 1];
    }
  }

  s = s.replace(/\.(exe|app|lnk|dmg|appimage)$/i, '');

  const processName = s.toLowerCase().replace(/\s+/g, ' ').trim();
  return { processName };
}

function normalizeAppTagName(tagName: string): string {
  const withoutNotes = (tagName ?? '').replace(/\s*\(.*?\)\s*/g, ' ').trim();
  return normalizeAppTarget(withoutNotes || tagName).processName;
}

function isLikelyLauncherExecutable(input: string): boolean {
  const { processName } = normalizeAppTarget(input);
  if (!processName) return false;
  return (
    processName === 'update' ||
    processName === 'setup' ||
    processName === 'install' ||
    processName === 'installer' ||
    processName === 'launcher' ||
    processName === 'unins000' ||
    processName.endsWith(' installer') ||
    processName.endsWith(' setup') ||
    processName.endsWith(' launcher') ||
    processName.endsWith('_launcher') ||
    processName.endsWith('-launcher')
  );
}

function isBrowserProcess(fgProc: string): boolean {
  return KNOWN_BROWSERS.some(
    (b) => fgProc === b || fgProc.startsWith(`${b} `)
  );
}

function isBrowserOrHostProcess(fgProc: string): boolean {
  return fgProc === 'applicationframehost' || isBrowserProcess(fgProc);
}

function extractTitleKeywordFromWindowTitle(
  windowTitle: string,
  fallbackTag?: string
): string {
  const raw = (windowTitle ?? '').trim();
  if (!raw) return (fallbackTag ?? '').trim();

  const cleaned = raw
    .replace(
      /\s+[-–—|]\s+(Google Chrome|Chrome|Microsoft​?\s*Edge|Edge|Mozilla Firefox|Firefox|Brave|Opera|Vivaldi|Arc|Safari|Personal|Work).*$/i,
      ''
    )
    .replace(/\s+and\s+\d+\s+more\s+pages?.*$/i, '')
    .replace(/^\(\d+\)\s*/, '')
    .trim();

  if (!cleaned) return (fallbackTag ?? raw).trim();

  const dashParts = cleaned
    .split(/\s+[-–—|]\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (dashParts.length > 1) {
    return dashParts[0];
  }
  return cleaned;
}

/**
 * Stage P8: Builds the deduplicated list of process aliases for a path or process name.
 * Strips -launcher / _launcher / " launcher", and for Update.exe / Setup.exe extracts
 * the parent folder name (e.g. AppData\Local\Discord\Update.exe -> "discord").
 */
function buildProcessAliases(
  rawPathOrInput: string,
  extraAliases: string[] = []
): string[] {
  const aliases: string[] = [];
  const addAlias = (candidate?: string) => {
    const norm = normalizeAppTarget(candidate ?? '').processName;
    if (norm && !aliases.includes(norm)) {
      aliases.push(norm);
    }
  };

  const primary = normalizeAppTarget(rawPathOrInput).processName;

  if (primary) {
    const stripped = primary
      .replace(/([-_\s]+)(launcher|installer|setup|updater|update)$/i, '')
      .trim();
    if (stripped && stripped !== primary) {
      addAlias(stripped);
    }
  }

  const cleanedPath = (rawPathOrInput ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/[\\/]+$/, '');

  if (cleanedPath.includes('/') || cleanedPath.includes('\\')) {
    const parts = cleanedPath.split(/[\\/]+/).filter(Boolean);
    if (parts.length >= 2) {
      for (let i = parts.length - 2; i >= 0; i -= 1) {
        const folder = parts[i].trim();
        const folderLower = folder.toLowerCase();
        if (
          /^app-\d/i.test(folderLower) ||
          /^v?\d+\.\d+/i.test(folderLower) ||
          GENERIC_PARENT_FOLDERS.has(folderLower) ||
          /^[a-z]:$/i.test(folderLower)
        ) {
          continue;
        }
        const folderNorm = normalizeAppTarget(folder).processName;
        if (
          folderNorm &&
          (isLikelyLauncherExecutable(primary) || folderNorm !== primary)
        ) {
          addAlias(folderNorm);
          break;
        }
      }
    }
  }

  for (const extra of extraAliases) {
    addAlias(extra);
  }

  addAlias(primary);
  return aliases;
}

function resolveRuleKindInMain(rule: WatcherAppRule): 'website' | 'app' {
  if (rule.kind === 'app' || rule.kind === 'website') {
    return rule.kind;
  }
  const raw = (rule.domainOrProcess ?? '').trim();
  if (
    /\.(exe|app|lnk|dmg|appimage)["']?$/i.test(raw) ||
    raw.includes('\\') ||
    raw.startsWith('/')
  ) {
    return 'app';
  }
  return 'website';
}

function shouldWatcherHelperRun(): boolean {
  if (isAppQuitting) return false;
  if (isFocusSessionRunning) return true;
  if (isSmartActivationEnabled && watchedSmartTargets.length > 0) return true;
  return false;
}

function assertAlwaysOnTop(win: BrowserWindow | null): void {
  if (!win || win.isDestroyed()) return;
  win.setAlwaysOnTop(true, 'screen-saver', 1);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
}

function createMainWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const win = new BrowserWindow({
    width,
    height,
    minWidth: 960,
    minHeight: 640,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  assertAlwaysOnTop(win);
  win.setIgnoreMouseEvents(true, { forward: true });

  win.on('ready-to-show', () => {
    win.show();
    assertAlwaysOnTop(win);
  });

  win.on('blur', () => {
    assertAlwaysOnTop(win);
  });

  win.on('show', () => {
    assertAlwaysOnTop(win);
  });

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow = win;
  return win;
}

export function dispatchOverlayTrigger(
  type: OverlayTriggerType,
  payload?: OverlayTriggerPayload
): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  assertAlwaysOnTop(mainWindow);
  mainWindow.webContents.send('buddy:trigger-overlay', { type, payload });
}

function dispatchSmartActivationTrigger(
  payload: SmartActivationTriggerPayload
): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  assertAlwaysOnTop(mainWindow);
  mainWindow.webContents.send('buddy:smart-activation-trigger', payload);
}

function applyCooldownForMatch(match: CapturedMatchTarget): void {
  const duration = match.strictBlock
    ? STRICT_COOLDOWN_MS
    : NON_STRICT_COOLDOWN_MS;
  const expiresAt = Date.now() + duration;
  cooldownUntilMap.set(match.ruleId, expiresAt);
  cooldownUntilMap.set(match.targetKey, expiresAt);
}

/**
 * Shared matcher used by both App Rules and Smart Activation targets.
 */
function matchTargetAgainstForeground(
  target: {
    kind: 'website' | 'app';
    tagName: string;
    domainOrProcess: string;
    processName?: string;
    processNames?: string[];
    bundleId?: string;
    titleKeyword?: string;
  },
  fg: ForegroundWindowInfo,
  fgProc: string,
  fgBundleLower: string,
  isBrowser: boolean
): { matched: boolean; reason: string; targetKey: string } {
  const cleanTagName =
    target.tagName.replace(/\s*\(.*?\)\s*/g, '').trim() || target.tagName;
  const normalizedTag = normalizeAppTagName(target.tagName);

  if (target.kind === 'app') {
    const aliases =
      target.processNames && target.processNames.length > 0
        ? target.processNames.map((a) => normalizeAppTarget(a).processName)
        : buildProcessAliases(
            target.domainOrProcess || target.processName || target.tagName,
            target.processName ? [target.processName] : []
          );
    if (normalizedTag && !aliases.includes(normalizedTag)) {
      aliases.push(normalizedTag);
    }

    const ruleBundle = (target.bundleId ?? '').trim().toLowerCase();
    const effectiveTitleKeyword = (
      target.titleKeyword?.trim() || cleanTagName
    ).toLowerCase();

    let processMatched = false;
    let matchSource = '';

    if (ruleBundle && fgBundleLower && fgBundleLower === ruleBundle) {
      processMatched = true;
      matchSource = `bundleId="${ruleBundle}"`;
    } else if (aliases.includes(fgProc)) {
      processMatched = true;
      matchSource = `alias="${fgProc}"`;
    } else {
      const prefixAlias = aliases.find(
        (alias) =>
          alias.length >= 3 &&
          (fgProc.startsWith(`${alias} `) ||
            fgProc.startsWith(`${alias}-`) ||
            fgProc.startsWith(`${alias}_`) ||
            fgProc.startsWith(`${alias}helper`))
      );
      if (prefixAlias) {
        processMatched = true;
        matchSource = `helper prefix="${prefixAlias}"`;
      } else if (fgProc === 'applicationframehost') {
        // UWP / Microsoft Store host process: match via title keyword below
        processMatched = true;
        matchSource = 'ApplicationFrameHost';
      }
    }

    if (!processMatched) {
      return {
        matched: false,
        reason: `name mismatch (watches [${aliases.join(', ')}], fg is "${fgProc}")`,
        targetKey: aliases[0] || normalizedTag,
      };
    }

    // Stage P8 Part A.2: If the matched process is a browser or ApplicationFrameHost,
    // REQUIRE the window title to contain the titleKeyword.
    if (isBrowserOrHostProcess(fgProc)) {
      if (
        !effectiveTitleKeyword ||
        !fg.windowTitle ||
        !fg.windowTitle.includes(effectiveTitleKeyword)
      ) {
        return {
          matched: false,
          reason: `title keyword missing (needs "${effectiveTitleKeyword}" in title "${fg.windowTitle}")`,
          targetKey: `${fgProc}:${effectiveTitleKeyword}`,
        };
      }
      return {
        matched: true,
        reason: `${matchSource} + titleKeyword="${effectiveTitleKeyword}"`,
        targetKey: `${fgProc}:${effectiveTitleKeyword}`,
      };
    }

    // If user explicitly set a custom titleKeyword on a normal app, also honor it
    if (
      target.titleKeyword &&
      target.titleKeyword.trim() &&
      (!fg.windowTitle ||
        !fg.windowTitle.includes(target.titleKeyword.trim().toLowerCase()))
    ) {
      return {
        matched: false,
        reason: `title keyword missing (needs "${target.titleKeyword
          .trim()
          .toLowerCase()}" in title "${fg.windowTitle}")`,
        targetKey: aliases[0] || normalizedTag,
      };
    }

    return {
      matched: true,
      reason: matchSource,
      targetKey: aliases[0] || normalizedTag,
    };
  }

  // Website matching
  if (!isBrowser) {
    return {
      matched: false,
      reason: `fg "${fgProc}" is not a browser`,
      targetKey: normalizedTag,
    };
  }

  if (!fg.windowTitle) {
    return {
      matched: false,
      reason: 'browser window title is empty',
      targetKey: normalizedTag,
    };
  }

  const domainBase = (target.domainOrProcess ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('.')[0];
  const kw = (target.titleKeyword?.trim() || normalizedTag).toLowerCase();

  const matched =
    (kw.length > 0 && fg.windowTitle.includes(kw)) ||
    (domainBase.length > 2 && fg.windowTitle.includes(domainBase));

  return {
    matched,
    reason: matched
      ? `browser title matched "${kw || domainBase}"`
      : `title keyword missing (needs "${kw || domainBase}" in "${fg.windowTitle}")`,
    targetKey: kw || domainBase,
  };
}

/**
 * Stage P8: Evaluates every foreground window change against:
 * 1. App Rules (when a focus session is running)
 * 2. Smart Activation targets (when no session is active and Smart Activation is enabled)
 */
function evaluateForegroundWindow(
  fg: ForegroundWindowInfo,
  changeDetectedPerfMs: number
): void {
  if (!fg || !fg.processName) return;

  const fgProc = normalizeAppTarget(fg.rawProcessName || fg.processName).processName;
  const fgBundleLower = (fg.bundleId ?? '').trim().toLowerCase();

  // Ignore Study Buddy / Electron itself
  if (
    fg.pid === process.pid ||
    fgProc === 'electron' ||
    fgProc === 'study-buddy' ||
    fgProc === 'study buddy' ||
    fgBundleLower === 'tech.ericarieldelapaz.studybuddy'
  ) {
    return;
  }

  const isBrowser = isBrowserProcess(fgProc);

  if (IS_DEV) {
    console.info(
      `[watcher] fg change: proc="${fgProc}", bundle="${fgBundleLower || '-'}", title="${fg.windowTitle || '-'}"`
    );
  }

  // ---------------------------------------------------------------------------
  // 1. SMART ACTIVATION EVALUATION (when no session is running/paused/on_break)
  // ---------------------------------------------------------------------------
  if (!isSessionActive && isSmartActivationEnabled && watchedSmartTargets.length > 0) {
    let matchedSmartId: string | null = null;

    for (const st of watchedSmartTargets) {
      const check = matchTargetAgainstForeground(
        {
          kind: st.kind,
          tagName: st.tagName,
          domainOrProcess: st.targetPathOrUrl,
          processName: st.processName,
          processNames: st.processNames,
          bundleId: st.bundleId,
          titleKeyword: st.titleKeyword,
        },
        fg,
        fgProc,
        fgBundleLower,
        isBrowser
      );

      if (!check.matched) {
        continue;
      }

      matchedSmartId = st.id;
      const now = Date.now();

      // Check 60-minute Cancel cooldown
      const cancelCooldownUntil = smartCancelCooldownUntilMap.get(st.id) ?? 0;
      if (now < cancelCooldownUntil) {
        if (IS_DEV) {
          const minsLeft = Math.ceil((cancelCooldownUntil - now) / 60000);
          console.info(
            `[watcher] smart target="${st.tagName}" matched, but on Cancel cooldown (${minsLeft}m left)`
          );
        }
        break;
      }

      // Check 30-minute re-trigger window unless the target was closed/left and re-opened
      const lastTrig = smartLastTriggeredAtMap.get(st.id) ?? 0;
      const wasClosedOrLeft =
        smartTargetClosedSinceTriggerMap.get(st.id) ?? true;

      if (
        !wasClosedOrLeft &&
        lastTrig > 0 &&
        now - lastTrig < SMART_RETRIGGER_WINDOW_MS
      ) {
        if (IS_DEV) {
          console.info(
            `[watcher] smart target="${st.tagName}" matched, waiting for re-open or 30m window`
          );
        }
        break;
      }

      smartLastTriggeredAtMap.set(st.id, now);
      smartTargetClosedSinceTriggerMap.set(st.id, false);
      lastMatchedSmartTargetId = st.id;

      if (IS_DEV) {
        console.info(
          `[watcher] SMART ACTIVATION TRIGGERED for "${st.tagName}" (${check.reason})`
        );
      }

      dispatchSmartActivationTrigger({
        targetId: st.id,
        tagName: st.tagName,
        kind: st.kind,
      });
      break;
    }

    // If the user switched away from the previously matched smart target, mark it so re-opening can trigger
    if (
      lastMatchedSmartTargetId &&
      matchedSmartId !== lastMatchedSmartTargetId
    ) {
      smartTargetClosedSinceTriggerMap.set(lastMatchedSmartTargetId, true);
      lastMatchedSmartTargetId = matchedSmartId;
    }
  }

  // ---------------------------------------------------------------------------
  // 2. APP RULES EVALUATION (only while a focus session is running)
  // ---------------------------------------------------------------------------
  if (!isFocusSessionRunning) {
    if (IS_DEV && watchedRules.length > 0) {
      for (const rule of watchedRules) {
        if (resolveRuleKindInMain(rule) === 'app') {
          console.info(
            `[watcher] app rule="${rule.targetName}" -> skipped (session not running)`
          );
        }
      }
    }
    return;
  }

  if (isInterventionOverlayActive) {
    if (IS_DEV) {
      console.info(
        `[watcher] app rules skipped (intervention overlay already active)`
      );
    }
    return;
  }

  for (const rule of watchedRules) {
    const resolvedKind = resolveRuleKindInMain(rule);
    const cleanTagName =
      rule.targetName.replace(/\s*\(.*?\)\s*/g, '').trim() || rule.targetName;

    if (!rule.enabled) {
      if (IS_DEV && resolvedKind === 'app') {
        console.info(
          `[watcher] app rule="${rule.targetName}" -> no match (rule disabled)`
        );
      }
      continue;
    }

    const check = matchTargetAgainstForeground(
      {
        kind: resolvedKind,
        tagName: rule.targetName,
        domainOrProcess: rule.domainOrProcess,
        processName: rule.processName,
        processNames: rule.processNames,
        bundleId: rule.bundleId,
        titleKeyword: rule.titleKeyword,
      },
      fg,
      fgProc,
      fgBundleLower,
      isBrowser
    );

    if (!check.matched) {
      if (IS_DEV && resolvedKind === 'app') {
        console.info(
          `[watcher] app rule="${rule.targetName}" -> no match (${check.reason})`
        );
      }
      continue;
    }

    const now = Date.now();
    const cooldownUntil = Math.max(
      cooldownUntilMap.get(rule.id) ?? 0,
      cooldownUntilMap.get(check.targetKey) ?? 0
    );

    if (now < cooldownUntil) {
      if (IS_DEV) {
        const secsLeft = Math.ceil((cooldownUntil - now) / 1000);
        console.info(
          `[watcher] rule="${rule.targetName}" -> no match (cooldown: ${secsLeft}s remaining)`
        );
      }
      continue;
    }

    if (IS_DEV && resolvedKind === 'app') {
      console.info(
        `[watcher] app rule="${rule.targetName}" -> MATCH (${check.reason})`
      );
    }

    lastCapturedMatch = {
      ruleId: rule.id,
      targetKey: check.targetKey,
      targetName: cleanTagName,
      resolvedKind,
      strictBlock: Boolean(rule.strictBlock),
      pid: fg.pid,
      rawProcessName: fg.rawProcessName,
      bundleId: fg.bundleId,
    };

    isInterventionOverlayActive = true;
    applyCooldownForMatch(lastCapturedMatch);

    const mainDetectToDispatchMs = Math.max(
      0,
      Math.round(performance.now() - changeDetectedPerfMs)
    );

    if (IS_DEV) {
      console.info(
        `[NudgeTiming][Main] foreground change detected -> overlay dispatched in ${mainDetectToDispatchMs}ms (target: "${cleanTagName}", kind: ${resolvedKind})`
      );
    }

    dispatchOverlayTrigger('intervention', {
      targetAppOrSite: cleanTagName,
      targetKind: resolvedKind,
      strictMode: Boolean(rule.strictBlock),
      dispatchedAtEpochMs: Date.now(),
      mainDetectToDispatchMs,
    });
    break;
  }
}

/**
 * Stage P8: Inspects an executable path, Windows .lnk shortcut, or macOS .app bundle.
 * - Builds processNames aliases (stripping -launcher / _launcher, adding parent folder for Update.exe/Setup.exe).
 * - On Windows, checks the same folder for sibling .exe files (e.g. blender.exe next to blender-launcher.exe).
 */
async function inspectDesktopAppPath(
  rawFilePath: string
): Promise<InspectedAppTarget> {
  const cleanedPath = (rawFilePath ?? '').trim().replace(/^["']|["']$/g, '');
  if (!cleanedPath) {
    return {
      canceled: true,
      filePath: '',
      displayName: '',
      processName: '',
      processNames: [],
    };
  }

  let resolvedPath = cleanedPath;
  let bundleId: string | undefined;
  let displayName = '';
  let processName = '';
  const siblingExeNames: string[] = [];

  if (process.platform === 'win32' && /\.lnk$/i.test(cleanedPath)) {
    try {
      const shortcut = shell.readShortcutLink(cleanedPath);
      if (shortcut && shortcut.target) {
        resolvedPath = shortcut.target;
      }
    } catch {
      // Fall back to the .lnk file name
    }
  }

  if (process.platform === 'darwin' && /\.app\/?$/i.test(resolvedPath)) {
    const appPath = resolvedPath.replace(/\/+$/, '');
    const plistPath = join(appPath, 'Contents', 'Info.plist');
    try {
      const { stdout } = await execFileAsync(
        'plutil',
        ['-convert', 'json', '-o', '-', plistPath],
        { timeout: 1500 }
      );
      const plist = JSON.parse(stdout) as {
        CFBundleIdentifier?: string;
        CFBundleExecutable?: string;
        CFBundleName?: string;
        CFBundleDisplayName?: string;
      };
      bundleId = plist.CFBundleIdentifier?.trim() || undefined;
      const execName =
        plist.CFBundleExecutable?.trim() ||
        plist.CFBundleName?.trim() ||
        appPath.split('/').pop() ||
        '';
      processName = normalizeAppTarget(execName).processName;
      displayName =
        plist.CFBundleDisplayName?.trim() ||
        plist.CFBundleName?.trim() ||
        normalizeAppTarget(appPath).processName;
    } catch {
      processName = normalizeAppTarget(appPath).processName;
      displayName = processName;
    }
  } else {
    processName = normalizeAppTarget(resolvedPath).processName;
    const rawSegment =
      cleanedPath
        .replace(/[\\/]+$/, '')
        .split(/[\\/]+/)
        .pop() ?? processName;
    displayName = rawSegment.replace(/\.(exe|app|lnk|dmg|appimage)$/i, '');

    // Stage P8 Part A.1: On Windows, if a launcher is picked, scan its folder for sibling .exe files
    if (
      process.platform === 'win32' &&
      (resolvedPath.includes('\\') || resolvedPath.includes('/'))
    ) {
      try {
        const folderPath = dirname(resolvedPath);
        const entries = await readdir(folderPath);
        const strippedBase = processName
          .replace(/([-_\s]+)(launcher|installer|setup|updater|update)$/i, '')
          .trim();

        for (const entry of entries) {
          if (!/\.exe$/i.test(entry)) continue;
          const sibNorm = normalizeAppTarget(entry).processName;
          if (!sibNorm || sibNorm === processName) continue;
          if (isLikelyLauncherExecutable(sibNorm)) continue;
          if ( sibNorm === 'crashpad_handler' || sibNorm.includes('uninstall')) {
            continue;
          }
          // Prioritize exact stripped match (e.g. blender.exe next to blender-launcher.exe)
          if (strippedBase && sibNorm === strippedBase) {
            siblingExeNames.unshift(sibNorm);
          } else if (siblingExeNames.length < 3) {
            siblingExeNames.push(sibNorm);
          }
        }
      } catch {
        // Ignore directory read errors
      }
    }
  }

  const processNames = buildProcessAliases(resolvedPath, [
    ...siblingExeNames,
    ...(processName ? [processName] : []),
  ]);

  const effectivePrimary = processNames[0] || processName;
  const isLauncher =
    isLikelyLauncherExecutable(resolvedPath) ||
    isLikelyLauncherExecutable(processName);

  // Clean displayName if it was "blender-launcher" or "Update"
  if (
    isLauncher &&
    effectivePrimary &&
    effectivePrimary !== processName
  ) {
    displayName =
      effectivePrimary.charAt(0).toUpperCase() + effectivePrimary.slice(1);
  }

  return {
    canceled: false,
    filePath: resolvedPath,
    displayName: displayName || effectivePrimary,
    processName: effectivePrimary,
    processNames,
    bundleId,
    isLauncherWarning: isLauncher,
    warningMessage: isLauncher
      ? 'Tip: Choose from open apps is the most reliable.'
      : undefined,
  };
}

/**
 * Stage P8: Lists currently open desktop applications with visible windows.
 * Labels Chrome/Edge installed app windows ("Chrome app window") and Microsoft Store apps ("Store app"),
 * and pre-computes `suggestedTitleKeyword` from the window title.
 */
async function listCurrentlyOpenApps(): Promise<RunningOpenAppItem[]> {
  try {
    if (process.platform === 'win32') {
      const psScript = `
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        $procs = Get-Process | Where-Object { $_.MainWindowTitle -ne "" -and $_.Id -ne $PID } | Select-Object Id, ProcessName, MainWindowTitle
        if ($null -eq $procs) {
          Write-Output "[]"
        } else {
          Write-Output ($procs | ConvertTo-Json -Compress)
        }
      `;
      const { stdout } = await execFileAsync(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-WindowStyle',
          'Hidden',
          '-Command',
          psScript,
        ],
        { timeout: 2500, windowsHide: true }
      );
      const trimmed = stdout.trim();
      if (!trimmed) return [];
      const parsed = JSON.parse(trimmed) as
        | Array<{ Id?: number; ProcessName?: string; MainWindowTitle?: string }>
        | { Id?: number; ProcessName?: string; MainWindowTitle?: string };
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const seen = new Set<string>();
      const results: RunningOpenAppItem[] = [];

      for (const item of items) {
        const rawProc = (item.ProcessName ?? '').trim();
        const winTitle = (item.MainWindowTitle ?? '').trim();
        if (!rawProc || !winTitle) continue;
        const norm = normalizeAppTarget(rawProc).processName;
        if (
          !norm ||
          norm === 'electron' ||
          norm === 'study-buddy' ||
          norm === 'study buddy' ||
          norm === 'textinputhost'
        ) {
          continue;
        }

        const isStoreHost = norm === 'applicationframehost';
        const isBrowser = isBrowserProcess(norm);
        const suggestedKeyword = extractTitleKeywordFromWindowTitle(
          winTitle,
          rawProc
        );

        const dedupeKey =
          isStoreHost || isBrowser
            ? `${norm}:${suggestedKeyword.toLowerCase()}`
            : norm;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        results.push({
          pid: Number(item.Id) || 0,
          processName: norm,
          processNames: [norm],
          rawProcessName: isStoreHost ? suggestedKeyword || rawProc : rawProc,
          windowTitle: winTitle,
          hostKind: isStoreHost
            ? 'store_app'
            : isBrowser
            ? 'chrome_app'
            : 'normal',
          hostLabel: isStoreHost
            ? 'Store app'
            : isBrowser
            ? 'Chrome app window'
            : undefined,
          suggestedTitleKeyword:
            isStoreHost || isBrowser ? suggestedKeyword : undefined,
        });
      }
      return results;
    }

    if (process.platform === 'darwin') {
      const jxaScript = `
        var se = Application('System Events');
        var procs = se.applicationProcesses.whose({ backgroundOnly: false });
        var out = [];
        for (var i = 0; i < procs.length; i++) {
          var p = procs[i];
          var name = "";
          var pid = 0;
          var bundleId = "";
          var winTitle = "";
          try { name = p.name() || ""; } catch (e) {}
          try { pid = p.unixId() || 0; } catch (e) {}
          try { bundleId = p.bundleIdentifier() || ""; } catch (e) {}
          try {
            if (p.windows.length > 0) {
              winTitle = p.windows[0].name() || "";
            }
          } catch (e) {}
          if (name) {
            out.push({
              pid: pid,
              rawProcessName: name,
              bundleId: bundleId,
              windowTitle: winTitle
            });
          }
        }
        JSON.stringify(out);
      `;
      const { stdout } = await execFileAsync(
        'osascript',
        ['-l', 'JavaScript', '-e', jxaScript],
        { timeout: 2500 }
      );
      const trimmed = stdout.trim();
      if (!trimmed) return [];
      const items = JSON.parse(trimmed) as Array<{
        pid?: number;
        rawProcessName?: string;
        bundleId?: string;
        windowTitle?: string;
      }>;
      const seen = new Set<string>();
      const results: RunningOpenAppItem[] = [];

      for (const item of items) {
        const rawProc = (item.rawProcessName ?? '').trim();
        const winTitle = (item.windowTitle ?? '').trim();
        const norm = normalizeAppTarget(rawProc).processName;
        const bundleId = (item.bundleId ?? '').trim() || undefined;
        if (
          !norm ||
          norm === 'electron' ||
          norm === 'study-buddy' ||
          norm === 'study buddy' ||
          bundleId === 'tech.ericarieldelapaz.studybuddy'
        ) {
          continue;
        }
        const isBrowser = isBrowserProcess(norm);
        const suggestedKeyword = extractTitleKeywordFromWindowTitle(
          winTitle,
          rawProc
        );
        const dedupeKey = isBrowser
          ? `${norm}:${suggestedKeyword.toLowerCase()}`
          : norm;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        results.push({
          pid: Number(item.pid) || 0,
          processName: norm,
          processNames: [norm],
          rawProcessName: rawProc,
          bundleId,
          windowTitle: winTitle,
          hostKind: isBrowser ? 'chrome_app' : 'normal',
          hostLabel: isBrowser ? 'Chrome app window' : undefined,
          suggestedTitleKeyword: isBrowser ? suggestedKeyword : undefined,
        });
      }
      return results;
    }
  } catch {
    return [];
  }
  return [];
}

async function queryCurrentForegroundAppOnce(): Promise<RunningOpenAppItem | null> {
  if (
    latestForegroundWindow &&
    latestForegroundWindow.processName &&
    !latestForegroundWindow.processName.includes('electron') &&
    !latestForegroundWindow.processName.includes('study-buddy') &&
    !latestForegroundWindow.processName.includes('study buddy')
  ) {
    const norm = normalizeAppTarget(
      latestForegroundWindow.rawProcessName
    ).processName;
    if (norm) {
      const isStore = norm === 'applicationframehost';
      const isBrowser = isBrowserProcess(norm);
      const suggested = extractTitleKeywordFromWindowTitle(
        latestForegroundWindow.windowTitle,
        latestForegroundWindow.rawProcessName
      );
      return {
        pid: latestForegroundWindow.pid,
        processName: norm,
        processNames: [norm],
        rawProcessName: latestForegroundWindow.rawProcessName,
        bundleId: latestForegroundWindow.bundleId || undefined,
        windowTitle: latestForegroundWindow.windowTitle,
        hostKind: isStore
          ? 'store_app'
          : isBrowser
          ? 'chrome_app'
          : 'normal',
        hostLabel: isStore
          ? 'Store app'
          : isBrowser
          ? 'Chrome app window'
          : undefined,
        suggestedTitleKeyword: isStore || isBrowser ? suggested : undefined,
      };
    }
  }

  const list = await listCurrentlyOpenApps();
  return list[0] ?? null;
}

function getWindowsWatcherScript(): string {
  return `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32FgStream {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@

$lastPid = [uint32]0
$lastTitle = $null
$ticks = 0

while ($true) {
  try {
    $h = [Win32FgStream]::GetForegroundWindow()
    if ($h -ne [IntPtr]::Zero) {
      $sb = New-Object System.Text.StringBuilder 512
      [void][Win32FgStream]::GetWindowText($h, $sb, 512)
      $title = $sb.ToString()
      $pidOut = [uint32]0
      [void][Win32FgStream]::GetWindowThreadProcessId($h, [ref]$pidOut)
      if ($pidOut -gt 0 -and ($pidOut -ne $lastPid -or $title -cne $lastTitle)) {
        $p = Get-Process -Id $pidOut -ErrorAction SilentlyContinue
        if ($null -ne $p) {
          $lastPid = $pidOut
          $lastTitle = $title
          $payload = @{
            type = "change"
            pid = [int]$pidOut
            rawProcessName = [string]$p.ProcessName
            bundleId = ""
            windowTitle = [string]$title
          }
          Write-Output ($payload | ConvertTo-Json -Compress)
        }
      }
    }
  } catch {
  }
  $ticks++
  if ($ticks -ge 6) {
    $ticks = 0
    Write-Output '{"type":"hb"}'
  }
  [System.Console]::Out.Flush()
  Start-Sleep -Milliseconds 300
}
`;
}

function getMacJxaWatcherScript(): string {
  return `
ObjC.import('Foundation');

function emitJson(obj) {
  var str = JSON.stringify(obj) + "\\n";
  var nsStr = $(str);
  var data = nsStr.dataUsingEncoding($.NSUTF8StringEncoding);
  $.NSFileHandle.fileHandleWithStandardOutput.writeData(data);
}

var se = Application('System Events');
var lastPid = -1;
var lastApp = null;
var lastTitle = null;
var ticks = 0;
var permErrorReported = false;

while (true) {
  try {
    var frontProcs = se.applicationProcesses.whose({ frontmost: true });
    if (frontProcs.length > 0) {
      var proc = frontProcs[0];
      var pid = 0;
      var appName = "";
      var bundleId = "";
      var winTitle = "";
      try { pid = proc.unixId(); } catch (e) {}
      try { appName = proc.name() || ""; } catch (e) {}
      try { bundleId = proc.bundleIdentifier() || ""; } catch (e) {}
      try {
        if (proc.windows.length > 0) {
          winTitle = proc.windows[0].name() || "";
        }
      } catch (e) {}

      if (pid !== lastPid || appName !== lastApp || winTitle !== lastTitle) {
        lastPid = pid;
        lastApp = appName;
        lastTitle = winTitle;
        emitJson({
          type: "change",
          pid: pid,
          rawProcessName: appName,
          bundleId: bundleId,
          windowTitle: winTitle
        });
      }
      permErrorReported = false;
    }
  } catch (err) {
    if (!permErrorReported) {
      permErrorReported = true;
      emitJson({
        type: "perm_error",
        message: String(err)
      });
    }
    delay(2.7);
  }

  ticks++;
  if (ticks >= 6) {
    ticks = 0;
    emitJson({ type: "hb" });
  }
  delay(0.3);
}
`;
}

function handleHelperStdoutChunk(chunk: Buffer | string): void {
  lastHelperResponseAt = Date.now();
  watcherStdoutBuffer += chunk.toString();

  let newlineIndex = watcherStdoutBuffer.indexOf('\n');
  while (newlineIndex !== -1) {
    const rawLine = watcherStdoutBuffer.slice(0, newlineIndex).trim();
    watcherStdoutBuffer = watcherStdoutBuffer.slice(newlineIndex + 1);

    if (rawLine.startsWith('{') && rawLine.endsWith('}')) {
      const changeDetectedPerfMs = performance.now();
      try {
        const parsed = JSON.parse(rawLine) as HelperJsonMessage;
        if (parsed.type === 'change') {
          const rawProc = (parsed.rawProcessName ?? '').trim();
          const fgInfo: ForegroundWindowInfo = {
            pid: Number(parsed.pid) || 0,
            rawProcessName: rawProc,
            bundleId: (parsed.bundleId ?? '').trim(),
            processName: normalizeAppTarget(rawProc).processName,
            windowTitle: (parsed.windowTitle ?? '').trim().toLowerCase(),
          };
          latestForegroundWindow = fgInfo;
          evaluateForegroundWindow(fgInfo, changeDetectedPerfMs);
        } else if (
          parsed.type === 'perm_error' &&
          !macAutomationPermissionNoticeLogged
        ) {
          macAutomationPermissionNoticeLogged = true;
          console.warn(
            '[StudyBuddy] macOS System Events permission is required to read active window titles. App continues running normally.'
          );
        }
      } catch {
        // Ignore malformed JSON line
      }
    }

    newlineIndex = watcherStdoutBuffer.indexOf('\n');
  }
}

function stopForegroundWatcherHelper(): void {
  isStoppingHelperIntentionally = true;

  if (watcherWatchdogTimer) {
    clearInterval(watcherWatchdogTimer);
    watcherWatchdogTimer = null;
  }

  if (watcherChild) {
    const procToKill = watcherChild;
    watcherChild = null;
    watcherStdoutBuffer = '';
    try {
      procToKill.stdout?.removeAllListeners();
      procToKill.stderr?.removeAllListeners();
      procToKill.removeAllListeners();
      procToKill.kill();
    } catch {
      // Ignore if process already exited
    }
  }

  isStoppingHelperIntentionally = false;
}

function scheduleHelperRestart(reason: string): void {
  stopForegroundWatcherHelper();

  if (!shouldWatcherHelperRun()) {
    return;
  }

  const now = Date.now();
  helperRestartTimestamps = helperRestartTimestamps.filter(
    (ts) => now - ts < 60000
  );

  if (helperRestartTimestamps.length >= MAX_RESTARTS_PER_MINUTE) {
    console.error(
      `[StudyBuddy] Foreground watcher helper exceeded max ${MAX_RESTARTS_PER_MINUTE} restarts per minute (${reason}). Stopping watcher.`
    );
    return;
  }

  helperRestartTimestamps.push(now);
  if (IS_DEV) {
    console.warn(
      `[StudyBuddy] Restarting foreground watcher helper (${reason}) [attempt ${helperRestartTimestamps.length}/${MAX_RESTARTS_PER_MINUTE} in last 60s]`
    );
  }

  startForegroundWatcherHelper();
}

function startForegroundWatcherHelper(): void {
  if (watcherChild || !shouldWatcherHelperRun()) {
    return;
  }

  if (process.platform !== 'win32' && process.platform !== 'darwin') {
    return;
  }

  watcherStdoutBuffer = '';
  lastHelperResponseAt = Date.now();

  try {
    if (process.platform === 'win32') {
      const encodedCommand = Buffer.from(
        getWindowsWatcherScript(),
        'utf16le'
      ).toString('base64');

      watcherChild = spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-WindowStyle',
          'Hidden',
          '-EncodedCommand',
          encodedCommand,
        ],
        {
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );
    } else if (process.platform === 'darwin') {
      watcherChild = spawn(
        'osascript',
        ['-l', 'JavaScript', '-e', getMacJxaWatcherScript()],
        {
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );
    }

    if (!watcherChild) return;

    watcherChild.stdout?.on('data', handleHelperStdoutChunk);
    watcherChild.stderr?.on('data', () => {
      lastHelperResponseAt = Date.now();
    });

    watcherChild.on('exit', () => {
      watcherChild = null;
      if (!isStoppingHelperIntentionally && shouldWatcherHelperRun()) {
        scheduleHelperRestart('process exited');
      }
    });

    watcherChild.on('error', (err) => {
      watcherChild = null;
      if (!isStoppingHelperIntentionally && shouldWatcherHelperRun()) {
        scheduleHelperRestart(`spawn error: ${err.message}`);
      }
    });

    if (watcherWatchdogTimer) {
      clearInterval(watcherWatchdogTimer);
    }
    watcherWatchdogTimer = setInterval(() => {
      if (!shouldWatcherHelperRun()) {
        stopForegroundWatcherHelper();
        return;
      }
      if (
        watcherChild &&
        Date.now() - lastHelperResponseAt > WATCHER_HEARTBEAT_TIMEOUT_MS
      ) {
        scheduleHelperRestart('heartbeat timeout > 5s');
      }
    }, 1000);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    scheduleHelperRestart(`startup exception: ${msg}`);
  }
}

function registerIpcHandlers(): void {
  ipcMain.on(
    'buddy:set-ignore-mouse-events',
    (event, ignore: boolean, forward?: boolean | { forward?: boolean }) => {
      const win = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
      if (!win || win.isDestroyed()) return;

      const shouldForward =
        typeof forward === 'boolean' ? forward : (forward?.forward ?? true);

      if (ignore) {
        win.setIgnoreMouseEvents(true, { forward: shouldForward });
      } else {
        win.setIgnoreMouseEvents(false);
      }
    }
  );

  /**
   * Stage P8: Syncs session status, App Rules, and Smart Activation targets.
   * Keeps the low-CPU watcher running whenever either a focus session is active
   * OR Smart Activation is enabled with at least 1 smart target.
   */
  ipcMain.on(
    'buddy:sync-watcher-state',
    (
      _event,
      payload: {
        isFocusing: boolean;
        isSessionActive?: boolean;
        rules: WatcherAppRule[];
        smartActivationEnabled?: boolean;
        smartTargets?: WatcherSmartTarget[];
      }
    ) => {
      const wasRunningHelper = shouldWatcherHelperRun();
      isFocusSessionRunning = Boolean(payload?.isFocusing);
      isSessionActive =
        typeof payload?.isSessionActive === 'boolean'
          ? payload.isSessionActive
          : isFocusSessionRunning;

      if (typeof payload?.smartActivationEnabled === 'boolean') {
        isSmartActivationEnabled = payload.smartActivationEnabled;
      }
      if (Array.isArray(payload?.smartTargets)) {
        watchedSmartTargets = payload.smartTargets.map((st) => {
          if (st.kind === 'app') {
            const aliases =
              st.processNames && st.processNames.length > 0
                ? st.processNames
                : buildProcessAliases(
                    st.targetPathOrUrl || st.processName || st.tagName
                  );
            return {
              ...st,
              processName: aliases[0],
              processNames: aliases,
            };
          }
          return st;
        });
      }

      const incomingRules = Array.isArray(payload?.rules) ? payload.rules : [];
      watchedRules = incomingRules.map((rule) => {
        const kind = resolveRuleKindInMain(rule);
        if (kind === 'app') {
          const aliases =
            rule.processNames && rule.processNames.length > 0
              ? rule.processNames
              : buildProcessAliases(
                  rule.domainOrProcess || rule.processName || rule.targetName
                );
          return {
            ...rule,
            kind: 'app',
            processName: aliases[0],
            processNames: aliases,
          };
        }
        return { ...rule, kind };
      });

      if (shouldWatcherHelperRun()) {
        if (!wasRunningHelper) {
          helperRestartTimestamps = [];
        }
        startForegroundWatcherHelper();

        if (latestForegroundWindow) {
          evaluateForegroundWindow(latestForegroundWindow, performance.now());
        }
      } else {
        stopForegroundWatcherHelper();
      }
    }
  );

  /**
   * Stage P8 Part B.3: Cancelling a Smart Activation countdown sets a 60-minute cooldown for that target.
   */
  ipcMain.on(
    'buddy:cancel-smart-activation',
    (_event, payload: { targetId: string }) => {
      const targetId = payload?.targetId;
      if (targetId) {
        smartCancelCooldownUntilMap.set(
          targetId,
          Date.now() + SMART_CANCEL_COOLDOWN_MS
        );
      }
    }
  );

  ipcMain.on(
    'buddy:notify-intervention-state',
    (_event, payload: { active: boolean }) => {
      const wasActive = isInterventionOverlayActive;
      isInterventionOverlayActive = Boolean(payload?.active);

      if (wasActive && !isInterventionOverlayActive && lastCapturedMatch) {
        applyCooldownForMatch(lastCapturedMatch);
      }
    }
  );

  ipcMain.on('buddy:quit-app', () => {
    isAppQuitting = true;
    stopForegroundWatcherHelper();
    app.quit();
  });

  /**
   * Stage P8 Part B.4: Electron login item settings ("Start Study Buddy when I sign in").
   */
  ipcMain.handle('buddy:get-login-item', (): boolean => {
    try {
      return Boolean(app.getLoginItemSettings().openAtLogin);
    } catch {
      return false;
    }
  });

  ipcMain.handle(
    'buddy:set-login-item',
    (_event, payload: { enabled: boolean }): boolean => {
      try {
        const openAtLogin = Boolean(payload?.enabled);
        app.setLoginItemSettings({ openAtLogin });
        return Boolean(app.getLoginItemSettings().openAtLogin);
      } catch {
        return false;
      }
    }
  );

  ipcMain.handle(
    'buddy:inspect-app-path',
    async (
      _event,
      payload: { filePath: string }
    ): Promise<InspectedAppTarget> => {
      return inspectDesktopAppPath(payload?.filePath ?? '');
    }
  );

  ipcMain.handle(
    'buddy:browse-desktop-app',
    async (event): Promise<InspectedAppTarget> => {
      const win = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
      if (!win || win.isDestroyed()) {
        return {
          canceled: true,
          filePath: '',
          displayName: '',
          processName: '',
          processNames: [],
        };
      }

      win.setIgnoreMouseEvents(false);

      if (process.platform === 'darwin') {
        const { canceled, filePaths } = await dialog.showOpenDialog(win, {
          title: 'Select Desktop Application (.app)',
          defaultPath: '/Applications',
          properties: ['openFile', 'openDirectory', 'treatPackageAsDirectory'],
          filters: [{ name: 'Applications', extensions: ['app'] }],
        });
        if (canceled || filePaths.length === 0) {
          return {
            canceled: true,
            filePath: '',
            displayName: '',
            processName: '',
            processNames: [],
          };
        }
        return inspectDesktopAppPath(filePaths[0]);
      }

      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: 'Select Desktop Application or Shortcut',
        properties: ['openFile'],
        filters: [
          {
            name: 'Applications & Shortcuts',
            extensions: ['exe', 'lnk', 'appimage'],
          },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (canceled || filePaths.length === 0) {
        return {
          canceled: true,
          filePath: '',
          displayName: '',
          processName: '',
          processNames: [],
        };
      }

      return inspectDesktopAppPath(filePaths[0]);
    }
  );

  ipcMain.handle(
    'buddy:list-open-apps',
    async (): Promise<RunningOpenAppItem[]> => {
      return listCurrentlyOpenApps();
    }
  );

  ipcMain.handle(
    'buddy:capture-foreground-app',
    async (): Promise<RunningOpenAppItem | null> => {
      return queryCurrentForegroundAppOnce();
    }
  );

  ipcMain.handle(
    'buddy:close-or-minimize-target',
    async (): Promise<{ ok: boolean }> => {
      const captured = lastCapturedMatch;
      if (!captured) {
        return { ok: false };
      }

      const procLower = captured.rawProcessName.toLowerCase();
      if (
        captured.pid === process.pid ||
        procLower === 'electron' ||
        procLower.includes('study-buddy') ||
        procLower.includes('study buddy') ||
        captured.bundleId === 'tech.ericarieldelapaz.studybuddy'
      ) {
        return { ok: false };
      }

      applyCooldownForMatch(captured);

      try {
        if (process.platform === 'win32' && captured.pid > 0) {
          const psScript = `
            Add-Type @"
              using System;
              using System.Runtime.InteropServices;
              public class Win32WindowAction {
                [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
              }
"@
            $targetPid = [int]$env:SB_TARGET_PID
            $mode = $env:SB_TARGET_MODE
            $p = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
            if ($null -ne $p -and $p.MainWindowHandle -ne [IntPtr]::Zero) {
              if ($mode -eq "website") {
                [void][Win32WindowAction]::ShowWindow($p.MainWindowHandle, 6)
              } else {
                [void]$p.CloseMainWindow()
                Start-Sleep -Seconds 3
                $stillRunning = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
                if ($null -ne $stillRunning -and $stillRunning.MainWindowHandle -ne [IntPtr]::Zero) {
                  [void]$stillRunning.CloseMainWindow()
                }
              }
            }
          `;
          await execFileAsync(
            'powershell.exe',
            [
              '-NoProfile',
              '-NonInteractive',
              '-WindowStyle',
              'Hidden',
              '-Command',
              psScript,
            ],
            {
              timeout: 5500,
              windowsHide: true,
              env: {
                ...process.env,
                SB_TARGET_PID: String(captured.pid),
                SB_TARGET_MODE: captured.resolvedKind,
              },
            }
          );
          return { ok: true };
        }

        if (process.platform === 'darwin') {
          const osaScript = `
            on run argv
              set targetAppName to item 1 of argv
              set targetBundleId to item 2 of argv
              set targetMode to item 3 of argv
              if targetAppName is "Electron" or targetAppName is "Study Buddy" or targetBundleId is "tech.ericarieldelapaz.studybuddy" then
                return
              end if
              if targetMode is "app" then
                if targetBundleId is not "" then
                  try
                    tell application id targetBundleId to quit
                    return
                  end try
                end if
                if targetAppName is not "" then
                  try
                    tell application targetAppName to quit
                  end try
                end if
              else
                try
                  tell application "System Events"
                    if targetBundleId is not "" then
                      set targetProc to first application process whose bundle identifier is targetBundleId
                    else
                      set targetProc to process targetAppName
                    end if
                    if (count of windows of targetProc) > 0 then
                      set value of attribute "AXMinimized" of window 1 of targetProc to true
                    end if
                  end tell
                on error
                  if targetBundleId is not "" then
                    try
                      tell application id targetBundleId
                        if (count of windows) > 0 then
                          set miniaturized of front window to true
                        end if
                      end tell
                    end try
                  end if
                end try
              end if
            end run
          `;
          await execFileAsync(
            'osascript',
            [
              '-e',
              osaScript,
              captured.rawProcessName,
              captured.bundleId,
              captured.resolvedKind,
            ],
            { timeout: 3000 }
          );
          return { ok: true };
        }

        return { ok: false };
      } catch {
        return { ok: false };
      }
    }
  );

  ipcMain.handle(
    'buddy:export-markdown',
    async (
      event,
      payload: { content: string; filename: string }
    ): Promise<{ canceled: boolean; filePath?: string; error?: string }> => {
      const win = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
      if (!win || win.isDestroyed()) {
        return { canceled: true, error: 'Main window is unavailable' };
      }

      const normalizedFilename = payload.filename?.trim()
        ? payload.filename.endsWith('.md')
          ? payload.filename
          : `${payload.filename}.md`
        : 'study-notepad.md';

      try {
        win.setIgnoreMouseEvents(false);

        const { canceled, filePath } = await dialog.showSaveDialog(win, {
          title: 'Export Notepad as Markdown',
          defaultPath: join(app.getPath('documents'), normalizedFilename),
          buttonLabel: 'Export .md',
          filters: [
            { name: 'Markdown Document', extensions: ['md', 'markdown'] },
            { name: 'Plain Text', extensions: ['txt'] },
          ],
        });

        if (canceled || !filePath) {
          return { canceled: true };
        }

        await writeFile(filePath, payload.content ?? '', 'utf-8');
        return { canceled: false, filePath };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown file write error';
        return { canceled: true, error: message };
      }
    }
  );

  ipcMain.handle('buddy:open-note', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
    if (!win || win.isDestroyed()) return { canceled: true };

    win.setIgnoreMouseEvents(false);

    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Open Markdown or Text Note',
      properties: ['openFile'],
      filters: [{ name: 'Notes', extensions: ['md', 'markdown', 'txt'] }],
    });

    if (!canceled && filePaths.length > 0) {
      const content = await readFile(filePaths[0], 'utf-8');
      return {
        canceled: false,
        filePath: filePaths[0],
        content,
      };
    }

    return { canceled: true };
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  screen.on('display-added', () => assertAlwaysOnTop(mainWindow));
  screen.on('display-removed', () => assertAlwaysOnTop(mainWindow));
  screen.on('display-metrics-changed', () => assertAlwaysOnTop(mainWindow));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else if (mainWindow) {
      mainWindow.show();
      assertAlwaysOnTop(mainWindow);
    }
  });
});

app.on('before-quit', () => {
  isAppQuitting = true;
  stopForegroundWatcherHelper();
});

app.on('will-quit', () => {
  isAppQuitting = true;
  stopForegroundWatcherHelper();
});

app.on('window-all-closed', () => {
  isAppQuitting = true;
  stopForegroundWatcherHelper();
  app.quit();
});

process.on('exit', () => {
  stopForegroundWatcherHelper();
});
