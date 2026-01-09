
import { ExamPaper } from '../types';
import { SAMPLE_PAPERS } from '../data/samplePapers';
import { StorageService } from '../store';

export enum PaperSource {
    STATIC = 'STATIC', // Hardcoded in codebase (Official)
    LOCAL = 'LOCAL',   // Saved in browser (User created/imported)
    REMOTE = 'REMOTE'  // Database (Future Community)
}

export interface LibraryPaper extends ExamPaper {
    source: PaperSource;
}

export const ContentService = {
    /**
     * Retrieves all available papers from all sources (Static + Local).
     * Merges them into a single list, prioritizing Local/Remote over Static if IDs collision occurs?
     * For now, we just list all unique papers.
     */
    getAllPapers: (): LibraryPaper[] => {
        // 1. Get Static Papers (Codebase)
        const staticPapers: LibraryPaper[] = SAMPLE_PAPERS.map(p => ({
            ...p,
            source: PaperSource.STATIC
        }));

        // 2. Get Local Templates (User Saved)
        const localTemplates = StorageService.getTemplates();
        const localPapers: LibraryPaper[] = localTemplates.map(p => ({
            ...p,
            source: PaperSource.LOCAL
        }));

        // 3. Merge (Avoid Duplicates by ID)
        // If a user "overrides" a static paper, we might want to show the local version?
        // For simplicity, we just concat and dedup by ID.
        const allPapers = [...localPapers, ...staticPapers];

        const uniquePapers = Array.from(new Map(allPapers.map(item => [item.id, item])).values());

        return uniquePapers;
    },

    /**
     * Saves a paper to the local library (Browser Storage).
     * This is what "Bookmark" does.
     */
    saveToLibrary: (paper: ExamPaper) => {
        StorageService.saveTemplate(paper);
    },

    /**
     * Removes a paper from the local library.
     * Only works for LOCAL source papers.
     */
    removeFromLibrary: (id: string) => {
        StorageService.deleteTemplate(id);
    },

    /**
     * checks if a paper exists in the library
     */
    isInLibrary: (id: string): boolean => {
        const all = ContentService.getAllPapers();
        return all.some(p => p.id === id);
    }
};
