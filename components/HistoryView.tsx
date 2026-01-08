
import React from 'react';
import { 
  ArrowLeft, 
  Clock, 
  History as HistoryIcon, 
  TrendingUp, 
  ChevronRight, 
  Award, 
  Target, 
  Zap, 
  Calendar,
  CheckCircle2,
  XCircle,
  BarChart2
} from 'lucide-react';
import { StorageService } from '../store';
import { ExamAttempt, ExamPaper } from '../types';

interface HistoryViewProps {
  onBack: () => void;
  onSelectAttempt: (attempt: ExamAttempt) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onBack, onSelectAttempt }) => {
  const attempts = StorageService.getAttempts().sort((a, b) => (b.endTime || 0) - (a.endTime || 0));
  const papers = StorageService.getPapers();

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const getPerformanceLabel = (percentage: number) => {
    if (percentage >= 80) return { label: 'Excellent', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
    if (percentage >= 60) return { label: 'Good', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' };
    if (percentage >= 40) return { label: 'Average', color: 'text-amber-600 bg-amber-50 border-amber-100' };
    return { label: 'Needs Improvement', color: 'text-rose-600 bg-rose-50 border-rose-100' };
  };

  return (
    <div className="p-4 md:p-10 max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-5">
          <button 
            onClick={onBack} 
            className="p-3 hover:bg-white rounded-2xl border border-transparent hover:border-slate-200 transition-all shadow-sm bg-slate-50"
          >
            <ArrowLeft size={24} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <HistoryIcon className="text-indigo-600" size={32} />
              Performance Log
            </h2>
            <p className="text-slate-500 font-medium mt-1">Track your progress and review past attempts</p>
          </div>
        </div>

        {attempts.length > 0 && (
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
             <div className="px-4 py-2 border-r border-slate-100 text-center">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Tests</span>
                <span className="text-xl font-black text-indigo-600">{attempts.length}</span>
             </div>
             <div className="px-4 py-2 text-center">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg. Accuracy</span>
                <span className="text-xl font-black text-emerald-600">
                  {Math.round(attempts.reduce((acc, curr) => {
                    const paper = papers.find(p => p.id === curr.paperId);
                    return acc + (paper ? (curr.score / paper.questions.length) * 100 : 0);
                  }, 0) / (attempts.length || 1))}%
                </span>
             </div>
          </div>
        )}
      </div>

      {attempts.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-20 text-center shadow-xl shadow-slate-200/50">
           <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
              <BarChart2 size={48} />
           </div>
           <h3 className="text-2xl font-black text-slate-800 mb-2">No History Yet</h3>
           <p className="text-slate-500 font-medium max-w-sm mx-auto mb-8">
             Your exam attempts and performance analytics will appear here once you finish your first test.
           </p>
           <button 
            onClick={onBack} 
            className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all"
           >
             Take a Test Now
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {attempts.map(attempt => {
            const paper = papers.find(p => p.id === attempt.paperId);
            const totalQuestions = paper?.questions.length || 0;
            const percentage = totalQuestions > 0 ? Math.round((attempt.score / totalQuestions) * 100) : 0;
            const perf = getPerformanceLabel(percentage);
            const accuracy = (attempt.totalCorrect + attempt.totalIncorrect) > 0 
              ? Math.round((attempt.totalCorrect / (attempt.totalCorrect + attempt.totalIncorrect)) * 100)
              : 0;
            
            return (
              <button 
                key={attempt.id} 
                onClick={() => onSelectAttempt(attempt)}
                className="group w-full text-left bg-white rounded-3xl border border-slate-200 p-2 hover:shadow-2xl hover:shadow-indigo-50 hover:border-indigo-200 transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6 p-4 md:p-6">
                   {/* Score Badge */}
                   <div className="flex flex-col items-center justify-center bg-slate-50 rounded-[2rem] px-8 py-6 shrink-0 group-hover:bg-indigo-50 transition-colors">
                      <span className={`text-4xl font-black ${percentage >= 80 ? 'text-emerald-600' : percentage >= 40 ? 'text-indigo-600' : 'text-rose-600'}`}>
                        {percentage}%
                      </span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Overall</span>
                   </div>

                   {/* Main Info */}
                   <div className="flex-1 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                         <div>
                            <div className="flex items-center gap-3 mb-1">
                               <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${perf.color}`}>
                                 {perf.label}
                               </span>
                               <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
                                 <Calendar size={12} /> {new Date(attempt.endTime || 0).toLocaleDateString()}
                               </span>
                            </div>
                            <h4 className="font-black text-slate-800 text-xl leading-tight group-hover:text-indigo-600 transition-colors">
                               {paper?.title || 'Unknown Paper'}
                            </h4>
                         </div>
                         
                         <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                               <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Time Spent</span>
                               <span className="font-bold text-slate-700 flex items-center gap-1.5 justify-end">
                                 <Clock size={14} className="text-indigo-500" />
                                 {formatDuration(attempt.timeElapsed)}
                               </span>
                            </div>
                            <div className="p-2 bg-slate-50 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-all">
                              <ChevronRight size={24} className="group-hover:translate-x-1 transition-all" />
                            </div>
                         </div>
                      </div>

                      {/* Mini Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                               <CheckCircle2 size={16} />
                            </div>
                            <div>
                               <span className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter">Correct</span>
                               <span className="font-bold text-slate-700 leading-none">{attempt.totalCorrect}</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                               <XCircle size={16} />
                            </div>
                            <div>
                               <span className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter">Incorrect</span>
                               <span className="font-bold text-slate-700 leading-none">{attempt.totalIncorrect}</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                               <Target size={16} />
                            </div>
                            <div>
                               <span className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter">Accuracy</span>
                               <span className="font-bold text-slate-700 leading-none">{accuracy}%</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                               <Zap size={16} />
                            </div>
                            <div>
                               <span className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter">Score</span>
                               <span className="font-bold text-slate-700 leading-none">{attempt.score}/{totalQuestions}</span>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistoryView;
