
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
import { parseExamPDF } from './services/geminiService';

// --- Sub-components ---
import Dashboard from './components/Dashboard';
import ImportWizard from './components/ImportWizard';
import ExamPanel from './components/ExamPanel';
import ResultView from './components/ResultView';
import HistoryView from './components/HistoryView';
import AIChatAssistant from './components/AIChatAssistant';

type View = 'dashboard' | 'import' | 'exam' | 'result' | 'history' | 'settings';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedPaper, setSelectedPaper] = useState<ExamPaper | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<ExamAttempt | null>(null);
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [activeJobs, setActiveJobs] = useState<ParsingJob[]>([]);
  const [reviewJob, setReviewJob] = useState<ParsingJob | null>(null);
  const [resumeAttempt, setResumeAttempt] = useState<ExamAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resultSource, setResultSource] = useState<'exam' | 'history'>('exam');

  useEffect(() => {
    setPapers(StorageService.getPapers());
    const draft = StorageService.getDraftAttempt();
    if (draft) {
      setResumeAttempt(draft);
    }
  }, [currentView]);

  const handleStartExam = (paper: ExamPaper) => {
    if (resumeAttempt && resumeAttempt.paperId === paper.id) {
      if (confirm('A saved draft exists for this paper. Would you like to resume?')) {
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
      alert("Failed to save results. Your progress is still in drafts.");
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

  const startBackgroundParsing = async (file: File, metadata: any) => {
    const jobId = Math.random().toString(36).substr(2, 9);
    const newJob: ParsingJob = {
      id: jobId,
      title: metadata.title || file.name.replace('.pdf', ''),
      fileName: file.name,
      status: 'parsing',
      progress: 0,
      progressMsg: 'Starting professional batch parse...',
      metadata: {
        examType: metadata.examType,
        year: metadata.year,
        subject: metadata.subject
      }
    };

    setActiveJobs(prev => [newJob, ...prev]);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        
        try {
          const questions = await parseExamPDF(base64, (msg) => {
            setActiveJobs(prev => prev.map(j => 
              j.id === jobId ? { 
                ...j, 
                progressMsg: msg, 
                progress: Math.min(j.progress + 15, 95) // Incremental visual progress
              } : j
            ));
          });

          setActiveJobs(prev => prev.map(j => 
            j.id === jobId ? { 
              ...j, 
              status: 'review', 
              parsedQuestions: questions, 
              progress: 100, 
              progressMsg: `Success: ${questions.length} questions digitized.` 
            } : j
          ));
        } catch (err) {
          setActiveJobs(prev => prev.map(j => 
            j.id === jobId ? { ...j, status: 'failed', progressMsg: 'Parsing failed. AI could not reassemble batches.' } : j
          ));
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setActiveJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, status: 'failed', progressMsg: 'File read error.' } : j
      ));
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
            onStartExam={handleStartExam} 
            onImportClick={() => {
              setReviewJob(null);
              setCurrentView('import');
            }} 
            onDeletePaper={(id) => {
              StorageService.deletePaper(id);
              setPapers(StorageService.getPapers());
            }} 
            onReviewJob={handleReviewJob}
            onDeleteJob={handleDeleteJob}
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
          />
        );
      case 'exam':
        return selectedPaper ? (
          <ExamPanel 
            paper={selectedPaper} 
            resumeAttempt={resumeAttempt}
            onFinish={handleExamFinish} 
            onCancel={() => setCurrentView('dashboard')} 
          />
        ) : null;
      case 'result':
        return currentAttempt && selectedPaper ? (
          <ResultView 
            attempt={currentAttempt} 
            paper={selectedPaper} 
            onBack={() => setCurrentView(resultSource === 'history' ? 'history' : 'dashboard')} 
          />
        ) : null;
      case 'history':
        return <HistoryView onBack={() => setCurrentView('dashboard')} onSelectAttempt={handleViewAttemptDetail} />;
      case 'settings':
        return <SettingsPage onBack={() => setCurrentView('dashboard')} />;
      default:
        return <Dashboard papers={papers} jobs={activeJobs} onStartExam={handleStartExam} onImportClick={() => setCurrentView('import')} onDeletePaper={() => {}} onReviewJob={handleReviewJob} onDeleteJob={handleDeleteJob} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {currentView !== 'exam' && !isLoading && (
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <BookOpen size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">TRE-Prep</h1>
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
              active={currentView === 'history'} 
              icon={<HistoryIcon size={20} />} 
              label="Attempt History" 
              onClick={() => setCurrentView('history')} 
            />
          </nav>

          <div className="p-4 border-t border-slate-100">
            <div className="bg-indigo-50 p-4 rounded-2xl mb-4 border border-indigo-100">
               <div className="flex items-center gap-2 text-indigo-600 mb-1">
                  <Sparkles size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Premium Plan</span>
               </div>
               <p className="text-[10px] text-indigo-700/70 font-bold leading-tight">Gemini Live & Pro features enabled.</p>
            </div>
            <NavItem 
              active={currentView === 'settings'} 
              icon={<SettingsIcon size={20} />} 
              label="Settings" 
              onClick={() => setCurrentView('settings')} 
            />
            <button className="flex items-center gap-3 w-full px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all mt-1">
              <LogOut size={20} />
              <span className="font-medium text-sm">Logout</span>
            </button>
          </div>
        </aside>
      )}

      <main className="flex-1 overflow-auto relative">
        {renderContent()}
        {currentView !== 'exam' && currentView !== 'result' && !isLoading && (
          <AIChatAssistant />
        )}
      </main>
    </div>
  );
}

const NavItem: React.FC<{ active: boolean; icon: React.ReactNode; label: string; onClick: () => void }> = ({ active, icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 translate-x-1' 
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
    }`}
  >
    {icon}
    <span className="font-semibold text-sm">{label}</span>
  </button>
);

const SettingsPage: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2">
    <div className="flex items-center gap-4 mb-8">
      <button onClick={onBack} className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200">
        <ArrowLeft size={24} className="text-slate-600" />
      </button>
      <h2 className="text-2xl font-bold text-slate-800">Account Settings</h2>
    </div>
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Display Name</label>
          <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" defaultValue="User" />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Bilingual Preference</label>
          <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none">
            <option>Hindi & English (Both)</option>
            <option>English Only</option>
            <option>Hindi Only</option>
          </select>
        </div>
        <div className="pt-4 border-t">
          <button className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default App;
