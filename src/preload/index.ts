// src/preload/index.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type OverlayTriggerType = 'hydration' | 'bathroom' | 'intervention';

export interface OverlayTriggerPayload {
  durationSeconds?: number;
  targetAppOrSite?: string;
  strictMode?: boolean;
  message?: string;
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
  strictBlock: boolean;
  enabled: boolean;
}

export const electronAPI = {
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
