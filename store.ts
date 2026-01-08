
import { ExamPaper, ExamAttempt } from './types';

const STORAGE_KEYS = {
  PAPERS: 'tre_prep_papers',
  ATTEMPTS: 'tre_prep_attempts',
  DRAFT_ATTEMPT: 'tre_prep_draft_attempt'
};

export const StorageService = {
  getPapers: (): ExamPaper[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PAPERS);
    return data ? JSON.parse(data) : [];
  },

  savePaper: (paper: ExamPaper) => {
    const papers = StorageService.getPapers();
    const index = papers.findIndex(p => p.id === paper.id);
    if (index >= 0) {
      papers[index] = paper;
    } else {
      papers.push(paper);
    }
    localStorage.setItem(STORAGE_KEYS.PAPERS, JSON.stringify(papers));
  },

  deletePaper: (id: string) => {
    const papers = StorageService.getPapers().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PAPERS, JSON.stringify(papers));
    const attempts = StorageService.getAttempts().filter(a => a.paperId !== id);
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));
  },

  getAttempts: (): ExamAttempt[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    return data ? JSON.parse(data) : [];
  },

  saveAttempt: (attempt: ExamAttempt) => {
    const attempts = StorageService.getAttempts();
    attempts.push(attempt);
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));
    // Clear draft when finished
    StorageService.clearDraftAttempt();
  },

  getDraftAttempt: (): ExamAttempt | null => {
    const data = localStorage.getItem(STORAGE_KEYS.DRAFT_ATTEMPT);
    return data ? JSON.parse(data) : null;
  },

  saveDraftAttempt: (attempt: ExamAttempt) => {
    localStorage.setItem(STORAGE_KEYS.DRAFT_ATTEMPT, JSON.stringify(attempt));
  },

  clearDraftAttempt: () => {
    localStorage.removeItem(STORAGE_KEYS.DRAFT_ATTEMPT);
  }
};
