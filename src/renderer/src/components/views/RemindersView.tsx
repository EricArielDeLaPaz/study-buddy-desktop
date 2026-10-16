// src/renderer/src/components/views/RemindersView.tsx
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  loadUserBuddyPresets,
  UserBuddyPreset,
} from './BuddyStudioView';

export interface HabitReminderItem {
  id: string;
  name: string;
  frequencyMinutes: number;
  durationMinutes: number;
  activeDays: number[]; // 0..6 for M T W T F S S
  message: string;
  icon: string;
  characterType: 'developer' | 'custom';
  animationSlotLabel: string;
}

const DEVELOPER_ANIMATION_OPTIONS = [
  'Reminder · Drinking water (Default)',
  'Reminder · Waving / Stretch',
  'Idle · Studying Loop',
  'Success · Celebrating Bounce',
  'Status · Nudge Alert',
] as const;

const DEFAULT_REMINDERS_ROSTER: HabitReminderItem[] = [
  {
    id: 'rem-water',
    name: 'Drink Water',
    frequencyMinutes: 30,
    durationMinutes: 5,
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    message: "Wohoo good job so far, don't forget to rehydrate!",
    icon: '💧',
    characterType: 'developer',
    animationSlotLabel: 'Reminder · Drinking water (Default)',
  },
  {
    id: 'rem-bathroom',
    name: 'Bathroom Break',
    frequencyMinutes: 60,
    durationMinutes: 10,
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    message: 'Bathroom Break time!',
    icon: '🚻',
    characterType: 'developer',
    animationSlotLabel: 'Reminder · Waving / Stretch',
  },
  {
    id: 'rem-posture',
    name: 'Posture Check',
    frequencyMinutes: 25,
    durationMinutes: 2,
    activeDays: [0, 1, 2, 3, 4],
    message: 'Sit tall, relax your shoulders, and align your screen.',
    icon: '🪑',
    characterType: 'developer',
    animationSlotLabel: 'Idle · Studying Loop',
  },
  {
    id: 'rem-stretch',
    name: 'Stretch',
    frequencyMinutes: 45,
    durationMinutes: 5,
    activeDays: [0, 1, 2, 3, 4],
    message: 'Roll your shoulders and stretch your wrists!',
    icon: '🧘',
    characterType: 'developer',
    animationSlotLabel: 'Reminder · Waving / Stretch',
  },
];

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const ICON_CHOICES = ['💧', '🚻', '🪑', '🧘', '🚶', '🌬️', '📝', '🍵'] as const;

export const RemindersView: React.FC = () => {
  const { triggerOverlay } = useApp();

  const [reminders, setReminders] = useState<HabitReminderItem[]>(
    DEFAULT_REMINDERS_ROSTER
  );

  const [userPresets] = useState<UserBuddyPreset[]>(loadUserBuddyPresets);
  const customBuddies = userPresets.filter((p) => p.source === 'Custom');

  // Build custom animation sequence options from user-created custom buddies
  const customAnimationOptions: string[] =
    customBuddies.length > 0
      ? customBuddies.flatMap((buddy) => [
          `${buddy.name} · Custom Hydration Sequence`,
          `${buddy.name} · Custom Break Sequence`,
          `${buddy.name} · Custom Idle Sequence`,
          `${buddy.name} · Custom Alert Sequence`,
        ])
      : [
          'Midnight Matcha · Custom Hydration Sequence',
          'Midnight Matcha · Custom Break Sequence',
        ];

  const [editingReminderId, setEditingReminderId] = useState<string | null>(
    DEFAULT_REMINDERS_ROSTER[0].id
  );

  // Right-Side Form Fields
  const [formName, setFormName] = useState<string>(
    DEFAULT_REMINDERS_ROSTER[0].name
  );
  const [formFrequency, setFormFrequency] = useState<number>(
    DEFAULT_REMINDERS_ROSTER[0].frequencyMinutes
  );
  const [formDuration, setFormDuration] = useState<number>(
    DEFAULT_REMINDERS_ROSTER[0].durationMinutes
  );
  const [formActiveDays, setFormActiveDays] = useState<number[]>(
    DEFAULT_REMINDERS_ROSTER[0].activeDays
  );
  const [formMessage, setFormMessage] = useState<string>(
    DEFAULT_REMINDERS_ROSTER[0].message
  );
  const [formIcon, setFormIcon] = useState<string>(
    DEFAULT_REMINDERS_ROSTER[0].icon
  );
  const [formCharacterType, setFormCharacterType] = useState<
    'developer' | 'custom'
  >(DEFAULT_REMINDERS_ROSTER[0].characterType);
  const [formAnimationSlot, setFormAnimationSlot] = useState<string>(
    DEFAULT_REMINDERS_ROSTER[0].animationSlotLabel
  );

  const handleEditReminderClick = (item: HabitReminderItem) => {
    setEditingReminderId(item.id);
    setFormName(item.name);
    setFormFrequency(item.frequencyMinutes);
    setFormDuration(item.durationMinutes);
    setFormActiveDays(item.activeDays);
    setFormMessage(item.message);
    setFormIcon(item.icon);
    setFormCharacterType(item.characterType);
    setFormAnimationSlot(item.animationSlotLabel);
  };

  const handleStartNewReminder = () => {
    setEditingReminderId(null);
    setFormName('');
    setFormFrequency(30);
    setFormDuration(5);
    setFormActiveDays([0, 1, 2, 3, 4]);
    setFormMessage('');
    setFormIcon('💧');
    setFormCharacterType('developer');
    setFormAnimationSlot(DEVELOPER_ANIMATION_OPTIONS[0]);
  };

  const handleSwitchCharacterType = (type: 'developer' | 'custom') => {
    setFormCharacterType(type);
    if (type === 'developer') {
      setFormAnimationSlot(DEVELOPER_ANIMATION_OPTIONS[0]);
    } else {
      setFormAnimationSlot(customAnimationOptions[0]);
    }
  };

  const toggleDaySelection = (dayIndex: number) => {
    setFormActiveDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort()
    );
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const updatedPayload: HabitReminderItem = {
      id: editingReminderId ?? `rem-${Date.now()}`,
      name: formName.trim(),
      frequencyMinutes: formFrequency,
      durationMinutes: formDuration,
      activeDays:
        formActiveDays.length > 0 ? formActiveDays : [0, 1, 2, 3, 4],
      message:
        formMessage.trim() ||
        `Time for your ${formName.trim()} check-in with Mambo!`,
      icon: formIcon,
      characterType: formCharacterType,
      animationSlotLabel: formAnimationSlot,
    };

    if (editingReminderId) {
      setReminders((prev) =>
        prev.map((item) =>
          item.id === editingReminderId ? updatedPayload : item
        )
      );
    } else {
      setReminders((prev) => [...prev, updatedPayload]);
      setEditingReminderId(updatedPayload.id);
    }
  };

  const handleTestReminder = (item: HabitReminderItem) => {
    const kind =
      item.name.toLowerCase().includes('water') ||
      item.animationSlotLabel.toLowerCase().includes('water') ||
      item.animationSlotLabel.toLowerCase().includes('hydration')
        ? 'overlay_hydration'
        : 'overlay_bathroom';

    triggerOverlay(kind, {
      durationSeconds: item.durationMinutes * 60,
      message: item.message,
    });
  };

  return (
    <div className="flex flex-col gap-5 p-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight text-white">
            Wellness & Study Reminders
          </h2>
          <p className="mt-1 text-[13px] text-[#9E97B8]">
            Click the edit pencil on any reminder to customize its cadence, animation slot, and Mambo message.
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartNewReminder}
          className="rounded-xl border border-[#4E4187] bg-[#261E42] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#342959] transition cursor-pointer"
        >
          + New Reminder
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left Column: Reminders Roster */}
        <div className="col-span-7 flex flex-col gap-3">
          {reminders.map((item) => {
            const isBeingEdited = editingReminderId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleEditReminderClick(item)}
                className={`flex items-center justify-between rounded-2xl border p-4 transition cursor-pointer ${
                  isBeingEdited
                    ? 'border-[#A594F9] bg-[#231C38] shadow-[0_8px_24px_rgba(165,148,249,0.14)]'
                    : 'border-[#2C253E] bg-[#181424] hover:border-[#41365E]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#251E3A] text-[20px]">
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14.5px] font-bold text-white truncate">
                        {item.name}
                      </p>
                      <span className="rounded-full bg-[#241E36] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#A594F9]">
                        Every {item.frequencyMinutes}m · {item.durationMinutes}m
                      </span>
                      <span className="rounded-md bg-[#161224] border border-[#322A4B] px-2 py-0.5 text-[10px] font-medium text-[#C4B5FD] truncate max-w-[190px]">
                        🎬 {item.animationSlotLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] text-[#9E97B8] truncate">
                      &ldquo;{item.message}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestReminder(item);
                    }}
                    className="rounded-lg border border-[#383052] bg-[#1F1A30] px-2.5 py-1.5 text-[11px] font-medium text-[#DDD8F3] hover:bg-[#2C2545] transition cursor-pointer"
                  >
                    Preview
                  </button>

                  {/* Edit Icon (Pencil) Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditReminderClick(item);
                    }}
                    title={`Edit ${item.name}`}
                    aria-label={`Edit ${item.name}`}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border transition cursor-pointer ${
                      isBeingEdited
                        ? 'border-[#A594F9] bg-[#A594F9] text-[#171329]'
                        : 'border-[#383052] bg-[#1F1A30] text-[#C4B5FD] hover:bg-[#2D2546] hover:text-white'
                    }`}
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
              </div>
            );
          })}
        </div>

        {/* Right Column: Editable Reminder / New Reminder Form Card with Animation Slot Picker */}
        <form
          onSubmit={handleSubmitForm}
          className="col-span-5 flex flex-col gap-3.5 rounded-2xl border border-[#342C4C] bg-[#181424] p-5"
        >
          <div className="flex items-center justify-between border-b border-[#262038] pb-3">
            <h3 className="text-[15px] font-bold text-white">
              {editingReminderId ? 'Edit reminder' : 'New reminder'}
            </h3>
            <span className="rounded-full bg-[#261E42] px-2.5 py-0.5 text-[11px] font-semibold text-[#A594F9]">
              {editingReminderId ? 'Editing selected' : 'Create mode'}
            </span>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-[12px] font-medium text-[#B8B2CC]">
              Reminder Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Drink Water, Bathroom Break..."
              className="mt-1.5 w-full rounded-xl border border-[#322A4B] bg-[#0E0B16] px-3 py-2 text-[13px] text-white placeholder-[#5A5373] focus:border-[#A594F9] focus:outline-none select-text"
            />
          </div>

          {/* Frequency & Time to Complete Steppers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#2A233D] bg-[#120F1D] p-3">
              <span className="block text-[11px] text-[#9E97B8]">
                Frequency
              </span>
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setFormFrequency((f) => Math.max(5, f - 5))}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-[#241E36] text-white hover:bg-[#352C50] cursor-pointer"
                >
                  −
                </button>
                <span className="text-[13px] font-bold tabular-nums">
                  {formFrequency} min
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFormFrequency((f) => Math.min(240, f + 5))
                  }
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-[#241E36] text-white hover:bg-[#352C50] cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-[#2A233D] bg-[#120F1D] p-3">
              <span className="block text-[11px] text-[#9E97B8]">
                Time to complete
              </span>
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setFormDuration((d) => Math.max(1, d - 1))}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-[#241E36] text-white hover:bg-[#352C50] cursor-pointer"
                >
                  −
                </button>
                <span className="text-[13px] font-bold tabular-nums">
                  {formDuration} min
                </span>
                <button
                  type="button"
                  onClick={() => setFormDuration((d) => Math.min(60, d + 1))}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-[#241E36] text-white hover:bg-[#352C50] cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Animation Slot Picker (Unlocked Developer Character vs Custom Uploaded Buddy) */}
          <div className="rounded-xl border border-[#2E2744] bg-[#120F1D] p-3">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-semibold text-[#E2DFF0]">
                Animation Slot Picker
              </label>
              <div className="flex rounded-lg bg-[#1A1528] p-0.5 border border-[#2E2744]">
                <button
                  type="button"
                  onClick={() => handleSwitchCharacterType('developer')}
                  className={`rounded-md px-2 py-0.5 text-[10.5px] font-semibold transition cursor-pointer ${
                    formCharacterType === 'developer'
                      ? 'bg-[#A594F9] text-[#171329]'
                      : 'text-[#9E97B8] hover:text-white'
                  }`}
                >
                  Unlocked Buddy
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchCharacterType('custom')}
                  className={`rounded-md px-2 py-0.5 text-[10.5px] font-semibold transition cursor-pointer ${
                    formCharacterType === 'custom'
                      ? 'bg-[#A594F9] text-[#171329]'
                      : 'text-[#9E97B8] hover:text-white'
                  }`}
                >
                  Custom Buddy
                </button>
              </div>
            </div>

            <select
              value={formAnimationSlot}
              onChange={(e) => setFormAnimationSlot(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#322A4B] bg-[#0E0B16] px-3 py-2 text-[12px] font-medium text-white focus:border-[#A594F9] focus:outline-none cursor-pointer"
            >
              {formCharacterType === 'developer'
                ? DEVELOPER_ANIMATION_OPTIONS.map((anim) => (
                    <option key={anim} value={anim}>
                      {anim}
                    </option>
                  ))
                : customAnimationOptions.map((anim) => (
                    <option key={anim} value={anim}>
                      {anim}
                    </option>
                  ))}
            </select>
          </div>

          {/* Active Days Picker (M T W T F S S) */}
          <div>
            <span className="block text-[12px] font-medium text-[#B8B2CC]">
              Active days
            </span>
            <div className="mt-1.5 grid grid-cols-7 gap-1.5">
              {DAY_LABELS.map((dayLabel, idx) => {
                const isSelected = formActiveDays.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDaySelection(idx)}
                    className={`h-8 rounded-lg text-[12px] font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#A594F9] text-[#171329]'
                        : 'bg-[#120F1D] border border-[#2A233D] text-[#8E87A8] hover:text-white'
                    }`}
                  >
                    {dayLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Message Input */}
          <div>
            <label className="block text-[12px] font-medium text-[#B8B2CC]">
              Custom Mambo message
            </label>
            <textarea
              rows={2}
              value={formMessage}
              onChange={(e) => setFormMessage(e.target.value)}
              placeholder="What should Mambo say when this reminder triggers?"
              className="mt-1.5 w-full resize-none rounded-xl border border-[#322A4B] bg-[#0E0B16] p-2.5 text-[12.5px] text-white placeholder-[#5A5373] focus:border-[#A594F9] focus:outline-none select-text"
            />
          </div>

          {/* Icon Selector */}
          <div>
            <span className="block text-[12px] font-medium text-[#B8B2CC]">
              Icon
            </span>
            <div className="mt-1.5 flex items-center gap-1.5">
              {ICON_CHOICES.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormIcon(icon)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-[15px] transition cursor-pointer ${
                    formIcon === icon
                      ? 'bg-[#3C3173] border border-[#A594F9]'
                      : 'bg-[#120F1D] border border-[#2A233D] hover:bg-[#211B34]'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="mt-auto w-full rounded-xl bg-[#A594F9] py-2.5 text-[13px] font-bold text-[#171329] shadow-md hover:bg-[#B5A7FA] transition cursor-pointer"
          >
            {editingReminderId ? 'Update Reminder' : 'Save New Reminder'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RemindersView;