// src/preload/index.ts
import {
  contextBridge,
  ipcRenderer,
  IpcRendererEvent,
  webUtils,
} from 'electron';

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
  processNames?: string[];
  bundleId?: string;
  titleKeyword?: string;
  strictBlock: boolean;
  enabled: boolean;
}

export interface WatcherSmartTarget {
  id: string;
  kind: 'website' | 'app';
  tagName: string;
  targetPathOrUrl: string;
  processName?: string;
  processNames?: string[];
  bundleId?: string;
  titleKeyword?: string;
}

export interface InspectedAppTarget {
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

export interface RunningOpenAppItem {
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

  /**
   * Stage P8: Listens for Smart Activation matches when no session is running.
   */
  onSmartActivationTrigger: (
    callback: (payload: SmartActivationTriggerPayload) => void
  ): (() => void) => {
    const listener = (
      _event: IpcRendererEvent,
      payload: SmartActivationTriggerPayload
    ) => {
      callback(payload);
    };
    ipcRenderer.on('buddy:smart-activation-trigger', listener);
    return () => {
      ipcRenderer.removeListener('buddy:smart-activation-trigger', listener);
    };
  },

  /**
   * Stage P8: Cancels a pending Smart Activation start and sets a 60-minute cooldown for that target.
   */
  cancelSmartActivationTarget: (targetId: string): void => {
    ipcRenderer.send('buddy:cancel-smart-activation', { targetId });
  },

  syncWatcherState: (payload: {
    isFocusing: boolean;
    isSessionActive?: boolean;
    rules: WatcherAppRule[];
    smartActivationEnabled?: boolean;
    smartTargets?: WatcherSmartTarget[];
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

  getPathForFile: (file: File): string => {
    try {
      return webUtils.getPathForFile(file) || '';
    } catch {
      return '';
    }
  },

  inspectAppPath: (filePath: string): Promise<InspectedAppTarget> => {
    return ipcRenderer.invoke('buddy:inspect-app-path', { filePath });
  },

  browseDesktopApp: (): Promise<InspectedAppTarget> => {
    return ipcRenderer.invoke('buddy:browse-desktop-app');
  },

  listOpenApps: (): Promise<RunningOpenAppItem[]> => {
    return ipcRenderer.invoke('buddy:list-open-apps');
  },

  captureForegroundApp: (): Promise<RunningOpenAppItem | null> => {
    return ipcRenderer.invoke('buddy:capture-foreground-app');
  },

  /**
   * Stage P8: Reads and updates Electron login item settings ("Start Study Buddy when I sign in").
   */
  getLoginItemEnabled: (): Promise<boolean> => {
    return ipcRenderer.invoke('buddy:get-login-item');
  },

  setLoginItemEnabled: (enabled: boolean): Promise<boolean> => {
    return ipcRenderer.invoke('buddy:set-login-item', { enabled });
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
