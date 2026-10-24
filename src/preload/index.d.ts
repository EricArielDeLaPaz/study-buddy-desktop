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

export interface ElectronAPI {
  platform: string;
  setIgnoreMouseEvents: (ignore: boolean, forward?: boolean) => void;
  exportMarkdown: (
    content: string,
    filename: string
  ): Promise<ExportMarkdownResult>;
  onTriggerOverlay: (
    callback: (
      type: OverlayTriggerType,
      payload?: OverlayTriggerPayload
    ) => void
  ) => () => void;
  onSmartActivationTrigger: (
    callback: (payload: SmartActivationTriggerPayload) => void
  ) => () => void;
  cancelSmartActivationTarget: (targetId: string) => void;
  syncWatcherState: (payload: {
    isFocusing: boolean;
    isSessionActive?: boolean;
    rules: WatcherAppRule[];
    smartActivationEnabled?: boolean;
    smartTargets?: WatcherSmartTarget[];
  }) => void;
  notifyInterventionState: (active: boolean) => void;
  closeOrMinimizeTarget: (targetName: string) => Promise<{ ok: boolean }>;
  quitApp: () => void;
  getPathForFile: (file: File) => string;
  inspectAppPath: (filePath: string) => Promise<InspectedAppTarget>;
  browseDesktopApp: (): Promise<InspectedAppTarget>;
  listOpenApps: (): Promise<RunningOpenAppItem[]>;
  captureForegroundApp: (): Promise<RunningOpenAppItem | null>;
  getLoginItemEnabled: () => Promise<boolean>;
  setLoginItemEnabled: (enabled: boolean) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
