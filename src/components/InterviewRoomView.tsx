import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  CandidateProfile,
  ChatMessage,
  InterviewConfig,
} from '../types/interview.ts';
import { ThemeToggle } from './ThemeToggle.tsx';

interface InterviewRoomViewProps {
  candidateProfile: CandidateProfile;
  config: InterviewConfig;
  messages: ChatMessage[];
  currentQuestionNumber: number;
  currentTopic: string;
  isSending: boolean;
  isEvaluating: boolean;
  isSessionComplete: boolean;
  errorMessage: string | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onSendMessage: (content: string) => Promise<void>;
  onFinishInterview: () => void;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const INTERVIEWER_AVATAR_URL = '/src/assets/images/avatar_interviewer_1794641159090.jpg';

export const InterviewRoomView: React.FC<InterviewRoomViewProps> = ({
  candidateProfile,
  config,
  messages,
  currentQuestionNumber,
  currentTopic,
  isSending,
  isEvaluating,
  isSessionComplete,
  errorMessage,
  theme,
  onToggleTheme,
  onSendMessage,
  onFinishInterview,
}) => {
  const [draft, setDraft] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceModeLabel, setVoiceModeLabel] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const feedEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const simTimerRef = useRef<number | null>(null);
  const lastSpokenIdRef = useRef<string | null>(null);

  const candidateAnswersCount = messages.filter((m) => m.role === 'candidate').length;

  // Elapsed session timer
  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Scroll chat feed smoothly on new messages
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Optional Text-to-Speech readout for new interviewer questions
  useEffect(() => {
    if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'interviewer' && lastMsg.id !== lastSpokenIdRef.current) {
      lastSpokenIdRef.current = lastMsg.id;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(lastMsg.content);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, [messages, ttsEnabled]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (simTimerRef.current) {
        window.clearInterval(simTimerRef.current);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const formatDuration = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const stopVoiceCapture = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (simTimerRef.current) {
      window.clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    setIsRecording(false);
    setVoiceModeLabel(null);
  };

  const toggleVoiceCapture = () => {
    if (isRecording) {
      stopVoiceCapture();
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        const baseText = draft.trim() ? `${draft.trim()} ` : '';

        recognition.onresult = (event) => {
          let combined = '';
          for (let i = 0; i < event.results.length; i++) {
            combined += event.results[i][0].transcript;
          }
          setDraft(baseText + combined);
        };

        recognition.onerror = () => {
          stopVoiceCapture();
          startSimulatedDictation();
        };

        recognition.onend = () => {
          setIsRecording(false);
          setVoiceModeLabel(null);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
        setVoiceModeLabel('Microphone active · Speak clearly');
        return;
      } catch {
        // Fall through to simulated voice dictation
      }
    }

    startSimulatedDictation();
  };

  const startSimulatedDictation = () => {
    const simulatedChunks = [
      'In my recent role, ',
      'I approached this by first profiling the core bottlenecks ',
      'and aligning with cross-functional stakeholders on measurable latency targets. ',
      'Specifically, we reduced round-trip overhead by batching state updates ',
      'and validating edge cases with automated integration tests.',
    ];
    let idx = 0;
    setIsRecording(true);
    setVoiceModeLabel('Voice simulation active · Click mic to stop');

    simTimerRef.current = window.setInterval(() => {
      if (idx >= simulatedChunks.length) {
        stopVoiceCapture();
        return;
      }
      const chunk = simulatedChunks[idx];
      idx += 1;
      setDraft((prev) => prev + chunk);
    }, 650);
  };

  const handleSubmit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isSending || isEvaluating) return;
    if (isRecording) {
      stopVoiceCapture();
    }
    setDraft('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await onSendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const progressPercent = Math.min(
    100,
    Math.round((currentQuestionNumber / Math.max(1, config.questionCount)) * 100)
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left Sidebar: Candidate Summary Snippet & Session Context */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Session Progress Card */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-[#273244] dark:bg-[#111827]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wide text-slate-500 dark:text-[#94A3B8]">
                Session Progress
              </span>
              <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                {formatDuration(elapsedSeconds)}
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <p className="text-lg font-semibold text-slate-900 dark:text-[#F8FAFC] tabular-nums">
                Question {currentQuestionNumber} of {config.questionCount}
              </p>
              <span className="font-mono text-xs text-slate-500 dark:text-[#94A3B8] tabular-nums">
                {progressPercent}%
              </span>
            </div>

            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5 dark:border-[#1E293B]">
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Current Focus</p>
                <p className="truncate text-sm font-medium text-slate-900 dark:text-[#F8FAFC]">
                  {currentTopic}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (ttsEnabled && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                  }
                  setTtsEnabled((v) => !v);
                }}
                aria-label={ttsEnabled ? 'Disable voice readout' : 'Enable voice readout'}
                title={ttsEnabled ? 'Mute AI voice readout' : 'Read AI questions aloud'}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  ttsEnabled
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-[#334155] dark:text-[#94A3B8] dark:hover:bg-[#1E293B]'
                }`}
              >
                {ttsEnabled ? (
                  <>
                    <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Voice On</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Voice Off</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Candidate Summary Snippet */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-[#273244] dark:bg-[#111827]">
            <h2 className="text-xs font-semibold tracking-wide text-slate-500 dark:text-[#94A3B8]">
              Candidate Profile
            </h2>
            <p className="mt-2 text-base font-semibold text-slate-900 dark:text-[#F8FAFC]">
              {candidateProfile.name}
            </p>
            <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
              {candidateProfile.currentTitle}
              {candidateProfile.yearsExperience ? ` · ${candidateProfile.yearsExperience}` : ''}
            </p>

            <p className="mt-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              {candidateProfile.summary}
            </p>

            {candidateProfile.skills.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3.5 dark:border-[#1E293B]">
                <h3 className="text-xs font-medium text-slate-500 dark:text-[#94A3B8]">
                  Core Skills
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                  {candidateProfile.skills.slice(0, 10).join(' · ')}
                </p>
              </div>
            )}

            {candidateProfile.highlights.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3.5 dark:border-[#1E293B]">
                <h3 className="text-xs font-medium text-slate-500 dark:text-[#94A3B8]">
                  Resume Highlights
                </h3>
                <ul className="mt-1.5 space-y-1.5">
                  {candidateProfile.highlights.slice(0, 3).map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>

        {/* Main Panel (8 cols): Focused Chat Conversation Feed */}
        <section
          aria-label="Interview conversation"
          className="lg:col-span-8 flex h-[calc(100vh-11rem)] min-h-[540px] flex-col rounded-lg border border-slate-200 bg-white dark:border-[#273244] dark:bg-[#111827]"
        >
          {/* Interview Room Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-[#1E293B]">
            <div className="flex items-center gap-3 min-w-0">
              {!avatarFailed ? (
                <img
                  src={INTERVIEWER_AVATAR_URL}
                  alt="AI Interviewer portrait"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="h-9 w-9 shrink-0 rounded-md object-cover border border-slate-200 dark:border-[#334155]"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-800 text-xs font-semibold text-white">
                  AI
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                  {config.targetRole}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-[#94A3B8]">
                  {config.interviewType} Interview · {config.difficulty} Level
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <ThemeToggle theme={theme} onToggle={onToggleTheme} />
              <button
                type="button"
                disabled={candidateAnswersCount === 0 || isEvaluating || isSending}
                onClick={onFinishInterview}
                className="rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 cursor-pointer whitespace-nowrap"
              >
                {isEvaluating ? 'Generating Debrief...' : 'Finish Interview'}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="mx-5 mt-3 rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
            >
              {errorMessage}
            </div>
          )}

          {/* Messages Feed */}
          <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-6">
            {messages.map((msg) => {
              const isInterviewer = msg.role === 'interviewer';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isInterviewer ? 'items-start' : 'items-end'}`}
                >
                  <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-500 dark:text-[#94A3B8]">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {isInterviewer ? 'Interviewer' : candidateProfile.name.split(' ')[0] || 'You'}
                    </span>
                    {isInterviewer && msg.topic && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{msg.topic}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      isInterviewer
                        ? 'border border-slate-200 bg-slate-50 text-slate-900 dark:border-[#273244] dark:bg-[#172033] dark:text-[#F8FAFC]'
                        : 'bg-[#2563EB] text-white'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex flex-col items-start">
                <div className="mb-1.5 text-xs font-medium text-slate-500 dark:text-[#94A3B8]">
                  Interviewer
                </div>
                <div className="inline-flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-[#273244] dark:bg-[#172033] dark:text-[#94A3B8]">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" aria-hidden="true" />
                  <span>Reviewing your response...</span>
                </div>
              </div>
            )}

            {isEvaluating && (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="inline-flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Compiling performance debrief and scoring breakdown...</span>
                </div>
              </div>
            )}

            <div ref={feedEndRef} />
          </div>

          {/* Session Complete Prompt or Active Input Bar */}
          {isSessionComplete ? (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-emerald-50/60 px-5 py-4 sm:flex-row dark:border-[#1E293B] dark:bg-emerald-950/20">
              <div className="flex items-center gap-2.5 text-sm text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>All planned questions completed. Ready for your performance debrief.</span>
              </div>
              <button
                type="button"
                disabled={isEvaluating}
                onClick={onFinishInterview}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
              >
                {isEvaluating ? 'Evaluating...' : 'View Performance Debrief'}
              </button>
            </div>
          ) : (
            <div className="border-t border-slate-200 p-4 dark:border-[#1E293B]">
              {voiceModeLabel && (
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-blue-600 dark:text-blue-400">
                  <span>{voiceModeLabel}</span>
                  <button
                    type="button"
                    onClick={stopVoiceCapture}
                    className="underline hover:no-underline cursor-pointer"
                  >
                    Stop
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2.5">
                <button
                  type="button"
                  onClick={toggleVoiceCapture}
                  disabled={isSending || isEvaluating}
                  aria-label={isRecording ? 'Stop voice input' : 'Start voice simulation'}
                  title={isRecording ? 'Stop voice capture' : 'Toggle voice simulation'}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                    isRecording
                      ? 'border-red-500 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-500/70 dark:bg-red-950/50 dark:text-red-400'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-[#334155] dark:bg-[#0B0F19] dark:text-[#94A3B8] dark:hover:bg-[#1E293B] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  {isRecording ? (
                    <MicOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Mic className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>

                <textarea
                  ref={textareaRef}
                  value={draft}
                  rows={1}
                  disabled={isSending || isEvaluating}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 144)}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer here (Enter to send, Shift+Enter for new line)..."
                  className="max-h-36 min-h-[40px] flex-1 resize-none rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-[#334155] dark:bg-[#0B0F19] dark:text-[#F8FAFC] dark:placeholder:text-slate-500"
                />

                <button
                  type="button"
                  disabled={!draft.trim() || isSending || isEvaluating}
                  onClick={() => void handleSubmit()}
                  aria-label="Send response"
                  className="flex h-10 items-center justify-center gap-1.5 rounded-md bg-[#2563EB] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3B82F6] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 cursor-pointer shrink-0"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
