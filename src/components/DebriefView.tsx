import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Printer,
  RotateCcw,
} from 'lucide-react';
import type {
  CandidateProfile,
  EvaluationReport,
  InterviewConfig,
} from '../types/interview.ts';
import { ThemeToggle } from './ThemeToggle.tsx';

interface DebriefViewProps {
  candidateProfile: CandidateProfile;
  config: InterviewConfig;
  report: EvaluationReport;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onRetakeInterview: () => void;
}

export const DebriefView: React.FC<DebriefViewProps> = ({
  candidateProfile,
  config,
  report,
  theme,
  onToggleTheme,
  onRetakeInterview,
}) => {
  const [expandedSet, setExpandedSet] = useState<Record<number, boolean>>(() => {
    const first = report.questionBreakdown[0]?.questionNumber;
    return first !== undefined ? { [first]: true } : {};
  });

  const toggleItem = (qNum: number) => {
    setExpandedSet((prev) => ({ ...prev, [qNum]: !prev[qNum] }));
  };

  const allExpanded =
    report.questionBreakdown.length > 0 &&
    report.questionBreakdown.every((q) => Boolean(expandedSet[q.questionNumber]));

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedSet({});
    } else {
      const next: Record<number, boolean> = {};
      for (const q of report.questionBreakdown) {
        next[q.questionNumber] = true;
      }
      setExpandedSet(next);
    }
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 65) return 'text-blue-600 dark:text-blue-400';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getBarColorClass = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 65) return 'bg-[#2563EB]';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getStrokeColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 65) return '#2563EB';
    if (score >= 50) return '#F59E0B';
    return '#EF4444';
  };

  const handleDownloadReport = () => {
    const lines: string[] = [
      `# Interview Performance Debrief — ${candidateProfile.name}`,
      `Role: ${config.targetRole}`,
      `Interview Type: ${config.interviewType} (${config.difficulty})`,
      `Date: ${new Date(report.generatedAt).toLocaleString()}`,
      ``,
      `## Overall Score: ${report.overallScore} / 100 (${report.readinessLabel})`,
      ``,
      report.executiveSummary,
      ``,
      `## Category Breakdown`,
      ...report.categories.map((c) => `- **${c.name}: ${c.score}/100** — ${c.rationale}`),
      ``,
      `## Key Strengths`,
      ...report.strengths.map((s) => `- ${s}`),
      ``,
      `## Areas for Improvement`,
      ...report.areasForImprovement.map((a) => `- ${a}`),
      ``,
      `## Question-by-Question Review`,
      ...report.questionBreakdown.flatMap((q) => [
        ``,
        `### Question ${q.questionNumber} (Score: ${q.score}/100)`,
        `**Prompt:** ${q.question}`,
        `**Your Answer:** ${q.candidateAnswer}`,
        `**Feedback:** ${q.feedback}`,
        `**Suggested Improvement:** ${q.suggestedImprovement}`,
      ]),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeRole = config.targetRole.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `interview-debrief-${safeRole || 'report'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Radial ring math
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, report.overallScore));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      {/* Header Bar */}
      <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between dark:border-[#1E293B]">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-[#94A3B8]">
            {candidateProfile.name} · {config.targetRole} · {config.interviewType} · {config.difficulty}
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-[#F8FAFC]">
            Performance Debrief
          </h1>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2.5">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-[#334155] dark:bg-[#151C2C] dark:text-[#F8FAFC] dark:hover:bg-[#1E293B] cursor-pointer whitespace-nowrap"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Print PDF</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadReport}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-[#334155] dark:bg-[#151C2C] dark:text-[#F8FAFC] dark:hover:bg-[#1E293B] cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Download Report</span>
          </button>
          <button
            type="button"
            onClick={onRetakeInterview}
            className="inline-flex items-center gap-2 rounded-md bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#3B82F6] cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Retake Interview</span>
          </button>
        </div>
      </div>

      {/* Top Row: Overall Score Card + Category Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Overall Score Radial Card */}
        <section
          aria-labelledby="overall-score-heading"
          className="lg:col-span-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-[#273244] dark:bg-[#111827]"
        >
          <h2
            id="overall-score-heading"
            className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]"
          >
            Overall Readiness Score
          </h2>

          <div className="mt-5 flex items-center gap-6">
            <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
              <svg className="h-32 w-32 -rotate-90" viewBox="0 0 128 128" aria-hidden="true">
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-slate-100 dark:text-slate-800"
                />
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  fill="none"
                  stroke={getStrokeColor(clampedScore)}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-3xl font-bold text-slate-900 dark:text-[#F8FAFC] tabular-nums">
                  {clampedScore}
                </span>
                <span className="font-mono text-xs text-slate-500 dark:text-[#94A3B8]">/ 100</span>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Assessment Verdict</p>
              <p className={`mt-0.5 text-lg font-bold ${getScoreColorClass(clampedScore)}`}>
                {report.readinessLabel}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-500 dark:text-[#94A3B8] tabular-nums">
                {report.questionBreakdown.length} questions evaluated
              </p>
            </div>
          </div>

          <p className="mt-5 border-t border-slate-100 pt-4 text-sm leading-relaxed text-slate-600 dark:border-[#1E293B] dark:text-slate-300">
            {report.executiveSummary}
          </p>
        </section>

        {/* Category Breakdown Progress Bars */}
        <section
          aria-labelledby="category-breakdown-heading"
          className="lg:col-span-8 rounded-lg border border-slate-200 bg-white p-6 dark:border-[#273244] dark:bg-[#111827]"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2
              id="category-breakdown-heading"
              className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]"
            >
              Competency Breakdown
            </h2>
            <span className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Scored 0–100 against {config.difficulty} expectations
            </span>
          </div>

          <div className="space-y-5">
            {report.categories.map((cat) => (
              <div key={cat.name}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-medium text-slate-900 dark:text-[#F8FAFC]">
                    {cat.name}
                  </span>
                  <span
                    className={`font-mono text-sm font-semibold tabular-nums ${getScoreColorClass(
                      cat.score
                    )}`}
                  >
                    {cat.score}%
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getBarColorClass(
                      cat.score
                    )}`}
                    style={{ width: `${Math.max(0, Math.min(100, cat.score))}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-[#94A3B8]">
                  {cat.rationale}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Strengths & Improvement Priorities */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-[#273244] dark:bg-[#111827]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
              Demonstrated Strengths
            </h2>
          </div>
          <ul className="mt-4 space-y-2.5">
            {report.strengths.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-[#273244] dark:bg-[#111827]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
              Priority Improvements
            </h2>
          </div>
          <ul className="mt-4 space-y-2.5">
            {report.areasForImprovement.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Collapsible Question-by-Question Review */}
      <section
        aria-labelledby="question-review-heading"
        className="mt-6 rounded-lg border border-slate-200 bg-white dark:border-[#273244] dark:bg-[#111827]"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-[#1E293B]">
          <div>
            <h2
              id="question-review-heading"
              className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC]"
            >
              Question-by-Question Breakdown
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-[#94A3B8]">
              Expand any question to compare your response against an AI-suggested improvement
            </p>
          </div>
          <button
            type="button"
            onClick={toggleAll}
            className="no-print text-xs font-medium text-[#2563EB] hover:text-[#3B82F6] dark:text-[#60A5FA] cursor-pointer whitespace-nowrap"
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-[#1E293B]">
          {report.questionBreakdown.map((item) => {
            const isOpen = Boolean(expandedSet[item.questionNumber]);
            return (
              <div key={item.questionNumber}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggleItem(item.questionNumber)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-[#151C2C] cursor-pointer"
                >
                  <div className="flex items-baseline gap-3 min-w-0">
                    <span className="font-mono text-xs font-semibold text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                      {String(item.questionNumber).padStart(2, '0')}.
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-[#F8FAFC] line-clamp-2">
                      {item.question}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span
                      className={`font-mono text-sm font-semibold tabular-nums ${getScoreColorClass(
                        item.score
                      )}`}
                    >
                      {item.score}/100
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="space-y-4 bg-slate-50/70 px-6 py-5 dark:bg-[#0B0F19]/50">
                    <div>
                      <h3 className="text-xs font-semibold tracking-wide text-slate-500 dark:text-[#94A3B8]">
                        Your Answer
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                        {item.candidateAnswer}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 md:grid-cols-2 dark:border-[#1E293B]">
                      <div>
                        <h3 className="text-xs font-semibold tracking-wide text-slate-500 dark:text-[#94A3B8]">
                          Interviewer Critique
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                          {item.feedback}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold tracking-wide text-emerald-700 dark:text-emerald-400">
                          AI-Suggested Improvement
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                          {item.suggestedImprovement}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
};
