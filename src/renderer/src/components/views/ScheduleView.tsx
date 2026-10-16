// src/renderer/src/components/views/ScheduleView.tsx
import React, { useState } from 'react';

interface TimeBlockSchedule {
  id: string;
  title: string;
  timeRange: string;
  days: string[];
  preset: string;
  enabled: boolean;
}

const INITIAL_BLOCKS: TimeBlockSchedule[] = [
  {
    id: 'sched-1',
    title: 'Morning UX Studio & Wireframing',
    timeRange: '09:00 AM – 11:30 AM',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    preset: 'Standard 45/5',
    enabled: true,
  },
  {
    id: 'sched-2',
    title: 'Afternoon Coursework & Reading',
    timeRange: '02:00 PM – 04:00 PM',
    days: ['Mon', 'Wed', 'Fri'],
    preset: 'Quick 25/5',
    enabled: true,
  },
  {
    id: 'sched-3',
    title: 'Evening Deep Focus Sprint',
    timeRange: '07:30 PM – 09:00 PM',
    days: ['Tue', 'Thu', 'Sun'],
    preset: 'Deep 60/10',
    enabled: false,
  },
];

const SMART_ACTIVATION_APPS = [
  { name: 'Figma', category: 'Design', active: true },
  { name: 'VS Code', category: 'Development', active: true },
  { name: 'Notion', category: 'Notes', active: true },
  { name: 'Canvas', category: 'University', active: true },
  { name: 'Coursera', category: 'Learning', active: false },
  { name: 'YouTube', category: 'Video Lecture', active: false },
  { name: 'Unity', category: 'Game Dev', active: true },
  { name: 'GitHub', category: 'Code', active: false },
];

export const ScheduleView: React.FC = () => {
  const [blocks, setBlocks] = useState<TimeBlockSchedule[]>(INITIAL_BLOCKS);
  const [smartApps, setSmartApps] = useState(SMART_ACTIVATION_APPS);

  const toggleBlock = (id: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b))
    );
  };

  const toggleSmartApp = (name: string) => {
    setSmartApps((prev) =>
      prev.map((app) =>
        app.name === name ? { ...app, active: !app.active } : app
      )
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6 text-white">
      <div>
        <h2 className="text-[22px] font-bold tracking-tight text-white">
          Study Schedule & Smart Activation
        </h2>
        <p className="mt-1 text-[13px] text-[#9E97B8]">
          Automate recurring focus blocks or wake Mambo automatically when you launch study tools.
        </p>
      </div>

      {/* Recurring Time Blocks */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[14px] font-bold text-[#E2DFF0]">
          Scheduled Time Blocks
        </h3>

        {blocks.map((block) => (
          <div
            key={block.id}
            className={`flex items-center justify-between rounded-2xl border p-4 transition ${
              block.enabled
                ? 'border-[#342C4C] bg-[#181424]'
                : 'border-[#221C33] bg-[#120F1D] opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center gap-2.5">
                <p className="text-[15px] font-bold text-white">
                  {block.title}
                </p>
                <span className="rounded-full bg-[#261E42] px-2.5 py-0.5 text-[11px] font-semibold text-[#A594F9]">
                  {block.preset}
                </span>
              </div>
              <p className="mt-1 text-[12.5px] text-[#9E97B8]">
                {block.timeRange}
              </p>

              <div className="mt-2.5 flex items-center gap-1.5">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => {
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

            <button
              type="button"
              role="switch"
              aria-checked={block.enabled}
              onClick={() => toggleBlock(block.id)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                block.enabled ? 'bg-[#A594F9]' : 'bg-[#2C253E]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-[#151120] transition-transform ${
                  block.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Smart Activation App/Website Chips */}
      <div className="rounded-2xl border border-[#2C253E] bg-[#181424] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-white">
              Smart Activation Triggers
            </h3>
            <p className="mt-0.5 text-[12px] text-[#9E97B8]">
              Automatically prompt a focus session when these apps or sites stay in the foreground for 2 minutes.
            </p>
          </div>
          <span className="rounded-full bg-[#241E36] px-3 py-1 text-[11.5px] font-semibold text-[#4ADE80]">
            {smartApps.filter((a) => a.active).length} active triggers
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          {smartApps.map((app) => (
            <button
              key={app.name}
              type="button"
              onClick={() => toggleSmartApp(app.name)}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[12.5px] font-semibold transition cursor-pointer ${
                app.active
                  ? 'border-[#A594F9] bg-[#261E42] text-white shadow-sm'
                  : 'border-[#2C253E] bg-[#120F1D] text-[#8E87A8] hover:text-white'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  app.active ? 'bg-[#4ADE80]' : 'bg-[#5A5373]'
                }`}
              />
              <span>{app.name}</span>
              <span className="text-[10.5px] font-normal text-[#9E97B8]">
                ({app.category})
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScheduleView;