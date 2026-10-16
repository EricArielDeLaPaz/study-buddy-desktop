// src/renderer/src/components/scratchpad/Scratchpad.tsx
import React, { useState, useRef, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';

export const Scratchpad: React.FC = () => {
  const {
    scratchpad,
    updateScratchpadContent,
    clearScratchpadContent,
    isScratchpadOpen,
    isScratchpadMinimized,
    setScratchpadOpen,
    setScratchpadMinimized,
    exportScratchpadToMarkdown,
    openNoteIntoScratchpad,
    setInteractiveRegionHovered,
  } = useAppContext();

  // Support both native OS dragging (-webkit-app-region: drag) and
  // in-viewport floating card dragging so the user can reposition the 400x520
  // scratchpad freely inside the full-screen transparent overlay canvas.
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 48,
    y: 64,
  });
  const dragOffsetRef = useRef<{ startX: number; startY: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stats = useMemo(() => {
    const raw = scratchpad.content;
    const characters = raw.length;
    const trimmed = raw.trim();
    const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
    return { words, characters };
  }, [scratchpad.content]);

  if (!isScratchpadOpen) {
    return null;
  }

  const handleMouseEnter = () => {
    setInteractiveRegionHovered('scratchpad', true);
  };

  const handleMouseLeave = () => {
    setInteractiveRegionHovered('scratchpad', false);
  };

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Do not initiate drag if clicking a no-drag button
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
    const openedViaNative = await openNoteIntoScratchpad();
    if (!openedViaNative) {
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
        updateScratchpadContent(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const isSynced = scratchpad.syncStatus === 'synced';

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '400px',
        height: isScratchpadMinimized ? 'auto' : '520px',
      }}
      className="fixed z-50 flex flex-col rounded-[20px] bg-[#1A1626] border border-[#2C253E] shadow-[0_24px_60px_rgba(0,0,0,0.75)] text-white overflow-hidden select-none transition-[height] duration-200"
    >
      {/* Hidden Browser File Input Fallback for Open Note */}
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

          {/* Sync Indicator Pill */}
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

        {/* Window Controls (no-drag) */}
        <div
          data-no-drag="true"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="flex items-center gap-1.5"
        >
          <button
            type="button"
            onClick={() => setScratchpadMinimized(!isScratchpadMinimized)}
            title={isScratchpadMinimized ? 'Restore Scratchpad' : 'Minimize'}
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
              onClick={clearScratchpadContent}
              className="ml-1.5 px-2 py-1.5 text-[12.5px] font-medium text-[#9B8AFB] hover:text-[#B8ACFF] transition cursor-pointer"
            >
              Clear
            </button>
          </div>

          {/* Multiline Plain Text Editor Area */}
          <div className="flex-1 px-5 pb-3 flex flex-col min-h-0">
            <div className="relative flex-1 rounded-xl bg-[#0B0912] border border-[#241E34] p-3.5 flex flex-col min-h-0">
              <textarea
                value={scratchpad.content}
                onChange={(e) => updateScratchpadContent(e.target.value)}
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