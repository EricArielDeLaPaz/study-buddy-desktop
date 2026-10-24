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
  processName: string;
  windowTitle: string;
}

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

// Stage 8 Watcher State
let isFocusSessionRunning = false;
let watchedRules: WatcherAppRule[] = [];
const nonStrictCooldowns = new Map<string, number>();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

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

/**
 * Re-asserts always-on-top hierarchy so Study Buddy stays above maximized
 * windows on both Windows and macOS.
 * Note: Exclusive fullscreen games (DirectX/Metal exclusive mode) and OS-level
 * security prompts (UAC / macOS Lock Screen) are rendered above 'screen-saver'
 * by the OS kernel.
 */
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

  // Re-assert always-on-top whenever another app takes focus
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
 * Queries the active foreground window using `get-windows` (if installed)
 * with a built-in native OS fallback (`powershell` on Windows, `osascript` on macOS).
 */
async function getForegroundWindowInfo(): Promise<ForegroundWindowInfo | null> {
  // 1. Try get-windows first
  try {
    const getWindowsModule = (await import('get-windows')) as {
      activeWindow?: () => Promise<
        | {
            title?: string;
            owner?: { name?: string; path?: string };
          }
        | undefined
      >;
    };
    if (typeof getWindowsModule.activeWindow === 'function') {
      const winInfo = await getWindowsModule.activeWindow();
      if (winInfo) {
        return {
          processName: (winInfo.owner?.name ?? '').toLowerCase(),
          windowTitle: (winInfo.title ?? '').toLowerCase(),
        };
      }
    }
  } catch {
    // Fall back to OS command below if get-windows is not available
  }

  // 2. Built-in OS Fallback
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
        $pidOut = 0
        [void][Win32Fg]::GetWindowThreadProcessId($h, [ref]$pidOut)
        $p = Get-Process -Id $pidOut -ErrorAction SilentlyContinue
        Write-Output "$($p.ProcessName)|$($sb.ToString())"
      `;
      const { stdout } = await execFileAsync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', psScript],
        { timeout: 1500 }
      );
      const [procName = '', title = ''] = stdout.trim().split('|');
      return {
        processName: procName.trim().toLowerCase(),
        windowTitle: title.trim().toLowerCase(),
      };
    }

    if (process.platform === 'darwin') {
      const osaScript = `
        tell application "System Events"
          set frontApp to first application process whose frontmost is true
          set appName to name of frontApp
          set winTitle to ""
          try
            set winTitle to name of front window of frontApp
          end try
          return appName & "|" & winTitle
        end tell
      `;
      const { stdout } = await execFileAsync('osascript', ['-e', osaScript], {
        timeout: 1500,
      });
      const [procName = '', title = ''] = stdout.trim().split('|');
      return {
        processName: procName.trim().toLowerCase(),
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

/**
 * Stage 8: Polls the active foreground window every 2 seconds while a focus session is running.
 * - "app" rules match by process or executable name (case-insensitive, with or without .exe/.app).
 * - "website" rules match when the foreground window is a known browser and the window title
 *   contains the site's tag name (note: this is window title matching and only sees the active tab).
 */
async function pollForegroundWindow(): Promise<void> {
  if (!isFocusSessionRunning || watchedRules.length === 0) return;

  const fg = await getForegroundWindowInfo();
  if (!fg || !fg.processName) return;

  // Ignore Study Buddy itself
  if (
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
      // Title matching for browser tabs (can miss background tabs not reflected in window title)
      isMatch =
        fg.windowTitle.includes(tagLower) ||
        (domainOrProcBase.length > 2 &&
          fg.windowTitle.includes(domainOrProcBase));
    }

    if (isMatch) {
      const now = Date.now();
      if (!rule.strictBlock) {
        const lastTriggered = nonStrictCooldowns.get(rule.id) ?? 0;
        if (now - lastTriggered < COOLDOWN_MS) {
          continue;
        }
        nonStrictCooldowns.set(rule.id, now);
      }

      dispatchOverlayTrigger('intervention', {
        targetAppOrSite: cleanTagName,
        strictMode: rule.strictBlock,
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
   * Politely minimizes the active browser window (for websites) or asks a desktop app
   * to close its window politely without force-killing processes.
   */
  ipcMain.handle(
    'buddy:close-or-minimize-target',
    async (
      _event,
      payload: { targetName: string }
    ): Promise<{ ok: boolean }> => {
      const target = (payload?.targetName ?? '').trim();
      if (!target) return { ok: false };

      try {
        if (process.platform === 'win32') {
          const ps = `
            $procs = Get-Process | Where-Object { $_.MainWindowTitle -like "*${target.replace(
              /"/g,
              ''
            )}*" -or $_.ProcessName -like "*${target.replace(/"/g, '')}*" }
            foreach ($p in $procs) {
              $null = $p.CloseMainWindow()
            }
          `;
          await execFileAsync(
            'powershell.exe',
            ['-NoProfile', '-NonInteractive', '-Command', ps],
            { timeout: 1500 }
          );
        } else if (process.platform === 'darwin') {
          const osa = `
            tell application "System Events"
              set frontApp to first application process whose frontmost is true
              try
                set value of attribute "AXMinimized" of window 1 of frontApp to true
              end try
            end tell
          `;
          await execFileAsync('osascript', ['-e', osa], { timeout: 1500 });
        }
        return { ok: true };
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

  // Re-assert always-on-top whenever displays or workspaces change
  screen.on('display-added', () => assertAlwaysOnTop(mainWindow));
  screen.on('display-removed', () => assertAlwaysOnTop(mainWindow));
  screen.on('display-metrics-changed', () => assertAlwaysOnTop(mainWindow));

  // Poll foreground window every 2 seconds for Stage 8 App Rules
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
