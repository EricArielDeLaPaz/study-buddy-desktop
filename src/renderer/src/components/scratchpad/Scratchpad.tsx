// src/renderer/src/components/scratchpad/Scratchpad.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp, SCRATCHPAD_STORAGE_KEY } from '../../context/AppContext';
import { ConfirmModal } from '../common/ConfirmModal';

export type NoteHierarchyType = 'title' | 'heading' | 'subheading' | 'body';
export type NoteListType =
  | 'none'
  | 'bullet'
  | 'numbered'
  | 'checklist'
  | 'dash';

export interface NoteAttachment {
  id: string;
  name: string;
  dataUrl: string;
  widthPx: number;
  heightPx: number;
}

export interface NoteBlock {
  id: string;
  text: string;
  hierarchy: NoteHierarchyType;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  listType: NoteListType;
  checked?: boolean;
  attachment?: NoteAttachment;
}

const RICH_NOTES_BLOCKS_STORAGE_KEY = 'study_buddy_rich_note_blocks_v3';

const DEFAULT_NOTE_BLOCKS: NoteBlock[] = [
  {
    id: 'blk-1',
    text: 'Chapter 4 – Cell respiration',
    hierarchy: 'title',
    bold: true,
    italic: false,
    underline: false,
    strikethrough: false,
    listType: 'none',
  },
  {
    id: 'blk-2',
    text: 'Core Metabolic Pathways',
    hierarchy: 'subheading',
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    listType: 'none',
  },
  {
    id: 'blk-3',
    text: 'Glycolysis: cytoplasm, 2 ATP net',
    hierarchy: 'body',
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    listType: 'bullet',
  },
  {
    id: 'blk-4',
    text: 'Krebs cycle: matrix, makes NADH + FADH2',
    hierarchy: 'body',
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    listType: 'bullet',
  },
  {
    id: 'blk-5',
    text: 'Electron transport chain: inner membrane, ~28 ATP',
    hierarchy: 'body',
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    listType: 'bullet',
  },
  {
    id: 'blk-6',
    text: 'Review flashcards before the quiz at 4pm',
    hierarchy: 'body',
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    listType: 'checklist',
    checked: false,
  },
  {
    id: 'blk-7',
    text: 'Ask Mambo for a break after 25 min',
    hierarchy: 'body',
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    listType: 'checklist',
    checked: true,
  },
];

const HIERARCHY_OPTIONS: ReadonlyArray<{
  id: NoteHierarchyType;
  label: string;
}> = [
  { id: 'title', label: 'Title' },
  { id: 'heading', label: 'Heading' },
  { id: 'subheading', label: 'Subheading' },
  { id: 'body', label: 'Body' },
];

const LIST_DROPDOWN_OPTIONS: ReadonlyArray<{
  id: NoteListType;
  symbol: string;
  label: string;
}> = [
  { id: 'bullet', symbol: '•', label: 'Bullet list' },
  { id: 'numbered', symbol: '1.', label: 'Numbered list' },
  { id: 'checklist', symbol: '✔', label: 'Checklist' },
  { id: 'dash', symbol: '-', label: 'Dash list' },
];

function serializeBlocksToMarkdown(blocks: NoteBlock[]): string {
  let numberedCounter = 0;
  return blocks
    .map((blk) => {
      if (blk.listType === 'numbered') {
        numberedCounter += 1;
      } else {
        numberedCounter = 0;
      }

      let line = blk.text;
      if (blk.bold && line) line = `**${line}**`;
      if (blk.italic && line) line = `*${line}*`;
      if (blk.strikethrough && line) line = `~~${line}~~`;

      const attachmentMd = blk.attachment
        ? `\n![${blk.attachment.name}](${blk.attachment.name})`
        : '';

      if (blk.listType === 'bullet') return `• ${line}${attachmentMd}`;
      if (blk.listType === 'dash') return `- ${line}${attachmentMd}`;
      if (blk.listType === 'numbered')
        return `${numberedCounter}. ${line}${attachmentMd}`;
      if (blk.listType === 'checklist') {
        return `- [${blk.checked ? 'x' : ' '}] ${line}${attachmentMd}`;
      }

      if (blk.hierarchy === 'title') return `# ${line}${attachmentMd}`;
      if (blk.hierarchy === 'heading') return `## ${line}${attachmentMd}`;
      if (blk.hierarchy === 'subheading') return `### ${line}${attachmentMd}`;
      return `${line}${attachmentMd}`;
    })
    .join('\n');
}

function createPageScreenshotDataUrl(): { name: string; dataUrl: string } {
  const timestamp = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const fileSafeStamp = timestamp.replace(/[^0-9]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="300" viewBox="0 0 520 300">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1A152B"/>
        <stop offset="100%" stop-color="#0E0B16"/>
      </linearGradient>
    </defs>
    <rect width="520" height="300" rx="14" fill="url(#bg)" stroke="#3D335B" stroke-width="2"/>
    <rect x="18" y="18" width="484" height="28" rx="7" fill="#141020"/>
    <circle cx="32" cy="32" r="4.5" fill="#F87171"/>
    <circle cx="46" cy="32" r="4.5" fill="#FBBF24"/>
    <circle cx="60" cy="32" r="4.5" fill="#4ADE80"/>
    <text x="80" y="36" fill="#A594F9" font-family="sans-serif" font-size="11" font-weight="bold">Study Session Page Capture · ${timestamp}</text>
    <rect x="24" y="64" width="140" height="196" rx="10" fill="#151122" stroke="#29223E"/>
    <rect x="180" y="64" width="316" height="90" rx="10" fill="#211A36" stroke="#4E4187"/>
    <text x="200" y="98" fill="#FFFFFF" font-family="sans-serif" font-size="14" font-weight="bold">Active Study Workspace Snapshot</text>
    <text x="200" y="122" fill="#C4B5FD" font-family="sans-serif" font-size="11.5">Captured directly into Notepad at ${timestamp}</text>
    <rect x="180" y="168" width="152" height="92" rx="10" fill="#151122" stroke="#29223E"/>
    <rect x="344" y="168" width="152" height="92" rx="10" fill="#151122" stroke="#29223E"/>
  </svg>`;

  return {
    name: `page-screenshot-${fileSafeStamp}.png`,
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
  };
}

export const Scratchpad: React.FC = () => {
  const {
    scratchpad,
    updateScratchpadTitle,
    updateScratchpadContent,
    isScratchpadOpen,
    isScratchpadMinimized,
    setScratchpadOpen,
    setScratchpadMinimized,
    toggleSyncStatus,
    setInteractiveRegionHovered,
  } = useApp();

  // Rich Blocks State
  const [blocks, setBlocks] = useState<NoteBlock[]>(() => {
    try {
      const saved = localStorage.getItem(RICH_NOTES_BLOCKS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as NoteBlock[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fall back to default blocks
    }
    return DEFAULT_NOTE_BLOCKS;
  });

  const [activeBlockId, setActiveBlockId] = useState<string>(
    () => blocks[0]?.id ?? 'blk-1'
  );
  const [isListMenuOpen, setIsListMenuOpen] = useState<boolean>(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);

  // Drag-and-Drop Inline Attachment State
  const [draggedSourceBlockId, setDraggedSourceBlockId] = useState<
    string | null
  >(null);
  const [dropTargetBlockId, setDropTargetBlockId] = useState<string | null>(
    null
  );

  // Floating Window Position & Resizable Dimensions
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 42,
    y: 52,
  });
  const [windowSize, setWindowSize] = useState<{
    width: number;
    height: number;
  }>({
    width: 430,
    height: 560,
  });

  const dragOffsetRef = useRef<{ startX: number; startY: number } | null>(null);
  const listMenuRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const blockInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const activeBlock =
    blocks.find((b) => b.id === activeBlockId) ?? blocks[0];

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        listMenuRef.current &&
        !listMenuRef.current.contains(e.target as Node)
      ) {
        setIsListMenuOpen(false);
      }
    }
    if (isListMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isListMenuOpen]);

  // Debounced Persistence
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const markdownText = serializeBlocksToMarkdown(blocks);
      const firstTitleBlock =
        blocks.find((b) => b.hierarchy === 'title' && b.text.trim()) ||
        blocks.find((b) => b.text.trim());
      const derivedTitle =
        firstTitleBlock?.text.trim().slice(0, 60) || 'Untitled Study Note';

      updateScratchpadTitle(derivedTitle);
      updateScratchpadContent(markdownText);

      try {
        localStorage.setItem(
          RICH_NOTES_BLOCKS_STORAGE_KEY,
          JSON.stringify(blocks)
        );
        localStorage.setItem(
          SCRATCHPAD_STORAGE_KEY,
          JSON.stringify({
            ...scratchpad,
            title: derivedTitle,
            content: markdownText,
            updatedAt: Date.now(),
          })
        );
      } catch {
        // Ignore quota errors
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [blocks, scratchpad, updateScratchpadContent, updateScratchpadTitle]);

  const updateActiveBlock = (patch: Partial<NoteBlock>) => {
    if (!activeBlock) return;
    setBlocks((prev) =>
      prev.map((blk) =>
        blk.id === activeBlock.id ? { ...blk, ...patch } : blk
      )
    );
  };

  const handleSelectHierarchy = (hierarchy: NoteHierarchyType) => {
    updateActiveBlock({ hierarchy });
  };

  const handleToggleInlineFormat = (
    field: 'bold' | 'italic' | 'underline' | 'strikethrough'
  ) => {
    if (!activeBlock) return;
    updateActiveBlock({ [field]: !activeBlock[field] });
  };

  const handleSelectListType = (listType: NoteListType) => {
    if (!activeBlock) return;
    const nextType = activeBlock.listType === listType ? 'none' : listType;
    updateActiveBlock({
      listType: nextType,
      checked:
        nextType === 'checklist' ? Boolean(activeBlock.checked) : undefined,
    });
    setIsListMenuOpen(false);
  };

  const handleConfirmClearNotepad = () => {
    const resetId = `blk-${Date.now()}`;
    setBlocks([
      {
        id: resetId,
        text: '',
        hierarchy: 'body',
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
        listType: 'none',
      },
    ]);
    setActiveBlockId(resetId);
  };

  const handleBlockKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    blk: NoteBlock,
    index: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newId = `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const nextBlock: NoteBlock = {
        id: newId,
        text: '',
        hierarchy: 'body',
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
        listType: blk.listType,
        checked: blk.listType === 'checklist' ? false : undefined,
      };

      setBlocks((prev) => {
        const copy = [...prev];
        copy.splice(index + 1, 0, nextBlock);
        return copy;
      });
      setActiveBlockId(newId);

      window.setTimeout(() => {
        blockInputRefs.current[newId]?.focus();
      }, 10);
    } else if (
      e.key === 'Backspace' &&
      blk.text === '' &&
      !blk.attachment &&
      blocks.length > 1
    ) {
      e.preventDefault();
      if (blk.listType !== 'none') {
        updateActiveBlock({ listType: 'none', checked: undefined });
        return;
      }

      const prevBlock = blocks[index - 1] ?? blocks[index + 1];
      setBlocks((prev) => prev.filter((item) => item.id !== blk.id));
      if (prevBlock) {
        setActiveBlockId(prevBlock.id);
        window.setTimeout(() => {
          blockInputRefs.current[prevBlock.id]?.focus();
        }, 10);
      }
    }
  };

  const insertAttachmentAtActiveBlock = useCallback(
    (newAttachment: NoteAttachment) => {
      setBlocks((prev) => {
        const activeIndex = prev.findIndex((b) => b.id === activeBlockId);
        const targetIndex = activeIndex >= 0 ? activeIndex : prev.length - 1;
        const currentBlk = prev[targetIndex];

        if (currentBlk && !currentBlk.attachment) {
          return prev.map((b, i) =>
            i === targetIndex ? { ...b, attachment: newAttachment } : b
          );
        }

        const newBlk: NoteBlock = {
          id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          text: '',
          hierarchy: 'body',
          bold: false,
          italic: false,
          underline: false,
          strikethrough: false,
          listType: 'none',
          attachment: newAttachment,
        };
        const copy = [...prev];
        copy.splice(targetIndex + 1, 0, newBlk);
        return copy;
      });
    },
    [activeBlockId]
  );

  const handleAttachmentSelected = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          insertAttachmentAtActiveBlock({
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            dataUrl: reader.result,
            widthPx: 240,
            heightPx: 145,
          });
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleScreenshotPage = () => {
    const shot = createPageScreenshotDataUrl();
    insertAttachmentAtActiveBlock({
      id: `att-shot-${Date.now()}`,
      name: shot.name,
      dataUrl: shot.dataUrl,
      widthPx: 260,
      heightPx: 150,
    });
  };

  const handleAttachmentDragStart = (
    e: React.DragEvent,
    sourceBlockId: string
  ) => {
    setDraggedSourceBlockId(sourceBlockId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleBlockDragOver = (e: React.DragEvent, targetBlockId: string) => {
    if (!draggedSourceBlockId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTargetBlockId !== targetBlockId) {
      setDropTargetBlockId(targetBlockId);
    }
  };

  const handleBlockDrop = (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    if (!draggedSourceBlockId || draggedSourceBlockId === targetBlockId) {
      setDraggedSourceBlockId(null);
      setDropTargetBlockId(null);
      return;
    }

    setBlocks((prev) => {
      const sourceBlock = prev.find((b) => b.id === draggedSourceBlockId);
      const movingAttachment = sourceBlock?.attachment;
      if (!movingAttachment) return prev;

      const targetBlock = prev.find((b) => b.id === targetBlockId);

      if (targetBlock && !targetBlock.attachment) {
        return prev
          .map((b) => {
            if (b.id === draggedSourceBlockId) {
              return { ...b, attachment: undefined };
            }
            if (b.id === targetBlockId) {
              return { ...b, attachment: movingAttachment };
            }
            return b;
          })
          .filter(
            (b, _idx, arr) =>
              !(
                b.id === draggedSourceBlockId &&
                b.text === '' &&
                !b.attachment &&
                arr.length > 1
              )
          );
      }

      const withoutSource = prev.filter((b) => b.id !== draggedSourceBlockId);
      const targetIdx = withoutSource.findIndex((b) => b.id === targetBlockId);
      if (targetIdx < 0 || !sourceBlock) return prev;

      const reordered = [...withoutSource];
      reordered.splice(targetIdx, 0, sourceBlock);
      return reordered;
    });

    setDraggedSourceBlockId(null);
    setDropTargetBlockId(null);
  };

  const handleStartAttachmentResize = (
    e: React.MouseEvent,
    blockId: string,
    initialWidth: number,
    initialHeight: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const nextWidth = Math.max(
        110,
        Math.min(windowSize.width - 64, initialWidth + deltaX)
      );
      const nextHeight = Math.max(
        70,
        Math.min(480, (initialHeight || 140) + deltaY)
      );

      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId && b.attachment
            ? {
                ...b,
                attachment: {
                  ...b.attachment,
                  widthPx: nextWidth,
                  heightPx: nextHeight,
                },
              }
            : b
        )
      );
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleRemoveAttachment = (blockId: string) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, attachment: undefined } : b
      )
    );
  };

  const handleStartWindowResize = (
    e: React.MouseEvent,
    direction: 'right' | 'bottom' | 'corner'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = windowSize.width;
    const startHeight = windowSize.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      setWindowSize({
        width:
          direction === 'right' || direction === 'corner'
            ? Math.max(350, Math.min(820, startWidth + deltaX))
            : startWidth,
        height:
          direction === 'bottom' || direction === 'corner'
            ? Math.max(360, Math.min(860, startHeight + deltaY))
            : startHeight,
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const exportNotesAsMarkdown = useCallback(async () => {
    const markdownContent = serializeBlocksToMarkdown(blocks);
    const filename = 'study-notepad.md';

    if (window.electronAPI?.exportMarkdown) {
      try {
        const result = await window.electronAPI.exportMarkdown(
          markdownContent,
          filename
        );
        if (!result.canceled || result.filePath) {
          return;
        }
      } catch {
        // Fall back to browser download
      }
    }

    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [blocks]);

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
          window.innerWidth - 180,
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

  const isSynced = scratchpad.syncStatus === 'synced';
  let numberedListRun = 0;

  return (
    <>
      <div
        onMouseEnter={() => setInteractiveRegionHovered('scratchpad', true)}
        onMouseLeave={() => setInteractiveRegionHovered('scratchpad', false)}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${windowSize.width}px`,
          height: isScratchpadMinimized ? 'auto' : `${windowSize.height}px`,
        }}
        className="fixed z-50 flex flex-col rounded-[22px] bg-[#1A1626] border border-[#2C253E] shadow-[0_24px_60px_rgba(0,0,0,0.78)] text-white overflow-hidden select-none font-sans"
      >
        <input
          ref={attachmentInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleAttachmentSelected}
          className="hidden"
        />

        {/* 1. HEADER: "Notepad" */}
        <div
          onMouseDown={handleHeaderMouseDown}
          className="flex items-center justify-between border-b border-[#262038] bg-[#151120] px-5 py-3.5 cursor-move"
        >
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-[18px] font-bold tracking-tight text-white">
              Notepad
            </h2>

            <button
              type="button"
              data-no-drag="true"
              onClick={toggleSyncStatus}
              title="Click to toggle Cloud Synced / Offline status"
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
                isSynced
                  ? 'bg-[#0E362D] text-[#4ADE80] border border-[#17594A]'
                  : 'bg-[#3A2813] text-[#FBBF24] border border-[#5C3F1C]'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isSynced ? 'bg-[#4ADE80]' : 'bg-[#FBBF24]'
                }`}
              />
              <span>{isSynced ? 'Cloud Synced' : 'Offline · Local'}</span>
            </button>
          </div>

          <div
            data-no-drag="true"
            className="flex items-center gap-2.5"
          >
            <span className="text-[11px] font-medium text-[#9490A8]">
              {isSynced ? 'Synced just now' : 'Saved locally'}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setScratchpadMinimized(!isScratchpadMinimized)}
                title={
                  isScratchpadMinimized ? 'Expand Notepad' : 'Minimize Notepad'
                }
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0E0B16] text-[#B8B2CC] hover:bg-[#29233B] hover:text-white transition cursor-pointer"
              >
                <svg
                  width="11"
                  height="11"
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
                title="Close Notepad"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0E0B16] text-[#B8B2CC] hover:bg-[#3B1D2E] hover:text-white transition cursor-pointer"
              >
                <svg
                  width="11"
                  height="11"
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
        </div>

        {!isScratchpadMinimized && (
          <>
            {/* 2. HIERARCHY ROW */}
            <div className="flex items-center justify-between border-b border-[#231D34] bg-[#171324] px-5 py-2.5">
              <div className="flex items-center gap-1.5">
                {HIERARCHY_OPTIONS.map((item) => {
                  const isSelected = activeBlock?.hierarchy === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectHierarchy(item.id)}
                      className={`rounded-full px-3 py-1 text-[11.5px] font-semibold transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#A594F9] text-[#12111A] shadow-sm'
                          : 'bg-[#221C34] text-[#C4B5FD] hover:bg-[#2E2646] hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={exportNotesAsMarkdown}
                title="Export notes as Markdown (.md)"
                className="text-[11px] font-semibold text-[#A594F9] hover:text-[#C4B5FD] transition cursor-pointer"
              >
                Export .md
              </button>
            </div>

            {/* 3. FORMATTING TOOLBAR */}
            <div className="flex items-center justify-between border-b border-[#231D34] bg-[#1A1528] px-5 py-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleInlineFormat('bold')}
                  title="Bold"
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-[12.5px] font-bold transition cursor-pointer ${
                    activeBlock?.bold
                      ? 'bg-[#2A244D] text-white border border-[#A594F9]'
                      : 'bg-[#120E1C] text-[#C4B5FD] hover:bg-[#251E38] hover:text-white'
                  }`}
                >
                  B
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleInlineFormat('italic')}
                  title="Italic"
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-[12.5px] italic font-serif font-semibold transition cursor-pointer ${
                    activeBlock?.italic
                      ? 'bg-[#2A244D] text-white border border-[#A594F9]'
                      : 'bg-[#120E1C] text-[#C4B5FD] hover:bg-[#251E38] hover:text-white'
                  }`}
                >
                  I
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleInlineFormat('underline')}
                  title="Underline"
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-[12.5px] underline font-semibold transition cursor-pointer ${
                    activeBlock?.underline
                      ? 'bg-[#2A244D] text-white border border-[#A594F9]'
                      : 'bg-[#120E1C] text-[#C4B5FD] hover:bg-[#251E38] hover:text-white'
                  }`}
                >
                  U
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleInlineFormat('strikethrough')}
                  title="Strikethrough"
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-[12.5px] line-through font-semibold transition cursor-pointer ${
                    activeBlock?.strikethrough
                      ? 'bg-[#2A244D] text-white border border-[#A594F9]'
                      : 'bg-[#120E1C] text-[#C4B5FD] hover:bg-[#251E38] hover:text-white'
                  }`}
                >
                  S
                </button>

                <span className="mx-1 h-4 w-[1px] bg-[#2C253E]" />

                {/* Single Combined List Dropdown (≡ ⌵) */}
                <div className="relative" ref={listMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsListMenuOpen((prev) => !prev)}
                    title="List formatting options"
                    aria-expanded={isListMenuOpen}
                    className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold transition cursor-pointer ${
                      activeBlock?.listType && activeBlock.listType !== 'none'
                        ? 'bg-[#2A244D] text-white border border-[#A594F9]'
                        : 'bg-[#120E1C] text-[#C4B5FD] hover:bg-[#251E38] hover:text-white'
                    }`}
                  >
                    <span className="text-[13px] leading-none">≡</span>
                    <span className="text-[10px] leading-none">⌵</span>
                  </button>

                  {isListMenuOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1.5 w-44 rounded-xl border border-[#52438F] bg-[#232136] p-1.5 shadow-xl">
                      {LIST_DROPDOWN_OPTIONS.map((opt) => {
                        const isCurrent = activeBlock?.listType === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectListType(opt.id)}
                            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition cursor-pointer ${
                              isCurrent
                                ? 'bg-[#2A244D] text-white font-semibold'
                                : 'text-[#E2DFF0] hover:bg-[#2A244D]/60'
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="w-4 text-center font-bold text-[#A594F9]">
                                {opt.symbol}
                              </span>
                              <span>{opt.label}</span>
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] text-[#4ADE80]">
                                ●
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsClearModalOpen(true)}
                className="text-[11.5px] font-semibold text-[#9490A8] hover:text-red-400 transition cursor-pointer"
              >
                Clear
              </button>
            </div>

            {/* 4. CONTENT AREA */}
            <div className="flex-1 px-4 py-3 flex flex-col min-h-0">
              <div className="flex-1 rounded-xl bg-[#0B0912] border border-[#241E34] p-3.5 overflow-y-auto flex flex-col gap-1.5">
                {blocks.map((blk, idx) => {
                  if (blk.listType === 'numbered') {
                    numberedListRun += 1;
                  } else {
                    numberedListRun = 0;
                  }

                  const hierarchyClasses =
                    blk.hierarchy === 'title'
                      ? 'text-[17px] font-bold text-white tracking-tight'
                      : blk.hierarchy === 'heading'
                      ? 'text-[15px] font-bold text-[#F5F5F7]'
                      : blk.hierarchy === 'subheading'
                      ? 'text-[13.5px] font-semibold text-[#C4B5FD]'
                      : 'text-[13px] text-[#E2DFF0]';

                  const inlineClasses = [
                    blk.bold ? 'font-bold' : '',
                    blk.italic ? 'italic' : '',
                    blk.underline ? 'underline' : '',
                    blk.strikethrough || blk.checked
                      ? 'line-through opacity-60'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  const isDropTarget =
                    dropTargetBlockId === blk.id &&
                    draggedSourceBlockId !== blk.id;

                  const att = blk.attachment;

                  return (
                    <div
                      key={blk.id}
                      onClick={() => setActiveBlockId(blk.id)}
                      onDragOver={(e) => handleBlockDragOver(e, blk.id)}
                      onDrop={(e) => handleBlockDrop(e, blk.id)}
                      className={`group relative rounded-lg px-2 py-1 transition ${
                        isDropTarget
                          ? 'border-t-2 border-[#A594F9] bg-[#211A36]'
                          : activeBlockId === blk.id
                          ? 'bg-[#171326]/90'
                          : 'hover:bg-[#131020]/50'
                      }`}
                    >
                      {att && (
                        <div
                          draggable
                          onDragStart={(e) =>
                            handleAttachmentDragStart(e, blk.id)
                          }
                          style={{
                            width: `${att.widthPx}px`,
                            height: `${att.heightPx || 145}px`,
                          }}
                          className="relative my-1.5 flex max-w-full flex-col overflow-hidden rounded-xl border border-[#383052] bg-[#151120] p-1.5 shadow-md cursor-grab active:cursor-grabbing"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAttachment(blk.id);
                            }}
                            title="Remove attachment"
                            aria-label="Remove attachment"
                            className="absolute top-2.5 right-2.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-[#0E0B16]/85 border border-[#383052] text-[10px] text-[#B8B2CC] hover:bg-rose-500/80 hover:text-white transition cursor-pointer"
                          >
                            ✕
                          </button>

                          <img
                            src={att.dataUrl}
                            alt={att.name}
                            draggable={false}
                            className="w-full flex-1 min-h-0 rounded-lg object-cover bg-[#09070E]"
                          />

                          <div className="relative mt-1.5 flex items-center pr-5 pl-1">
                            <span className="w-full truncate text-[10.5px] font-medium text-[#9490A8]">
                              {att.name}
                            </span>
                          </div>

                          <div
                            onMouseDown={(e) =>
                              handleStartAttachmentResize(
                                e,
                                blk.id,
                                att.widthPx,
                                att.heightPx || 145
                              )
                            }
                            title="Drag to resize attachment horizontally or vertically"
                            className="absolute bottom-1 right-1 z-20 flex h-4 w-4 cursor-nwse-resize items-end justify-end p-0.5 text-[#9490A8] hover:text-[#A594F9]"
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 10 10"
                              fill="none"
                            >
                              <path
                                d="M9 1L1 9M9 5L5 9M9 8.5L8.5 9"
                                stroke="currentColor"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {blk.listType === 'bullet' && (
                          <span className="w-4 shrink-0 text-center text-[14px] font-bold text-[#A594F9]">
                            •
                          </span>
                        )}
                        {blk.listType === 'dash' && (
                          <span className="w-4 shrink-0 text-center text-[13px] font-bold text-[#A594F9]">
                            −
                          </span>
                        )}
                        {blk.listType === 'numbered' && (
                          <span className="w-5 shrink-0 text-right text-[12px] font-bold tabular-nums text-[#A594F9]">
                            {numberedListRun}.
                          </span>
                        )}
                        {blk.listType === 'checklist' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBlocks((prev) =>
                                prev.map((item) =>
                                  item.id === blk.id
                                    ? { ...item, checked: !item.checked }
                                    : item
                                )
                              );
                            }}
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] transition cursor-pointer ${
                              blk.checked
                                ? 'border-[#4ADE80] bg-[#4ADE80] text-[#0B0912] font-bold'
                                : 'border-[#5A5373] bg-[#141022] text-transparent hover:border-[#A594F9]'
                            }`}
                          >
                            ✔
                          </button>
                        )}

                        <input
                          ref={(el) => {
                            blockInputRefs.current[blk.id] = el;
                          }}
                          type="text"
                          value={blk.text}
                          onFocus={() => setActiveBlockId(blk.id)}
                          onChange={(e) =>
                            setBlocks((prev) =>
                              prev.map((item) =>
                                item.id === blk.id
                                  ? { ...item, text: e.target.value }
                                  : item
                              )
                            )
                          }
                          onKeyDown={(e) => handleBlockKeyDown(e, blk, idx)}
                          aria-label={`Notepad line ${idx + 1}`}
                          className={`w-full bg-transparent focus:outline-none select-text min-h-[22px] ${hierarchyClasses} ${inlineClasses}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. FOOTER */}
            <div className="relative flex items-center justify-between gap-2 border-t border-[#241E34] bg-[#151120] px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#52438F] bg-[#211B34] px-3 py-1.5 text-[11.5px] font-semibold text-[#E2DFF0] hover:bg-[#2C2445] hover:text-white transition cursor-pointer shadow-sm"
                >
                  <span className="text-[13px] font-bold text-[#A594F9]">
                    +
                  </span>
                  <span>Upload from desktop</span>
                </button>

                <button
                  type="button"
                  onClick={handleScreenshotPage}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#52438F] bg-[#1B162B] px-3 py-1.5 text-[11.5px] font-semibold text-[#C4B5FD] hover:bg-[#28203F] hover:text-white transition cursor-pointer shadow-sm"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>Screenshot Page</span>
                </button>
              </div>

              <span className="inline-flex items-center gap-1.5 pr-2 text-[11px] font-medium text-[#9490A8] shrink-0">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isSynced ? 'bg-[#4ADE80]' : 'bg-[#FBBF24]'
                  }`}
                />
                <span>{isSynced ? 'iPhone synced' : 'Saved locally'}</span>
              </span>
            </div>

            {/* Notepad Window Resize Handles */}
            <div
              onMouseDown={(e) => handleStartWindowResize(e, 'right')}
              className="absolute top-12 right-0 bottom-4 w-1.5 cursor-ew-resize"
            />
            <div
              onMouseDown={(e) => handleStartWindowResize(e, 'bottom')}
              className="absolute bottom-0 left-4 right-4 h-1.5 cursor-ns-resize"
            />
            <div
              onMouseDown={(e) => handleStartWindowResize(e, 'corner')}
              title="Drag to resize Notepad window"
              className="absolute bottom-1 right-1 z-30 flex h-4 w-4 cursor-nwse-resize items-end justify-end p-0.5 text-[#9490A8] hover:text-[#A594F9]"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M9 1L1 9M9 5L5 9M9 8.5L8.5 9"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal for Clearing All Notepad Content */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        title="Clear All Notepad Notes?"
        description="This will remove all current lines, checklists, and inline attachments from your Notepad. This action cannot be undone."
        confirmLabel="Clear Notepad"
        onConfirm={handleConfirmClearNotepad}
        onCancel={() => setIsClearModalOpen(false)}
      />
    </>
  );
};

export default Scratchpad;