// src/renderer/src/components/views/MessagesView.tsx
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

interface MessageTemplate {
  id: string;
  category: 'Hydration' | 'Break' | 'Intervention' | 'Encouragement';
  text: string;
  tone: 'Warm' | 'Playful' | 'Direct';
}

const INITIAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'msg-1',
    category: 'Hydration',
    text: "Wohoo good job so far, don't forget to rehydrate!",
    tone: 'Warm',
  },
  {
    id: 'msg-2',
    category: 'Break',
    text: 'Bathroom Break time!',
    tone: 'Playful',
  },
  {
    id: 'msg-3',
    category: 'Intervention',
    text: "No! Don't go on YouTube",
    tone: 'Direct',
  },
  {
    id: 'msg-4',
    category: 'Intervention',
    text: "No! Don't go on Reddit",
    tone: 'Direct',
  },
  {
    id: 'msg-5',
    category: 'Encouragement',
    text: 'Keep your shoulders relaxed — you are making steady progress!',
    tone: 'Warm',
  },
];

export const MessagesView: React.FC = () => {
  const { triggerOverlay } = useApp();
  const [templates, setTemplates] =
    useState<MessageTemplate[]>(INITIAL_TEMPLATES);
  const [draftText, setDraftText] = useState<string>('');
  const [draftCategory, setDraftCategory] =
    useState<MessageTemplate['category']>('Encouragement');

  const handleAddMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftText.trim()) return;
    setTemplates((prev) => [
      {
        id: `msg-${Date.now()}`,
        category: draftCategory,
        text: draftText.trim(),
        tone: 'Warm',
      },
      ...prev,
    ]);
    setDraftText('');
  };

  const handleTestTemplate = (item: MessageTemplate) => {
    if (item.category === 'Hydration') {
      triggerOverlay('overlay_hydration', {
        durationSeconds: 300,
        message: item.text,
      });
    } else if (item.category === 'Break') {
      triggerOverlay('overlay_bathroom', {
        durationSeconds: 600,
        message: item.text,
      });
    } else if (item.category === 'Intervention') {
      const targetMatch = item.text.replace(/^No!\s*Don't go on\s*/i, '').trim();
      triggerOverlay('overlay_intervention', {
        targetAppOrSite: targetMatch || 'YouTube',
      });
    } else {
      triggerOverlay('overlay_hydration', {
        durationSeconds: 180,
        message: item.text,
      });
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6 text-white">
      <div>
        <h2 className="text-[22px] font-bold tracking-tight text-white">
          Companion Messages
        </h2>
        <p className="mt-1 text-[13px] text-[#9E97B8]">
          Customize what Mambo says during hydration check-ins, breaks, and app nudges.
        </p>
      </div>

      <form
        onSubmit={handleAddMessage}
        className="flex items-center gap-3 rounded-2xl border border-[#2C253E] bg-[#181424] p-4"
      >
        <select
          value={draftCategory}
          onChange={(e) =>
            setDraftCategory(e.target.value as MessageTemplate['category'])
          }
          className="rounded-xl border border-[#342C4C] bg-[#0E0B16] px-3 py-2.5 text-[13px] text-white focus:border-[#A594F9] focus:outline-none"
        >
          <option value="Hydration">Hydration</option>
          <option value="Break">Break</option>
          <option value="Intervention">Intervention</option>
          <option value="Encouragement">Encouragement</option>
        </select>

        <input
          type="text"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          placeholder="Add a custom speech bubble line for Mambo..."
          className="flex-1 rounded-xl border border-[#342C4C] bg-[#0E0B16] px-3.5 py-2.5 text-[13px] text-white placeholder-[#5A5373] focus:border-[#A594F9] focus:outline-none select-text"
        />

        <button
          type="submit"
          className="rounded-xl bg-[#A594F9] px-4 py-2.5 text-[13px] font-bold text-[#171329] hover:bg-[#B5A7FA] transition cursor-pointer"
        >
          Add Line
        </button>
      </form>

      <div className="flex flex-col gap-2.5">
        {templates.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-2xl border border-[#2C253E] bg-[#181424] px-4 py-3.5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="rounded-full bg-[#261E42] border border-[#3E3268] px-3 py-0.5 text-[11px] font-semibold text-[#A594F9]">
                {item.category}
              </span>
              <p className="text-[13.5px] font-medium text-white truncate">
                &ldquo;{item.text}&rdquo;
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleTestTemplate(item)}
              className="rounded-xl border border-[#3B3354] bg-[#211B32] px-3 py-1.5 text-[12px] font-medium text-[#DDD8F3] hover:bg-[#2D2546] transition cursor-pointer shrink-0"
            >
              Test in Overlay
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MessagesView;