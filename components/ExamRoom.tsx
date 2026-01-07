import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Exam, Attempt, Question, Language, UserAnswer } from '../types';
import { 
  Timer, Calculator as CalcIcon, Flag, ChevronLeft, ChevronRight, 
  ArrowLeft, Languages, LayoutGrid, AlertTriangle
} from 'lucide-react';
import Calculator from './Calculator';

interface ExamRoomProps {
  paper: Exam;
  initialLanguage: Language;
  onFinish: (attempt: Attempt) => void;
  onCancel: () => void;
}

const RichText: React.FC<{ content: string; className?: string }> = ({ content, className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Trigger KaTeX rendering
      if ((window as any).renderMath) {
        (window as any).renderMath(containerRef.current);
      }
      // Trigger Prism.js syntax highlighting
      if ((window as any).Prism) {
        (window as any).Prism.highlightAllUnder(containerRef.current);
      }
    }
  }, [content]);

  return (
    <div 
      ref={containerRef} 
      className={`text-slate-800 font-medium leading-relaxed whitespace-pre-wrap ${className}`}
      dangerouslySetInnerHTML={{ __html: content }} // Content is sanitized/formatted by AI into safe HTML tags if needed
    />
  );
};

const ExamRoom: React.FC<ExamRoomProps> = ({ paper, initialLanguage, onFinish, onCancel }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState(paper.durationMinutes * 60);
  const [showCalculator, setShowCalculator] = useState(false);
  const [viewLanguage, setViewLanguage] = useState<Language>(initialLanguage);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFinish = () => {
    const attempt: Attempt = {
      id: `att_${Date.now()}`,
      examId: paper.id,
      examTitle: paper.title,
      startTime: Date.now() - (paper.durationMinutes * 60 - timeLeft) * 1000,
      status: 'COMPLETED',
      userAnswers
    };
    onFinish(attempt);
  };

  const currentQ = paper.questions[currentIdx];
  
  const qDisplay = useMemo(() => {
    const trans = currentQ.translations.find(t => t.language === viewLanguage) || currentQ.translations[0];
    return {
      text: trans.content,
      options: currentQ.options.map(opt => ({
        id: opt.id,
        orderIndex: opt.orderIndex,
        content: opt.translations.find(t => t.language === viewLanguage)?.content || opt.translations[0].content
      }))
    };
  }, [currentQ, viewLanguage]);

  const updateAnswer = (optionId: string | null) => {
    setUserAnswers(prev => {
      const filtered = prev.filter(a => a.questionId !== currentQ.id);
      return [...filtered, { 
        questionId: currentQ.id, 
        selectedOptionId: optionId, 
        isMarkedForReview: prev.find(a => a.questionId === currentQ.id)?.isMarkedForReview || false 
      }];
    });
  };

  const toggleReview = () => {
    setUserAnswers(prev => {
      const existing = prev.find(a => a.questionId === currentQ.id);
      if (existing) {
        return prev.map(a => a.questionId === currentQ.id ? { ...a, isMarkedForReview: !a.isMarkedForReview } : a);
      }
      return [...prev, { questionId: currentQ.id, selectedOptionId: null, isMarkedForReview: true }];
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentAns = userAnswers.find(a => a.questionId === currentQ.id);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans select-none">
      <header className="bg-slate-900 text-white px-4 py-2.5 sticky top-0 z-50 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{paper.examName}</h1>
            <p className="text-xs font-bold truncate max-w-[200px] text-slate-200">{paper.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setViewLanguage(prev => prev === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-2 bg-indigo-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all"
          >
            <Languages className="w-3.5 h-3.5" />
            {viewLanguage === 'en' ? 'हिन्दी' : 'English'}
          </button>
          
          <div className="bg-slate-800 px-4 py-1.5 rounded-xl border border-slate-700 flex items-center gap-2.5">
            <Timer className={`w-4 h-4 ${timeLeft < 300 ? 'text-rose-500 animate-pulse' : 'text-indigo-400'}`} />
            <span className="font-mono text-sm font-black">{formatTime(timeLeft)}</span>
          </div>
          
          <button onClick={handleFinish} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all">Submit</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
              <div className="bg-slate-50/50 px-8 py-4 border-b border-slate-100 flex justify-between items-center">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Question {currentQ.order}</span>
                <button 
                  onClick={toggleReview}
                  className={`p-2.5 rounded-xl transition-all ${currentAns?.isMarkedForReview ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-300'}`}
                >
                  <Flag className={`w-4 h-4 ${currentAns?.isMarkedForReview ? 'fill-current' : ''}`} />
                </button>
              </div>
              
              <div className="p-12">
                <RichText content={qDisplay.text} className="text-lg mb-12" />
                
                <div className="grid gap-3">
                  {qDisplay.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => updateAnswer(opt.id)}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-start gap-5 group ${currentAns?.selectedOptionId === opt.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-50 hover:border-indigo-100 hover:bg-slate-50'}`}
                    >
                      <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${currentAns?.selectedOptionId === opt.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border-2 border-slate-100 text-slate-400'}`}>
                        {String.fromCharCode(65 + opt.orderIndex)}
                      </div>
                      <RichText content={opt.content} className="text-sm pt-1" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-white shadow-xl">
              <button 
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[10px] uppercase bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-20"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              
              <button onClick={() => updateAnswer(null)} className="text-[9px] font-black uppercase text-slate-300 hover:text-rose-500 transition-all">Clear Choice</button>

              <button 
                onClick={() => setCurrentIdx(prev => Math.min(paper.questions.length - 1, prev + 1))}
                disabled={currentIdx === paper.questions.length - 1}
                className="flex items-center gap-3 px-8 py-3 rounded-2xl font-black text-[10px] uppercase bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 disabled:opacity-20 transition-all"
              >
                Next Step <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>

        <aside className="hidden lg:flex w-72 bg-white border-l border-slate-100 p-6 flex-col">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Test Matrix</h3>
          <div className="grid grid-cols-5 gap-2 overflow-y-auto custom-scrollbar flex-1 pr-2">
            {paper.questions.map((q, idx) => {
              const ans = userAnswers.find(ua => ua.questionId === q.id);
              let style = 'bg-slate-50 text-slate-300 border-slate-100';
              if (ans?.isMarkedForReview) style = 'bg-amber-500 text-white border-amber-600 shadow-lg';
              else if (ans?.selectedOptionId) style = 'bg-indigo-600 text-white border-indigo-700 shadow-lg';
              if (currentIdx === idx) style += ' ring-4 ring-indigo-600/20 border-indigo-600 scale-110';

              return (
                <button key={q.id} onClick={() => setCurrentIdx(idx)} className={`aspect-square rounded-xl text-[10px] font-black border-2 transition-all flex items-center justify-center ${style}`}>
                  {q.order}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
    </div>
  );
};

export default ExamRoom;