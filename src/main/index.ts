// src/main/index.ts
import { app, shell, BrowserWindow, ipcMain, screen, dialog } from 'electron';
import { join } from 'path';
import { writeFile, readFile } from 'fs/promises';

export type OverlayTriggerType = 'hydration' | 'bathroom' | 'intervention';

export interface OverlayTriggerPayload {
  durationSeconds?: number;
  targetAppOrSite?: string;
  strictMode?: boolean;
  message?: string;
}

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

app.on('before-quit', () => {
  isQuitting = true;
});

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

  // Float above standard desktop workspaces while respecting fullscreen disabling
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Start in click-through mode with mouse move forwarding enabled
  win.setIgnoreMouseEvents(true, { forward: true });

  win.on('ready-to-show', () => {
    win.show();
  });

  /**
   * Slack-style Close Interception:
   * Instead of quitting the app when the user closes the window, prevent default,
   * keep the transparent Electron overlay alive, and notify the renderer to switch
   * into the compact floating Mambo Companion mode.
   */
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

/**
 * Helper to dispatch scheduled or OS-watcher overlay events from Main to Renderer.
 */
export function dispatchOverlayTrigger(
  type: OverlayTriggerType,
  payload?: OverlayTriggerPayload
): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('buddy:trigger-overlay', { type, payload });
}

function registerIpcHandlers(): void {
  /**
   * 1. Dynamic Mouse Click-Through Toggle
   */
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
   * 2. Native System Save Dialog for Markdown Export
   */
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
        console.error('Failed to export Markdown file:', message);
        return { canceled: true, error: message };
      }
    }
  );

  /**
   * 3. Native Open Note Dialog
   */
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});