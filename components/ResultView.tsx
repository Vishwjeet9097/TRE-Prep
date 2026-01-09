
import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Trophy,
  Target,
  Zap,
  Activity,
  Search,
  Flag,
  Calendar,
  BrainCircuit,
  ChevronRight,
  TrendingUp,
  Clock,
  LayoutGrid,
  Sparkles,
  Filter as FilterIcon,
  Share2, RotateCcw, Home, Download, MinusCircle, ChevronDown, ChevronUp, Eye, X, MessageSquare
} from 'lucide-react';
import { ExamPaper, ExamAttempt, Question } from '../types';
import AIChatAssistant from './AIChatAssistant';
import RichTextRenderer from './RichTextRenderer';
import { toPDF } from '../services/pdfService';

interface ResultViewProps {
  attempt: ExamAttempt;
  paper: ExamPaper;
  onBack: () => void;
}

type LangMode = 'en' | 'hi' | 'both';
type Filter = 'all' | 'correct' | 'incorrect' | 'marked';

const ResultView: React.FC<ResultViewProps> = ({ attempt, paper, onBack }) => {
  const [langMode, setLangMode] = useState<LangMode>('both');
  const [filter, setFilter] = useState<Filter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAIContext, setActiveAIContext] = useState<string | undefined>();
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  const percentage = Math.round((attempt.score / paper.questions.length) * 100);
  const accuracy = attempt.totalCorrect + attempt.totalIncorrect > 0
    ? Math.round((attempt.totalCorrect / (attempt.totalCorrect + attempt.totalIncorrect)) * 100)
    : 0;

  const filteredQuestions = paper.questions.filter(q => {
    const r = attempt.responses.find(res => res.questionId === q.id);
    const matchesFilter =
      filter === 'all' ||
      (filter === 'correct' && r?.selectedOptionId === q.correctOptionId) ||
      (filter === 'incorrect' && r?.selectedOptionId !== q.correctOptionId && r?.selectedOptionId !== null) ||
      (filter === 'marked' && r?.isMarkedForReview);

    const matchesSearch = q.content.en.toLowerCase().includes(searchQuery.toLowerCase()) || q.content.hi.includes(searchQuery);

    return matchesFilter && matchesSearch;
  });

  // Render Helpers
  const renderMobileView = () => (
    <div className="md:hidden space-y-6">
      {/* Existing Mobile Score Card */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white text-center relative overflow-hidden shadow-xl">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 192 192">
            <circle cx="96" cy="96" r="86" className="stroke-slate-800 fill-none" strokeWidth="16" />
            <circle cx="96" cy="96" r="86" className="stroke-indigo-500 fill-none" strokeWidth="16" strokeDasharray={540} strokeDashoffset={540 - (540 * percentage) / 100} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{percentage}%</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-400 mt-1">Score</span>
          </div>
        </div>
        <h3 className="text-2xl font-bold mb-2">{percentage >= 40 ? 'Well Done!' : 'Try Again!'}</h3>
        <div className="grid grid-cols-3 gap-2 mt-6">
          <div className="bg-emerald-500/10 rounded-xl p-2 border border-emerald-500/20">
            <span className="block text-xl font-bold text-emerald-400">{attempt.totalCorrect}</span>
            <span className="text-[8px] uppercase tracking-wider text-emerald-200">Correct</span>
          </div>
          <div className="bg-rose-500/10 rounded-xl p-2 border border-rose-500/20">
            <span className="block text-xl font-bold text-rose-400">{attempt.totalIncorrect}</span>
            <span className="text-[8px] uppercase tracking-wider text-rose-200">Wrong</span>
          </div>
          <div className="bg-slate-500/10 rounded-xl p-2 border border-slate-500/20">
            <span className="block text-xl font-bold text-slate-400">{attempt.totalUnattempted}</span>
            <span className="text-[8px] uppercase tracking-wider text-slate-300">Skip</span>
          </div>
        </div>
      </div>

      {/* Mobile Question Cards */}
      <div className="space-y-4">
        {filteredQuestions.map(q => {
          const res = attempt.responses.find(r => r.questionId === q.id);
          const isCorrect = res?.selectedOptionId === q.correctOptionId;
          return (
            <div key={q.id} onClick={() => setSelectedQuestion(q)} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm active:scale-95 transition-all cursor-pointer">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-slate-400">#{q.number}</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${isCorrect ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>
              <p className="font-bold text-slate-800 mb-4 text-sm line-clamp-3">{q.content[langMode === 'both' ? 'en' : langMode]}</p>
              <button
                className="w-full py-3 rounded-xl bg-slate-50 text-slate-600 font-bold text-xs flex items-center justify-center gap-2 active:bg-slate-100"
              >
                View Full Analysis <ChevronRight size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  );

  const renderDesktopView = () => (
    <div className="hidden md:block space-y-10 animate-in fade-in duration-500">
      {/* Dashboard Top Stats Row */}
      <div className="grid grid-cols-4 gap-8">
        {/* Main Score Card - Clean White Style */}
        <div className="col-span-1 bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-lg shadow-slate-200/50 relative overflow-hidden flex flex-col items-center justify-between h-[360px]">
          <h3 className="font-bold text-slate-800 text-lg uppercase tracking-widest self-start">Total Score</h3>
          <div className="relative w-48 h-48">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 192 192">
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#818CF8" />
                </linearGradient>
              </defs>
              <circle cx="96" cy="96" r="80" className="stroke-slate-100 fill-none" strokeWidth="12" />
              <circle cx="96" cy="96" r="80" className="stroke-[url(#scoreGradient)] fill-none" strokeWidth="12" strokeDasharray={502} strokeDashoffset={502 - (502 * percentage) / 100} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold text-slate-900">{percentage}%</span>
              <span className="text-xs font-bold text-slate-400 mt-2">{percentage >= 40 ? 'PASS' : 'FAIL'}</span>
            </div>
          </div>
          <div className="w-full flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest border-t border-slate-100 pt-6">
            <span>Rank Top 5%</span>
            <span className="text-emerald-500">+12% vs Avg</span>
          </div>
        </div>

        {/* Detailed Stats Panel */}
        <div className="col-span-2 grid grid-cols-2 gap-6 h-[360px]">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 flex flex-col justify-between hover:border-indigo-200 transition-colors shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
              <CheckCircle size={24} />
            </div>
            <div>
              <span className="text-4xl font-bold text-slate-900">{attempt.totalCorrect}</span>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-1">Correct Answers</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 flex flex-col justify-between hover:border-indigo-200 transition-colors shadow-sm">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
              <XCircle size={24} />
            </div>
            <div>
              <span className="text-4xl font-bold text-slate-900">{attempt.totalIncorrect}</span>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-1">Incorrect</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 flex flex-col justify-between hover:border-indigo-200 transition-colors shadow-sm">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4">
              <Clock size={24} />
            </div>
            <div>
              <span className="text-4xl font-bold text-slate-900">{(attempt.timeElapsed / 60).toFixed(1)}m</span>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-1">Time Spent</p>
            </div>
          </div>
          <div className="bg-indigo-600 p-6 rounded-[2rem] flex flex-col justify-center items-center text-center text-white cursor-pointer hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200" onClick={() => setActiveAIContext("Analyze my overall performance")}>
            <Sparkles size={32} className="mb-3 opacity-80" />
            <h4 className="font-bold text-lg mb-1">AI Insights</h4>
            <p className="text-xs opacity-60">Get a deep breakdown</p>
          </div>
        </div>

        {/* Action Card */}
        <div className="col-span-1 bg-slate-900 text-white rounded-[2.5rem] p-8 flex flex-col justify-between h-[360px] relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[60px] opacity-40"></div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Keep Going!</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Consistency is key. You've mastered {accuracy}% of this paper.</p>
          </div>
          <div className="space-y-3">
            <button className="w-full bg-white text-slate-900 py-4 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-lg">Retake Exam</button>
            <button className="w-full bg-transparent border border-white/20 text-white py-4 rounded-xl font-bold text-sm hover:bg-white/10 transition-colors" onClick={onBack}>Back to Home</button>
          </div>
        </div>
      </div>

      {/* Compact Table Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Question Analysis</h3>
          <div className="flex gap-2">
            {/* Table Filters */}
            {(['all', 'correct', 'incorrect'] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border ${filter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>{f}</button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden p-2">
          <div className="grid grid-cols-12 gap-4 p-5 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-6">Question</div>
            <div className="col-span-2">Your Answer</div>
            <div className="col-span-2">Correct Answer</div>
            <div className="col-span-1 text-center">Action</div>
          </div>
          <div className="space-y-1 mt-2">
            {filteredQuestions.map(q => {
              const res = attempt.responses.find(r => r.questionId === q.id);
              const isCorrect = res?.selectedOptionId === q.correctOptionId;
              const correctOpt = q.options.find(o => o.id === q.correctOptionId);

              return (
                <div key={q.id} onClick={() => setSelectedQuestion(q)} className="grid grid-cols-12 gap-4 p-5 items-center hover:bg-slate-50 rounded-2xl transition-all text-sm font-medium text-slate-700 group cursor-pointer border border-transparent hover:border-indigo-100 hover:shadow-sm">
                  <div className="col-span-1 text-center font-bold text-slate-300">#{q.number}</div>
                  <div className="col-span-6 pr-8">
                    <p className="line-clamp-2 text-slate-900 font-bold mb-1">{q.content['en']}</p>
                    <div className="hidden group-hover:block transition-all text-xs text-slate-400 line-clamp-1">{q.explanation.en}</div>
                  </div>
                  <div className="col-span-2">
                    {res?.selectedOptionId ? (
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isCorrect ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                        <span className="font-bold">{res.selectedOptionId}</span>
                        {isCorrect ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Skipped</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600">
                      <span className="font-bold">{q.correctOptionId}</span>
                      <span className="text-xs opacity-70 truncate max-w-[100px]">{correctOpt?.text.en.substring(0, 15)}...</span>
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button className="p-2 rounded-lg hover:bg-white text-slate-300 hover:text-indigo-600 transition-colors">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

    </div>
  );

  return (
    <div className="min-h-full bg-[#F8F9FD] p-4 md:p-10 animate-in fade-in duration-700 pb-32">
      {/* Background Decoration Desktop Only */}
      <div className="hidden md:block absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] -z-10" />

      <div className="max-w-7xl mx-auto space-y-6 md:space-y-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="w-10 h-10 md:w-12 md:h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors shadow-sm">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-xl md:text-3xl font-bold text-slate-900 tracking-tight">Performance Summary</h2>
          </div>
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {(['en', 'hi', 'both'] as LangMode[]).map(m => (
              <button key={m} onClick={() => setLangMode(m)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${langMode === m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-700'}`}>{m.toUpperCase()}</button>
            ))}
          </div>
        </div>

        {renderMobileView()}
        {renderDesktopView()}
      </div>

      <AIChatAssistant initialContext={activeAIContext} />

      {/* Global Question Details Modal - Visible on both Mobile & Desktop */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedQuestion(null)}>
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 relative border border-white/20" onClick={e => e.stopPropagation()}>
            {/* Decorative Gradient Top */}
            <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur z-20 px-5 py-4 md:px-8 md:py-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <span className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center font-bold text-slate-500 text-sm border border-slate-100 shadow-sm">#{selectedQuestion.number}</span>
                <div>
                  <h3 className="text-lg md:text-2xl font-bold text-slate-900 tracking-tight">Question Details</h3>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:block">Deep Dive Analysis</p>
                </div>
              </div>
              <button onClick={() => setSelectedQuestion(null)} className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 rounded-full flex items-center justify-center text-slate-400 transition-all">
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 md:p-8 space-y-6 md:space-y-10">
              {/* Question Text */}
              <div className="space-y-3 md:space-y-6">
                {(langMode === 'en' || langMode === 'both') && (
                  <div className="relative pl-4 md:pl-6 border-l-4 border-indigo-500">
                    <RichTextRenderer content={selectedQuestion.content.en} className="text-xl md:text-3xl font-black text-slate-900 leading-snug" />
                  </div>
                )}
                {(langMode === 'hi' || langMode === 'both') && (
                  <div className="relative pl-4 md:pl-6 border-l-4 border-slate-200">
                    <RichTextRenderer content={selectedQuestion.content.hi} className="text-lg md:text-2xl font-bold text-slate-500 hindi-text leading-relaxed" />
                  </div>
                )}
              </div>

              {/* Options Analysis */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Answer Analysis</h4>
                <div className="grid grid-cols-1 gap-3 md:gap-4">
                  {selectedQuestion.options.map(opt => {
                    const res = attempt.responses.find(r => r.questionId === selectedQuestion.id);
                    const isCorrectOpt = opt.id === selectedQuestion.correctOptionId;
                    const isUserSelection = opt.id === res?.selectedOptionId;

                    let optClass = "bg-slate-50 border-transparent text-slate-500 hover:border-indigo-100";
                    let icon = null;

                    if (isCorrectOpt) {
                      optClass = "bg-emerald-50 border-emerald-500/30 text-emerald-900 ring-2 ring-emerald-100/50 shadow-lg shadow-emerald-100/50 z-10 scale-[1.01]";
                      icon = <CheckCircle size={20} className="text-emerald-600 md:w-6 md:h-6" />;
                    } else if (isUserSelection) {
                      optClass = "bg-rose-50 border-rose-500/30 text-rose-900 ring-2 ring-rose-100/50";
                      icon = <XCircle size={20} className="text-rose-600 md:w-6 md:h-6" />;
                    }

                    return (
                      <div key={opt.id} className={`relative flex items-center gap-4 md:gap-6 p-4 md:p-6 rounded-2xl border-2 transition-all duration-300 ${optClass}`}>
                        <span className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center font-black text-[10px] md:text-xs shrink-0 shadow-sm ${isCorrectOpt ? 'bg-emerald-600 text-white' : isUserSelection ? 'bg-rose-600 text-white' : 'bg-white text-slate-400'}`}>
                          {opt.id.toUpperCase()}
                        </span>
                        <div className="flex-1 space-y-1">
                          <RichTextRenderer content={opt.text.en} className="font-bold text-base md:text-lg leading-tight" />
                          <RichTextRenderer content={opt.text.hi} className="text-xs md:text-sm opacity-80 hindi-text font-medium" />
                        </div>
                        {icon}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Explanation Card */}
              <div className="bg-slate-900 rounded-2xl md:rounded-[2rem] p-6 md:p-10 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-48 h-48 md:w-80 md:h-80 bg-indigo-600 rounded-full blur-[60px] md:blur-[100px] opacity-30 pointer-events-none translate-x-1/4 -translate-y-1/4"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 md:w-64 md:h-64 bg-emerald-600 rounded-full blur-[50px] md:blur-[80px] opacity-20 pointer-events-none -translate-x-1/4 translate-y-1/4"></div>

                <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-10">
                  <div className="shrink-0 hidden md:block">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400 shadow-inner border border-white/5">
                      <BrainCircuit size={32} />
                    </div>
                  </div>
                  <div className="flex-1 space-y-4 md:space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={14} className="text-indigo-400" />
                        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">Logic Breakdown</h4>
                      </div>
                      <div className="space-y-3 text-slate-200 leading-relaxed font-medium text-sm md:text-base border-l-2 border-indigo-500/30 pl-4">
                        <RichTextRenderer content={selectedQuestion.explanation.en} />
                        <RichTextRenderer content={selectedQuestion.explanation.hi} className="italic opacity-60 hindi-text" />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        onClick={() => { setActiveAIContext(`Explain detailed logic for question ${selectedQuestion.number} (${selectedQuestion.content.en})`); }}
                        className="w-full sm:w-auto px-6 py-3 md:px-8 md:py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 md:gap-3 transition-colors shadow-lg shadow-indigo-900/50 text-xs md:text-sm group"
                      >
                        <MessageSquare size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                        <span>Chat with AI about this</span>
                      </button>
                      <button onClick={() => setSelectedQuestion(null)} className="w-full sm:w-auto px-6 py-3 md:px-8 md:py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl md:rounded-2xl font-bold text-white transition-colors text-xs md:text-sm">
                        Close Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


const MetricCard = ({ label, value, sub, icon, trend, trendColor }: any) => (
  <div className="p-5 md:p-6 bg-white rounded-2xl md:rounded-[2rem] border border-slate-200 flex flex-col shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative">
    <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none">
      {icon}
    </div>
    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-50 flex items-center justify-center mb-4 md:mb-5 group-hover:scale-110 transition-transform">{icon}</div>
    <div className="space-y-0.5 md:space-y-1">
      <span className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">{value}</span>
      <div className="flex flex-col">
        <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1 leading-tight">{sub}</p>
      </div>
    </div>
    <div className={`mt-4 md:mt-6 pt-4 md:pt-6 border-t border-slate-50 text-[9px] md:text-[10px] font-black uppercase tracking-widest ${trendColor}`}>
      {trend}
    </div>
  </div>
);

const StatusCount = ({ label, count, color }: any) => (
  <div className="flex items-center gap-2 md:gap-4 group">
    <div className={`w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl ${color} flex items-center justify-center text-white shadow-lg shadow-slate-100 group-hover:scale-110 transition-transform`}>
      {label === 'Correct' ? <CheckCircle size={14} className="md:w-5 md:h-5" /> : label === 'Wrong' ? <XCircle size={14} className="md:w-5 md:h-5" /> : <AlertCircle size={14} className="md:w-5 md:h-5" />}
    </div>
    <div className="flex flex-col">
      <span className="text-lg md:text-2xl font-black text-slate-900 leading-none">{count}</span>
      <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 md:mt-1.5">{label}</span>
    </div>
  </div>
);

const MessageSquare = ({ size, className }: any) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default ResultView;
