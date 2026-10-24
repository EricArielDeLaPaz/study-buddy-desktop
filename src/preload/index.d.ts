// src/preload/index.d.ts

export type OverlayTriggerType = 'hydration' | 'bathroom' | 'intervention';

export interface OverlayTriggerPayload {
  durationSeconds?: number;
  targetAppOrSite?: string;
  targetKind?: 'website' | 'app';
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

export interface ElectronAPI {
  platform: string;
  setIgnoreMouseEvents: (ignore: boolean, forward?: boolean) => void;
  exportMarkdown: (
    content: string,
    filename: string
  ) => Promise<ExportMarkdownResult>;
  onTriggerOverlay: (
    callback: (
      type: OverlayTriggerType,
      payload?: OverlayTriggerPayload
    ) => void
  ) => () => void;
  syncWatcherState: (payload: {
    isFocusing: boolean;
    rules: WatcherAppRule[];
  }) => void;
  notifyInterventionState: (active: boolean) => void;
  closeOrMinimizeTarget: (targetName: string) => Promise<{ ok: boolean }>;
  quitApp: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
