// src/renderer/src/components/scratchpad/Scratchpad.tsx
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { useApp, SCRATCHPAD_STORAGE_KEY } from '../../context/AppContext';

export type NoteHierarchyType = 'title' | 'heading' | 'subheading' | 'body';
export type NoteListType = 'none' | 'bullet' | 'numbered' | 'checklist' | 'dash';

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
}

export interface NoteAttachment {
  id: string;
  name: string;
  dataUrl: string;
  addedAt: string;
}

const RICH_NOTES_BLOCKS_STORAGE_KEY = 'study_buddy_rich_note_blocks_v1';
const RICH_NOTES_ATTACHMENTS_STORAGE_KEY = 'study_buddy_rich_note_attachments_v1';

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

      if (blk.listType === 'bullet') return `• ${line}`;
      if (blk.listType === 'dash') return `- ${line}`;
      if (blk.listType === 'numbered') return `${numberedCounter}. ${line}`;
      if (blk.listType === 'checklist') {
        return `- [${blk.checked ? 'x' : ' '}] ${line}`;
      }

      if (blk.hierarchy === 'title') return `# ${line}`;
      if (blk.hierarchy === 'heading') return `## ${line}`;
      if (blk.hierarchy === 'subheading') return `### ${line}`;
      return line;
    })
    .join('\n');
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
      // Fall back to default structured blocks
    }
    return DEFAULT_NOTE_BLOCKS;
  });

  // Attachments State (Photos / Screenshots)
  const [attachments, setAttachments] = useState<NoteAttachment[]>(() => {
    try {
      const saved = localStorage.getItem(RICH_NOTES_ATTACHMENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as NoteAttachment[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore parse error
    }
    return [];
  });

  const [activeBlockId, setActiveBlockId] = useState<string>(
    () => blocks[0]?.id ?? 'blk-1'
  );
  const [isListMenuOpen, setIsListMenuOpen] = useState<boolean>(false);

  // Floating Window Coordinates
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 42,
    y: 52,
  });

  const dragOffsetRef = useRef<{ startX: number; startY: number } | null>(null);
  const listMenuRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const blockInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const activeBlock =
    blocks.find((b) => b.id === activeBlockId) ?? blocks[0];

  // Close the combined list dropdown when clicking outside
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

  // Debounced sync of blocks & attachments to localStorage and AppContext
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
          RICH_NOTES_ATTACHMENTS_STORAGE_KEY,
          JSON.stringify(attachments)
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
        // Ignore storage quota errors
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [blocks, attachments, scratchpad, updateScratchpadContent, updateScratchpadTitle]);

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
      checked: nextType === 'checklist' ? Boolean(activeBlock.checked) : undefined,
    });
    setIsListMenuOpen(false);
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
      blocks.length > 1
    ) {
      e.preventDefault();
      if (blk.listType !== 'none') {
        // First Backspace on empty list item converts it to normal body text
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

  const handleAttachmentSelected = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const newAttachment: NoteAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            dataUrl: reader.result,
            addedAt: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          };
          setAttachments((prev) => [...prev, newAttachment]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const exportNotesAsMarkdown = useCallback(async () => {
    const markdownContent = serializeBlocksToMarkdown(blocks);
    const filename = 'study-notes.md';

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
          window.innerWidth - 430,
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
    <div
      onMouseEnter={() => setInteractiveRegionHovered('scratchpad', true)}
      onMouseLeave={() => setInteractiveRegionHovered('scratchpad', false)}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '420px',
        height: isScratchpadMinimized ? 'auto' : '560px',
      }}
      className="fixed z-50 flex flex-col rounded-[22px] bg-[#1A1626] border border-[#2C253E] shadow-[0_24px_60px_rgba(0,0,0,0.78)] text-white overflow-hidden select-none transition-[height] duration-200"
    >
      {/* Hidden File Input for Photo / Screenshot Attachment */}
      <input
        ref={attachmentInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleAttachmentSelected}
        className="hidden"
      />

      {/* 1. HEADER: "Notes", "Cloud Synced" green pill badge, and right-aligned sync status */}
      <div
        onMouseDown={handleHeaderMouseDown}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        className="flex items-center justify-between border-b border-[#262038] bg-[#151120] px-5 py-3.5 cursor-move"
      >
        <div className="flex items-center gap-2.5">
          <h2 className="text-[18px] font-bold tracking-tight text-white">
            Notes
          </h2>

          {/* Cloud Synced Green Pill Badge */}
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

        {/* Right-Aligned Sync Status & Window Controls */}
        <div
          data-no-drag="true"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="flex items-center gap-2.5"
        >
          <span className="text-[11px] font-medium text-[#8E87A8]">
            {isSynced ? 'Synced just now' : 'Saved locally'}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setScratchpadMinimized(!isScratchpadMinimized)}
              title={isScratchpadMinimized ? 'Expand Notes' : 'Minimize Notes'}
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
              title="Close Notes"
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
          {/* 2. HIERARCHY ROW: Title, Heading, Subheading, Body selector pills */}
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
                        ? 'bg-[#A594F9] text-[#171329] shadow-sm'
                        : 'bg-[#221C34] text-[#B8B2CC] hover:bg-[#2E2646] hover:text-white'
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

          {/* 3. FORMATTING TOOLBAR: B, I, U, S + Single Combined List Dropdown (≡ ⌵) */}
          <div className="flex items-center justify-between border-b border-[#231D34] bg-[#1A1528] px-5 py-2">
            <div className="flex items-center gap-1.5">
              {/* Bold (B) */}
              <button
                type="button"
                onClick={() => handleToggleInlineFormat('bold')}
                title="Bold"
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-[12.5px] font-bold transition cursor-pointer ${
                  activeBlock?.bold
                    ? 'bg-[#3C3173] text-white border border-[#A594F9]'
                    : 'bg-[#120E1C] text-[#B8B2CC] hover:bg-[#251E38] hover:text-white'
                }`}
              >
                B
              </button>

              {/* Italic (I) */}
              <button
                type="button"
                onClick={() => handleToggleInlineFormat('italic')}
                title="Italic"
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-[12.5px] italic font-serif font-semibold transition cursor-pointer ${
                  activeBlock?.italic
                    ? 'bg-[#3C3173] text-white border border-[#A594F9]'
                    : 'bg-[#120E1C] text-[#B8B2CC] hover:bg-[#251E38] hover:text-white'
                }`}
              >
                I
              </button>

              {/* Underline (U) */}
              <button
                type="button"
                onClick={() => handleToggleInlineFormat('underline')}
                title="Underline"
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-[12.5px] underline font-semibold transition cursor-pointer ${
                  activeBlock?.underline
                    ? 'bg-[#3C3173] text-white border border-[#A594F9]'
                    : 'bg-[#120E1C] text-[#B8B2CC] hover:bg-[#251E38] hover:text-white'
                }`}
              >
                U
              </button>

              {/* Strikethrough (S) */}
              <button
                type="button"
                onClick={() => handleToggleInlineFormat('strikethrough')}
                title="Strikethrough"
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-[12.5px] line-through font-semibold transition cursor-pointer ${
                  activeBlock?.strikethrough
                    ? 'bg-[#3C3173] text-white border border-[#A594F9]'
                    : 'bg-[#120E1C] text-[#B8B2CC] hover:bg-[#251E38] hover:text-white'
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
                      ? 'bg-[#3C3173] text-white border border-[#A594F9]'
                      : 'bg-[#120E1C] text-[#B8B2CC] hover:bg-[#251E38] hover:text-white'
                  }`}
                >
                  <span className="text-[13px] leading-none">≡</span>
                  <span className="text-[10px] leading-none">⌵</span>
                </button>

                {isListMenuOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1.5 w-44 rounded-xl border border-[#3B3256] bg-[#151122] p-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.75)]">
                    {LIST_DROPDOWN_OPTIONS.map((opt) => {
                      const isCurrent = activeBlock?.listType === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectListType(opt.id)}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition cursor-pointer ${
                            isCurrent
                              ? 'bg-[#3C3173] text-white font-semibold'
                              : 'text-[#DDD8F3] hover:bg-[#241E38]'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="w-4 text-center font-bold text-[#A594F9]">
                              {opt.symbol}
                            </span>
                            <span>{opt.label}</span>
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] text-[#4ADE80]">●</span>
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
              onClick={() => {
                const resetId = `blk-${Date.now()}`;
                setBlocks([
                  {
                    id: resetId,
                    text: '',
                    hierarchy: 'title',
                    bold: true,
                    italic: false,
                    underline: false,
                    strikethrough: false,
                    listType: 'none',
                  },
                ]);
                setAttachments([]);
                setActiveBlockId(resetId);
              }}
              className="text-[11.5px] font-medium text-[#8E87A8] hover:text-rose-300 transition cursor-pointer"
            >
              Clear
            </button>
          </div>

          {/* 4. CONTENT AREA: Formatted Blocks, Checklists, and Interactive Attachments */}
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
                    ? 'text-[15px] font-bold text-[#F3F1FA]'
                    : blk.hierarchy === 'subheading'
                    ? 'text-[13.5px] font-semibold text-[#C4B5FD]'
                    : 'text-[13px] text-[#DFDCF0]';

                const inlineClasses = [
                  blk.bold ? 'font-bold' : '',
                  blk.italic ? 'italic' : '',
                  blk.underline ? 'underline' : '',
                  blk.strikethrough || blk.checked ? 'line-through opacity-60' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <div
                    key={blk.id}
                    onClick={() => setActiveBlockId(blk.id)}
                    className={`group flex items-center gap-2 rounded-lg px-2 py-1 transition ${
                      activeBlockId === blk.id
                        ? 'bg-[#171326]/90'
                        : 'hover:bg-[#131020]/50'
                    }`}
                  >
                    {/* List Prefix Indicator or Interactive Checkbox */}
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
                      placeholder={
                        idx === 0
                          ? 'Note title or topic...'
                          : 'Type notes or press Enter for new line...'
                      }
                      className={`w-full bg-transparent focus:outline-none select-text placeholder-[#4B4463] ${hierarchyClasses} ${inlineClasses}`}
                    />
                  </div>
                );
              })}

              {/* Interactive Attachments Section */}
              {attachments.length > 0 && (
                <div className="mt-3 border-t border-[#221C33] pt-3 flex flex-col gap-2">
                  <span className="text-[11px] font-semibold text-[#8E87A8]">
                    Attachments ({attachments.length})
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="group relative flex flex-col overflow-hidden rounded-xl border border-[#2E2744] bg-[#151120] p-1.5"
                      >
                        <img
                          src={att.dataUrl}
                          alt={att.name}
                          className="h-20 w-full rounded-lg object-cover bg-[#09070E]"
                        />
                        <div className="mt-1.5 flex items-center justify-between px-1">
                          <span className="truncate text-[10.5px] font-medium text-[#DDD8F3]">
                            {att.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att.id)}
                            title="Remove attachment"
                            className="ml-1 text-[10px] text-[#8E87A8] hover:text-rose-400 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5. FOOTER: "+ Attach (photo or screenshot)" pill button & bottom-right sync indicator */}
          <div className="flex items-center justify-between border-t border-[#241E34] bg-[#151120] px-5 py-3">
            <button
              type="button"
              onClick={() => attachmentInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#3E345B] bg-[#211B34] px-3.5 py-1.5 text-[11.5px] font-semibold text-[#E2DFF0] hover:bg-[#2C2445] hover:text-white transition cursor-pointer shadow-sm"
            >
              <span className="text-[13px] font-bold text-[#A594F9]">+</span>
              <span>Attach (photo or screenshot)</span>
            </button>

            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#8E87A8]">
              <span
                className={`h-2 w-2 rounded-full ${
                  isSynced ? 'bg-[#4ADE80]' : 'bg-[#FBBF24]'
                }`}
              />
              <span>
                {isSynced ? 'iPhone synced' : 'Saved locally'}
              </span>
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default Scratchpad;