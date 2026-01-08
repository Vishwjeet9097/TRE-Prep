
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Timer, 
  Menu, 
  X, 
  ArrowLeft, 
  Bookmark, 
  BookmarkCheck,
  Pause,
  Play,
  Save,
  Flag,
  Info,
  BookOpen,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { ExamPaper, ExamAttempt, AttemptResponse } from '../types';
import { StorageService } from '../store';

interface ExamPanelProps {
  paper: ExamPaper;
  resumeAttempt?: ExamAttempt | null;
  onFinish: (attempt: ExamAttempt) => void;
  onCancel: () => void;
}

type LangMode = 'en' | 'hi' | 'both';

const ExamPanel: React.FC<ExamPanelProps> = ({ paper, resumeAttempt, onFinish, onCancel }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, { id: string | null; marked: boolean }>>({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [langMode, setLangMode] = useState<LangMode>('both');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Initialization & Resume logic
  useEffect(() => {
    if (resumeAttempt && resumeAttempt.paperId === paper.id) {
      setTimeElapsed(resumeAttempt.timeElapsed || 0);
      const initialResponses: Record<string, { id: string | null; marked: boolean }> = {};
      resumeAttempt.responses.forEach(r => {
        initialResponses[r.questionId] = { id: r.selectedOptionId, marked: r.isMarkedForReview || false };
      });
      setResponses(initialResponses);
    }
  }, [resumeAttempt, paper.id]);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (!isPaused) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPaused]);

  // Auto-save logic to Draft storage
  useEffect(() => {
    if (timeElapsed > 0) {
      const draftResponses: AttemptResponse[] = paper.questions.map(q => ({
        questionId: q.id,
        selectedOptionId: responses[q.id]?.id || null,
        isMarkedForReview: responses[q.id]?.marked || false,
        timeSpent: 0
      }));

      StorageService.saveDraftAttempt({
        id: resumeAttempt?.id || Math.random().toString(36).substr(2, 9),
        paperId: paper.id,
        userId: 'user_1',
        startTime: resumeAttempt?.startTime || Date.now() - (timeElapsed * 1000),
        endTime: null,
        timeElapsed,
        responses: draftResponses,
        score: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        totalUnattempted: 0
      });
    }
  }, [responses, timeElapsed, paper.id, paper.questions, resumeAttempt]);

  const currentQuestion = paper.questions[currentIdx];

  // Fix: Improved handleSelectOption to prevent unknown type errors on record access by using a default entry object
  const handleSelectOption = (qId: string, optId: string) => {
    if (isPaused) return;
    setResponses(prev => {
      const existing = prev[qId] || { id: null, marked: false };
      return {
        ...prev,
        [qId]: { ...existing, id: existing.id === optId ? null : optId }
      };
    });
  };

  // Fix: Improved handleToggleMark to prevent unknown type errors on record access by using a default entry object
  const handleToggleMark = (qId: string) => {
    if (isPaused) return;
    setResponses(prev => {
      const existing = prev[qId] || { id: null, marked: false };
      return {
        ...prev,
        [qId]: { ...existing, marked: !existing.marked }
      };
    });
  };

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleFinish = () => {
    try {
      let correct = 0, incorrect = 0, unattempted = 0;
      const finalResponses: AttemptResponse[] = paper.questions.map(q => {
        // Fix: Explicitly type r to avoid unknown property errors
        const r = responses[q.id] as { id: string | null; marked: boolean } | undefined;
        if (!r || r.id === null) {
          unattempted++;
        } else if (r.id === q.correctOptionId) {
          correct++;
        } else {
          incorrect++;
        }

        return {
          questionId: q.id,
          selectedOptionId: r?.id || null,
          isMarkedForReview: r?.marked || false,
          timeSpent: 0
        };
      });

      const attempt: ExamAttempt = {
        id: resumeAttempt?.id || Math.random().toString(36).substr(2, 9),
        paperId: paper.id,
        userId: 'user_1',
        startTime: resumeAttempt?.startTime || Date.now() - (timeElapsed * 1000),
        endTime: Date.now(),
        timeElapsed,
        responses: finalResponses,
        score: correct,
        totalCorrect: correct,
        totalIncorrect: incorrect,
        totalUnattempted: unattempted
      };

      onFinish(attempt);
    } catch (err) {
      console.error("Submission Error:", err);
      alert("Something went wrong while submitting. Please try again.");
    }
  };

  // Fix: Explicitly cast Object.values to avoid unknown type errors in map/filter
  const responseValues = Object.values(responses) as Array<{ id: string | null; marked: boolean }>;
  const answeredCount = responseValues.filter(r => r.id !== null).length;
  const markedCount = responseValues.filter(r => r.marked).length;

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col z-50 select-none overflow-hidden">
      {/* Submit Confirmation Overlay */}
      {showSubmitConfirm && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/40 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Ready to Submit?</h3>
            <p className="text-slate-500 font-medium mb-6">
              You have answered <span className="text-indigo-600 font-bold">{answeredCount}</span> out of <span className="font-bold">{paper.questions.length}</span> questions.
              {markedCount > 0 && <span> You still have <span className="text-purple-600 font-bold">{markedCount}</span> questions marked for review.</span>}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
              >
                Go Back
              </button>
              <button 
                onClick={handleFinish}
                className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Navigation Header */}
      <header className="h-20 bg-white border-b flex items-center justify-between px-6 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if(confirm("Exit and save draft? You can resume later from the dashboard.")) onCancel();
            }} 
            className="p-3 hover:bg-slate-50 border border-slate-100 rounded-2xl text-slate-500 transition-all"
            title="Exit Exam"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="h-8 w-px bg-slate-200 mx-2" />
          <div className="flex flex-col">
            <h2 className="font-extrabold text-slate-800 leading-tight truncate max-w-[200px] md:max-w-md text-lg">
              {paper.title}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest">{paper.examType}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Year: {paper.year}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Lang Toggles */}
          <div className="hidden md:flex bg-slate-100 p-1.5 rounded-2xl gap-1 border border-slate-200">
            {(['en', 'hi', 'both'] as LangMode[]).map(m => (
              <button
                key={m}
                onClick={() => setLangMode(m)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
                  langMode === m ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl font-mono font-black text-base transition-all shadow-inner ${
              isPaused ? 'bg-amber-100 text-amber-700' : 'bg-slate-900 text-white'
            }`}>
              <Timer size={18} className={isPaused ? 'animate-pulse' : 'text-indigo-400'} />
              {formatTime(timeElapsed)}
            </div>
            
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className={`p-3 rounded-2xl transition-all ${isPaused ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              title={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} />}
            </button>
          </div>

          <button 
            onClick={() => setShowSubmitConfirm(true)}
            className="px-8 py-3 bg-indigo-600 text-white font-black rounded-2xl text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
          >
            SUBMIT
          </button>
          
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-3 text-slate-600 bg-white border border-slate-200 rounded-2xl">
             <Menu size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 z-40 backdrop-blur-xl bg-white/70 flex flex-col items-center justify-center p-6 text-center">
             <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-amber-200/50">
                <Pause size={48} />
             </div>
             <h3 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Exam is Paused</h3>
             <p className="text-slate-500 font-bold max-w-sm mb-10 text-lg">Your progress is safely locked. Resume when you're ready.</p>
             <button 
               onClick={() => setIsPaused(false)}
               className="px-12 py-5 bg-indigo-600 text-white font-black rounded-[1.5rem] hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all flex items-center gap-4 text-xl scale-110 active:scale-100"
             >
               <Play size={24} fill="currentColor" />
               RESUME NOW
             </button>
          </div>
        )}

        {/* Main Workspace */}
        <div className="flex-1 overflow-auto p-4 md:p-10">
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Action Bar */}
            <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
               <div className="flex items-center gap-4">
                  <span className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-200">
                    {currentIdx + 1}
                  </span>
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Question Palette</h3>
                    <p className="font-extrabold text-slate-800 text-sm mt-1">Multiple Choice</p>
                  </div>
               </div>
               
               <div className="flex items-center gap-3">
                 <button 
                  onClick={() => handleToggleMark(currentQuestion.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all ${
                    responses[currentQuestion.id]?.marked 
                    ? 'bg-purple-600 text-white shadow-xl shadow-purple-200 scale-105' 
                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                  }`}
                 >
                   {responses[currentQuestion.id]?.marked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                   {responses[currentQuestion.id]?.marked ? 'MARKED FOR REVIEW' : 'MARK FOR REVIEW'}
                 </button>
                 
                 <button 
                  onClick={() => handleSelectOption(currentQuestion.id, responses[currentQuestion.id]?.id || '')}
                  className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                  title="Clear Response"
                 >
                   <RotateCcw size={20} />
                 </button>
               </div>
            </div>

            {/* Question Card */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 md:p-14 shadow-2xl shadow-slate-200/40 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                   <BookOpen size={160} />
                </div>
                
                <div className="relative space-y-12">
                  <div className="space-y-8">
                    {(langMode === 'en' || langMode === 'both') && (
                      <p className="text-3xl font-black text-slate-800 leading-[1.2] tracking-tight">
                        {currentQuestion.content.en}
                      </p>
                    )}
                    {(langMode === 'hi' || langMode === 'both') && (
                      <p className={`text-2xl font-bold leading-relaxed hindi-text ${langMode === 'both' ? 'text-slate-500 border-l-[6px] pl-8 border-indigo-100' : 'text-slate-800'}`}>
                        {currentQuestion.content.hi}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {currentQuestion.options.map(opt => {
                      const isSelected = responses[currentQuestion.id]?.id === opt.id;
                      return (
                        <button 
                          key={opt.id}
                          onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                          className={`group relative flex items-start gap-5 p-6 rounded-[1.5rem] border-2 transition-all text-left ${
                            isSelected 
                              ? 'border-indigo-600 bg-indigo-50 shadow-xl shadow-indigo-100/50 translate-x-1 ring-4 ring-indigo-50/50' 
                              : 'border-slate-100 hover:border-indigo-300 bg-white'
                          }`}
                        >
                          <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all ${
                            isSelected ? 'bg-indigo-600 text-white scale-110' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                          }`}>
                            {opt.id.toUpperCase()}
                          </span>
                          <div className="flex-1 pt-1">
                            {(langMode === 'en' || langMode === 'both') && (
                              <p className={`font-black text-lg transition-colors ${isSelected ? 'text-indigo-950' : 'text-slate-700'}`}>
                                {opt.text.en}
                              </p>
                            )}
                            {(langMode === 'hi' || langMode === 'both') && (
                              <p className={`text-base font-bold hindi-text transition-colors mt-1 ${isSelected ? 'text-indigo-800' : 'text-slate-500'}`}>
                                {opt.text.hi}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-6 pb-20">
              <button 
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => prev - 1)}
                className="flex items-center gap-3 px-10 py-5 bg-white text-slate-700 font-black rounded-[1.5rem] border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:scale-95 transition-all shadow-sm"
              >
                <ChevronLeft size={24} />
                PREVIOUS
              </button>
              
              <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</span>
                  <div className="flex gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${responses[currentQuestion.id]?.id ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <div className={`w-2 h-2 rounded-full ${responses[currentQuestion.id]?.marked ? 'bg-purple-500' : 'bg-slate-300'}`} />
                  </div>
                </div>
              </div>

              {currentIdx < paper.questions.length - 1 ? (
                <button 
                  onClick={() => setCurrentIdx(prev => prev + 1)}
                  className="flex items-center gap-3 px-14 py-5 bg-slate-900 text-white font-black rounded-[1.5rem] hover:bg-indigo-600 shadow-2xl shadow-slate-200 transition-all group scale-105 active:scale-100"
                >
                  SAVE & NEXT
                  <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button 
                  onClick={() => setShowSubmitConfirm(true)}
                  className="flex items-center gap-3 px-14 py-5 bg-emerald-600 text-white font-black rounded-[1.5rem] hover:bg-emerald-700 shadow-2xl shadow-emerald-100 transition-all scale-105 active:scale-100"
                >
                  FINAL REVIEW
                  <CheckCircle size={24} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Improved Question Palette */}
        <aside className={`fixed inset-y-0 right-0 w-80 bg-white border-l border-slate-100 p-8 overflow-auto shadow-2xl transition-transform lg:relative lg:translate-x-0 z-50 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
           <div className="flex items-center justify-between mb-10">
              <h4 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.25em] flex items-center gap-3">
                 <Flag size={16} className="text-indigo-600" />
                 Question Explorer
              </h4>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">
                <X size={24} />
              </button>
           </div>
           
           <div className="grid grid-cols-5 gap-3">
              {paper.questions.map((q, idx) => {
                const r = responses[q.id];
                const isCurrent = idx === currentIdx;
                const isAnswered = r?.id !== null && r?.id !== undefined;
                const isMarked = r?.marked;

                let colorClass = "bg-slate-50 text-slate-400 border border-slate-100 hover:border-slate-300 hover:text-slate-600";
                if (isCurrent) colorClass = "bg-white text-indigo-600 border-[3px] border-indigo-600 shadow-xl shadow-indigo-100 scale-110 z-10";
                else if (isMarked && isAnswered) colorClass = "bg-purple-600 text-white shadow-lg ring-2 ring-emerald-400 ring-offset-2";
                else if (isMarked) colorClass = "bg-purple-600 text-white shadow-lg";
                else if (isAnswered) colorClass = "bg-emerald-600 text-white shadow-lg shadow-emerald-100";

                return (
                  <button 
                    key={q.id}
                    onClick={() => {
                      setCurrentIdx(idx);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={`w-11 h-11 rounded-xl text-xs font-black flex items-center justify-center transition-all ${colorClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
           </div>

           <div className="mt-14 space-y-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Color Codes</h5>
              <LegendItem color="bg-emerald-600" label="Answered" />
              <LegendItem color="bg-purple-600" label="Marked Review" />
              <LegendItem color="bg-purple-600 ring-2 ring-emerald-400 ring-offset-2" label="Solved & Marked" />
              <LegendItem color="bg-slate-50 border border-slate-200" label="Unanswered" />
           </div>

           <div className="mt-8 p-6 bg-indigo-50 rounded-[1.5rem] border border-indigo-100 flex items-start gap-4 shadow-sm">
              <Info size={20} className="text-indigo-600 shrink-0" />
              <p className="text-[11px] text-indigo-700 font-bold leading-relaxed">
                Exam progress is synchronized in real-time. You can close the browser and resume later from the dashboard.
              </p>
           </div>
        </aside>
      </div>
    </div>
  );
};

const LegendItem = ({ color, label }: { color: string, label: string }) => (
  <div className="flex items-center gap-4">
    <div className={`w-5 h-5 rounded-lg ${color} shrink-0 shadow-sm`} />
    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{label}</span>
  </div>
);

export default ExamPanel;
