// src/main/index.ts
import { app, shell, BrowserWindow, ipcMain, screen, dialog } from 'electron';
import { join } from 'path';
import { writeFile, readFile } from 'fs/promises';
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

interface WatcherAppRule {
  id: string;
  kind?: 'website' | 'app';
  targetName: string;
  domainOrProcess: string;
  processName?: string;
  bundleId?: string;
  strictBlock: boolean;
  enabled: boolean;
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
  bundleId?: string;
  isLauncherWarning?: boolean;
  warningMessage?: string;
}

interface RunningOpenAppItem {
  pid: number;
  processName: string;
  rawProcessName: string;
  bundleId?: string;
  windowTitle: string;
}

const IS_DEV =
  Boolean(process.env['ELECTRON_RENDERER_URL']) || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let isAppQuitting = false;

// Stage P6 / P7 Watcher State
let isFocusSessionRunning = false;
let isInterventionOverlayActive = false;
let watchedRules: WatcherAppRule[] = [];
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

const cooldownUntilMap = new Map<string, number>();
const NON_STRICT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes for default rules
const STRICT_COOLDOWN_MS = 30 * 1000; // 30 seconds after dismissal for strict rules

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

/**
 * Stage P7: Shared normalization helper for desktop app targets.
 * - trims; strips surrounding single or double quotes;
 * - if it contains / or \, takes the last path segment (file or .app folder name);
 * - strips a trailing .exe, .app, .lnk, .dmg, .appimage (case-insensitive);
 * - lowercases; collapses inner whitespace; keeps parentheses if part of the file name.
 */
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

function applyCooldownForMatch(match: CapturedMatchTarget): void {
  const duration = match.strictBlock
    ? STRICT_COOLDOWN_MS
    : NON_STRICT_COOLDOWN_MS;
  const expiresAt = Date.now() + duration;
  cooldownUntilMap.set(match.ruleId, expiresAt);
  cooldownUntilMap.set(match.targetKey, expiresAt);
}

/**
 * Stage P7: Evaluates a foreground window change against active App Rules.
 * - For 'app' rules: uses ONLY normalized processName, normalized tagName, macOS bundleId,
 *   safe helper prefix ("discord helper"), or Windows ApplicationFrameHost window title.
 * - For 'website' rules: matches known browsers whose active window title contains the tag or domain keyword.
 */
function evaluateForegroundWindow(
  fg: ForegroundWindowInfo,
  changeDetectedPerfMs: number
): void {
  if (!fg || !fg.processName) return;

  const fgProc = normalizeAppTarget(fg.rawProcessName || fg.processName).processName;
  const fgBundleLower = (fg.bundleId ?? '').trim().toLowerCase();

  // Never match Study Buddy / Electron itself
  if (
    fg.pid === process.pid ||
    fgProc === 'electron' ||
    fgProc === 'study-buddy' ||
    fgProc === 'study buddy' ||
    fgBundleLower === 'tech.ericarieldelapaz.studybuddy'
  ) {
    return;
  }

  if (!isFocusSessionRunning) {
    if (IS_DEV) {
      console.info(
        `[watcher] fg="${fgProc}" | skipped (focus session is not running)`
      );
    }
    return;
  }

  if (isInterventionOverlayActive) {
    if (IS_DEV) {
      console.info(
        `[watcher] fg="${fgProc}" | skipped (intervention overlay already active)`
      );
    }
    return;
  }

  if (watchedRules.length === 0) {
    if (IS_DEV) {
      console.info(`[watcher] fg="${fgProc}" | no rules configured`);
    }
    return;
  }

  const isBrowser = KNOWN_BROWSERS.some(
    (b) => fgProc === b || fgProc.startsWith(`${b} `)
  );

  for (const rule of watchedRules) {
    const resolvedKind = resolveRuleKindInMain(rule);
    const cleanTagName =
      rule.targetName.replace(/\s*\(.*?\)\s*/g, '').trim() || rule.targetName;
    const normalizedTag = normalizeAppTagName(rule.targetName);

    if (!rule.enabled) {
      if (IS_DEV && resolvedKind === 'app') {
        const ruleProc =
          rule.processName ||
          normalizeAppTarget(rule.domainOrProcess).processName;
        console.info(
          `[watcher] rule="${rule.targetName}" (proc="${ruleProc}") vs fg="${fgProc}" -> no match (rule disabled)`
        );
      }
      continue;
    }

    let isMatch = false;
    let matchReason = 'process name mismatch';

    if (resolvedKind === 'app') {
      const ruleProc = (
        rule.processName ||
        normalizeAppTarget(rule.domainOrProcess).processName ||
        normalizedTag
      )
        .toLowerCase()
        .trim();
      const ruleBundle = (rule.bundleId ?? '').trim().toLowerCase();

      if (ruleBundle && fgBundleLower && fgBundleLower === ruleBundle) {
        isMatch = true;
        matchReason = `bundleId="${ruleBundle}"`;
      } else if (ruleProc && fgProc === ruleProc) {
        isMatch = true;
        matchReason = `exact processName="${ruleProc}"`;
      } else if (normalizedTag && fgProc === normalizedTag) {
        isMatch = true;
        matchReason = `exact tagName="${normalizedTag}"`;
      } else if (
        ruleProc.length >= 3 &&
        (fgProc.startsWith(`${ruleProc} `) ||
          fgProc.startsWith(`${ruleProc}-`) ||
          fgProc.startsWith(`${ruleProc}_`) ||
          fgProc.startsWith(`${ruleProc}helper`))
      ) {
        isMatch = true;
        matchReason = `helper process prefix="${ruleProc}"`;
      } else if (
        fgProc === 'applicationframehost' &&
        fg.windowTitle &&
        ((ruleProc.length >= 2 && fg.windowTitle.includes(ruleProc)) ||
          (normalizedTag.length >= 2 && fg.windowTitle.includes(normalizedTag)))
      ) {
        isMatch = true;
        matchReason = `UWP ApplicationFrameHost window title`;
      }

      if (IS_DEV) {
        console.info(
          `[watcher] app rule="${rule.targetName}" (normalized proc="${ruleProc}"${
            ruleBundle ? `, bundle="${ruleBundle}"` : ''
          }) vs fg="${fgProc}"${
            fgBundleLower ? ` (bundle="${fgBundleLower}")` : ''
          } -> ${isMatch ? `MATCH (${matchReason})` : `no match (${matchReason})`}`
        );
      }
    } else if (resolvedKind === 'website' && isBrowser && fg.windowTitle) {
      const domainBase = rule.domainOrProcess
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('.')[0];

      isMatch =
        (normalizedTag.length > 0 && fg.windowTitle.includes(normalizedTag)) ||
        (domainBase.length > 2 && fg.windowTitle.includes(domainBase));
    }

    if (isMatch) {
      const now = Date.now();
      const targetKey =
        resolvedKind === 'app'
          ? rule.processName ||
            normalizeAppTarget(rule.domainOrProcess).processName ||
            normalizedTag
          : normalizedTag;

      const cooldownUntil = Math.max(
        cooldownUntilMap.get(rule.id) ?? 0,
        cooldownUntilMap.get(targetKey) ?? 0
      );

      if (now < cooldownUntil) {
        if (IS_DEV && resolvedKind === 'app') {
          const secsLeft = Math.ceil((cooldownUntil - now) / 1000);
          console.info(
            `[watcher] app rule="${rule.targetName}" matched fg="${fgProc}", but on cooldown (${secsLeft}s remaining)`
          );
        }
        continue;
      }

      lastCapturedMatch = {
        ruleId: rule.id,
        targetKey,
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
}

/**
 * Stage P7: Inspects an executable path, Windows .lnk shortcut, or macOS .app bundle
 * to extract the true processName, displayName, bundleId, and launcher warning.
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
    };
  }

  let resolvedPath = cleanedPath;
  let bundleId: string | undefined;
  let displayName = '';
  let processName = '';

  // 1. Windows .lnk shortcut resolution via Electron's shell.readShortcutLink
  if (process.platform === 'win32' && /\.lnk$/i.test(cleanedPath)) {
    try {
      const shortcut = shell.readShortcutLink(cleanedPath);
      if (shortcut && shortcut.target) {
        resolvedPath = shortcut.target;
      }
    } catch {
      // Fall back to the .lnk file name itself if shortcut cannot be read
    }
  }

  // 2. macOS .app bundle inspection via Contents/Info.plist
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
      // Fallback: parse XML Info.plist or use .app folder name
      try {
        const xml = await readFile(plistPath, 'utf-8');
        const bundleMatch = xml.match(
          /<key>CFBundleIdentifier<\/key>\s*<string>([^<]+)<\/string>/
        );
        const execMatch = xml.match(
          /<key>CFBundleExecutable<\/key>\s*<string>([^<]+)<\/string>/
        );
        const nameMatch = xml.match(
          /<key>CFBundleName<\/key>\s*<string>([^<]+)<\/string>/
        );
        bundleId = bundleMatch?.[1]?.trim() || undefined;
        const execName =
          execMatch?.[1]?.trim() || nameMatch?.[1]?.trim() || appPath;
        processName = normalizeAppTarget(execName).processName;
        displayName = nameMatch?.[1]?.trim() || processName;
      } catch {
        processName = normalizeAppTarget(appPath).processName;
        displayName = processName;
      }
    }
  } else {
    processName = normalizeAppTarget(resolvedPath).processName;
    // Derive a clean title-cased display name from the shortcut or executable filename
    const rawSegment =
      cleanedPath
        .replace(/[\\/]+$/, '')
        .split(/[\\/]+/)
        .pop() ?? processName;
    displayName = rawSegment.replace(/\.(exe|app|lnk|dmg|appimage)$/i, '');
  }

  const isLauncher =
    isLikelyLauncherExecutable(resolvedPath) ||
    isLikelyLauncherExecutable(processName);

  return {
    canceled: false,
    filePath: resolvedPath,
    displayName: displayName || processName,
    processName,
    bundleId,
    isLauncherWarning: isLauncher,
    warningMessage: isLauncher
      ? "This looks like a launcher. Open the app and use 'Choose from open apps' instead."
      : undefined,
  };
}

/**
 * Stage P7: Returns a list of currently running desktop applications with visible windows.
 * Results are kept in memory only.
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
        if (!rawProc) continue;
        const norm = normalizeAppTarget(rawProc).processName;
        if (
          !norm ||
          norm === 'electron' ||
          norm === 'study-buddy' ||
          norm === 'study buddy' ||
          norm === 'applicationframehost' ||
          seen.has(norm)
        ) {
          continue;
        }
        seen.add(norm);
        results.push({
          pid: Number(item.Id) || 0,
          processName: norm,
          rawProcessName: rawProc,
          windowTitle: (item.MainWindowTitle ?? '').trim(),
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
        const norm = normalizeAppTarget(rawProc).processName;
        const bundleId = (item.bundleId ?? '').trim() || undefined;
        if (
          !norm ||
          norm === 'electron' ||
          norm === 'study-buddy' ||
          norm === 'study buddy' ||
          bundleId === 'tech.ericarieldelapaz.studybuddy' ||
          seen.has(norm)
        ) {
          continue;
        }
        seen.add(norm);
        results.push({
          pid: Number(item.pid) || 0,
          processName: norm,
          rawProcessName: rawProc,
          bundleId,
          windowTitle: (item.windowTitle ?? '').trim(),
        });
      }
      return results;
    }
  } catch {
    return [];
  }
  return [];
}

/**
 * Stage P7: One-shot foreground app read for "Add the app I am in now".
 */
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
      return {
        pid: latestForegroundWindow.pid,
        processName: norm,
        rawProcessName: latestForegroundWindow.rawProcessName,
        bundleId: latestForegroundWindow.bundleId || undefined,
        windowTitle: latestForegroundWindow.windowTitle,
      };
    }
  }

  try {
    if (process.platform === 'win32') {
      const psScript = `
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          using System.Text;
          public class Win32FgOnce {
            [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
            [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
            [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
          }
"@
        $h = [Win32FgOnce]::GetForegroundWindow()
        $sb = New-Object System.Text.StringBuilder 512
        [void][Win32FgOnce]::GetWindowText($h, $sb, 512)
        $pidOut = [uint32]0
        [void][Win32FgOnce]::GetWindowThreadProcessId($h, [ref]$pidOut)
        if ($pidOut -gt 0) {
          $p = Get-Process -Id $pidOut -ErrorAction SilentlyContinue
          if ($null -ne $p) {
            $obj = @{
              pid = [int]$pidOut
              rawProcessName = [string]$p.ProcessName
              windowTitle = [string]$sb.ToString()
            }
            Write-Output ($obj | ConvertTo-Json -Compress)
          }
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
        { timeout: 2000, windowsHide: true }
      );
      const trimmed = stdout.trim();
      if (!trimmed) return null;
      const parsed = JSON.parse(trimmed) as {
        pid?: number;
        rawProcessName?: string;
        windowTitle?: string;
      };
      const rawProc = (parsed.rawProcessName ?? '').trim();
      const norm = normalizeAppTarget(rawProc).processName;
      if (!norm) return null;
      return {
        pid: Number(parsed.pid) || 0,
        processName: norm,
        rawProcessName: rawProc,
        windowTitle: (parsed.windowTitle ?? '').trim(),
      };
    }

    if (process.platform === 'darwin') {
      const jxa = `
        var se = Application('System Events');
        var front = se.applicationProcesses.whose({ frontmost: true });
        if (front.length > 0) {
          var p = front[0];
          var name = "";
          var pid = 0;
          var bundleId = "";
          var winTitle = "";
          try { name = p.name() || ""; } catch (e) {}
          try { pid = p.unixId() || 0; } catch (e) {}
          try { bundleId = p.bundleIdentifier() || ""; } catch (e) {}
          try { if (p.windows.length > 0) winTitle = p.windows[0].name() || ""; } catch (e) {}
          JSON.stringify({ pid: pid, rawProcessName: name, bundleId: bundleId, windowTitle: winTitle });
        } else {
          "";
        }
      `;
      const { stdout } = await execFileAsync(
        'osascript',
        ['-l', 'JavaScript', '-e', jxa],
        { timeout: 2000 }
      );
      const trimmed = stdout.trim();
      if (!trimmed) return null;
      const parsed = JSON.parse(trimmed) as {
        pid?: number;
        rawProcessName?: string;
        bundleId?: string;
        windowTitle?: string;
      };
      const rawProc = (parsed.rawProcessName ?? '').trim();
      const norm = normalizeAppTarget(rawProc).processName;
      if (!norm) return null;
      return {
        pid: Number(parsed.pid) || 0,
        processName: norm,
        rawProcessName: rawProc,
        bundleId: (parsed.bundleId ?? '').trim() || undefined,
        windowTitle: (parsed.windowTitle ?? '').trim(),
      };
    }
  } catch {
    return null;
  }
  return null;
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

  if (!isFocusSessionRunning || isAppQuitting) {
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
  if (watcherChild || !isFocusSessionRunning || isAppQuitting) {
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
      if (
        !isStoppingHelperIntentionally &&
        isFocusSessionRunning &&
        !isAppQuitting
      ) {
        scheduleHelperRestart('process exited');
      }
    });

    watcherChild.on('error', (err) => {
      watcherChild = null;
      if (
        !isStoppingHelperIntentionally &&
        isFocusSessionRunning &&
        !isAppQuitting
      ) {
        scheduleHelperRestart(`spawn error: ${err.message}`);
      }
    });

    if (watcherWatchdogTimer) {
      clearInterval(watcherWatchdogTimer);
    }
    watcherWatchdogTimer = setInterval(() => {
      if (!isFocusSessionRunning || isAppQuitting) {
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

  ipcMain.on(
    'buddy:sync-watcher-state',
    (
      _event,
      payload: { isFocusing: boolean; rules: WatcherAppRule[] }
    ) => {
      const wasFocusing = isFocusSessionRunning;
      isFocusSessionRunning = Boolean(payload?.isFocusing);

      // Compute normalized processName for any rule missing it
      const incomingRules = Array.isArray(payload?.rules) ? payload.rules : [];
      watchedRules = incomingRules.map((rule) => {
        const kind = resolveRuleKindInMain(rule);
        if (kind === 'app' && !rule.processName) {
          return {
            ...rule,
            kind: 'app',
            processName: normalizeAppTarget(rule.domainOrProcess).processName,
          };
        }
        return { ...rule, kind };
      });

      if (isFocusSessionRunning) {
        if (!wasFocusing) {
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
   * Stage P7: Inspects a file path (from webUtils.getPathForFile or Browse).
   */
  ipcMain.handle(
    'buddy:inspect-app-path',
    async (
      _event,
      payload: { filePath: string }
    ): Promise<InspectedAppTarget> => {
      return inspectDesktopAppPath(payload?.filePath ?? '');
    }
  );

  /**
   * Stage P7: Native Browse dialog for selecting a desktop application
   * (supports .app directory bundles in /Applications on macOS and .exe/.lnk on Windows).
   */
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
        };
      }

      return inspectDesktopAppPath(filePaths[0]);
    }
  );

  /**
   * Stage P7: Returns currently running desktop apps with a visible window.
   */
  ipcMain.handle(
    'buddy:list-open-apps',
    async (): Promise<RunningOpenAppItem[]> => {
      return listCurrentlyOpenApps();
    }
  );

  /**
   * Stage P7: Captures the active foreground app (used after the 3s countdown in "Add the app I am in now").
   */
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
