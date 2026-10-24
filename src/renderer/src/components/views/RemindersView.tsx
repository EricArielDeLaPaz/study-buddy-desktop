// src/renderer/src/components/views/RemindersView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ActiveCompanionSelection,
  DEFAULT_ANIMATION_SLOTS,
  loadActiveCompanionSelection,
} from './BuddyStudioView';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  loadStorage,
  saveStorage,
  STORAGE_KEYS,
} from '../../utils/storage';

export interface HabitReminderItem {
  id: string;
  name: string;
  frequencyMinutes: number;
  durationMinutes: number;
  activeDays: number[]; // 0..6 for M T W T F S S
  message: string;
  icon: string;
  boundSlotId: string;
  boundSlotLabel: string;
}

export const DEFAULT_REMINDERS_ROSTER: HabitReminderItem[] = [
  {
    id: 'rem-water',
    name: 'Drink Water',
    frequencyMinutes: 30,
    durationMinutes: 5,
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    message: "Wohoo good job so far, don't forget to rehydrate!",
    icon: '💧',
    boundSlotId: 'slot-water-break',
    boundSlotLabel: 'Water break',
  },
  {
    id: 'rem-bathroom',
    name: 'Bathroom Break',
    frequencyMinutes: 60,
    durationMinutes: 10,
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    message: 'Bathroom Break time!',
    icon: '🚻',
    boundSlotId: 'slot-break-stretch',
    boundSlotLabel: 'Break time stretch',
  },
  {
    id: 'rem-posture',
    name: 'Posture Check',
    frequencyMinutes: 25,
    durationMinutes: 2,
    activeDays: [0, 1, 2, 3, 4],
    message: 'Sit tall, relax your shoulders, and align your screen.',
    icon: '🪑',
    boundSlotId: 'slot-study-focus',
    boundSlotLabel: 'Study focus loop',
  },
  {
    id: 'rem-stretch',
    name: 'Stretch',
    frequencyMinutes: 45,
    durationMinutes: 5,
    activeDays: [0, 1, 2, 3, 4],
    message: 'Roll your shoulders and stretch your wrists!',
    icon: '🧘',
    boundSlotId: 'slot-break-stretch',
    boundSlotLabel: 'Break time stretch',
  },
];

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const ICON_CHOICES = ['💧', '🚻', '🪑', '🧘', '🚶', '🌬️', '📝', '🍵'] as const;

export const RemindersView: React.FC = () => {
  const { triggerOverlay, setCurrentAnimationSlot } = useApp();

  // Stage 5: Persist and reload reminders from localStorage
  const [reminders, setReminders] = useState<HabitReminderItem[]>(() =>
    loadStorage<HabitReminderItem[]>(
      STORAGE_KEYS.REMINDERS,
      DEFAULT_REMINDERS_ROSTER
    )
  );

  useEffect(() => {
    saveStorage(STORAGE_KEYS.REMINDERS, reminders);
  }, [reminders]);

  useEffect(() => {
    const handleReset = () => {
      setReminders(
        loadStorage<HabitReminderItem[]>(
          STORAGE_KEYS.REMINDERS,
          DEFAULT_REMINDERS_ROSTER
        )
      );
    };
    window.addEventListener('study-buddy:data-reset', handleReset);
    return () =>
      window.removeEventListener('study-buddy:data-reset', handleReset);
  }, []);

  const [activeBuddy, setActiveBuddy] = useState<ActiveCompanionSelection>(
    loadActiveCompanionSelection
  );

  useEffect(() => {
    const handleSyncCompanion = () => {
      setActiveBuddy(loadActiveCompanionSelection());
    };
    window.addEventListener(
      'study-buddy:companion-updated',
      handleSyncCompanion
    );
    return () => {
      window.removeEventListener(
        'study-buddy:companion-updated',
        handleSyncCompanion
      );
    };
  }, []);

  const availableBuddySlots =
    activeBuddy.slots && activeBuddy.slots.length > 0
      ? activeBuddy.slots
      : DEFAULT_ANIMATION_SLOTS;

  const [editingReminderId, setEditingReminderId] = useState<string | null>(
    () => reminders[0]?.id ?? null
  );

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const initialFirst = reminders[0] ?? DEFAULT_REMINDERS_ROSTER[0];
  const [formName, setFormName] = useState<string>(initialFirst.name);
  const [formFrequency, setFormFrequency] = useState<number>(
    initialFirst.frequencyMinutes
  );
  const [formDuration, setFormDuration] = useState<number>(
    initialFirst.durationMinutes
  );
  const [formActiveDays, setFormActiveDays] = useState<number[]>(
    initialFirst.activeDays
  );
  const [formMessage, setFormMessage] = useState<string>(initialFirst.message);
  const [formIcon, setFormIcon] = useState<string>(initialFirst.icon);
  const [formSlotId, setFormSlotId] = useState<string>(
    () => availableBuddySlots[0]?.id ?? 'slot-water-break'
  );

  const [isSlotDropdownOpen, setIsSlotDropdownOpen] = useState<boolean>(false);
  const slotDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        slotDropdownRef.current &&
        !slotDropdownRef.current.contains(e.target as Node)
      ) {
        setIsSlotDropdownOpen(false);
      }
    }
    if (isSlotDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isSlotDropdownOpen]);

  useEffect(() => {
    if (!availableBuddySlots.some((s) => s.id === formSlotId)) {
      setFormSlotId(availableBuddySlots[0]?.id ?? '');
    }
  }, [availableBuddySlots, formSlotId]);

  const handleEditReminderClick = (item: HabitReminderItem) => {
    setEditingReminderId(item.id);
    setFormName(item.name);
    setFormFrequency(item.frequencyMinutes);
    setFormDuration(item.durationMinutes);
    setFormActiveDays(item.activeDays);
    setFormMessage(item.message);
    setFormIcon(item.icon);
    const matchingSlot =
      availableBuddySlots.find(
        (s) => s.id === item.boundSlotId || s.label === item.boundSlotLabel
      ) ?? availableBuddySlots[0];
    if (matchingSlot) {
      setFormSlotId(matchingSlot.id);
    }
  };

  const handleStartNewReminder = () => {
    setEditingReminderId(null);
    setFormName('');
    setFormFrequency(30);
    setFormDuration(5);
    setFormActiveDays([0, 1, 2, 3, 4]);
    setFormMessage('');
    setFormIcon('💧');
    setFormSlotId(availableBuddySlots[0]?.id ?? '');
  };

  const handleConfirmDeleteReminder = () => {
    if (!editingReminderId) return;
    const remaining = reminders.filter((r) => r.id !== editingReminderId);
    setReminders(remaining);

    if (remaining.length > 0) {
      handleEditReminderClick(remaining[0]);
    } else {
      handleStartNewReminder();
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

    const chosenSlot =
      availableBuddySlots.find((s) => s.id === formSlotId) ??
      availableBuddySlots[0];

    const updatedPayload: HabitReminderItem = {
      id: editingReminderId ?? `rem-${Date.now()}`,
      name: formName.trim(),
      frequencyMinutes: formFrequency,
      durationMinutes: formDuration,
      activeDays:
        formActiveDays.length > 0 ? formActiveDays : [0, 1, 2, 3, 4],
      message:
        formMessage.trim() ||
        `Time for your ${formName.trim()} check-in with ${activeBuddy.name}!`,
      icon: formIcon,
      boundSlotId: chosenSlot?.id ?? 'slot-water-break',
      boundSlotLabel: chosenSlot?.label ?? 'Water break',
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

  const handleTriggerBoundReminder = (item: HabitReminderItem) => {
    const boundSlot = availableBuddySlots.find(
      (s) => s.id === item.boundSlotId || s.label === item.boundSlotLabel
    );

    const isHydrationSlot =
      boundSlot?.mode === 'hydration' ||
      item.boundSlotLabel.toLowerCase().includes('water') ||
      item.boundSlotLabel.toLowerCase().includes('matcha');

    setCurrentAnimationSlot(
      isHydrationSlot ? 'reminder_drinking_water' : 'reminder_bathroom'
    );

    triggerOverlay(
      isHydrationSlot ? 'overlay_hydration' : 'overlay_bathroom',
      {
        durationSeconds: item.durationMinutes * 60,
        message: item.message,
      }
    );
  };

  const selectedSlotObj =
    availableBuddySlots.find((s) => s.id === formSlotId) ??
    availableBuddySlots[0];

  return (
    <div className="flex flex-col gap-5 p-6 text-white font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-[22px] font-bold tracking-tight text-white">
            Wellness & Study Reminders
          </h2>
          <p className="mt-1 text-[13px] text-[#9E97B8]">
            Configure low-friction reminders and bind them to Mambo&apos;s animations.
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartNewReminder}
          className="rounded-xl border border-[#52438F] bg-[#2A244D] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#3C3173] transition cursor-pointer"
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
                    ? 'border-[#A594F9] bg-[#2A244D] shadow-[0_8px_24px_rgba(165,148,249,0.16)]'
                    : 'border-[#2C253E] bg-[#181424] hover:border-[#52438F]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#261E42] text-[20px]">
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14.5px] font-bold text-white truncate">
                        {item.name}
                      </p>
                      <span className="rounded-full bg-[#141020] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#A594F9]">
                        Every {item.frequencyMinutes}m · {item.durationMinutes}m
                      </span>
                      <span className="rounded-md bg-[#141020] border border-[#52438F] px-2 py-0.5 text-[10px] font-semibold text-[#C4B5FD] truncate">
                        🎬 {item.boundSlotLabel}
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
                      handleTriggerBoundReminder(item);
                    }}
                    className="rounded-lg border border-[#52438F] bg-[#1F1A30] px-2.5 py-1.5 text-[11px] font-medium text-[#DDD8F3] hover:bg-[#2C2545] transition cursor-pointer"
                  >
                    Preview
                  </button>

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
                        ? 'border-[#A594F9] bg-[#A594F9] text-[#12111A]'
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

        {/* Right Column: Editable Reminder Form */}
        <form
          onSubmit={handleSubmitForm}
          className="col-span-5 flex flex-col gap-3.5 rounded-2xl border border-[#52438F] bg-[#181424] p-5"
        >
          <div className="flex items-center justify-between border-b border-[#262038] pb-3">
            <h3 className="text-[15px] font-bold text-white">
              {editingReminderId ? 'Edit reminder' : 'New reminder'}
            </h3>

            {editingReminderId ? (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="text-red-400 hover:text-red-300 text-xs font-semibold transition cursor-pointer"
              >
                Delete Reminder
              </button>
            ) : (
              <span className="rounded-full bg-[#2A244D] px-2.5 py-0.5 text-[11px] font-semibold text-[#C4B5FD]">
                Create mode
              </span>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#B8B2CC]">
              Reminder Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Drink Water, Bathroom Break..."
              className="mt-1.5 w-full rounded-xl border border-[#322A4B] bg-[#0E0B16] px-3 py-2 text-[13px] text-white placeholder-[#9490A8] focus:border-[#A594F9] focus:outline-none select-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#2A233D] bg-[#120F1D] p-3">
              <span className="block text-[11px] text-[#9E97B8]">
                Frequency
              </span>
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setFormFrequency((f) => Math.max(5, f - 5))}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2A244D] text-white hover:bg-[#3C3173] cursor-pointer"
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
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2A244D] text-white hover:bg-[#3C3173] cursor-pointer"
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
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2A244D] text-white hover:bg-[#3C3173] cursor-pointer"
                >
                  −
                </button>
                <span className="text-[13px] font-bold tabular-nums">
                  {formDuration} min
                </span>
                <button
                  type="button"
                  onClick={() => setFormDuration((d) => Math.min(60, d + 1))}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2A244D] text-white hover:bg-[#3C3173] cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="relative" ref={slotDropdownRef}>
            <label className="block text-[12px] font-medium text-[#B8B2CC]">
              Animation Slot
            </label>
            <button
              type="button"
              onClick={() => setIsSlotDropdownOpen((prev) => !prev)}
              className="mt-1.5 flex w-full items-center justify-between rounded-xl border border-[#322A4B] bg-[#0E0B16] px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-white hover:border-[#7C3AED] transition cursor-pointer"
            >
              <span className="truncate">
                {selectedSlotObj
                  ? `${selectedSlotObj.label} (${selectedSlotObj.slotKey})`
                  : 'Select animation slot'}
              </span>
              <span className="ml-2 text-[11px] text-[#9E97B8]">
                {isSlotDropdownOpen ? '▴' : '▾'}
              </span>
            </button>

            {isSlotDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-[#52438F] bg-[#232136] p-1.5 shadow-xl">
                {availableBuddySlots.map((slot) => {
                  const isSelected = slot.id === formSlotId;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => {
                        setFormSlotId(slot.id);
                        setIsSlotDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12px] transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#2A244D] text-[#C4B5FD] font-semibold'
                          : 'text-[#E2DFF0] hover:bg-[#2A244D]/60 hover:text-white'
                      }`}
                    >
                      <span className="truncate">
                        {slot.label} ({slot.slotKey})
                      </span>
                      {isSelected && (
                        <span className="text-[11px] text-[#A594F9]">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

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
                        ? 'bg-[#A594F9] text-[#12111A]'
                        : 'bg-[#120F1D] border border-[#2A233D] text-[#8E87A8] hover:text-white'
                    }`}
                  >
                    {dayLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#B8B2CC]">
              Custom Mambo message
            </label>
            <textarea
              rows={2}
              value={formMessage}
              onChange={(e) => setFormMessage(e.target.value)}
              placeholder="What should Mambo say when this reminder triggers?"
              className="mt-1.5 w-full resize-none rounded-xl border border-[#322A4B] bg-[#0E0B16] p-2.5 text-[12.5px] text-white placeholder-[#9490A8] focus:border-[#A594F9] focus:outline-none select-text"
            />
          </div>

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
                      ? 'bg-[#2A244D] border border-[#A594F9]'
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
            className="mt-auto w-full rounded-xl bg-[#A594F9] py-2.5 text-[13px] font-bold text-[#12111A] shadow-md hover:bg-[#B8A9FA] transition cursor-pointer"
          >
            {editingReminderId ? 'Update Reminder' : 'Save New Reminder'}
          </button>
        </form>
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title={`Delete "${formName || 'Reminder'}"?`}
        description="This reminder and its scheduled cadence will be permanently removed from your active wellness roster."
        confirmLabel="Delete Reminder"
        onConfirm={handleConfirmDeleteReminder}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};

export default RemindersView;
