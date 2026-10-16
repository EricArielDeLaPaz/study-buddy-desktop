// src/preload/index.d.ts

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

export interface ElectronAPI {
  /**
   * Enables or disables window click-through in the main process.
   * @param ignore Whether mouse events should pass through the transparent window.
   * @param forward Whether mouse move events should still be forwarded to the renderer.
   */
  setIgnoreMouseEvents: (ignore: boolean, forward?: boolean) => void;

  /**
   * Opens the native system save dialog to save Scratchpad notes as a `.md` file.
   * @param content Plain text / Markdown string buffer.
   * @param filename Suggested file name (e.g. `cell-respiration.md`).
   */
  exportMarkdown: (
    content: string,
    filename: string
  ) => Promise<ExportMarkdownResult>;

  /**
   * Registers a callback for main-process overlay triggers.
   * Returns a cleanup function that removes the IPC listener.
   */
  onTriggerOverlay: (
    callback: (
      type: OverlayTriggerType,
      payload?: OverlayTriggerPayload
    ) => void
  ) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
