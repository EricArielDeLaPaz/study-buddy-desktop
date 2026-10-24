// src/renderer/src/components/layout/Header.tsx
import React, { useState } from 'react';
import { WindowControls } from './WindowControls';
import { ConfirmModal } from '../common/ConfirmModal';

export interface HeaderProps {
  isScratchpadOpen: boolean;
  onToggleScratchpad: () => void;
  onMinimizeToCompanion: () => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  activeTabLabel?: string;
}

export const Header: React.FC<HeaderProps> = ({
  isScratchpadOpen,
  onToggleScratchpad,
  onMinimizeToCompanion,
  isFullScreen = false,
  onToggleFullScreen,
  activeTabLabel,
}) => {
  const [isQuitModalOpen, setIsQuitModalOpen] = useState<boolean>(false);

  const isMac =
    typeof window !== 'undefined' &&
    (window.electronAPI?.platform === 'darwin' ||
      (!window.electronAPI?.platform &&
        /Mac|iPod|iPhone|iPad/.test(navigator.platform)));

  const handleToggleFull = () => {
    onToggleFullScreen?.();
  };

  const handleConfirmQuit = () => {
    if (window.electronAPI?.quitApp) {
      window.electronAPI.quitApp();
    } else {
      window.close();
    }
  };

  return (
    <>
      <header
        onDoubleClick={handleToggleFull}
        className="flex h-12 shrink-0 items-center justify-between border-b border-[#241E36] bg-[#0F0C18] px-4 select-none"
      >
        {/* Left: macOS Traffic Lights (on macOS) + App Title */}
        <div className="flex items-center gap-3">
          {isMac && (
            <WindowControls
              variant="mac"
              isFullScreen={isFullScreen}
              onMinimize={onMinimizeToCompanion}
              onToggleFullScreen={handleToggleFull}
              onRequestClose={() => setIsQuitModalOpen(true)}
            />
          )}

          <div className="flex items-center gap-2">
            <span className="text-[12.5px] font-semibold tracking-tight text-[#E2DFF0]">
              Study Buddy Desktop
            </span>
            {activeTabLabel && (
              <>
                <span className="text-[#463E62]">/</span>
                <span className="text-[12px] font-medium text-[#9E97B8]">
                  {activeTabLabel}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Open/Close Notepad Button + Windows/Linux Controls */}
        <div
          data-no-drag="true"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="flex items-center gap-2.5"
        >
          <button
            type="button"
            onClick={onToggleScratchpad}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-all duration-150 ease-out cursor-pointer ${
              isScratchpadOpen
                ? 'border-violet-500 bg-violet-600 !text-white shadow-sm hover:bg-violet-700'
                : 'border-[#2F2747] bg-[#1B162A] text-[#C4B5FD] hover:bg-violet-50 hover:border-violet-300 hover:text-violet-900 dark:hover:bg-violet-900/40 dark:hover:border-violet-600/60 dark:hover:text-white'
            }`}
          >
            <svg
              width="13"
              height="13"
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
            <span>{isScratchpadOpen ? 'Close Notepad' : 'Open Notepad'}</span>
          </button>

          {!isMac && (
            <WindowControls
              variant="win"
              isFullScreen={isFullScreen}
              onMinimize={onMinimizeToCompanion}
              onToggleFullScreen={handleToggleFull}
              onRequestClose={() => setIsQuitModalOpen(true)}
            />
          )}
        </div>
      </header>

      {/* Quit Confirmation Modal (Stage P2) */}
      <ConfirmModal
        isOpen={isQuitModalOpen}
        title="Quit Study Buddy?"
        description="Quit Study Buddy? Reminders and nudges stop until you open it again."
        confirmLabel="Quit Study Buddy"
        onConfirm={handleConfirmQuit}
        onCancel={() => setIsQuitModalOpen(false)}
      />
    </>
  );
};

export default Header;
