// src/main/index.ts
import { app, shell, BrowserWindow, ipcMain, screen, dialog } from 'electron';
import { join } from 'path';
import { writeFile, readFile } from 'fs/promises';

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
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

  // Keep overlay above fullscreen/normal desktop workspaces
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Default to click-through with mouse move forwarding enabled so renderer
  // can detect when the cursor enters interactive cards or the scratchpad.
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

function registerIpcHandlers(): void {
  /**
   * Dynamic Mouse Click-Through Handler
   * - When `ignore` is true (e.g., cursor is on the transparent/dimmed backdrop),
   *   clicks pass through to underlying OS windows while forwarding mousemove events.
   * - When `ignore` is false (cursor enters CenterOverlay card, Scratchpad, or HUD),
   *   the Electron window captures mouse clicks normally.
   */
  ipcMain.on(
    'buddy:set-ignore-mouse-events',
    (event, ignore: boolean, options?: { forward: boolean }) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win || win.isDestroyed()) return;

      if (ignore) {
        win.setIgnoreMouseEvents(true, { forward: options?.forward ?? true });
      } else {
        win.setIgnoreMouseEvents(false);
      }
    }
  );

  /**
   * Native Markdown Export Handler (Optional native save dialog fallback)
   */
  ipcMain.handle(
    'buddy:export-markdown',
    async (event, payload: { filename: string; content: string }) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) return { canceled: true };

      // Temporarily capture mouse events while native dialog is open
      win.setIgnoreMouseEvents(false);

      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: 'Export Scratchpad Note',
        defaultPath: payload.filename || 'study-notes.md',
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
      });

      if (!canceled && filePath) {
        await writeFile(filePath, payload.content, 'utf-8');
        return { canceled: false, filePath };
      }

      return { canceled: true };
    }
  );

  /**
   * Native Open Note Handler
   */
  ipcMain.handle('buddy:open-note', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { canceled: true };

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
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});