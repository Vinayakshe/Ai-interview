export type AppView = 'setup' | 'interview' | 'debrief';

export type InterviewType = 'Technical' | 'Behavioral' | 'Mixed';

export type DifficultyLevel = 'Junior' | 'Mid-Level' | 'Senior';

export interface CandidateProfile {
  name: string;
  currentTitle: string;
  yearsExperience: string;
  summary: string;
  skills: string[];
  highlights: string[];
  education: string;
  fileName?: string;
  rawText: string;
}

export interface InterviewConfig {
  targetRole: string;
  interviewType: InterviewType;
  difficulty: DifficultyLevel;
  questionCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp: string;
  topic?: string;
  questionNumber?: number;
}

export interface CategoryScore {
  name: 'Technical Accuracy' | 'Communication' | 'Clarity' | 'Professional Tone';
  score: number;
  rationale: string;
}

export interface QuestionBreakdownItem {
  questionNumber: number;
  question: string;
  candidateAnswer: string;
  score: number;
  feedback: string;
  suggestedImprovement: string;
}

export interface EvaluationReport {
  overallScore: number;
  readinessLabel: 'Strong Hire' | 'Hire' | 'Developing' | 'Needs Focus';
  executiveSummary: string;
  categories: CategoryScore[];
  strengths: string[];
  areasForImprovement: string[];
  questionBreakdown: QuestionBreakdownItem[];
  generatedAt: string;
}
