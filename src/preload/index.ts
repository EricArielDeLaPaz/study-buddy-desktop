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

export const electronAPI = {
  /**
   * Toggles OS-level window mouse click-through.
   * - When `ignore` is true and `forward` is true, clicks pass through to underlying
   *   applications while mousemove events continue forwarding to the renderer.
   * - When `ignore` is false, the Electron window captures all mouse interactions.
   */
  setIgnoreMouseEvents: (ignore: boolean, forward?: boolean): void => {
    ipcRenderer.send('buddy:set-ignore-mouse-events', ignore, forward ?? false);
  },

  /**
   * Sends Markdown note content to the main process to open a native OS Save dialog
   * and write the `.md` file to disk.
   */
  exportMarkdown: (
    content: string,
    filename: string
  ): Promise<ExportMarkdownResult> => {
    return ipcRenderer.invoke('buddy:export-markdown', { content, filename });
  },

  /**
   * Subscribes to scheduled or system-initiated overlay triggers from the main process.
   * Returns an unsubscribe cleanup function for React `useEffect` hooks.
   */
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
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  } catch (error) {
    console.error('Failed to expose electronAPI via contextBridge:', error);
  }
} else {
  // Fallback if contextIsolation is disabled in custom environments
  (window as unknown as { electronAPI: typeof electronAPI }).electronAPI =
    electronAPI;
}