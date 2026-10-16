// src/renderer/src/components/scratchpad/Scratchpad.tsx
import React, {
  useState,
  useRef,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import { useApp, SCRATCHPAD_STORAGE_KEY } from '../../context/AppContext';

export const Scratchpad: React.FC = () => {
  const {
    scratchpad,
    updateScratchpadTitle,
    updateScratchpadContent,
    clearScratchpadContent,
    isScratchpadOpen,
    isScratchpadMinimized,
    setScratchpadOpen,
    setScratchpadMinimized,
    openNoteIntoScratchpad,
    setInteractiveRegionHovered,
  } = useApp();

  // Local editor buffers hydrated from context / localStorage('study_buddy_scratchpad')
  const [title, setTitle] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(SCRATCHPAD_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.title === 'string') return parsed.title;
      }
    } catch {
      // Ignore parse errors
    }
    return scratchpad.title;
  });

  const [content, setContent] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(SCRATCHPAD_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.content === 'string') return parsed.content;
      }
    } catch {
      // Ignore parse errors
    }
    return scratchpad.content;
  });

  // Floating window position coordinates
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 48,
    y: 64,
  });

  const dragOffsetRef = useRef<{ startX: number; startY: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Debounced persistence of title and content to localStorage key 'study_buddy_scratchpad'
  useEffect(() => {
    const debounceTimer = window.setTimeout(() => {
      try {
        const payload = {
          ...scratchpad,
          title,
          content,
          updatedAt: Date.now(),
        };
        localStorage.setItem(SCRATCHPAD_STORAGE_KEY, JSON.stringify(payload));
      } catch (err) {
        console.warn('Failed to persist scratchpad note to localStorage:', err);
      }
    }, 350);

    return () => window.clearTimeout(debounceTimer);
  }, [title, content, scratchpad]);

  // Handle Title & Content Updates
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTitle = e.target.value;
    setTitle(nextTitle);
    updateScratchpadTitle(nextTitle);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextContent = e.target.value;
    setContent(nextContent);
    updateScratchpadContent(nextContent);

    // Automatically derive title from first line if title is blank
    if (!title.trim()) {
      const firstNonEmptyLine = nextContent
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.length > 0);
      if (firstNonEmptyLine) {
        const derived = firstNonEmptyLine.slice(0, 60);
        setTitle(derived);
        updateScratchpadTitle(derived);
      }
    }
  };

  const handleClear = () => {
    setTitle('Untitled Study Note');
    setContent('');
    clearScratchpadContent();
    try {
      localStorage.setItem(
        SCRATCHPAD_STORAGE_KEY,
        JSON.stringify({
          ...scratchpad,
          title: 'Untitled Study Note',
          content: '',
          updatedAt: Date.now(),
        })
      );
    } catch {
      // Ignore storage write error
    }
  };

  /**
   * Exports current scratchpad note as a Markdown (.md) file.
   * - Uses `window.electronAPI.exportMarkdown` when running inside Electron.
   * - Falls back to an in-memory Blob (`text/markdown`) and temporary `<a download="...">`
   *   when running in browser preview.
   */
  const exportScratchpadToMarkdown = useCallback(async () => {
    const safeSlug =
      (title || 'scratchpad-note')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'scratchpad-note';
    const filename = `${safeSlug}.md`;

    if (window.electronAPI?.exportMarkdown) {
      try {
        const result = await window.electronAPI.exportMarkdown(
          content,
          filename
        );
        if (!result.canceled || result.filePath) {
          return;
        }
        if (result.canceled && !result.error) {
          return;
        }
      } catch (err) {
        console.warn(
          'Electron bridge export failed; using browser Blob download fallback:',
          err
        );
      }
    }

    // Browser preview fallback: in-memory Blob + temporary <a download="...">
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const tempAnchor = document.createElement('a');
    tempAnchor.href = url;
    tempAnchor.download = filename;
    document.body.appendChild(tempAnchor);
    tempAnchor.click();
    document.body.removeChild(tempAnchor);
    URL.revokeObjectURL(url);
  }, [content, title]);

  const stats = useMemo(() => {
    const characters = content.length;
    const trimmed = content.trim();
    const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
    return { words, characters };
  }, [content]);

  if (!isScratchpadOpen) {
    return null;
  }

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-no-drag="true"]')) {
      return;
    }

    dragOffsetRef.current = {
      startX: e.clientX - position.x,
      startY: e.clientY - position.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragOffsetRef.current) return;
      const nextX = Math.max(
        12,
        Math.min(
          window.innerWidth - 412,
          moveEvent.clientX - dragOffsetRef.current.startX
        )
      );
      const nextY = Math.max(
        12,
        Math.min(
          window.innerHeight - 80,
          moveEvent.clientY - dragOffsetRef.current.startY
        )
      );
      setPosition({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      dragOffsetRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleOpenNoteClick = async () => {
    const handledByElectron = await openNoteIntoScratchpad();
    if (!handledByElectron) {
      fileInputRef.current?.click();
    }
  };

  const handleBrowserFileSelected = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const importedTitle = file.name.replace(/\.(md|markdown|txt)$/i, '');
        setTitle(importedTitle);
        setContent(reader.result);
        updateScratchpadTitle(importedTitle);
        updateScratchpadContent(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const isSynced = scratchpad.syncStatus === 'synced';

  return (
    <div
      onMouseEnter={() => setInteractiveRegionHovered('scratchpad', true)}
      onMouseLeave={() => setInteractiveRegionHovered('scratchpad', false)}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '400px',
        height: isScratchpadMinimized ? 'auto' : '520px',
      }}
      className="fixed z-50 flex flex-col rounded-[20px] bg-[#1A1626] border border-[#2C253E] shadow-[0_24px_60px_rgba(0,0,0,0.75)] text-white overflow-hidden select-none transition-[height] duration-200"
    >
      {/* Hidden File Input for Browser Open Note Fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        onChange={handleBrowserFileSelected}
        className="hidden"
      />

      {/* Draggable Header Bar */}
      <div
        onMouseDown={handleHeaderMouseDown}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        className="flex items-center justify-between border-b border-[#262038] bg-[#161221] px-5 py-3.5 cursor-move"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-[18px] font-bold tracking-tight text-white">
            Scratchpad
          </h2>

          {/* Sync Status Pill */}
          {isSynced ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0E362D] px-2.5 py-0.5 text-[11.5px] font-medium text-[#4ADE80]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" />
              Cloud Synced
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3A2813] px-2.5 py-0.5 text-[11.5px] font-medium text-[#FBBF24]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FBBF24]" />
              Offline · saved locally
            </span>
          )}
        </div>

        {/* Minimize & Close Controls (no-drag) */}
        <div
          data-no-drag="true"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="flex items-center gap-1.5"
        >
          <button
            type="button"
            onClick={() => setScratchpadMinimized(!isScratchpadMinimized)}
            title={isScratchpadMinimized ? 'Expand Scratchpad' : 'Minimize'}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0E0B16] text-[#B8B2CC] hover:bg-[#29233B] hover:text-white transition cursor-pointer"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => {
              setInteractiveRegionHovered('scratchpad', false);
              setScratchpadOpen(false);
            }}
            title="Close Scratchpad"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0E0B16] text-[#B8B2CC] hover:bg-[#3B1D2E] hover:text-white transition cursor-pointer"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Collapsible Body */}
      {!isScratchpadMinimized && (
        <>
          {/* Action Toolbar Row */}
          <div className="flex items-center gap-2.5 px-5 pt-3.5 pb-3">
            <button
              type="button"
              onClick={handleOpenNoteClick}
              className="rounded-lg border border-[#3B3354] bg-[#1E192D] px-3.5 py-1.5 text-[12.5px] font-medium text-[#EAE6F8] hover:bg-[#29223D] transition cursor-pointer"
            >
              Open Note
            </button>

            <button
              type="button"
              onClick={exportScratchpadToMarkdown}
              className="rounded-lg border border-[#3B3354] bg-[#1E192D] px-3.5 py-1.5 text-[12.5px] font-medium text-[#EAE6F8] hover:bg-[#29223D] transition cursor-pointer"
            >
              Export .md
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="ml-1.5 px-2 py-1.5 text-[12.5px] font-medium text-[#9B8AFB] hover:text-[#B8ACFF] transition cursor-pointer"
            >
              Clear
            </button>
          </div>

          {/* Note Title + Multiline Plain Text Editor Area */}
          <div className="flex-1 px-5 pb-3 flex flex-col min-h-0">
            <div className="relative flex-1 rounded-xl bg-[#0B0912] border border-[#241E34] p-3.5 flex flex-col min-h-0">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Note title..."
                aria-label="Scratchpad Note Title"
                className="mb-2 w-full border-b border-[#1E192D] bg-transparent pb-1.5 text-[13.5px] font-semibold text-white placeholder-[#5A5373] focus:border-[#4D4177] focus:outline-none select-text"
              />

              <textarea
                value={content}
                onChange={handleContentChange}
                placeholder="Write your study notes, formulas, or TODOs here..."
                spellCheck={false}
                className="w-full flex-1 resize-none bg-transparent text-[13.5px] leading-[1.6] text-[#DFDCF0] placeholder-[#5A5373] focus:outline-none select-text overflow-y-auto pr-2"
              />
            </div>
          </div>

          {/* Footer Status Bar */}
          <div className="flex items-center justify-between border-t border-[#241E34] bg-[#151120] px-5 py-2.5 text-[12px] text-[#7D7696]">
            <span>
              {stats.words} {stats.words === 1 ? 'word' : 'words'} ·{' '}
              {stats.characters}{' '}
              {stats.characters === 1 ? 'character' : 'characters'}
            </span>

            <span className="inline-flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  scratchpad.phoneConnected ? 'bg-[#4ADE80]' : 'bg-[#6E678A]'
                }`}
              />
              <span className="text-[#8E87A8]">
                {scratchpad.phoneConnected
                  ? `${scratchpad.deviceName ?? 'iPhone'} connected`
                  : 'Phone not connected'}
              </span>
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default Scratchpad;