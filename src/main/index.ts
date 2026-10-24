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
}

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

// Stage 8 Watcher & Cooldown State
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

app.on('before-quit', () => {
  isQuitting = true;
});

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

  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      if (!win.isDestroyed()) {
        win.webContents.send('buddy:minimize-to-companion');
        win.setIgnoreMouseEvents(true, { forward: true });
      }
    }
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

/**
 * Queries the active foreground window using ONLY the built-in OS tools:
 * - Windows: PowerShell Win32 API (returns PID, ProcessName, and WindowTitle)
 * - macOS: osascript System Events (returns unix id, process name, and front window title)
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
            Write-Output "$pidOut|$($p.ProcessName)|$($sb.ToString())"
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
      const [pidStr = '0', rawProc = '', ...titleParts] = trimmed.split('|');
      const pid = parseInt(pidStr, 10) || 0;
      const title = titleParts.join('|');
      return {
        pid,
        rawProcessName: rawProc.trim(),
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
          set winTitle to ""
          try
            set winTitle to name of front window of frontApp
          end try
          return (appPid as text) & "|" & appName & "|" & winTitle
        end tell
      `;
      const { stdout } = await execFileAsync('osascript', ['-e', osaScript], {
        timeout: 1800,
      });
      const trimmed = stdout.trim();
      if (!trimmed) return null;
      const [pidStr = '0', rawProc = '', ...titleParts] = trimmed.split('|');
      const pid = parseInt(pidStr, 10) || 0;
      const title = titleParts.join('|');
      return {
        pid,
        rawProcessName: rawProc.trim(),
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
    fg.processName.includes('study buddy')
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

      // Capture the exact matched foreground process so "Close <target>" acts only on it
      lastCapturedMatch = {
        ruleId: rule.id,
        targetKey: tagLower,
        targetName: cleanTagName,
        resolvedKind,
        strictBlock: Boolean(rule.strictBlock),
        pid: fg.pid,
        rawProcessName: fg.rawProcessName,
      };

      isInterventionOverlayActive = true;
      applyCooldownForMatch(lastCapturedMatch);

      dispatchOverlayTrigger('intervention', {
        targetAppOrSite: cleanTagName,
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

  /**
   * Tracks when an intervention overlay is shown or dismissed in the renderer.
   * When dismissed, starts a fresh 30-second cooldown for strict rules (or 5-minute
   * cooldown for non-strict rules) so strict overlays never immediately re-open.
   */
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
   * Safely closes or minimizes ONLY the captured process that triggered the match:
   * - Desktop app rule: politely asks the captured process to close its main window.
   * - Website rule: minimizes the captured browser window without closing it.
   * - Never interpolates user strings into scripts (uses env vars on Windows and argv on macOS).
   */
  ipcMain.handle(
    'buddy:close-or-minimize-target',
    async (): Promise<{ ok: boolean }> => {
      const captured = lastCapturedMatch;
      if (!captured) {
        return { ok: false };
      }

      // Guard: never close or minimize Study Buddy / Electron itself
      const procLower = captured.rawProcessName.toLowerCase();
      if (
        captured.pid === process.pid ||
        procLower === 'electron' ||
        procLower.includes('study-buddy') ||
        procLower.includes('study buddy')
      ) {
        return { ok: false };
      }

      // Refresh cooldown from the moment the user clicks Close
      applyCooldownForMatch(captured);

      try {
        if (process.platform === 'win32' && captured.pid > 0) {
          const psScript = `
            Add-Type @"
              using System;
              using System.Runtime.InteropServices;
              public class Win32WindowAction {
                [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
              }
"@
            $targetPid = [int]$env:SB_TARGET_PID
            $mode = $env:SB_TARGET_MODE
            $p = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
            if ($null -ne $p -and $p.MainWindowHandle -ne [IntPtr]::Zero) {
              if ($mode -eq "website") {
                # 6 = SW_MINIMIZE (minimize browser window; never close it)
                [void][Win32WindowAction]::ShowWindowAsync($p.MainWindowHandle, 6)
              } else {
                # Politely ask the desktop app to close its main window (no force-kill)
                [void]$p.CloseMainWindow()
              }
            }
          `;
          await execFileAsync(
            'powershell.exe',
            ['-NoProfile', '-NonInteractive', '-Command', psScript],
            {
              timeout: 2000,
              env: {
                ...process.env,
                SB_TARGET_PID: String(captured.pid),
                SB_TARGET_MODE: captured.resolvedKind,
              },
            }
          );
          return { ok: true };
        }

        if (process.platform === 'darwin' && captured.rawProcessName) {
          const osaScript = `
            on run argv
              set targetAppName to item 1 of argv
              set targetMode to item 2 of argv
              if targetAppName is "" or targetAppName is "Electron" or targetAppName is "Study Buddy" then
                return
              end if
              if targetMode is "app" then
                try
                  tell application targetAppName
                    if (count of windows) > 0 then
                      close front window
                    end if
                  end tell
                end try
              else
                try
                  tell application targetAppName
                    if (count of windows) > 0 then
                      set miniaturized of front window to true
                    end if
                  end tell
                on error
                  try
                    tell application "System Events"
                      tell process targetAppName
                        if (count of windows) > 0 then
                          set value of attribute "AXMinimized" of window 1 to true
                        end if
                      end tell
                    end tell
                  end try
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
              captured.resolvedKind,
            ],
            { timeout: 2000 }
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
