// src/main/index.ts
import { app, shell, BrowserWindow, ipcMain, screen, dialog } from 'electron';
import { join } from 'path';
import { writeFile } from 'fs/promises';

export type OverlayTriggerType = 'hydration' | 'bathroom' | 'intervention';

export interface OverlayTriggerPayload {
  durationSeconds?: number;
  targetAppOrSite?: string;
  strictMode?: boolean;
  message?: string;
}

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const win = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Float above fullscreen and standard desktop spaces
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Start in click-through mode with mouse move forwarding enabled
  win.setIgnoreMouseEvents(true, { forward: true });

  win.on('ready-to-show', () => {
    win.show();
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
   * Safely resolves the target BrowserWindow and applies:
   * win.setIgnoreMouseEvents(ignore, { forward: forward ?? false })
   */
  ipcMain.on(
    'buddy:set-ignore-mouse-events',
    (event, ignore: boolean, forward?: boolean) => {
      const win = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
      if (!win || win.isDestroyed()) return;

      if (ignore) {
        win.setIgnoreMouseEvents(true, { forward: forward ?? false });
      } else {
        win.setIgnoreMouseEvents(false);
      }
    }
  );

  /**
   * 2. Native System Save Dialog for Markdown Export
   * Receives { content, filename } from window.electronAPI.exportMarkdown(content, filename)
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
        : 'scratchpad-notes.md';

      try {
        // Ensure window captures mouse events while the modal save dialog is active
        win.setIgnoreMouseEvents(false);

        const { canceled, filePath } = await dialog.showSaveDialog(win, {
          title: 'Export Scratchpad Note as Markdown',
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
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});