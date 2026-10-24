// src/main/index.ts
import { app, shell, BrowserWindow, ipcMain, screen, dialog } from 'electron';
import { join } from 'path';
import { writeFile, readFile } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type OverlayTriggerType = 'hydration' | 'bathroom' | 'intervention';

export interface OverlayTriggerPayload {
  durationSeconds?: number;
  targetAppOrSite?: string;
  targetKind?: 'website' | 'app';
  strictMode?: boolean;
  message?: string;
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

let mainWindow: BrowserWindow | null = null;

// Stage P1 Watcher & Cooldown State
let isFocusSessionRunning = false;
let isInterventionOverlayActive = false;
let watchedRules: WatcherAppRule[] = [];
let lastCapturedMatch: CapturedMatchTarget | null = null;

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

  // Stage P2: OS-level close requests (Alt+F4, Cmd+Q) really quit the app.
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

/**
 * Queries the active foreground window using ONLY built-in OS tools:
 * - Windows: PowerShell Win32 API (returns PID, ProcessName, and WindowTitle)
 * - macOS: osascript System Events (returns unix id, process name, bundle identifier, and front window title)
 */
async function getForegroundWindowInfo(): Promise<ForegroundWindowInfo | null> {
  try {
    if (process.platform === 'win32') {
      const psScript = `
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          using System.Text;
          public class Win32Fg {
            [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
            [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
            [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
          }
"@
        $h = [Win32Fg]::GetForegroundWindow()
        $sb = New-Object System.Text.StringBuilder 512
        [void][Win32Fg]::GetWindowText($h, $sb, 512)
        $pidOut = [uint32]0
        [void][Win32Fg]::GetWindowThreadProcessId($h, [ref]$pidOut)
        if ($pidOut -gt 0) {
          $p = Get-Process -Id $pidOut -ErrorAction SilentlyContinue
          if ($null -ne $p) {
            Write-Output "$pidOut|$($p.ProcessName)||$($sb.ToString())"
          }
        }
      `;
      const { stdout } = await execFileAsync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', psScript],
        { timeout: 1800 }
      );
      const trimmed = stdout.trim();
      if (!trimmed) return null;
      const [pidStr = '0', rawProc = '', bundleId = '', ...titleParts] =
        trimmed.split('|');
      const pid = parseInt(pidStr, 10) || 0;
      const title = titleParts.join('|');
      return {
        pid,
        rawProcessName: rawProc.trim(),
        bundleId: bundleId.trim(),
        processName: rawProc.trim().toLowerCase(),
        windowTitle: title.trim().toLowerCase(),
      };
    }

    if (process.platform === 'darwin') {
      const osaScript = `
        tell application "System Events"
          set frontApp to first application process whose frontmost is true
          set appPid to unix id of frontApp
          set appName to name of frontApp
          set appBundle to ""
          try
            set appBundle to bundle identifier of frontApp
          end try
          set winTitle to ""
          try
            set winTitle to name of front window of frontApp
          end try
          return (appPid as text) & "|" & appName & "|" & appBundle & "|" & winTitle
        end tell
      `;
      const { stdout } = await execFileAsync('osascript', ['-e', osaScript], {
        timeout: 1800,
      });
      const trimmed = stdout.trim();
      if (!trimmed) return null;
      const [pidStr = '0', rawProc = '', bundleId = '', ...titleParts] =
        trimmed.split('|');
      const pid = parseInt(pidStr, 10) || 0;
      const title = titleParts.join('|');
      return {
        pid,
        rawProcessName: rawProc.trim(),
        bundleId: bundleId.trim(),
        processName: rawProc.trim().toLowerCase(),
        windowTitle: title.trim().toLowerCase(),
      };
    }
  } catch {
    return null;
  }

  return null;
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
 * Polls the active foreground window every 2 seconds while a focus session is running.
 * Never dispatches a new intervention while an intervention overlay is already active.
 */
async function pollForegroundWindow(): Promise<void> {
  if (
    !isFocusSessionRunning ||
    isInterventionOverlayActive ||
    watchedRules.length === 0
  ) {
    return;
  }

  const fg = await getForegroundWindowInfo();
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
          fgBaseProcess.includes(domainOrProcBase));
    } else if (resolvedKind === 'website' && isBrowser && fg.windowTitle) {
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

      // Capture the exact matched foreground process & bundleId at match time
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

      dispatchOverlayTrigger('intervention', {
        targetAppOrSite: cleanTagName,
        targetKind: resolvedKind,
        strictMode: Boolean(rule.strictBlock),
      });
      break;
    }
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
      isFocusSessionRunning = Boolean(payload?.isFocusing);
      watchedRules = Array.isArray(payload?.rules) ? payload.rules : [];
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

  /**
   * Stage P2: Real Quit IPC handler for the Close window control.
   */
  ipcMain.on('buddy:quit-app', () => {
    app.quit();
  });

  /**
   * Stage P1: Acts ONLY on the captured foreground process from match time:
   * - Desktop app rule ("Close <app>"):
   *   - Windows: calls CloseMainWindow() on the captured PID. If still running after 3s,
   *     retries CloseMainWindow() once. Never force-kills. (Apps with unsaved changes
   *     show their "Save changes?" prompt; tray apps like Discord hide to the system tray.)
   *   - macOS: runs `tell application id "<bundle id>" to quit` via argv. Never force-kills.
   * - Website rule ("Minimize <site>"):
   *   - Windows: minimizes the captured browser window via ShowWindow(hWnd, SW_MINIMIZE).
   *   - macOS: minimizes the captured browser's front window by bundleId / appName (AXMinimized).
   */
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
                # 6 = SW_MINIMIZE (minimize captured browser window; never close it)
                [void][Win32WindowAction]::ShowWindow($p.MainWindowHandle, 6)
              } else {
                # Politely ask the desktop app to close its main window
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
            ['-NoProfile', '-NonInteractive', '-Command', psScript],
            {
              timeout: 5500,
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

  setInterval(() => {
    void pollForegroundWindow();
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else if (mainWindow) {
      mainWindow.show();
      assertAlwaysOnTop(mainWindow);
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
