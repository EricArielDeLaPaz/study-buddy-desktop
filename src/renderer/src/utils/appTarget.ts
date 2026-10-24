// src/renderer/src/utils/appTarget.ts

export interface NormalizedAppTarget {
  processName: string;
}

const KNOWN_BROWSER_OR_HOST_PROCESSES = [
  'chrome',
  'google chrome',
  'msedge',
  'microsoft edge',
  'firefox',
  'mozilla firefox',
  'brave',
  'brave browser',
  'safari',
  'arc',
  'opera',
  'vivaldi',
  'applicationframehost',
];

const GENERIC_PARENT_FOLDERS = new Set([
  'applications',
  'application',
  'app',
  'apps',
  'bin',
  'binaries',
  'win64',
  'win32',
  'x64',
  'x86',
  'release',
  'debug',
  'contents',
  'macos',
  'resources',
  'local',
  'roaming',
  'appdata',
  'program files',
  'program files (x86)',
  'programs',
  'users',
  'system32',
  'windows',
]);

/**
 * Stage P7 / P8: Normalizes any user-entered app path, filename, or process string:
 * - trims and strips surrounding single or double quotes;
 * - strips trailing slashes (/ or \);
 * - if it contains / or \, takes the last path segment (the file or .app folder name);
 * - strips a trailing .exe, .app, .lnk, .dmg, .appimage (case-insensitive);
 * - lowercases and collapses inner whitespace, keeping parentheses only if part of the file name.
 */
export function normalizeAppTarget(input: string): NormalizedAppTarget {
  let s = (input ?? '').trim();

  while (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }

  s = s.replace(/[\\/]+$/, '');

  if (s.includes('/') || s.includes('\\')) {
    const segments = s.split(/[\\/]+/).filter(Boolean);
    if (segments.length > 0) {
      s = segments[segments.length - 1];
    }
  }

  s = s.replace(/\.(exe|app|lnk|dmg|appimage)$/i, '');

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

/**
 * Stage P8: Builds the deduplicated list of process-name aliases to watch for an app rule or smart target.
 * - Strips -launcher, _launcher, or " launcher" suffixes (e.g., "blender-launcher" -> ["blender", "blender-launcher"]).
 * - For Update.exe / Setup.exe / Launcher.exe inside a folder path (e.g., AppData\Local\Discord\Update.exe),
 *   extracts the meaningful parent folder name ("discord") as an alias.
 */
export function buildProcessAliases(
  rawPathOrInput: string,
  extraAliases: string[] = []
): string[] {
  const aliases: string[] = [];
  const addAlias = (candidate?: string) => {
    const norm = normalizeAppTarget(candidate ?? '').processName;
    if (norm && !aliases.includes(norm)) {
      aliases.push(norm);
    }
  };

  const primary = normalizeAppTarget(rawPathOrInput).processName;

  // 1. If the name ends with -launcher, _launcher, " launcher", -setup, etc., add the stripped base name first
  if (primary) {
    const stripped = primary
      .replace(/([-_\s]+)(launcher|installer|setup|updater|update)$/i, '')
      .trim();
    if (stripped && stripped !== primary) {
      addAlias(stripped);
    }
  }

  // 2. If the path points to Update.exe, Setup.exe, or Launcher.exe, inspect parent folders for the real app name
  const cleanedPath = (rawPathOrInput ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/[\\/]+$/, '');

  if (cleanedPath.includes('/') || cleanedPath.includes('\\')) {
    const parts = cleanedPath.split(/[\\/]+/).filter(Boolean);
    if (parts.length >= 2) {
      // Walk upward from the parent directory
      for (let i = parts.length - 2; i >= 0; i -= 1) {
        const folder = parts[i].trim();
        const folderLower = folder.toLowerCase();
        // Skip version folders like "app-1.0.9035" or generic OS folders
        if (
          /^app-\d/i.test(folderLower) ||
          /^v?\d+\.\d+/i.test(folderLower) ||
          GENERIC_PARENT_FOLDERS.has(folderLower) ||
          /^[a-z]:$/i.test(folderLower)
        ) {
          continue;
        }
        const folderNorm = normalizeAppTarget(folder).processName;
        if (
          folderNorm &&
          (isLikelyLauncherExecutable(primary) || folderNorm !== primary)
        ) {
          addAlias(folderNorm);
          break;
        }
      }
    }
  }

  // 3. Add any extra aliases discovered (e.g. sibling .exe files in the same folder)
  for (const extra of extraAliases) {
    addAlias(extra);
  }

  // 4. Always include the normalized input itself
  addAlias(primary);

  return aliases;
}

/**
 * Stage P8: Returns true if the process is a web browser or Windows Store host (ApplicationFrameHost),
 * which requires a window title keyword so it doesn't match every browser/Store window.
 */
export function isBrowserOrHostProcess(processName: string): boolean {
  const norm = normalizeAppTarget(processName).processName;
  if (!norm) return false;
  return KNOWN_BROWSER_OR_HOST_PROCESSES.some(
    (b) => norm === b || norm.startsWith(`${b} `)
  );
}

/**
 * Stage P8: Extracts a clean default titleKeyword from a running window's title
 * (e.g. "Instagram - Google Chrome" -> "Instagram", "Instagram and 2 more pages - Edge" -> "Instagram").
 */
export function extractTitleKeywordFromWindowTitle(
  windowTitle: string,
  fallbackTag?: string
): string {
  const raw = (windowTitle ?? '').trim();
  if (!raw) {
    return (fallbackTag ?? '').trim();
  }

  // Strip common browser suffixes
  const cleaned = raw
    .replace(
      /\s+[-–—|]\s+(Google Chrome|Chrome|Microsoft​?\s*Edge|Edge|Mozilla Firefox|Firefox|Brave|Opera|Vivaldi|Arc|Safari|Personal|Work).*$/i,
      ''
    )
    .replace(/\s+and\s+\d+\s+more\s+pages?.*$/i, '')
    .replace(/^\(\d+\)\s*/, '') // Strip unread count like "(3) Instagram"
    .trim();

  if (!cleaned) {
    return (fallbackTag ?? raw).trim();
  }

  // If the remaining title has " - ", take the most specific segment
  const dashParts = cleaned
    .split(/\s+[-–—|]\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (dashParts.length > 1) {
    return dashParts[0];
  }

  return cleaned;
}
