
export interface Translation {
  en: string;
  hi: string;
}

export interface Option {
  id: string;
  text: Translation;
}

export interface Question {
  id: string;
  number: number;
  content: Translation;
  options: Option[];
  correctOptionId: string;
  explanation: Translation;
  topic?: string;
}

export interface ExamPaper {
  id: string;
  title: string;
  examType: string;
  year: number;
  subject: string;
  questions: Question[];
  status: 'draft' | 'published';
  createdAt: number;
  source?: 'PDF' | 'LOCAL';
}

export interface ParsingJob {
  id: string;
  title: string;
  fileName: string;
  status: 'pending' | 'parsing' | 'paused' | 'review' | 'failed';
  progress: number;
  progressMsg: string;
  parsedQuestions?: Question[];
  file?: File; // Transient, for resuming
  completedBatches?: number;
  metadata: {
    examType: string;
    year: number;
    subject: string;
  };
}

export interface AttemptResponse {
  questionId: string;
  selectedOptionId: string | null;
  isMarkedForReview: boolean;
  timeSpent: number; // in seconds
}

export interface ExamAttempt {
  id: string;
  paperId: string;
  userId: string;
  startTime: number;
  endTime: number | null;
  timeElapsed: number; // seconds
  responses: AttemptResponse[];
  score: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalUnattempted: number;
}
