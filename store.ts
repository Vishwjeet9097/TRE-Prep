
import { ExamPaper, ExamAttempt, Question } from './types';

const STORAGE_KEYS = {
  PAPERS: 'tre_prep_papers',
  ATTEMPTS: 'tre_prep_attempts',
  DRAFT_ATTEMPT: 'tre_prep_draft_attempt',
  TEMPLATES: 'tre_prep_templates'
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

  updatePaper: (paperId: string, updates: Partial<ExamPaper>) => {
    const papers = StorageService.getPapers();
    const index = papers.findIndex(p => p.id === paperId);
    if (index >= 0) {
      papers[index] = { ...papers[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.PAPERS, JSON.stringify(papers));
    }
  },

  deletePaper: (id: string) => {
    const papers = StorageService.getPapers().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PAPERS, JSON.stringify(papers));
    const attempts = StorageService.getAttempts().filter(a => a.paperId !== id);
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));
  },

  getAllQuestions: (): Question[] => {
    const papers = StorageService.getPapers();
    return papers.flatMap(p => p.questions);
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
  },

  getTemplates: (): ExamPaper[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    return data ? JSON.parse(data) : [];
  },

  saveTemplate: (paper: ExamPaper) => {
    const templates = StorageService.getTemplates();
    if (!templates.some(t => t.id === paper.id)) {
      templates.push(paper);
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
    }
  },

  deleteTemplate: (id: string) => {
    const templates = StorageService.getTemplates().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  }
};

export const StreakService = {
  checkStreak: (): number => {
    const lastLogin = localStorage.getItem('tre_last_login');
    const currentStreak = parseInt(localStorage.getItem('tre_streak') || '0');
    const today = new Date().toDateString();

    if (lastLogin === today) {
      return currentStreak;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastLogin === yesterday.toDateString()) {
      const newStreak = currentStreak + 1;
      localStorage.setItem('tre_streak', newStreak.toString());
      localStorage.setItem('tre_last_login', today);
      return newStreak;
    } else {
      // Broken streak or first time
      localStorage.setItem('tre_streak', '1');
      localStorage.setItem('tre_last_login', today);
      return 1;
    }
  },

  getStreak: (): number => {
    return parseInt(localStorage.getItem('tre_streak') || '0');
  }
};

export interface UserProfile {
  name: string;
  phone: string;
  location: string;
  initials: string;
  isBilingual: boolean;
  isOnboarded: boolean;
  apiKey?: string;
}

export const UserService = {
  getProfile: (): UserProfile => {
    const data = localStorage.getItem('tre_user_profile');
    if (data) {
      const profile = JSON.parse(data);
      // Migration for existing users
      if (typeof profile.isOnboarded === 'undefined') {
        profile.isOnboarded = false; // Force onboarding for updated app
      }
      return profile;
    }

    // Default for fresh users
    return {
      name: '',
      phone: '',
      location: '',
      initials: '',
      isBilingual: true,
      isOnboarded: false,
      apiKey: ''
    };
  },

  saveProfile: (profile: UserProfile) => {
    localStorage.setItem('tre_user_profile', JSON.stringify(profile));
  }
};
