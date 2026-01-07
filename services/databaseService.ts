
import { Exam, Question, Attempt, UserAnswer, Language } from '../types';

/**
 * Service Layer for interacting with the normalized data.
 * In a full production environment, these methods would call API endpoints
 * that use Prisma to interact with PostgreSQL.
 */
export const databaseService = {
  
  /**
   * Persists a staged JSON import into normalized database records.
   */
  async persistStagedExam(stagedData: any, metadata: any): Promise<Exam> {
    const examId = `ex_${Date.now()}`;
    
    // Normalize into the Exam structure
    const exam: Exam = {
      id: examId,
      title: stagedData.metadata.title || metadata.paperTitle,
      examName: metadata.examName || "BPSC Mock",
      year: metadata.year || new Date().getFullYear(),
      type: metadata.type || "TRE 3",
      durationMinutes: stagedData.metadata.durationMinutes || 150,
      totalMarks: stagedData.questions.length,
      negativeMarking: 0.25,
      createdAt: Date.now(),
      questions: stagedData.questions.map((q: any) => ({
        id: `q_${q.order}_${examId}`,
        order: q.order,
        subject: q.subject,
        correctAnswer: q.correctAnswer,
        translations: [
          { language: 'en', content: q.contentEn },
          { language: 'hi', content: q.contentHi }
        ],
        options: q.options.map((opt: any) => ({
          id: `opt_${opt.orderIndex}_${q.order}_${examId}`,
          orderIndex: opt.orderIndex,
          translations: [
            { language: 'en', content: opt.textEn },
            { language: 'hi', content: opt.textHi }
          ]
        }))
      }))
    };

    return exam;
  },

  /**
   * Calculates scores using the authoritative server-side logic pattern.
   */
  calculateScore(exam: Exam, userAnswers: UserAnswer[]) {
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    exam.questions.forEach(q => {
      const ans = userAnswers.find(ua => ua.questionId === q.id);
      if (!ans || ans.selectedOptionId === null) {
        skippedCount++;
      } else {
        // Find the option to check orderIndex
        const selectedOpt = q.options.find(o => o.id === ans.selectedOptionId);
        if (selectedOpt && selectedOpt.orderIndex === q.correctAnswer) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }
    });

    const score = correctCount - (wrongCount * exam.negativeMarking);

    return {
      score,
      correctCount,
      wrongCount,
      skippedCount
    };
  }
};
