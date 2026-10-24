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

const IS_DEV =
  Boolean(process.env['ELECTRON_RENDERER_URL']) || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let isAppQuitting = false;

// Stage P6 Long-Lived Foreground Watcher State
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

const WATCHER_HEARTBEAT_TIMEOUT_MS = 5000; // 5 seconds
const MAX_RESTARTS_PER_MINUTE = 3;

// Maps ruleId and normalized targetKey -> timestamp (ms) when cooldown expires
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

function normalizeProcessBase(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\.(exe|app)$/i, '');
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
 * Evaluates a foreground window change against the user's active App Rules.
 * Runs immediately when a foreground change line arrives from the helper,
 * when a focus session starts, or when the rules list changes.
 */
function evaluateForegroundWindow(
  fg: ForegroundWindowInfo,
  changeDetectedPerfMs: number
): void {
  if (
    !isFocusSessionRunning ||
    isInterventionOverlayActive ||
    watchedRules.length === 0
  ) {
    return;
  }

  if (!fg || !fg.processName) return;

  // Never match Study Buddy / Electron itself
  if (
    fg.pid === process.pid ||
    fg.processName.includes('electron') ||
    fg.processName.includes('study-buddy') ||
    fg.processName.includes('study buddy') ||
    fg.bundleId === 'tech.ericarieldelapaz.studybuddy'
  ) {
    return;
  }

  const fgBaseProcess = normalizeProcessBase(fg.processName);
  const isBrowser = KNOWN_BROWSERS.some(
    (b) => fgBaseProcess === b || fgBaseProcess.includes(b)
  );

  for (const rule of watchedRules) {
    if (!rule.enabled) continue;

    const resolvedKind: 'app' | 'website' =
      rule.kind ??
      (/\.(exe|app)$/i.test(rule.domainOrProcess.trim()) ? 'app' : 'website');

    const cleanTagName =
      rule.targetName.replace(/\s*\(.*?\)\s*/g, '').trim() || rule.targetName;
    const tagLower = cleanTagName.toLowerCase();
    const domainOrProcBase = normalizeProcessBase(rule.domainOrProcess)
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('.')[0];

    let isMatch = false;

    if (resolvedKind === 'app') {
      isMatch =
        fgBaseProcess === tagLower ||
        fgBaseProcess === domainOrProcBase ||
        (domainOrProcBase.length > 2 &&
          fgBaseProcess.includes(domainOrProcBase)) ||
        (fg.bundleId.length > 0 &&
          fg.bundleId.toLowerCase().includes(domainOrProcBase));
    } else if (resolvedKind === 'website' && isBrowser && fg.windowTitle) {
      // Browser window title matching (matches the active tab title)
      isMatch =
        fg.windowTitle.includes(tagLower) ||
        (domainOrProcBase.length > 2 &&
          fg.windowTitle.includes(domainOrProcBase));
    }

    if (isMatch) {
      const now = Date.now();
      const cooldownUntil = Math.max(
        cooldownUntilMap.get(rule.id) ?? 0,
        cooldownUntilMap.get(tagLower) ?? 0
      );

      if (now < cooldownUntil) {
        continue;
      }

      lastCapturedMatch = {
        ruleId: rule.id,
        targetKey: tagLower,
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
 * Builds the static Windows PowerShell script that compiles the Win32 helper ONCE,
 * checks the foreground window every 300 ms, and prints a JSON line ONLY on change
 * (plus a lightweight heartbeat every ~1.8s).
 */
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

/**
 * Builds the static macOS JXA (`osascript -l JavaScript`) script that loops every 300 ms
 * and writes one unbuffered UTF-8 JSON line to stdout ONLY when the frontmost app or its
 * front window title changes (plus a heartbeat every ~1.8s).
 */
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
    // Do not loop tightly on an Automation permission error
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
            processName: rawProc.toLowerCase(),
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

/**
 * Stops the long-lived foreground watcher process and clears the watchdog timer.
 * Guarantees no orphan powershell.exe or osascript processes remain.
 */
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

/**
 * Starts the single long-lived foreground watcher process on Windows or macOS.
 */
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

    // 5-second heartbeat watchdog
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

  /**
   * Stage P6: Starts/stops the single long-lived helper when a session starts/ends,
   * and runs an immediate check when a session starts or when the rules list changes.
   */
  ipcMain.on(
    'buddy:sync-watcher-state',
    (
      _event,
      payload: { isFocusing: boolean; rules: WatcherAppRule[] }
    ) => {
      const wasFocusing = isFocusSessionRunning;
      isFocusSessionRunning = Boolean(payload?.isFocusing);
      watchedRules = Array.isArray(payload?.rules) ? payload.rules : [];

      if (isFocusSessionRunning) {
        if (!wasFocusing) {
          helperRestartTimestamps = [];
        }
        startForegroundWatcherHelper();

        // Run an immediate check against the latest known foreground window
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
