// src/renderer/src/utils/appTarget.ts

export interface NormalizedAppTarget {
  processName: string;
}

/**
 * Stage P7: Normalizes any user-entered app path, filename, or process string:
 * - trims and strips surrounding single or double quotes;
 * - strips trailing slashes (/ or \);
 * - if it contains / or \, takes the last path segment (the file or .app folder name);
 * - strips a trailing .exe, .app, .lnk, .dmg, .appimage (case-insensitive);
 * - lowercases and collapses inner whitespace, keeping parentheses only if part of the file name.
 */
export function normalizeAppTarget(input: string): NormalizedAppTarget {
  let s = (input ?? '').trim();

  // Strip surrounding single or double quotes repeatedly
  while (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }

  // Strip trailing slashes so "/Applications/Slack.app/" doesn't produce an empty segment
  s = s.replace(/[\\/]+$/, '');

  // Take the last path segment if forward or back slashes are present
  if (s.includes('/') || s.includes('\\')) {
    const segments = s.split(/[\\/]+/).filter(Boolean);
    if (segments.length > 0) {
      s = segments[segments.length - 1];
    }
  }

  // Strip trailing executable/bundle/shortcut extensions (case-insensitive)
  s = s.replace(/\.(exe|app|lnk|dmg|appimage)$/i, '');

  // Lowercase and collapse inner whitespace
  const processName = s.toLowerCase().replace(/\s+/g, ' ').trim();

  return { processName };
}

/**
 * Normalizes a human-friendly tag name (stripping optional parenthetical notes
 * like "Figma (UI Design)" -> "figma") for fallback matching.
 */
export function normalizeAppTagName(tagName: string): string {
  const withoutNotes = (tagName ?? '').replace(/\s*\(.*?\)\s*/g, ' ').trim();
  return normalizeAppTarget(withoutNotes || tagName).processName;
}

/**
 * Checks whether an executable file name looks like an updater, installer, or launcher stub.
 */
export function isLikelyLauncherExecutable(input: string): boolean {
  const { processName } = normalizeAppTarget(input);
  if (!processName) return false;
  return (
    processName === 'update' ||
    processName === 'setup' ||
    processName === 'install' ||
    processName === 'installer' ||
    processName === 'launcher' ||
    processName === 'unins000' ||
    processName.endsWith(' installer') ||
    processName.endsWith(' setup') ||
    processName.endsWith(' launcher') ||
    processName.endsWith('_launcher') ||
    processName.endsWith('-launcher')
  );
}
