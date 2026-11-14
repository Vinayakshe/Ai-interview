/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import type {
  AppView,
  CandidateProfile,
  ChatMessage,
  EvaluationReport,
  InterviewConfig,
} from './types/interview.ts';
import { TopBar } from './components/TopBar.tsx';
import { SetupView } from './components/SetupView.tsx';
import { InterviewRoomView } from './components/InterviewRoomView.tsx';
import { DebriefView } from './components/DebriefView.tsx';

function formatNowTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read file.'));
        return;
      }
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentView, setCurrentView] = useState<AppView>('setup');

  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [config, setConfig] = useState<InterviewConfig>({
    targetRole: 'Senior Frontend Engineer',
    interviewType: 'Technical',
    difficulty: 'Senior',
    questionCount: 6,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [currentTopic, setCurrentTopic] = useState('Introduction');
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [evaluationReport, setEvaluationReport] = useState<EvaluationReport | null>(null);

  const [isParsingResume, setIsParsingResume] = useState(false);
  const [isStartingInterview, setIsStartingInterview] = useState(false);
  const [isSendingTurn, setIsSendingTurn] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleUploadFile = async (file: File) => {
    setIsParsingResume(true);
    setErrorMessage(null);
    try {
      const base64Data = await fileToBase64(file);
      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          base64Data,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse resume file.');
      }
      setCandidateProfile(data as CandidateProfile);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to parse resume.');
    } finally {
      setIsParsingResume(false);
    }
  };

  const handleParseRawText = async (rawText: string, label?: string) => {
    setIsParsingResume(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: label || 'Resume_Text.txt',
          rawText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze resume.');
      }
      setCandidateProfile(data as CandidateProfile);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to analyze resume.');
    } finally {
      setIsParsingResume(false);
    }
  };

  const handleStartInterview = async () => {
    if (!candidateProfile || !config.targetRole.trim()) return;
    setIsStartingInterview(true);
    setErrorMessage(null);
    setEvaluationReport(null);
    setIsSessionComplete(false);

    try {
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateProfile, config }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start interview session.');
      }

      const openingMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'interviewer',
        content: data.message,
        timestamp: formatNowTime(),
        topic: data.topic || 'Opening Question',
        questionNumber: data.questionNumber || 1,
      };

      setMessages([openingMessage]);
      setCurrentQuestionNumber(1);
      setCurrentTopic(data.topic || 'Opening Question');
      setCurrentView('interview');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to start interview.');
    } finally {
      setIsStartingInterview(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!candidateProfile) return;
    setErrorMessage(null);

    const candidateMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'candidate',
      content,
      timestamp: formatNowTime(),
    };

    const nextMessages = [...messages, candidateMsg];
    setMessages(nextMessages);
    setIsSendingTurn(true);

    try {
      const res = await fetch('/api/interview/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateProfile,
          config,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          currentQuestionNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Interviewer failed to respond.');
      }

      const aiMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'interviewer',
        content: data.message,
        timestamp: formatNowTime(),
        topic: data.topic,
        questionNumber: data.questionNumber,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setCurrentQuestionNumber(data.questionNumber ?? currentQuestionNumber);
      setCurrentTopic(data.topic ?? currentTopic);
      setIsSessionComplete(Boolean(data.isComplete));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setIsSendingTurn(false);
    }
  };

  const handleFinishInterview = async () => {
    if (!candidateProfile || messages.length === 0) return;
    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateProfile,
          config,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            questionNumber: m.questionNumber,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate evaluation report.');
      }

      setEvaluationReport(data as EvaluationReport);
      setCurrentView('debrief');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to evaluate interview.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRetakeInterview = () => {
    setMessages([]);
    setEvaluationReport(null);
    setIsSessionComplete(false);
    setCurrentQuestionNumber(1);
    setErrorMessage(null);
    setCurrentView('setup');
  };

  const hasAnsweredAtLeastOne = messages.some((m) => m.role === 'candidate');
  const isBusy = isParsingResume || isStartingInterview || isSendingTurn || isEvaluating;

  const handlePrimaryAction = () => {
    if (currentView === 'setup') {
      void handleStartInterview();
    } else if (currentView === 'interview') {
      void handleFinishInterview();
    } else {
      handleRetakeInterview();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-150 dark:bg-[#0B0F19] dark:text-[#F8FAFC]">
      <TopBar
        currentView={currentView}
        canAccessInterview={messages.length > 0 && Boolean(candidateProfile)}
        canAccessDebrief={Boolean(evaluationReport)}
        canStartInterview={Boolean(candidateProfile && config.targetRole.trim())}
        isBusy={isBusy}
        hasAnsweredAtLeastOne={hasAnsweredAtLeastOne}
        onNavigate={setCurrentView}
        onPrimaryAction={handlePrimaryAction}
      />

      {currentView === 'setup' && (
        <SetupView
          candidateProfile={candidateProfile}
          config={config}
          isParsingResume={isParsingResume}
          isStartingInterview={isStartingInterview}
          errorMessage={errorMessage}
          theme={theme}
          onToggleTheme={toggleTheme}
          onConfigChange={setConfig}
          onUploadFile={handleUploadFile}
          onParseRawText={handleParseRawText}
          onClearResume={() => {
            setCandidateProfile(null);
            setErrorMessage(null);
          }}
          onStartInterview={() => void handleStartInterview()}
        />
      )}

      {currentView === 'interview' && candidateProfile && (
        <InterviewRoomView
          candidateProfile={candidateProfile}
          config={config}
          messages={messages}
          currentQuestionNumber={currentQuestionNumber}
          currentTopic={currentTopic}
          isSending={isSendingTurn}
          isEvaluating={isEvaluating}
          isSessionComplete={isSessionComplete}
          errorMessage={errorMessage}
          theme={theme}
          onToggleTheme={toggleTheme}
          onSendMessage={handleSendMessage}
          onFinishInterview={() => void handleFinishInterview()}
        />
      )}

      {currentView === 'debrief' && candidateProfile && evaluationReport && (
        <DebriefView
          candidateProfile={candidateProfile}
          config={config}
          report={evaluationReport}
          theme={theme}
          onToggleTheme={toggleTheme}
          onRetakeInterview={handleRetakeInterview}
        />
      )}
    </div>
  );
}
