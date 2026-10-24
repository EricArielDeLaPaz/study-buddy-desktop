// src/preload/index.ts
import { contextBridge, ipcRenderer, IpcRendererEvent, webUtils } from 'electron';

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

export interface ExportMarkdownResult {
  canceled: boolean;
  filePath?: string;
  error?: string;
}

export interface WatcherAppRule {
  id: string;
  kind?: 'website' | 'app';
  targetName: string;
  domainOrProcess: string;
  processName?: string;
  bundleId?: string;
  strictBlock: boolean;
  enabled: boolean;
}

export interface InspectedAppTarget {
  canceled?: boolean;
  filePath: string;
  displayName: string;
  processName: string;
  bundleId?: string;
  isLauncherWarning?: boolean;
  warningMessage?: string;
}

export interface RunningOpenAppItem {
  pid: number;
  processName: string;
  rawProcessName: string;
  bundleId?: string;
  windowTitle: string;
}

export const electronAPI = {
  platform: process.platform,

  setIgnoreMouseEvents: (ignore: boolean, forward?: boolean): void => {
    ipcRenderer.send('buddy:set-ignore-mouse-events', ignore, forward ?? false);
  },

  exportMarkdown: (
    content: string,
    filename: string
  ): Promise<ExportMarkdownResult> => {
    return ipcRenderer.invoke('buddy:export-markdown', { content, filename });
  },

  onTriggerOverlay: (
    callback: (
      type: OverlayTriggerType,
      payload?: OverlayTriggerPayload
    ) => void
  ): (() => void) => {
    const listener = (
      _event: IpcRendererEvent,
      data: { type: OverlayTriggerType; payload?: OverlayTriggerPayload }
    ) => {
      callback(data.type, data.payload);
    };

    ipcRenderer.on('buddy:trigger-overlay', listener);

    return () => {
      ipcRenderer.removeListener('buddy:trigger-overlay', listener);
    };
  },

  syncWatcherState: (payload: {
    isFocusing: boolean;
    rules: WatcherAppRule[];
  }): void => {
    ipcRenderer.send('buddy:sync-watcher-state', payload);
  },

  notifyInterventionState: (active: boolean): void => {
    ipcRenderer.send('buddy:notify-intervention-state', { active });
  },

  closeOrMinimizeTarget: (targetName: string): Promise<{ ok: boolean }> => {
    return ipcRenderer.invoke('buddy:close-or-minimize-target', { targetName });
  },

  quitApp: (): void => {
    ipcRenderer.send('buddy:quit-app');
  },

  /**
   * Stage P7: Resolves the real filesystem path for a File object selected via input or drag-and-drop.
   */
  getPathForFile: (file: File): string => {
    try {
      return webUtils.getPathForFile(file) || '';
    } catch {
      return '';
    }
  },

  /**
   * Stage P7: Inspects an executable, .lnk shortcut, or macOS .app bundle path in the main process.
   */
  inspectAppPath: (filePath: string): Promise<InspectedAppTarget> => {
    return ipcRenderer.invoke('buddy:inspect-app-path', { filePath });
  },

  /**
   * Stage P7: Opens a native file/app picker dialog (supporting .app bundles on macOS and .exe/.lnk on Windows).
   */
  browseDesktopApp: (): Promise<InspectedAppTarget> => {
    return ipcRenderer.invoke('buddy:browse-desktop-app');
  },

  /**
   * Stage P7: Lists currently running desktop apps with a visible window (in memory only).
   */
  listOpenApps: (): Promise<RunningOpenAppItem[]> => {
    return ipcRenderer.invoke('buddy:list-open-apps');
  },

  /**
   * Stage P7: Reads the current foreground application so the user can add the app they just switched to.
   */
  captureForegroundApp: (): Promise<RunningOpenAppItem | null> => {
    return ipcRenderer.invoke('buddy:capture-foreground-app');
  },
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  } catch (error) {
    console.error('Failed to expose electronAPI via contextBridge:', error);
  }
} else {
  (window as unknown as { electronAPI: typeof electronAPI }).electronAPI =
    electronAPI;
}
