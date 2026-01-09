
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileUp,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Plus,
  BookOpen,
  CheckCircle,
  Clock,
  LogOut,
  ChevronRight,
  Trash2,
  AlertCircle,
  ArrowLeft,
  Timer,
  Loader2,
  Sparkles
} from 'lucide-react';
import { StorageService } from './store';
import { ExamPaper, ExamAttempt, Question, ParsingJob } from './types';
import { parseExamPDF, LimitReachedError } from './services/geminiService';
import { Toaster, toast } from 'sonner';
import { ConfirmProvider, useConfirm } from './context/ConfirmContext';

// --- Sub-components ---
import Dashboard from './components/Dashboard';
import ImportWizard from './components/ImportWizard';
import ExamPanel from './components/ExamPanel';
import ResultView from './components/ResultView';
import HistoryView from './components/HistoryView';
import AIChatAssistant from './components/AIChatAssistant';
import AIChatPage from './components/AIChatPage';
import BottomNav from './components/BottomNav';

type View = 'dashboard' | 'import' | 'exam' | 'result' | 'history' | 'settings' | 'ai-chat';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  console.log('App Render: currentView =', currentView); // DEBUG LOG
  const [selectedPaper, setSelectedPaper] = useState<ExamPaper | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<ExamAttempt | null>(null);
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [activeJobs, setActiveJobs] = useState<ParsingJob[]>([]);
  const [reviewJob, setReviewJob] = useState<ParsingJob | null>(null);
  const [resumeAttempt, setResumeAttempt] = useState<ExamAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resultSource, setResultSource] = useState<'exam' | 'history'>('exam');
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);

  const { confirm } = useConfirm();

  useEffect(() => {
    setPapers(StorageService.getPapers());
    setAttempts(StorageService.getAttempts());
    const draft = StorageService.getDraftAttempt();
    if (draft) {
      setResumeAttempt(draft);
    }
  }, [currentView]);

  const handleStartExam = async (paper: ExamPaper) => {
    if (resumeAttempt && resumeAttempt.paperId === paper.id) {
      const shouldResume = await confirm({
        title: "Resume Exam?",
        description: "A saved draft exists for this paper. Would you like to resume where you left off?",
        confirmLabel: "Resume Exam",
        cancelLabel: "Start New",
        variant: "neutral"
      });

      if (shouldResume) {
        setSelectedPaper(paper);
        setCurrentView('exam');
        return;
      } else {
        StorageService.clearDraftAttempt();
        setResumeAttempt(null);
      }
    }

    setSelectedPaper(paper);
    setResumeAttempt(null);
    setCurrentView('exam');
  };

  const handleExamFinish = (attempt: ExamAttempt) => {
    try {
      setIsLoading(true);
      StorageService.saveAttempt(attempt);
      setCurrentAttempt(attempt);
      setResumeAttempt(null);
      setResultSource('exam');

      setTimeout(() => {
        setCurrentView('result');
        setIsLoading(false);
      }, 500);
    } catch (err) {
      console.error("Failed to finish exam:", err);
      setIsLoading(false);
      toast.error("Failed to save results", { description: "Your progress is still in drafts." });
    }
  };

  const handleViewAttemptDetail = (attempt: ExamAttempt) => {
    const paper = papers.find(p => p.id === attempt.paperId);
    if (paper) {
      setSelectedPaper(paper);
      setCurrentAttempt(attempt);
      setResultSource('history');
      setCurrentView('result');
    }
  };

  const startBackgroundParsing = async (file: File | undefined, metadata: any, resumeJobId?: string) => {
    let jobId = Math.random().toString(36).substr(2, 9);
    let startBatch = 0;
    let initialQuestions: Question[] = [];
    let fileToProcess = file;

    // Handle Resume Logic
    if (resumeJobId) {
      const existingJob = activeJobs.find(j => j.id === resumeJobId);
      if (existingJob) {
        jobId = existingJob.id;
        startBatch = existingJob.completedBatches || 0;
        initialQuestions = existingJob.parsedQuestions || [];
        fileToProcess = existingJob.file;

        // Update to 'parsing' state immediately
        setActiveJobs(prev => prev.map(j =>
          j.id === jobId ? { ...j, status: 'parsing', progressMsg: 'Resuming extraction...' } : j
        ));
      }
    } else if (file) {
      // New Job
      const newJob: ParsingJob = {
        id: jobId,
        title: metadata.title || file.name.replace('.pdf', ''),
        fileName: file.name,
        status: 'parsing',
        progress: 0,
        progressMsg: 'Starting professional batch parse...',
        file: file, // Store file transiently
        metadata: {
          examType: metadata.examType,
          year: metadata.year,
          subject: metadata.subject
        }
      };
      setActiveJobs(prev => [newJob, ...prev]);
    } else {
      console.error("No file provided for new job");
      return;
    }

    if (!fileToProcess) {
      toast.error("Original file lost. Please re-upload.", {
        description: "The PDF file is no longer in memory. Try importing again."
      });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];

        try {
          // Call parser with resume parameters
          const questions = await parseExamPDF(
            base64,
            (msg) => {
              setActiveJobs(prev => prev.map(j =>
                j.id === jobId ? {
                  ...j,
                  progressMsg: msg,
                  progress: Math.min(j.progress + 15, 95) // Incremental visual progress
                } : j
              ));
            },
            startBatch,
            initialQuestions
          );

          setActiveJobs(prev => prev.map(j =>
            j.id === jobId ? {
              ...j,
              status: 'review',
              parsedQuestions: questions,
              progress: 100,
              progressMsg: `Success: ${questions.length} questions digitized.`
            } : j
          ));

          toast.success("Extraction Complete", {
            description: `${questions.length} questions ready for review.`
          });

        } catch (err: any) {
          if (err instanceof LimitReachedError) {
            // Handle Paused State
            setActiveJobs(prev => prev.map(j =>
              j.id === jobId ? {
                ...j,
                status: 'paused',
                progressMsg: 'Paused: Limit Reached',
                parsedQuestions: err.parsedQuestions,
                completedBatches: err.completedBatches
              } : j
            ));

            toast("Parsing Limit Reached", {
              description: "We've paused to save your quota. Resume when ready or retry later.",
              action: {
                label: "Resume Now",
                onClick: () => startBackgroundParsing(undefined, {}, jobId) // Resume!
              },
              duration: 10000,
            });
          } else {
            setActiveJobs(prev => prev.map(j =>
              j.id === jobId ? { ...j, status: 'failed', progressMsg: 'Parsing failed. AI could not reassemble batches.' } : j
            ));
            toast.error("Extraction Failed", { description: "Please check the PDF file and try again." });
          }
        }
      };
      reader.readAsDataURL(fileToProcess);
    } catch (err) {
      setActiveJobs(prev => prev.map(j =>
        j.id === jobId ? { ...j, status: 'failed', progressMsg: 'File read error.' } : j
      ));
      toast.error("File Read Error");
    }
  };

  const handleReviewJob = (job: ParsingJob) => {
    setReviewJob(job);
    setCurrentView('import');
  };

  const handleFinishReview = () => {
    if (reviewJob) {
      setActiveJobs(prev => prev.filter(j => j.id !== reviewJob.id));
      setReviewJob(null);
    }
    setCurrentView('dashboard');
  };

  const handleImportComplete = (paper: ExamPaper) => {
    StorageService.savePaper(paper);
    setPapers(StorageService.getPapers());
    setCurrentView('dashboard');
    setActiveJobs(prev => prev.filter(j => j.id !== reviewJob?.id));
    setReviewJob(null);
    toast.success("Success", { description: "Exam paper published successfully." });
  };

  const handleDeleteJob = (id: string) => {
    setActiveJobs(prev => prev.filter(j => j.id !== id));
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Calculating Results...</h3>
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            papers={papers}
            jobs={activeJobs}
            attempts={attempts}
            onStartExam={handleStartExam}
            onImportClick={() => setCurrentView('import')}
            onDeletePaper={(id) => {
              StorageService.deletePaper(id);
              setPapers(StorageService.getPapers());
            }}
            onReviewJob={handleReviewJob}
            onResumeJob={(job) => startBackgroundParsing(undefined, {}, job.id)}
            onDeleteJob={(id) => setActiveJobs(prev => prev.filter(j => j.id !== id))}
            onViewAttempt={handleViewAttemptDetail}
          />
        );
      case 'import':
        return (
          <ImportWizard
            initialJob={reviewJob}
            onStartParsing={startBackgroundParsing}
            onSuccess={handleFinishReview}
            onCancel={() => {
              setReviewJob(null);
              setCurrentView('dashboard');
            }}
            onImportComplete={handleImportComplete}
          />
        );
      case 'exam':
        return selectedPaper ? (
          <ExamPanel
            paper={selectedPaper}
            resumeAttempt={resumeAttempt}
            onFinish={handleExamFinish}
            onCancel={() => setCurrentView('dashboard')}
            onExit={() => setCurrentView('dashboard')}
            initialTimeRemaining={resumeAttempt ? undefined : selectedPaper.questions.length * 60}
            resumeData={resumeAttempt || undefined}
          />
        ) : null;
      case 'result':
        return currentAttempt && selectedPaper ? (
          <ResultView
            attempt={currentAttempt}
            paper={selectedPaper}
            onBack={() => setCurrentView(resultSource === 'history' ? 'history' : 'dashboard')}
            onHome={() => setCurrentView('dashboard')}
            onRetry={() => {
              const p = selectedPaper!;
              setSelectedPaper(p);
              setResumeAttempt(null);
              setCurrentView('exam');
            }}
          />
        ) : null;
      case 'history':
        return <HistoryView onBack={() => setCurrentView('dashboard')} onSelectAttempt={handleViewAttemptDetail} attempts={attempts} papers={papers} />;
      case 'ai-chat':
        return <AIChatPage />;
      case 'settings':
        return <ProfilePage onBack={() => setCurrentView('dashboard')} />;
      default:
        // DEBUG: If we hit default, show what view we are trying to render
        return (
          <div className="flex items-center justify-center h-full flex-col gap-4">
            <h2 className="text-xl font-bold text-red-500">Page Not Found</h2>
            <p>Trying to render view: {currentView}</p>
            <button onClick={() => setCurrentView('dashboard')} className="px-4 py-2 bg-blue-500 text-white rounded">Go Home</button>
            {/* Fallback to Dashboard if needed for production, but right now we debug */}
          </div>
        );
      // return <Dashboard papers={papers} jobs={activeJobs} onStartExam={handleStartExam} onImportClick={() => setCurrentView('import')} onDeletePaper={() => { }} onReviewJob={handleReviewJob} onDeleteJob={handleDeleteJob} attempts={attempts} onViewAttempt={handleViewAttemptDetail} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-100 shrink-0 z-40">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-md" />
          <h1 className="text-lg font-bold tracking-tight text-slate-800">TRE-Prep</h1>
        </div>
        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 border border-slate-200">
          <span className="text-xs font-bold">U</span>
        </div>
      </div>

      {currentView !== 'exam' && !isLoading && (
        <aside className="hidden md:flex w-72 bg-white flex-col shrink-0 transition-all p-4">
          <div className="px-4 py-6 flex items-center gap-3 mb-6">
            <img src="/logo.png" alt="TRE-Prep Logo" className="w-10 h-10 rounded-xl shadow-lg shadow-indigo-200" />
            <h1 className="text-xl font-black tracking-tight text-slate-900">TRE-Prep</h1>
          </div>

          <nav className="flex-1 px-4 space-y-1 py-4">
            <NavItem
              active={currentView === 'dashboard'}
              icon={<LayoutDashboard size={20} />}
              label="Dashboard"
              onClick={() => setCurrentView('dashboard')}
            />
            <NavItem
              active={currentView === 'import'}
              icon={<FileUp size={20} />}
              label="Import Paper"
              onClick={() => {
                setReviewJob(null);
                setCurrentView('import');
              }}
            />
            <NavItem
              active={currentView === 'ai-chat'}
              icon={<Sparkles size={20} />}
              label="AI Tutor"
              onClick={() => setCurrentView('ai-chat')}
            />
            <NavItem
              active={currentView === 'history'}
              icon={<HistoryIcon size={20} />}
              label="Attempt History"
              onClick={() => setCurrentView('history')}
            />
          </nav>

          <div className="p-4 border-t border-slate-100">

            <NavItem
              active={currentView === 'settings'}
              icon={<SettingsIcon size={20} />}
              label="Settings"
              onClick={() => setCurrentView('settings')}
            />

          </div>
        </aside>
      )}

      <main className="flex-1 overflow-auto relative pb-24 md:pb-0">
        {renderContent()}
        {currentView !== 'exam' && currentView !== 'result' && currentView !== 'ai-chat' && !isLoading && (
          <AIChatAssistant />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      {currentView !== 'exam' && !isLoading && (
        <BottomNav
          currentView={currentView}
          onChangeView={(view) => {
            if (view === 'import') setReviewJob(null);
            setCurrentView(view);
          }}
        />
      )}
      <Toaster position="top-center" />
    </div>
  );
}

const NavItem: React.FC<{ active: boolean; icon: React.ReactNode; label: string; onClick: () => void }> = ({ active, icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-4 w-full px-5 py-4 rounded-2xl transition-all duration-300 font-bold text-sm ${active
      ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 scale-100'
      : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900 hover:scale-[1.02]'
      }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

import ProfilePage from './components/ProfilePage';

const App: React.FC = () => {
  return (
    <ConfirmProvider>
      <AppContent />
    </ConfirmProvider>
  );
};

export default App;
