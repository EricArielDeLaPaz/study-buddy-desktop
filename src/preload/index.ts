// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

export const buddyBridge = {
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }): void => {
    ipcRenderer.send('buddy:set-ignore-mouse-events', ignore, options ?? { forward: true });
  },
  exportMarkdown: (filename: string, content: string): Promise<{ canceled: boolean; filePath?: string }> => {
    return ipcRenderer.invoke('buddy:export-markdown', { filename, content });
  },
  openNote: (): Promise<{ canceled: boolean; filePath?: string; content?: string }> => {
    return ipcRenderer.invoke('buddy:open-note');
  },
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('buddyAPI', buddyBridge);
  } catch (error) {
    console.error('Failed to expose buddyAPI in preload:', error);
  }
} else {
  // @ts-expect-error Fallback when contextIsolation is disabled
  window.buddyAPI = buddyBridge;
}