// src/renderer/src/constants/layers.ts
// Single source of truth for stacking order inside the app window (lowest to highest).
export const Z_LAYERS = {
  NOTEPAD: 20,
  DASHBOARD: 30,
  COMPANION_DOCK: 40,
  OVERLAY: 50,
  DEV_BAR: 60,
} as const;
