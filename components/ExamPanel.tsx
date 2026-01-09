
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

import { useConfirm } from '../context/ConfirmContext';
import RichTextRenderer from './RichTextRenderer';

const ExamPanel: React.FC<ExamPanelProps> = ({ paper, resumeAttempt, onFinish, onCancel }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, { id: string | null; marked: boolean }>>({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [langMode, setLangMode] = useState<LangMode>('both');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const { confirm } = useConfirm();

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

  const calculateResultAndFinish = () => {
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

  const handleSubmit = () => {
    calculateResultAndFinish();
  };

  const handleExit = async () => {
    if (await confirm({
      title: "Exit Exam?",
      description: "Your progress will be saved as a draft. You can resume later from the dashboard.",
      confirmLabel: "Exit & Save",
      cancelLabel: "Cancel",
      variant: "neutral"
    })) {
      onCancel();
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
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-md w-full animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setShowSubmitConfirm(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
            >
              <X size={20} />
            </button>
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Ready to Submit?</h3>
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
                onClick={handleSubmit}
                className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Navigation Header - Glassmorphism */}
      <header className="h-16 md:h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-4 md:px-8 shadow-sm shrink-0 z-30 sticky top-0">
        <div className="flex items-center gap-3 md:gap-6">
          <button
            onClick={handleExit}
            className="p-2.5 md:p-3 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-slate-500 transition-all hover:scale-105 active:scale-95"
            title="Exit Exam"
          >
            <ArrowLeft size={20} className="md:w-5 md:h-5" />
          </button>
          <div className="h-8 md:h-10 w-px bg-slate-200 mx-1 hidden md:block" />
          <div className="hidden md:flex flex-col">
            <h2 className="font-bold text-slate-800 leading-tight truncate max-w-[160px] md:max-w-xl text-base md:text-xl tracking-tight">
              {paper.title}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest border border-indigo-100">{paper.examType}</span>
              <span className="text-[10px] text-slate-400 font-bold">• {paper.questions.length} Questions</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          {/* Submit Button (Header) */}
          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
          >
            <CheckCircle size={16} />
            <span>Submit</span>
          </button>

          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="md:hidden p-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold hover:bg-emerald-100 transition-all"
          >
            <CheckCircle size={20} />
          </button>

          {/* Lang Toggles - Premium Pill Style */}
          <div className="hidden md:flex bg-slate-100/80 p-1.5 rounded-2xl gap-1 border border-slate-200/50 backdrop-blur-sm">
            {(['en', 'hi', 'both'] as LangMode[]).map(m => (
              <button
                key={m}
                onClick={() => setLangMode(m)}
                className={`px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-300 ${langMode === m
                  ? 'bg-white text-indigo-600 shadow-sm scale-100 ring-1 ring-black/5'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Timer - Neumorphic Depth */}
            <div className={`flex items-center gap-2.5 px-4 py-2 md:px-5 md:py-2.5 rounded-2xl font-mono font-bold text-xs md:text-lg transition-all shadow-inner border border-white/20 ${isPaused
              ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-200'
              : 'bg-slate-800 text-white shadow-slate-300'
              }`}>
              <Timer size={16} className={`md:w-5 md:h-5 ${isPaused ? 'animate-pulse' : 'text-indigo-400'}`} />
              <span className="tracking-widest">{formatTime(timeElapsed)}</span>
            </div>

            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl shadow-sm active:scale-95 transition-transform"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative bg-[#F8F9FD]">
        {/* Pause Overlay - Frosted Glass */}
        {isPaused && (
          <div className="absolute inset-0 z-40 backdrop-blur-xl bg-white/60 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="w-28 h-28 bg-white text-amber-500 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-[0_20px_60px_-15px_rgba(251,191,36,0.5)] ring-1 ring-amber-100">
              <Pause size={56} fill="currentColor" className="ml-1" />
            </div>
            <h3 className="text-5xl font-bold text-slate-900 mb-4 tracking-tighter">Exam Paused</h3>
            <p className="text-slate-500 font-medium max-w-sm mb-12 text-lg leading-relaxed">Your progress is safely locked. Take a break and resume when ready.</p>
            <button
              onClick={() => setIsPaused(false)}
              className="px-10 py-5 bg-slate-900 text-white font-bold rounded-3xl hover:bg-slate-800 hover:scale-105 shadow-2xl shadow-slate-300 transition-all flex items-center gap-4 text-lg group"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Play size={14} fill="currentColor" />
              </div>
              RESUME EXAM
            </button>
          </div>
        )}

        {/* Main Workspace */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 w-full scroll-smooth">
          <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-10">

            {/* Mobile Paper Details */}
            <div className="md:hidden px-2 space-y-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-slate-900 leading-tight">{paper.title}</h1>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-sm uppercase tracking-wider">{paper.examType}</span>
                  <span className="text-xs font-bold text-slate-400">{paper.questions.length} Questions</span>
                </div>
              </div>

              {/* Mobile Language Toggle - Segmented Control */}
              <div className="bg-slate-100 p-1.5 rounded-[1.2rem] flex items-center shadow-inner border border-slate-200/60 mx-1">
                {(['en', 'hi', 'both'] as LangMode[]).map((m) => {
                  const isActive = langMode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setLangMode(m)}
                      className={`flex-1 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 relative overflow-hidden ${isActive
                        ? 'bg-white text-indigo-600 shadow-md scale-100 shadow-indigo-100 ring-1 ring-black/5'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                        }`}
                    >
                      {/* Active Indicator Dot matching the screenshot aesthetic slightly differently but premium */}
                      {isActive && <div className="absolute top-1/2 left-2 w-1 h-1 bg-indigo-500 rounded-full -translate-y-1/2 hidden" />}
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Card Container */}
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-1 shadow-[0_2px_40px_-12px_rgba(0,0,0,0.08)] border border-slate-100/50">
              {/* Action Bar */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-600 blur-lg opacity-20 rounded-full"></div>
                    <span className="relative w-12 h-12 md:w-14 md:h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl md:text-2xl shadow-inner border border-white/20">
                      {currentIdx + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] leading-none mb-1">Question</h3>
                    <p className="font-bold text-slate-800 text-sm md:text-base">Multiple Choice</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                  <button
                    onClick={() => handleToggleMark(currentQuestion.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[11px] md:text-xs transition-all duration-300 ${responses[currentQuestion.id]?.marked
                      ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-200'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                  >
                    {responses[currentQuestion.id]?.marked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                    <span className="hidden md:inline">{responses[currentQuestion.id]?.marked ? 'Marked' : 'Mark for Review'}</span>
                  </button>

                  <button
                    onClick={() => handleSelectOption(currentQuestion.id, responses[currentQuestion.id]?.id || '')}
                    className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    title="Clear Response"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>
              </div>

              {/* Question Content */}
              <div className="p-5 md:p-12 space-y-8 md:space-y-12">
                {/* Watermark Icon */}
                <div className="absolute top-20 right-10 text-slate-50 opacity-50 pointer-events-none transform rotate-12">
                  <BookOpen size={200} />
                </div>

                <div className="relative space-y-6 md:space-y-10 z-10">
                  <div className="mb-6 space-y-3">
                    {(langMode === 'en' || langMode === 'both') && (
                      <div className="text-base font-semibold text-slate-800 leading-relaxed">
                        <RichTextRenderer content={currentQuestion.content.en} />
                      </div>
                    )}
                    {(langMode === 'hi' || langMode === 'both') && (
                      <div className="text-base font-medium text-slate-600 leading-relaxed hindi-text">
                        <RichTextRenderer content={currentQuestion.content.hi} />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {currentQuestion.options.map(opt => {
                      const isSelected = responses[currentQuestion.id]?.id === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                          className={`group relative flex items-start gap-4 md:gap-5 p-5 md:p-6 rounded-[1.5rem] border-2 transition-all duration-200 text-left hover:shadow-lg hover:-translate-y-0.5 ${isSelected
                            ? 'border-indigo-600 bg-indigo-600/5 shadow-xl shadow-indigo-100 ring-1 ring-indigo-600/20'
                            : 'border-slate-100 hover:border-indigo-200 bg-white'
                            }`}
                        >
                          <span className={`w-8 h-8 md:w-11 md:h-11 rounded-xl md:rounded-2xl flex items-center justify-center font-bold text-xs md:text-sm shrink-0 transition-all duration-300 ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                            }`}>
                            {opt.id.toUpperCase()}
                          </span>
                          <div className="flex-1 pt-0.5 md:pt-1.5">
                            {(langMode === 'en' || langMode === 'both') && (
                              <div className={`font-semibold text-sm md:text-base transition-colors ${isSelected ? 'text-indigo-950' : 'text-slate-700'}`}>
                                <RichTextRenderer content={opt.text.en} />
                              </div>
                            )}
                            {(langMode === 'hi' || langMode === 'both') && opt.text.hi && (
                              <div className={`text-sm md:text-base transition-colors hindi-text ${isSelected ? 'text-indigo-900' : 'text-slate-600'} ${langMode === 'both' ? 'mt-1' : ''}`}>
                                <RichTextRenderer content={opt.text.hi} />
                              </div>
                            )}
                          </div>

                          {isSelected && (
                            <div className="absolute top-4 right-4 text-indigo-600 animate-in zoom-in spin-in-12 duration-300">
                              <CheckCircle size={20} fill="currentColor" className="text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Navigation */}
            <div className="flex items-center gap-4 sticky bottom-6 z-20">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => prev - 1)}
                className="flex-[1] flex items-center justify-center gap-3 px-6 py-4 bg-white text-slate-600 font-bold rounded-2xl shadow-lg shadow-slate-200/50 hover:bg-slate-50 disabled:opacity-50 disabled:shadow-none transition-all border border-transparent hover:border-slate-200"
              >
                <ChevronLeft size={20} />
                <span className="hidden md:inline">Previous</span>
              </button>

              {currentIdx < paper.questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIdx(prev => prev + 1)}
                  className="flex-[3] flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-indigo-600 shadow-xl shadow-slate-300 hover:shadow-indigo-200 transition-all group lg:text-lg"
                >
                  <span className="hidden md:inline">Save & Next</span>
                  <span className="md:hidden">Next</span>
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  className="flex-[3] flex items-center justify-center gap-3 px-8 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 shadow-xl shadow-emerald-200 transition-all active:scale-95 lg:text-lg"
                >
                  <span className="hidden md:inline">Finish Exam</span>
                  <span className="md:hidden">Submit</span>
                  <CheckCircle size={20} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Improved Question Palette */}
        <aside className={`fixed inset-y-0 right-0 w-80 bg-white border-l border-slate-100 p-8 overflow-auto shadow-2xl transition-transform lg:relative lg:translate-x-0 z-50 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between mb-10">
            <h4 className="font-bold text-slate-900 text-[10px] uppercase tracking-[0.25em] flex items-center gap-3">
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
