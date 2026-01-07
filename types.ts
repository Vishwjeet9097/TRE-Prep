
export type Language = 'en' | 'hi';

export interface Translation {
  language: Language;
  content: string;
}

export interface Option {
  id: string;
  orderIndex: number;
  translations: Translation[];
}

export interface Question {
  id: string;
  order: number;
  subject: string;
  correctAnswer: number;
  translations: Translation[];
  options: Option[];
}

export interface Exam {
  id: string;
  title: string;
  examName: string;
  year: number;
  type: string;
  durationMinutes: number;
  totalMarks: number;
  negativeMarking: number;
  questions: Question[];
  createdAt: number;
}

export interface UserAnswer {
  questionId: string;
  selectedOptionId: string | null;
  isMarkedForReview: boolean;
}

export interface Attempt {
  id: string;
  examId: string;
  examTitle: string;
  startTime: number;
  endTime?: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  userAnswers: UserAnswer[];
  
  // Stats for completed attempts
  score?: number;
  correctCount?: number;
  wrongCount?: number;
  skippedCount?: number;
}

export enum Page {
  DASHBOARD = 'DASHBOARD',
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS',
  EXAM_ROOM = 'EXAM_ROOM',
  INSTRUCTIONS = 'INSTRUCTIONS',
  RESULTS = 'RESULTS'
}

export interface AppState {
  exams: Exam[];
  history: Attempt[];
  activePage: Page;
  currentExam: Exam | null;
  activeAttempt: Attempt | null;
  lastResult: Attempt | null;
  preferredLanguage: Language;
}
