
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
  Filter as FilterIcon
} from 'lucide-react';
import { ExamPaper, ExamAttempt } from '../types';
import AIChatAssistant from './AIChatAssistant';

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

  return (
    <div className="min-h-full bg-slate-50/50 p-4 md:p-10 animate-in fade-in duration-700 relative overflow-x-hidden pb-32">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-12 relative">
        {/* Navigation & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="flex items-center gap-6">
              <button 
                onClick={onBack} 
                className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm hover:shadow-indigo-50"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Performance Summary</h2>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-md uppercase tracking-widest">{paper.examType}</span>
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                    <Calendar size={12} />
                    {new Date(attempt.endTime || Date.now()).toLocaleDateString()}
                  </div>
                </div>
              </div>
           </div>

           <div className="flex items-center gap-3 bg-white p-2 rounded-[1.5rem] border border-slate-200 shadow-sm">
             {(['en', 'hi', 'both'] as LangMode[]).map(m => (
               <button
                 key={m}
                 onClick={() => setLangMode(m)}
                 className={`px-5 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${
                   langMode === m ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                 }`}
               >
                 {m.toUpperCase()}
               </button>
             ))}
           </div>
        </div>

        {/* High-Fidelity Result Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
           {/* Score Visualizer */}
           <div className="lg:col-span-2 bg-slate-900 rounded-[3rem] p-10 text-white flex flex-col md:flex-row items-center gap-12 relative overflow-hidden group shadow-2xl shadow-slate-200">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:scale-110 transition-transform">
                 <Trophy size={200} />
              </div>

              <div className="relative w-48 h-48 shrink-0">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="96" cy="96" r="86" className="stroke-slate-800 fill-none" strokeWidth="16" />
                  <circle cx="96" cy="96" r="86" className="stroke-indigo-500 fill-none" strokeWidth="16" strokeDasharray={540} strokeDashoffset={540 - (540 * percentage) / 100} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className="text-6xl font-black">{percentage}%</span>
                   <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 mt-1">Total Score</span>
                </div>
              </div>

              <div className="flex-1 space-y-6 text-center md:text-left relative">
                 <div>
                    <h3 className="text-4xl font-black mb-2 tracking-tight">
                      {percentage >= 80 ? 'Exceptional!' : percentage >= 40 ? 'Well Done!' : 'Try Again!'}
                    </h3>
                    <p className="text-slate-400 font-medium leading-relaxed">
                      You successfully correctly answered <span className="text-white font-black">{attempt.score}</span> questions. Accuracy is at <span className="text-emerald-400 font-black">{accuracy}%</span>.
                    </p>
                 </div>
                 <div className="flex flex-wrap justify-center md:justify-start gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                       <TrendingUp size={16} className="text-indigo-400" />
                       <span className="text-xs font-bold">Top 5% Performance</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Metrics Grid */}
           <div className="lg:col-span-2 grid grid-cols-2 gap-6">
              <MetricCard 
                label="Efficiency" 
                value={`${(attempt.timeElapsed / (paper.questions.length || 1)).toFixed(1)}s`} 
                sub="Avg. time per question" 
                icon={<Clock size={24} className="text-indigo-600" />}
                trend="+12% faster"
                trendColor="text-emerald-500"
              />
              <MetricCard 
                label="Knowledge Base" 
                value={`${attempt.totalCorrect}`} 
                sub="Questions mastered" 
                icon={<LayoutGrid size={24} className="text-amber-500" />}
                trend="Strong in History"
                trendColor="text-indigo-500"
              />
              <div className="col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
                 <div className="flex flex-1 w-full gap-4 md:gap-12">
                    <StatusCount label="Correct" count={attempt.totalCorrect} color="bg-emerald-500" />
                    <StatusCount label="Wrong" count={attempt.totalIncorrect} color="bg-rose-500" />
                    <StatusCount label="Skipped" count={attempt.totalUnattempted} color="bg-slate-200" />
                 </div>
                 <button className="whitespace-nowrap flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 scale-105 active:scale-100">
                    Detailed Analytics
                    <ChevronRight size={20} />
                 </button>
              </div>
           </div>
        </div>

        {/* Interactive Answer Explorer */}
        <div className="space-y-8">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-indigo-600">
                    <FilterIcon size={24} />
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">Review All Items</h3>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="relative group">
                   <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                   <input 
                    type="text" 
                    placeholder="Search logic..." 
                    className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 w-full md:w-64 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                   />
                </div>
                
                <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                   {(['all', 'correct', 'incorrect', 'marked'] as Filter[]).map(f => (
                     <button
                       key={f}
                       onClick={() => setFilter(f)}
                       className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                         filter === f ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                       }`}
                     >
                       {f}
                     </button>
                   ))}
                </div>
              </div>
           </div>

           {/* Question Table/Grid */}
           <div className="grid grid-cols-1 gap-8">
             {filteredQuestions.length === 0 ? (
               <div className="bg-white p-24 rounded-[3rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                     <Search size={40} />
                  </div>
                  <p className="text-slate-400 font-bold text-lg">No questions match your filter parameters.</p>
               </div>
             ) : (
               filteredQuestions.map((q) => {
                 const res = attempt.responses.find(r => r.questionId === q.id);
                 const isCorrect = res?.selectedOptionId === q.correctOptionId;
                 const isSkipped = !res?.selectedOptionId;

                 return (
                   <div key={q.id} className={`group bg-white rounded-[2.5rem] border-2 transition-all duration-300 hover:shadow-2xl overflow-hidden ${
                      isCorrect ? 'border-emerald-100 hover:border-emerald-200' : isSkipped ? 'border-slate-100 hover:border-slate-200' : 'border-rose-100 hover:border-rose-200'
                   }`}>
                     {/* Card Header */}
                     <div className={`px-10 py-6 border-b flex flex-wrap justify-between items-center gap-4 ${
                        isCorrect ? 'bg-emerald-50/20' : isSkipped ? 'bg-slate-50/50' : 'bg-rose-50/20'
                     }`}>
                        <div className="flex items-center gap-6">
                          <span className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-black text-xs text-slate-600">
                            #{q.number}
                          </span>
                          <div className="flex items-center gap-3">
                            {res?.isMarkedForReview && (
                              <span className="flex items-center gap-1.5 text-[10px] font-black text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200 shadow-sm">
                                <Flag size={12} fill="currentColor" /> REVIEW
                              </span>
                            )}
                            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Question Entry</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                           {isCorrect ? (
                              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl font-black text-[10px] tracking-widest uppercase border border-emerald-100">
                                <CheckCircle size={14} /> CORRECT
                              </div>
                           ) : isSkipped ? (
                              <div className="flex items-center gap-2 text-slate-400 bg-slate-50 px-4 py-2 rounded-xl font-black text-[10px] tracking-widest uppercase border border-slate-100">
                                UNATTEMPTED
                              </div>
                           ) : (
                              <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-2 rounded-xl font-black text-[10px] tracking-widest uppercase border border-rose-100">
                                <XCircle size={14} /> INCORRECT
                              </div>
                           )}
                           <button 
                            onClick={() => setActiveAIContext(`Explain question ${q.number}: ${q.content.en}`)}
                            className="p-3 bg-white border border-slate-200 rounded-xl text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm"
                            title="Ask AI about this"
                           >
                             <BrainCircuit size={20} />
                           </button>
                        </div>
                     </div>
                     
                     {/* Card Content */}
                     <div className="p-10 space-y-12">
                        <div className={`grid ${langMode === 'both' ? 'lg:grid-cols-2 gap-16' : 'grid-cols-1'}`}>
                           {/* Question Texts */}
                           <div className="space-y-10">
                             {(langMode === 'en' || langMode === 'both') && (
                               <div className="relative">
                                  <div className="absolute -left-4 top-0 w-1 h-full bg-indigo-500/10 rounded-full" />
                                  <p className="text-2xl font-black text-slate-900 leading-[1.3] tracking-tight">{q.content.en}</p>
                               </div>
                             )}
                             {(langMode === 'hi' || langMode === 'both') && (
                               <div className="relative">
                                  <div className="absolute -left-4 top-0 w-1 h-full bg-slate-200 rounded-full" />
                                  <p className={`text-xl font-bold leading-relaxed hindi-text ${langMode === 'both' ? 'text-slate-500' : 'text-slate-800'}`}>
                                    {q.content.hi}
                                  </p>
                               </div>
                             )}
                           </div>

                           {/* Options Visualizer */}
                           <div className="grid grid-cols-1 gap-4">
                             {q.options.map(opt => {
                               const isCorrectOpt = opt.id === q.correctOptionId;
                               const isUserSelection = opt.id === res?.selectedOptionId;
                               
                               let optClass = "bg-slate-50/50 border-slate-100 text-slate-400";
                               if (isCorrectOpt) optClass = "bg-emerald-50 border-emerald-500/20 text-emerald-900 ring-4 ring-emerald-50/50 scale-[1.02] shadow-xl z-10";
                               else if (isUserSelection) optClass = "bg-rose-50 border-rose-500/20 text-rose-900";

                               return (
                                 <div key={opt.id} className={`group/opt relative flex items-start gap-6 p-6 rounded-[1.5rem] border-2 transition-all ${optClass}`}>
                                   <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-all ${
                                     isCorrectOpt ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white border border-slate-100 text-slate-300'
                                   }`}>{opt.id.toUpperCase()}</span>
                                   
                                   <div className="flex-1 space-y-1">
                                     {(langMode === 'en' || langMode === 'both') && <p className="font-extrabold text-base leading-snug">{opt.text.en}</p>}
                                     {(langMode === 'hi' || langMode === 'both') && <p className="hindi-text text-sm font-bold opacity-80">{opt.text.hi}</p>}
                                   </div>

                                   {isCorrectOpt && (
                                     <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                                       <CheckCircle size={18} />
                                     </div>
                                   )}
                                   {isUserSelection && !isCorrectOpt && (
                                     <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                                       <XCircle size={18} />
                                     </div>
                                   )}
                                 </div>
                               );
                             })}
                           </div>
                        </div>

                        {/* Analysis Footer */}
                        <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group/footer">
                          <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600" />
                          <div className="absolute bottom-0 right-0 p-12 opacity-[0.05] group-hover/footer:scale-110 transition-transform pointer-events-none">
                             <BrainCircuit size={120} />
                          </div>
                          
                          <div className="flex flex-col md:flex-row md:items-start gap-8 relative">
                             <div className="shrink-0">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400">
                                   <Sparkles size={24} fill="currentColor" />
                                </div>
                             </div>
                             <div className="flex-1 space-y-6">
                                <div>
                                   <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3">AI Logical Breakdown</h4>
                                   <div className="space-y-4">
                                      {(langMode === 'en' || langMode === 'both') && <p className="text-base font-medium leading-relaxed text-slate-300">{q.explanation.en}</p>}
                                      {(langMode === 'hi' || langMode === 'both') && <p className="text-base hindi-text leading-relaxed text-slate-400 italic font-medium opacity-90">{q.explanation.hi}</p>}
                                   </div>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                   <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest border border-white/10">Topic: General Studies</span>
                                   <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest border border-white/10">Difficulty: Medium</span>
                                </div>
                             </div>
                             <button 
                              onClick={() => setActiveAIContext(`I need a more detailed explanation for Question ${q.number} about ${q.content.en}. Why is option ${q.correctOptionId} correct compared to the others?`)}
                              className="md:self-center px-6 py-3 bg-indigo-600 text-white font-black rounded-xl text-xs tracking-widest hover:bg-indigo-500 transition-all flex items-center gap-2 whitespace-nowrap shadow-xl shadow-indigo-900/40"
                             >
                               <MessageSquare size={16} />
                               EXPAND DOUBT
                             </button>
                          </div>
                        </div>
                     </div>
                   </div>
                 );
               })
             )}
           </div>
        </div>
      </div>

      {/* Global Study Assistant */}
      <AIChatAssistant initialContext={activeAIContext} />
    </div>
  );
};

const MetricCard = ({ label, value, sub, icon, trend, trendColor }: any) => (
  <div className="p-8 bg-white rounded-[2.5rem] border border-slate-200 flex flex-col shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative">
    <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none">
       {icon}
    </div>
    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">{icon}</div>
    <div className="space-y-1">
      <span className="text-4xl font-black text-slate-900 tracking-tighter">{value}</span>
      <div className="flex flex-col">
         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
         <p className="text-xs font-medium text-slate-500 mt-1">{sub}</p>
      </div>
    </div>
    <div className={`mt-6 pt-6 border-t border-slate-50 text-[10px] font-black uppercase tracking-widest ${trendColor}`}>
       {trend}
    </div>
  </div>
);

const StatusCount = ({ label, count, color }: any) => (
  <div className="flex items-center gap-4 group">
    <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg shadow-slate-100 group-hover:scale-110 transition-transform`}>
       {label === 'Correct' ? <CheckCircle size={20} /> : label === 'Wrong' ? <XCircle size={20} /> : <AlertCircle size={20} />}
    </div>
    <div className="flex flex-col">
       <span className="text-2xl font-black text-slate-900 leading-none">{count}</span>
       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{label}</span>
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
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

export default ResultView;
