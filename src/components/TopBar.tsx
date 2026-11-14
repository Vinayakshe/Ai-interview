import React from 'react';
import type { AppView } from '../types/interview.ts';

interface TopBarProps {
  currentView: AppView;
  canAccessInterview: boolean;
  canAccessDebrief: boolean;
  canStartInterview: boolean;
  isBusy: boolean;
  hasAnsweredAtLeastOne: boolean;
  onNavigate: (view: AppView) => void;
  onPrimaryAction: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  canAccessInterview,
  canAccessDebrief,
  canStartInterview,
  isBusy,
  hasAnsweredAtLeastOne,
  onNavigate,
  onPrimaryAction,
}) => {
  const navItems: Array<{ id: AppView; label: string; enabled: boolean }> = [
    { id: 'setup', label: '01. Setup', enabled: !isBusy },
    { id: 'interview', label: '02. Interview Room', enabled: canAccessInterview && !isBusy },
    { id: 'debrief', label: '03. Debrief', enabled: canAccessDebrief && !isBusy },
  ];

  const primaryActionLabel =
    currentView === 'setup'
      ? 'Start Interview'
      : currentView === 'interview'
      ? 'Finish Interview'
      : 'Retake Interview';

  const primaryDisabled =
    isBusy ||
    (currentView === 'setup' && !canStartInterview) ||
    (currentView === 'interview' && !hasAnsweredAtLeastOne);

  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-[#1E293B] dark:bg-[#0B0F19]/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => !isBusy && onNavigate('setup')}
          className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500 rounded-sm"
        >
          Ai Interviewer
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav aria-label="Interview stages" className="hidden md:flex items-center gap-7">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={!item.enabled}
                onClick={() => item.enabled && onNavigate(item.id)}
                className={`relative py-1 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500 ${
                  isActive
                    ? 'text-slate-900 dark:text-[#F8FAFC]'
                    : item.enabled
                    ? 'text-slate-500 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] cursor-pointer'
                    : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[15px] h-0.5 bg-blue-600 dark:bg-[#3B82F6]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            disabled={primaryDisabled}
            onClick={onPrimaryAction}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
              currentView === 'interview'
                ? 'bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600'
                : 'bg-[#2563EB] text-white hover:bg-[#3B82F6] disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600'
            } ${primaryDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {primaryActionLabel}
          </button>
        </div>
      </div>
    </header>
  );
};
