// src/renderer/src/components/views/ScheduleView.tsx
import React, { useState, useRef } from 'react';

export interface TimeBlockSchedule {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  days: string[];
  preset: 'Quick 25/5' | 'Standard 45/5' | 'Deep 60/10' | 'Custom';
  customFocusMinutes?: number;
  customBreakMinutes?: number;
}

export interface SmartActivationTarget {
  id: string;
  kind: 'app' | 'website';
  tagName: string;
  targetPathOrUrl: string;
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const PRESET_OPTIONS: ReadonlyArray<TimeBlockSchedule['preset']> = [
  'Quick 25/5',
  'Standard 45/5',
  'Deep 60/10',
  'Custom',
];

const INITIAL_BLOCKS: TimeBlockSchedule[] = [
  {
    id: 'sched-1',
    title: 'Morning UX Studio & Wireframing',
    startTime: '09:00',
    endTime: '11:30',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    preset: 'Standard 45/5',
  },
  {
    id: 'sched-2',
    title: 'Afternoon Coursework & Reading',
    startTime: '14:00',
    endTime: '16:00',
    days: ['Mon', 'Wed', 'Fri'],
    preset: 'Quick 25/5',
  },
  {
    id: 'sched-3',
    title: 'Evening Deep Focus Sprint',
    startTime: '19:30',
    endTime: '21:00',
    days: ['Tue', 'Thu', 'Sun'],
    preset: 'Deep 60/10',
  },
];

const INITIAL_SMART_TARGETS: SmartActivationTarget[] = [
  {
    id: 'sa-1',
    kind: 'app',
    tagName: 'Figma (UI Design)',
    targetPathOrUrl: 'Figma.exe',
  },
  {
    id: 'sa-2',
    kind: 'app',
    tagName: 'VS Code (Development)',
    targetPathOrUrl: 'Code.exe',
  },
  {
    id: 'sa-3',
    kind: 'app',
    tagName: 'Unity 6 (Game Dev)',
    targetPathOrUrl: 'Unity.exe',
  },
  {
    id: 'sa-4',
    kind: 'website',
    tagName: 'University Canvas',
    targetPathOrUrl: 'canvas.instructure.com',
  },
  {
    id: 'sa-5',
    kind: 'website',
    tagName: 'Notion Workspace',
    targetPathOrUrl: 'notion.so',
  },
  {
    id: 'sa-6',
    kind: 'website',
    tagName: 'Coursera Lectures',
    targetPathOrUrl: 'coursera.org',
  },
];

function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const hour24 = parseInt(hStr || '9', 10);
  const minute = mStr || '00';
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${String(hour12).padStart(2, '0')}:${minute} ${period}`;
}

export const ScheduleView: React.FC = () => {
  const [blocks, setBlocks] = useState<TimeBlockSchedule[]>(INITIAL_BLOCKS);
  const [smartTargets, setSmartTargets] = useState<SmartActivationTarget[]>(
    INITIAL_SMART_TARGETS
  );

  // Add / Edit Time Block Modal State
  const [isBlockModalOpen, setIsBlockModalOpen] = useState<boolean>(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockTitle, setBlockTitle] = useState<string>('');
  const [blockStart, setBlockStart] = useState<string>('09:00');
  const [blockEnd, setBlockEnd] = useState<string>('11:00');
  const [blockDays, setBlockDays] = useState<string[]>([
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
  ]);
  const [blockPreset, setBlockPreset] =
    useState<TimeBlockSchedule['preset']>('Standard 45/5');

  // Custom Time Drawer State inside Schedule Modal
  const [isCustomTimeDrawerOpen, setIsCustomTimeDrawerOpen] =
    useState<boolean>(false);
  const [customFocusMinutes, setCustomFocusMinutes] = useState<number>(35);
  const [customBreakMinutes, setCustomBreakMinutes] = useState<number>(8);

  // Smart Activation Add Form State
  const [addTargetKind, setAddTargetKind] = useState<'website' | 'app'>(
    'website'
  );
  const [customTagName, setCustomTagName] = useState<string>('');
  const [targetUrlOrAppName, setTargetUrlOrAppName] = useState<string>('');
  const appFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenAddBlockModal = () => {
    setEditingBlockId(null);
    setBlockTitle('');
    setBlockStart('09:00');
    setBlockEnd('11:00');
    setBlockDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    setBlockPreset('Standard 45/5');
    setCustomFocusMinutes(35);
    setCustomBreakMinutes(8);
    setIsCustomTimeDrawerOpen(false);
    setIsBlockModalOpen(true);
  };

  const handleOpenEditBlockModal = (block: TimeBlockSchedule) => {
    setEditingBlockId(block.id);
    setBlockTitle(block.title);
    setBlockStart(block.startTime);
    setBlockEnd(block.endTime);
    setBlockDays(block.days);
    setBlockPreset(block.preset);
    setCustomFocusMinutes(block.customFocusMinutes ?? 35);
    setCustomBreakMinutes(block.customBreakMinutes ?? 8);
    setIsCustomTimeDrawerOpen(block.preset === 'Custom');
    setIsBlockModalOpen(true);
  };

  const toggleBlockDay = (day: string) => {
    setBlockDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSaveBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockTitle.trim()) return;

    const payload: TimeBlockSchedule = {
      id: editingBlockId ?? `sched-${Date.now()}`,
      title: blockTitle.trim(),
      startTime: blockStart || '09:00',
      endTime: blockEnd || '11:00',
      days:
        blockDays.length > 0 ? blockDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      preset: blockPreset,
      customFocusMinutes:
        blockPreset === 'Custom' ? customFocusMinutes : undefined,
      customBreakMinutes:
        blockPreset === 'Custom' ? customBreakMinutes : undefined,
    };

    if (editingBlockId) {
      setBlocks((prev) =>
        prev.map((b) => (b.id === editingBlockId ? payload : b))
      );
    } else {
      setBlocks((prev) => [...prev, payload]);
    }

    setIsBlockModalOpen(false);
  };

  const handleDeleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setIsBlockModalOpen(false);
  };

  // Smart Activation Handlers
  const handleAppFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTargetUrlOrAppName(file.name);
    if (!customTagName.trim()) {
      const cleanName = file.name.replace(/\.(exe|app|lnk|dmg)$/i, '');
      setCustomTagName(cleanName);
    }
    e.target.value = '';
  };

  const handleAddSmartTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTagName.trim() || !targetUrlOrAppName.trim()) return;

    const created: SmartActivationTarget = {
      id: `sa-${Date.now()}`,
      kind: addTargetKind,
      tagName: customTagName.trim(),
      targetPathOrUrl: targetUrlOrAppName.trim(),
    };

    setSmartTargets((prev) => [...prev, created]);
    setCustomTagName('');
    setTargetUrlOrAppName('');
  };

  const handleRemoveSmartTarget = (id: string) => {
    setSmartTargets((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="relative flex flex-col gap-6 p-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight text-white">
            Study Schedule & Smart Activation
          </h2>
          <p className="mt-1 text-[13px] text-[#9E97B8]">
            Pair recurring time blocks with monitored study tools for hands-free session activation.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddBlockModal}
          className="flex items-center gap-1.5 rounded-xl bg-[#A594F9] px-4 py-2 text-[12.5px] font-bold text-[#171329] shadow-md hover:bg-[#B5A7FA] transition cursor-pointer"
        >
          <span>+ Add time block</span>
        </button>
      </div>

      {/* Prominent Explanatory Concept Callout */}
      <blockquote className="flex items-start gap-3.5 rounded-2xl border border-[#4E4187] bg-[#211A36]/90 px-4 py-3.5 text-[13px] leading-relaxed text-[#EAE6F8] shadow-inner">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3C3173] text-[13px] text-[#A594F9] font-bold">
          ✦
        </span>
        <p className="italic">
          &ldquo;Mambo activates automatically during your scheduled blocks when
          you launch one of your monitored apps or websites. For ad-hoc focus
          sprints, start a session manually in the Session tab.&rdquo;
        </p>
      </blockquote>

      {/* Scheduled Time Blocks Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[14.5px] font-bold text-[#E2DFF0]">
            Scheduled Time Blocks ({blocks.length})
          </h3>
          <span className="text-[11.5px] text-[#8E87A8]">
            Click the pencil icon to edit or remove a block
          </span>
        </div>

        {blocks.map((block) => {
          const presetDisplay =
            block.preset === 'Custom'
              ? `Custom ${block.customFocusMinutes ?? 35}/${
                  block.customBreakMinutes ?? 8
                }`
              : block.preset;

          return (
            <div
              key={block.id}
              onClick={() => handleOpenEditBlockModal(block)}
              className="flex items-center justify-between rounded-2xl border border-[#342C4C] bg-[#181424] p-4 hover:border-[#524578] transition cursor-pointer"
            >
              <div>
                <div className="flex items-center gap-2.5">
                  <p className="text-[15px] font-bold text-white">
                    {block.title}
                  </p>
                  <span className="rounded-full bg-[#261E42] px-2.5 py-0.5 text-[11px] font-semibold text-[#A594F9]">
                    {presetDisplay}
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] font-medium text-[#9E97B8]">
                  {formatTime12h(block.startTime)} –{' '}
                  {formatTime12h(block.endTime)}
                </p>

                <div className="mt-2.5 flex items-center gap-1.5">
                  {ALL_DAYS.map((d) => {
                    const active = block.days.includes(d);
                    return (
                      <span
                        key={d}
                        className={`rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${
                          active
                            ? 'bg-[#3C3173] text-white'
                            : 'bg-[#110E1A] text-[#6E678A]'
                        }`}
                      >
                        {d}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Edit Icon (Pencil) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEditBlockModal(block);
                }}
                title={`Edit ${block.title}`}
                aria-label={`Edit ${block.title}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#383052] bg-[#1F1A30] text-[#C4B5FD] hover:bg-[#A594F9] hover:text-[#171329] hover:border-[#A594F9] transition cursor-pointer"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Smart Activation Management (Apps & Websites) */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[#2C253E] bg-[#181424] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-white">
              Smart Activation Monitored Apps & Websites
            </h3>
            <p className="mt-0.5 text-[12px] text-[#9E97B8]">
              Opening any of these during an active schedule block wakes Mambo automatically.
            </p>
          </div>
          <span className="rounded-full bg-[#241E36] px-3 py-1 text-[11.5px] font-semibold text-[#4ADE80]">
            {smartTargets.length} monitored targets
          </span>
        </div>

        {/* Add Custom Website or App Form */}
        <form
          onSubmit={handleAddSmartTarget}
          className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[#2A233D] bg-[#120F1D] p-3"
        >
          <div className="flex rounded-lg bg-[#1A1528] p-0.5 border border-[#2E2744]">
            <button
              type="button"
              onClick={() => setAddTargetKind('website')}
              className={`rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition cursor-pointer ${
                addTargetKind === 'website'
                  ? 'bg-[#A594F9] text-[#171329]'
                  : 'text-[#9E97B8] hover:text-white'
              }`}
            >
              Website
            </button>
            <button
              type="button"
              onClick={() => setAddTargetKind('app')}
              className={`rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition cursor-pointer ${
                addTargetKind === 'app'
                  ? 'bg-[#A594F9] text-[#171329]'
                  : 'text-[#9E97B8] hover:text-white'
              }`}
            >
              Desktop App
            </button>
          </div>

          <input
            type="text"
            value={customTagName}
            onChange={(e) => setCustomTagName(e.target.value)}
            placeholder={
              addTargetKind === 'website'
                ? 'Custom Tag Name (e.g., University Canvas)'
                : 'Custom Tag Name (e.g., VS Code (Development))'
            }
            className="flex-1 min-w-[190px] rounded-lg border border-[#322A4B] bg-[#0E0B16] px-3 py-1.5 text-[12.5px] text-white placeholder-[#5A5373] focus:border-[#A594F9] focus:outline-none select-text"
          />

          <div className="flex flex-1 min-w-[210px] items-center gap-1.5">
            <input
              type="text"
              value={targetUrlOrAppName}
              onChange={(e) => setTargetUrlOrAppName(e.target.value)}
              placeholder={
                addTargetKind === 'website'
                  ? 'Target URL (e.g., canvas.instructure.com)'
                  : 'Executable or app name (e.g., Code.exe)'
              }
              className="w-full rounded-lg border border-[#322A4B] bg-[#0E0B16] px-3 py-1.5 text-[12.5px] text-white placeholder-[#5A5373] focus:border-[#A594F9] focus:outline-none select-text"
            />

            {addTargetKind === 'app' && (
              <>
                <input
                  ref={appFileInputRef}
                  type="file"
                  onChange={handleAppFilePicked}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => appFileInputRef.current?.click()}
                  title="Browse local application executable"
                  className="shrink-0 rounded-lg border border-[#3B3354] bg-[#1E192D] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#C4B5FD] hover:bg-[#2A233F] hover:text-white transition cursor-pointer"
                >
                  Browse…
                </button>
              </>
            )}
          </div>

          <button
            type="submit"
            className="rounded-lg bg-[#A594F9] px-3.5 py-1.5 text-[12px] font-bold text-[#171329] hover:bg-[#B5A7FA] transition cursor-pointer"
          >
            + Add
          </button>
        </form>

        {/* Monitored Chips List with Removal Trigger ('✕') */}
        <div className="flex flex-wrap gap-2.5">
          {smartTargets.map((target) => (
            <div
              key={target.id}
              className="group flex items-center gap-2 rounded-xl border border-[#3E3268] bg-[#261E42] px-3 py-2 text-[12.5px] font-semibold text-white shadow-sm"
            >
              <span className="text-[12px]">
                {target.kind === 'website' ? '🌐' : '💻'}
              </span>
              <span>{target.tagName}</span>
              <span className="rounded bg-[#171229] px-1.5 py-0.5 text-[10.5px] font-normal text-[#A594F9]">
                {target.targetPathOrUrl}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveSmartTarget(target.id)}
                title={`Remove ${target.tagName}`}
                aria-label={`Remove ${target.tagName}`}
                className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-[#9E97B8] hover:bg-rose-500/30 hover:text-rose-200 transition cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Schedule Time Block Modal */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm">
          <form
            onSubmit={handleSaveBlock}
            className="w-[460px] rounded-2xl border border-[#4E4187] bg-[#1A1626] p-5 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-[#2C253E] pb-3">
              <h3 className="text-[16px] font-bold text-white">
                {editingBlockId
                  ? 'Edit Schedule Time Block'
                  : 'New Schedule Time Block'}
              </h3>
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                className="text-[#8E87A8] hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Block Title */}
            <div>
              <label className="block text-[12px] font-medium text-[#B8B2CC]">
                Block Title
              </label>
              <input
                type="text"
                required
                value={blockTitle}
                onChange={(e) => setBlockTitle(e.target.value)}
                placeholder="e.g., Morning UX Studio & Wireframing"
                className="mt-1.5 w-full rounded-xl border border-[#322A4B] bg-[#0E0B16] px-3 py-2 text-[13px] text-white placeholder-[#5A5373] focus:border-[#A594F9] focus:outline-none select-text"
              />
            </div>

            {/* Start & End Time Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-[#B8B2CC]">
                  Start Time
                </label>
                <input
                  type="time"
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#322A4B] bg-[#0E0B16] px-3 py-2 text-[13px] text-white focus:border-[#A594F9] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#B8B2CC]">
                  End Time
                </label>
                <input
                  type="time"
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#322A4B] bg-[#0E0B16] px-3 py-2 text-[13px] text-white focus:border-[#A594F9] focus:outline-none"
                />
              </div>
            </div>

            {/* Active Days (Mon-Sun Pills) */}
            <div>
              <span className="block text-[12px] font-medium text-[#B8B2CC]">
                Active Days
              </span>
              <div className="mt-2 grid grid-cols-7 gap-1.5">
                {ALL_DAYS.map((day) => {
                  const selected = blockDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleBlockDay(day)}
                      className={`h-8 rounded-lg text-[11.5px] font-bold transition cursor-pointer ${
                        selected
                          ? 'bg-[#A594F9] text-[#171329]'
                          : 'border border-[#2A233D] bg-[#120F1D] text-[#8E87A8] hover:text-white'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Session Preset Selector + Dynamic "Set Custom Time" Drawer */}
            <div>
              <span className="block text-[12px] font-medium text-[#B8B2CC]">
                Session Preset
              </span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {PRESET_OPTIONS.map((preset) => {
                  const active = blockPreset === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setBlockPreset(preset);
                        if (preset !== 'Custom') {
                          setIsCustomTimeDrawerOpen(false);
                        }
                      }}
                      className={`rounded-xl border px-3 py-2 text-[12px] font-semibold transition cursor-pointer ${
                        active
                          ? 'border-[#A594F9] bg-[#261E42] text-white'
                          : 'border-[#2A233D] bg-[#120F1D] text-[#8E87A8] hover:text-white'
                      }`}
                    >
                      {preset === 'Custom' && active
                        ? `Custom (${customFocusMinutes}m / ${customBreakMinutes}m)`
                        : preset}
                    </button>
                  );
                })}
              </div>

              {/* Dynamically Revealed "Set Custom Time" Button & Stepper Drawer */}
              {blockPreset === 'Custom' && (
                <div className="mt-2.5 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setIsCustomTimeDrawerOpen((prev) => !prev)
                    }
                    className="flex w-full items-center justify-between rounded-xl border border-[#4E4187] bg-[#211A36] px-3.5 py-2 text-[12px] font-semibold text-[#C4B5FD] hover:bg-[#2B2246] hover:text-white transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span>⏱ Set Custom Time</span>
                      <span className="rounded-md bg-[#141022] px-2 py-0.5 text-[11px] font-bold text-[#A594F9]">
                        {customFocusMinutes}m study · {customBreakMinutes}m break
                      </span>
                    </span>
                    <span className="text-[11px]">
                      {isCustomTimeDrawerOpen ? '▴' : '▾'}
                    </span>
                  </button>

                  {isCustomTimeDrawerOpen && (
                    <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#352C50] bg-[#120F1D] p-3">
                      <div className="flex flex-col justify-between">
                        <span className="text-[11px] font-medium text-[#9E97B8]">
                          Study Duration
                        </span>
                        <div className="mt-2 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              setCustomFocusMinutes((m) => Math.max(5, m - 5))
                            }
                            className="flex h-6 w-6 items-center justify-center rounded bg-[#241E36] font-bold text-white hover:bg-[#352C50] cursor-pointer"
                          >
                            −
                          </button>
                          <span className="text-[13px] font-bold tabular-nums text-white">
                            {customFocusMinutes} min
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomFocusMinutes((m) =>
                                Math.min(180, m + 5)
                              )
                            }
                            className="flex h-6 w-6 items-center justify-center rounded bg-[#241E36] font-bold text-white hover:bg-[#352C50] cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between">
                        <span className="text-[11px] font-medium text-[#9E97B8]">
                          Break Duration
                        </span>
                        <div className="mt-2 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              setCustomBreakMinutes((b) => Math.max(1, b - 1))
                            }
                            className="flex h-6 w-6 items-center justify-center rounded bg-[#241E36] font-bold text-white hover:bg-[#352C50] cursor-pointer"
                          >
                            −
                          </button>
                          <span className="text-[13px] font-bold tabular-nums text-white">
                            {customBreakMinutes} min
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomBreakMinutes((b) => Math.min(60, b + 1))
                            }
                            className="flex h-6 w-6 items-center justify-center rounded bg-[#241E36] font-bold text-white hover:bg-[#352C50] cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="mt-2 flex items-center justify-between pt-2 border-t border-[#262038]">
              {editingBlockId ? (
                <button
                  type="button"
                  onClick={() => handleDeleteBlock(editingBlockId)}
                  className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-3.5 py-2 text-[12px] font-semibold text-rose-200 hover:bg-rose-500/30 transition cursor-pointer"
                >
                  Delete Block
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  className="rounded-xl border border-[#383052] bg-[#120F1D] px-4 py-2 text-[12.5px] font-semibold text-[#B8B2CC] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#A594F9] px-4 py-2 text-[12.5px] font-bold text-[#171329] hover:bg-[#B5A7FA] cursor-pointer"
                >
                  {editingBlockId ? 'Save Changes' : 'Create Block'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ScheduleView;