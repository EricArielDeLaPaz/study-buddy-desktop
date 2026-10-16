// src/renderer/src/components/views/RemindersView.tsx
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export interface HabitReminderItem {
  id: string;
  name: string;
  frequencyMinutes: number;
  durationMinutes: number;
  activeDays: number[]; // 0..6 for M T W T F S S
  message: string;
  icon: string;
  enabled: boolean;
}

const INITIAL_REMINDERS: HabitReminderItem[] = [
  {
    id: 'rem-water',
    name: 'Drink Water',
    frequencyMinutes: 30,
    durationMinutes: 5,
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    message: "Wohoo good job so far, don't forget to rehydrate!",
    icon: '💧',
    enabled: true,
  },
  {
    id: 'rem-stretch',
    name: 'Stretch',
    frequencyMinutes: 45,
    durationMinutes: 5,
    activeDays: [0, 1, 2, 3, 4],
    message: 'Roll your shoulders and stretch your wrists!',
    icon: '🧘',
    enabled: true,
  },
  {
    id: 'rem-walk',
    name: 'Walk Around',
    frequencyMinutes: 60,
    durationMinutes: 10,
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    message: 'Bathroom Break time! Step away from the desk for a moment.',
    icon: '🚶',
    enabled: true,
  },
  {
    id: 'rem-posture',
    name: 'Posture Check',
    frequencyMinutes: 25,
    durationMinutes: 2,
    activeDays: [0, 1, 2, 3, 4],
    message: 'Sit tall, relax your shoulders, and align your screen.',
    icon: '🪑',
    enabled: true,
  },
  {
    id: 'rem-breathing',
    name: 'Deep Breathing',
    frequencyMinutes: 50,
    durationMinutes: 3,
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    message: 'Take 4 slow box breaths with Mambo.',
    icon: '🌬️',
    enabled: false,
  },
  {
    id: 'rem-review',
    name: 'Review Notes',
    frequencyMinutes: 90,
    durationMinutes: 10,
    activeDays: [0, 1, 2, 3, 4],
    message: 'Summarize your last study block in the Scratchpad!',
    icon: '📝',
    enabled: true,
  },
  {
    id: 'rem-medication',
    name: 'Take Medication',
    frequencyMinutes: 180,
    durationMinutes: 5,
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    message: 'Time for your scheduled wellness check-in and glass of water.',
    icon: '💊',
    enabled: false,
  },
];

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const ICON_CHOICES = ['💧', '🧘', '🚶', '🪑', '🌬️', '📝', '💊', '🍵'] as const;

export const RemindersView: React.FC = () => {
  const { triggerOverlay } = useApp();

  const [reminders, setReminders] =
    useState<HabitReminderItem[]>(INITIAL_REMINDERS);

  // New Reminder Creator Form State
  const [newName, setNewName] = useState<string>('Eye Rest (20-20-20)');
  const [newFrequency, setNewFrequency] = useState<number>(30);
  const [newDuration, setNewDuration] = useState<number>(5);
  const [newActiveDays, setNewActiveDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [newMessage, setNewMessage] = useState<string>(
    'Look 20 feet away for 20 seconds to relax your eyes!'
  );
  const [newIcon, setNewIcon] = useState<string>('💧');

  const toggleHabitEnabled = (id: string) => {
    setReminders((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const toggleDaySelection = (dayIndex: number) => {
    setNewActiveDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort()
    );
  };

  const handleSaveNewReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const created: HabitReminderItem = {
      id: `rem-${Date.now()}`,
      name: newName.trim(),
      frequencyMinutes: newFrequency,
      durationMinutes: newDuration,
      activeDays: newActiveDays.length > 0 ? newActiveDays : [0, 1, 2, 3, 4],
      message:
        newMessage.trim() || `Time for your ${newName.trim()} break with Mambo!`,
      icon: newIcon,
      enabled: true,
    };

    setReminders((prev) => [created, ...prev]);
    setNewName('');
  };

  const handleTestReminder = (item: HabitReminderItem) => {
    const kind =
      item.name === 'Drink Water' ? 'overlay_hydration' : 'overlay_bathroom';
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
            Configure low-friction hydration, posture, and break nudges.
          </p>
        </div>

        <span className="rounded-full bg-[#1E192D] border border-[#342C4C] px-3.5 py-1 text-[12px] font-medium text-[#C4B5FD]">
          {reminders.filter((r) => r.enabled).length} active habits
        </span>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left Column: Habit Toggle List */}
        <div className="col-span-7 flex flex-col gap-2.5">
          {reminders.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded-2xl border p-3.5 transition ${
                item.enabled
                  ? 'border-[#322A4B] bg-[#181424]'
                  : 'border-[#221C33] bg-[#120F1C] opacity-65'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#251E3A] text-[18px]">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-bold text-white truncate">
                      {item.name}
                    </p>
                    <span className="rounded-full bg-[#241E36] px-2 py-0.5 text-[10.5px] font-medium text-[#A594F9]">
                      Every {item.frequencyMinutes}m · {item.durationMinutes}m
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-[#8E87A8] truncate">
                    {item.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 ml-3">
                <button
                  type="button"
                  onClick={() => handleTestReminder(item)}
                  className="rounded-lg border border-[#383052] bg-[#1F1A30] px-2.5 py-1 text-[11px] font-medium text-[#DDD8F3] hover:bg-[#2C2545] transition cursor-pointer"
                >
                  Preview
                </button>

                {/* Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={item.enabled}
                  onClick={() => toggleHabitEnabled(item.id)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                    item.enabled ? 'bg-[#A594F9]' : 'bg-[#2C253E]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-[#151120] transition-transform ${
                      item.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: "New reminder" Creator Card */}
        <form
          onSubmit={handleSaveNewReminder}
          className="col-span-5 flex flex-col gap-4 rounded-2xl border border-[#342C4C] bg-[#181424] p-5"
        >
          <div className="flex items-center justify-between border-b border-[#262038] pb-3">
            <h3 className="text-[15px] font-bold text-white">New reminder</h3>
            <span className="text-[11px] font-medium text-[#A594F9]">
              Custom Habit
            </span>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-[12px] font-medium text-[#B8B2CC]">
              Reminder Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Drink Matcha, Eye Rest..."
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
                  onClick={() =>
                    setNewFrequency((f) => Math.max(5, f - 5))
                  }
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-[#241E36] text-white hover:bg-[#352C50] cursor-pointer"
                >
                  −
                </button>
                <span className="text-[13px] font-bold tabular-nums">
                  {newFrequency} min
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setNewFrequency((f) => Math.min(240, f + 5))
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
                  onClick={() =>
                    setNewDuration((d) => Math.max(1, d - 1))
                  }
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-[#241E36] text-white hover:bg-[#352C50] cursor-pointer"
                >
                  −
                </button>
                <span className="text-[13px] font-bold tabular-nums">
                  {newDuration} min
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setNewDuration((d) => Math.min(60, d + 1))
                  }
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-[#241E36] text-white hover:bg-[#352C50] cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Active Days Picker (M T W T F S S) */}
          <div>
            <span className="block text-[12px] font-medium text-[#B8B2CC]">
              Active days
            </span>
            <div className="mt-2 grid grid-cols-7 gap-1.5">
              {DAY_LABELS.map((dayLabel, idx) => {
                const isSelected = newActiveDays.includes(idx);
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
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="What should Mambo say when this triggers?"
              className="mt-1.5 w-full resize-none rounded-xl border border-[#322A4B] bg-[#0E0B16] p-2.5 text-[12.5px] text-white placeholder-[#5A5373] focus:border-[#A594F9] focus:outline-none select-text"
            />
          </div>

          {/* Icon Selector */}
          <div>
            <span className="block text-[12px] font-medium text-[#B8B2CC]">
              Icon
            </span>
            <div className="mt-2 flex items-center gap-1.5">
              {ICON_CHOICES.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setNewIcon(icon)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-[15px] transition cursor-pointer ${
                    newIcon === icon
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
            Save Reminder
          </button>
        </form>
      </div>
    </div>
  );
};

export default RemindersView;