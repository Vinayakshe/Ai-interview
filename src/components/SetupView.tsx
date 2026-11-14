import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import type {
  CandidateProfile,
  DifficultyLevel,
  InterviewConfig,
  InterviewType,
} from '../types/interview.ts';
import { ROLE_PRESETS, SAMPLE_RESUME_TEXT } from '../data/sampleResumes.ts';
import { ThemeToggle } from './ThemeToggle.tsx';

interface SetupViewProps {
  candidateProfile: CandidateProfile | null;
  config: InterviewConfig;
  isParsingResume: boolean;
  isStartingInterview: boolean;
  errorMessage: string | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onConfigChange: (next: InterviewConfig) => void;
  onUploadFile: (file: File) => Promise<void>;
  onParseRawText: (rawText: string, label?: string) => Promise<void>;
  onClearResume: () => void;
  onStartInterview: () => void;
}

export const SetupView: React.FC<SetupViewProps> = ({
  candidateProfile,
  config,
  isParsingResume,
  isStartingInterview,
  errorMessage,
  theme,
  onToggleTheme,
  onConfigChange,
  onUploadFile,
  onParseRawText,
  onClearResume,
  onStartInterview,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [localValidationError, setLocalValidationError] = useState<string | null>(null);

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;
    setLocalValidationError(null);

    const ext = file.name.toLowerCase();
    const valid = ext.endsWith('.pdf') || ext.endsWith('.docx') || ext.endsWith('.txt') || ext.endsWith('.md');
    if (!valid) {
      setLocalValidationError('Unsupported file format. Please upload a PDF, DOCX, or TXT resume.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setLocalValidationError('File exceeds 10 MB limit. Please upload a smaller resume file.');
      return;
    }

    await onUploadFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    await handleFileSelected(file);
  };

  const handlePasteSubmit = async () => {
    if (pastedText.trim().length < 40) {
      setLocalValidationError('Please paste at least a short resume summary or experience section.');
      return;
    }
    setLocalValidationError(null);
    await onParseRawText(pastedText.trim(), 'Pasted Resume');
    setShowPasteBox(false);
  };

  const handleLoadSample = async () => {
    setLocalValidationError(null);
    await onParseRawText(SAMPLE_RESUME_TEXT, 'Elena_Rostova_Resume.pdf');
    if (!config.targetRole.trim()) {
      onConfigChange({
        ...config,
        targetRole: 'Senior Frontend Engineer',
        interviewType: 'Technical',
        difficulty: 'Senior',
      });
    }
  };

  const activeError = localValidationError || errorMessage;
  const canStart = Boolean(candidateProfile && config.targetRole.trim() && !isParsingResume && !isStartingInterview);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      {/* View Sub-header with Theme Toggle */}
      <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between dark:border-[#1E293B]">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-[#F8FAFC] text-balance">
            Prepare your tailored interview session
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-[#94A3B8] sm:text-base">
            Upload your resume and configure your target role. The interviewer adapts questions directly to your background and delivers a structured evaluation debrief.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-end">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>

      {activeError && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          {activeError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        {/* Left Column (7 cols): Resume Upload & Extracted Candidate Summary */}
        <section aria-labelledby="resume-section-heading" className="lg:col-span-7 space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-[#273244] dark:bg-[#111827]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2
                  id="resume-section-heading"
                  className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC]"
                >
                  Candidate Resume
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-[#94A3B8]">
                  Supports PDF, DOCX, or plain text up to 10 MB
                </p>
              </div>
              {!candidateProfile && !isParsingResume && (
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="text-xs font-medium text-[#2563EB] hover:text-[#3B82F6] dark:text-[#60A5FA] dark:hover:text-[#93C5FD] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Use Sample Resume
                </button>
              )}
            </div>

            {/* Upload Dropzone */}
            {!candidateProfile && !isParsingResume && (
              <>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Drop your resume here or browse files"
                  className={`group flex flex-col items-center justify-center rounded-md border border-dashed px-6 py-12 text-center transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/70 dark:border-blue-400 dark:bg-blue-950/30'
                      : 'border-slate-300 bg-slate-50/60 hover:border-blue-500 hover:bg-slate-50 dark:border-[#334155] dark:bg-[#0B0F19]/60 dark:hover:border-blue-500/70 dark:hover:bg-[#151C2C]'
                  }`}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors group-hover:border-blue-200 group-hover:text-blue-600 dark:border-[#334155] dark:bg-[#151C2C] dark:text-[#94A3B8] dark:group-hover:border-blue-500/40 dark:group-hover:text-blue-400">
                    <UploadCloud className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-[#F8FAFC]">
                    Drop your resume here or browse files
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-[#94A3B8]">
                    PDF or DOCX recommended · Parsed automatically for tailored questions
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      void handleFileSelected(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-[#1E293B]">
                  <button
                    type="button"
                    onClick={() => setShowPasteBox((v) => !v)}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] transition-colors cursor-pointer"
                  >
                    {showPasteBox ? 'Hide text input' : 'Or paste resume text directly'}
                  </button>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    Processed securely on session
                  </span>
                </div>

                {showPasteBox && (
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      rows={6}
                      placeholder="Paste your resume summary, work experience, and technical skills..."
                      className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-[#334155] dark:bg-[#0B0F19] dark:text-[#F8FAFC] dark:placeholder:text-slate-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handlePasteSubmit()}
                        className="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      >
                        Analyze Resume Text
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Parsing Skeleton / Loading State */}
            {isParsingResume && (
              <div className="rounded-md border border-slate-200 bg-slate-50/70 p-6 dark:border-[#273244] dark:bg-[#0B0F19]/60">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-[#F8FAFC]">
                      Extracting skills, roles, and project highlights...
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                      Preparing candidate context for the interviewer
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-2.5">
                  <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3.5 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3.5 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            )}

            {/* Extracted Candidate Summary */}
            {candidateProfile && !isParsingResume && (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-[#1E293B]">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC]">
                          {candidateProfile.name}
                        </h3>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          Resume parsed
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600 dark:text-[#94A3B8]">
                        {candidateProfile.currentTitle}
                        {candidateProfile.yearsExperience ? ` · ${candidateProfile.yearsExperience}` : ''}
                      </p>
                      {candidateProfile.fileName && (
                        <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{candidateProfile.fileName}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClearResume}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-[#334155] dark:text-[#94A3B8] dark:hover:border-red-900/60 dark:hover:bg-red-950/40 dark:hover:text-red-300 transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Replace</span>
                  </button>
                </div>

                <div>
                  <h4 className="text-xs font-semibold tracking-wide text-slate-500 dark:text-[#94A3B8]">
                    Extracted Summary
                  </h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {candidateProfile.summary}
                  </p>
                </div>

                {candidateProfile.skills.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold tracking-wide text-slate-500 dark:text-[#94A3B8]">
                      Identified Skills
                    </h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                      {candidateProfile.skills.join(' · ')}
                    </p>
                  </div>
                )}

                {candidateProfile.highlights.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold tracking-wide text-slate-500 dark:text-[#94A3B8]">
                      Key Experience Highlights
                    </h4>
                    <ul className="mt-2 space-y-1.5">
                      {candidateProfile.highlights.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300"
                        >
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right Column (5 cols): Interview Configuration */}
        <section aria-labelledby="config-section-heading" className="lg:col-span-5">
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-[#273244] dark:bg-[#111827]">
            <h2
              id="config-section-heading"
              className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC]"
            >
              Interview Configuration
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-[#94A3B8]">
              Set the role rubric and session depth
            </p>

            <div className="mt-6 space-y-5">
              {/* Target Job Title / Role */}
              <div>
                <label
                  htmlFor="target-role-input"
                  className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  Target Job Title / Role
                </label>
                <input
                  id="target-role-input"
                  type="text"
                  value={config.targetRole}
                  onChange={(e) => onConfigChange({ ...config, targetRole: e.target.value })}
                  placeholder="e.g., Senior Frontend Engineer"
                  className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-[#334155] dark:bg-[#0B0F19] dark:text-[#F8FAFC] dark:placeholder:text-slate-500"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ROLE_PRESETS.map((preset) => {
                    const active = config.targetRole === preset.label;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          onConfigChange({
                            ...config,
                            targetRole: preset.label,
                            interviewType: preset.config.interviewType || config.interviewType,
                            difficulty: preset.config.difficulty || config.difficulty,
                          })
                        }
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                          active
                            ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-[#273244] dark:bg-[#0B0F19] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interview Type Dropdown */}
              <div>
                <label
                  htmlFor="interview-type-select"
                  className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  Interview Type
                </label>
                <div className="relative mt-1.5">
                  <select
                    id="interview-type-select"
                    value={config.interviewType}
                    onChange={(e) =>
                      onConfigChange({ ...config, interviewType: e.target.value as InterviewType })
                    }
                    className="w-full appearance-none rounded-md border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-[#334155] dark:bg-[#0B0F19] dark:text-[#F8FAFC] cursor-pointer"
                  >
                    <option value="Technical">Technical (System design, depth & problem solving)</option>
                    <option value="Behavioral">Behavioral (STAR leadership, conflict & impact)</option>
                    <option value="Mixed">Mixed (Balanced technical + behavioral assessment)</option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Difficulty Dropdown */}
              <div>
                <label
                  htmlFor="difficulty-select"
                  className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  Difficulty Level
                </label>
                <div className="relative mt-1.5">
                  <select
                    id="difficulty-select"
                    value={config.difficulty}
                    onChange={(e) =>
                      onConfigChange({ ...config, difficulty: e.target.value as DifficultyLevel })
                    }
                    className="w-full appearance-none rounded-md border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-[#334155] dark:bg-[#0B0F19] dark:text-[#F8FAFC] cursor-pointer"
                  >
                    <option value="Junior">Junior (Foundational concepts & clarity)</option>
                    <option value="Mid-Level">Mid-Level (Ownership, execution & trade-offs)</option>
                    <option value="Senior">Senior (Architecture, scale & cross-team impact)</option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Question Count Dropdown */}
              <div>
                <label
                  htmlFor="question-count-select"
                  className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  Session Length
                </label>
                <div className="relative mt-1.5">
                  <select
                    id="question-count-select"
                    value={config.questionCount}
                    onChange={(e) =>
                      onConfigChange({ ...config, questionCount: Number(e.target.value) })
                    }
                    className="w-full appearance-none rounded-md border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-[#334155] dark:bg-[#0B0F19] dark:text-[#F8FAFC] cursor-pointer"
                  >
                    <option value={4}>4 Questions (~8 mins · Quick Practice)</option>
                    <option value={6}>6 Questions (~15 mins · Standard Round)</option>
                    <option value={8}>8 Questions (~22 mins · Deep Dive)</option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Primary CTA */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={!canStart}
                  onClick={onStartInterview}
                  className={`flex w-full items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold text-white transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                    canStart
                      ? 'bg-[#2563EB] hover:bg-[#3B82F6] cursor-pointer'
                      : 'bg-slate-300 text-slate-500 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isStartingInterview ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Initializing Interview Room...</span>
                    </>
                  ) : (
                    <>
                      <span>Start Interview</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </button>
                {!candidateProfile && (
                  <p className="mt-2.5 text-center text-xs text-slate-500 dark:text-[#94A3B8]">
                    Upload a resume or load the sample profile to begin
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
