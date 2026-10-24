// src/preload/index.d.ts

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
  getPathForFile: (file: File) => string;
  inspectAppPath: (filePath: string) => Promise<InspectedAppTarget>;
  browseDesktopApp: () => Promise<InspectedAppTarget>;
  listOpenApps: () => Promise<RunningOpenAppItem[]>;
  captureForegroundApp: () => Promise<RunningOpenAppItem | null>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
