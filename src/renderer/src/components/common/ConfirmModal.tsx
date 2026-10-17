// src/renderer/src/components/common/ConfirmModal.tsx
import React, { useEffect } from 'react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none font-sans"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[410px] max-w-full rounded-[24px] border border-[#52438F] bg-[#1A1829] p-6 text-white shadow-[0_28px_80px_rgba(0,0,0,0.85)] flex flex-col gap-4"
      >
        {/* Header with Warning Badge */}
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF6584]/20 border border-[#FF6584]/35 text-[#FF6584]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <h3
              id="confirm-modal-title"
              className="font-display text-[17px] font-bold tracking-tight text-white"
            >
              {title}
            </h3>
            <p
              id="confirm-modal-desc"
              className="mt-1.5 text-[13px] leading-relaxed text-[#C4B5FD]"
            >
              {description}
            </p>
          </div>
        </div>

        {/* Footer Actions: Cancel & Red Confirm CTA */}
        <div className="mt-2 flex items-center justify-end gap-2.5 border-t border-[#2E2A45] pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#52438F] bg-[#120F1D] px-4 py-2 text-[12.5px] font-semibold text-[#C4B5FD] hover:bg-[#232136] hover:text-white transition cursor-pointer"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className="rounded-xl border border-red-500/40 bg-red-600 px-4 py-2 text-[12.5px] font-bold text-white shadow-md hover:bg-red-500 active:scale-[0.99] transition cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;