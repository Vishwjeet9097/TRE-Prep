
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
    <div className="p-4 md:p-10 min-h-full bg-[#F8F9FD] animate-in fade-in duration-500 pb-24 md:pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-8 md:mb-12">
          <div className="flex items-center gap-3 md:gap-5">
            <button
              onClick={onBack}
              className="w-10 h-10 md:w-12 md:h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors shadow-sm"
            >
              <ArrowLeft size={20} className="md:w-6 md:h-6" />
            </button>
            <div>
              <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
                <HistoryIcon className="text-indigo-600 md:w-8 md:h-8" size={24} />
                Performance Log
              </h2>
              <p className="text-xs md:text-base text-slate-500 font-medium mt-0.5 md:mt-1">Track your progress and review past attempts</p>
            </div>
          </div>

          {attempts.length > 0 && (
            <div className="flex items-center gap-2 md:gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm self-start md:self-auto">
              <div className="px-3 md:px-4 py-1.5 md:py-2 border-r border-slate-100 text-center">
                <span className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Tests</span>
                <span className="text-lg md:text-xl font-black text-indigo-600">{attempts.length}</span>
              </div>
              <div className="px-3 md:px-4 py-1.5 md:py-2 text-center">
                <span className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg. Accuracy</span>
                <span className="text-lg md:text-xl font-black text-emerald-600">
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
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 md:p-20 text-center shadow-xl shadow-slate-200/50">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 text-slate-300">
              <BarChart2 size={32} className="md:w-12 md:h-12" />
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-2">No History Yet</h3>
            <p className="text-sm md:text-base text-slate-500 font-medium max-w-sm mx-auto mb-6 md:mb-8">
              Your exam attempts and performance analytics will appear here once you finish your first test.
            </p>
            <button
              onClick={onBack}
              className="px-6 py-3 md:px-8 md:py-4 bg-indigo-600 text-white font-black rounded-xl md:rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all text-sm md:text-base"
            >
              Take a Test Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:gap-4">
            {attempts.map(attempt => {
              const paper = papers.find(p => p.id === attempt.paperId);
              const percentage = Math.round((attempt.score / (paper?.questions.length || 1)) * 100);
              const { label, color } = getPerformanceLabel(percentage);

              return (
                <div
                  key={attempt.id}
                  onClick={() => onSelectAttempt(attempt)}
                  className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-100 transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 md:gap-6">
                    {/* Score Circle */}
                    <div className="relative w-14 h-14 md:w-16 md:h-16 shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" className="fill-none stroke-slate-50" strokeWidth="2.5" />
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          className="fill-none stroke-indigo-600"
                          strokeWidth="2.5"
                          strokeDasharray={`${percentage}, 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-xs md:text-sm font-black text-slate-900">
                        {percentage}%
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">{paper?.title}</h3>
                      <div className="flex items-center gap-3 text-xs md:text-sm text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} /> {new Date(attempt.startTime).toLocaleDateString()}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} /> {formatDuration(attempt.timeElapsed)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 md:gap-8">
                    <span className={`hidden md:inline-flex px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${color}`}>
                      {label}
                    </span>
                    <button className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-transparent transition-all">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
