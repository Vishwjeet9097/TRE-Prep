
import React from 'react';
import {
  Plus, Trash2, ArrowRight, BookOpen, Clock, FileText, Loader2, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Activity,
  Eye,
  AlarmClockCheck,
  TrendingUp,
  Sparkles,
  Calendar,
  Play,
  Bookmark,
  Trophy
} from 'lucide-react';
import { ExamPaper, ParsingJob, ExamAttempt } from '../types';
import { useConfirm } from '../context/ConfirmContext';
import TopicAnalysis from './TopicAnalysis';
import { SAMPLE_PAPERS } from '../data/samplePapers';

import { LibraryPaper } from '../services/ContentService';

import { UserProfile } from '../store';

interface DashboardProps {
  papers: ExamPaper[];
  jobs: ParsingJob[];
  attempts: ExamAttempt[];
  onStartExam: (paper: ExamPaper) => void;
  onImportClick: () => void;
  onGenerateClick: () => void;
  onDeletePaper: (id: string) => void;
  onReviewJob: (job: ParsingJob) => void;
  onDeleteJob: (id: string) => void;
  onViewAttempt: (attempt: ExamAttempt) => void;
  onResumeJob: (job: ParsingJob) => void;
  onAddSamplePaper: (paper: ExamPaper) => void;
  onSaveTemplate: (paper: ExamPaper) => void;
  library: LibraryPaper[];
  userProfile?: UserProfile;
}

const Dashboard: React.FC<DashboardProps> = ({
  papers,
  jobs,
  attempts,
  onStartExam,
  onImportClick,
  onGenerateClick,
  onDeletePaper,
  onReviewJob,
  onDeleteJob,
  onViewAttempt,
  onResumeJob,
  onAddSamplePaper,
  onSaveTemplate,
  library,
  userProfile
}) => {
  const [viewDate, setViewDate] = React.useState(new Date());
  const { confirm } = useConfirm();
  const [showAllPapers, setShowAllPapers] = React.useState(false);

  const handleDeletePaper = async (id: string, title: string) => {
    if (await confirm({
      title: "Delete Paper",
      description: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger"
    })) {
      onDeletePaper(id);
    }
  };


  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const recentAttempts = [...attempts].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).slice(0, 5);

  /* --- Helper Components for Charts --- */
  const BarChart = ({ data }: { data: ExamAttempt[] }) => {
    const maxScore = 100;

    return (
      <div className="relative h-40 w-full pt-6 flex flex-col justify-end">
        {/* Background Grid Lines for "Financial" Look */}
        <div className="absolute inset-0 flex flex-col justify-between text-[9px] text-slate-300 font-bold z-0 pb-6 pointer-events-none">
          <div className="w-full border-b border-dashed border-slate-100 flex items-center"><span className="absolute -left-0">100%</span></div>
          <div className="w-full border-b border-dashed border-slate-100 flex items-center"><span className="absolute -left-0">50%</span></div>
          <div className="w-full border-b border-dashed border-slate-100 flex items-center"><span className="absolute -left-0">0%</span></div>
        </div>

        <div className="flex items-end gap-3 h-full w-full z-10 pl-6">
          {data.map((attempt, i) => {
            const paper = papers.find(p => p.id === attempt.paperId);
            const pct = Math.round((attempt.score / (paper?.questions.length || 1)) * 100);
            const height = Math.max(pct, 10); // min height for visibility

            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative cursor-pointer" onClick={() => onViewAttempt(attempt)}>
                {/* Tooltip on Hover */}
                <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-xl">
                  {paper?.title} • {pct}%
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                </div>

                {/* Animated Gradient Bar */}
                <div className="w-full bg-slate-50/50 rounded-t-xl relative overflow-hidden h-full group-hover:bg-slate-100 transition-colors">
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-t-xl transition-all duration-1000 ease-out shadow-[0_4px_20px_-4px_rgba(99,102,241,0.5)] bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:to-indigo-500"
                    style={{ height: `${height}%` }}
                  >
                    {/* Inner shine effect */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/30"></div>
                  </div>
                </div>

                {/* Date Label */}
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">
                  {new Date(attempt.startTime).getDate()}
                </span>
              </div>
            )
          })}

          {data.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-bold bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
              No activity data yet.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMobile = () => (
    <div className="md:hidden space-y-6 pb-32 px-4 pt-4 bg-[#F8F9FD] min-h-full select-none">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Dashboard</h2>
            <p className="text-slate-400 text-xs font-medium">
              {userProfile ? `Welcome back, ${userProfile.name.split(' ')[0]}` : 'Manage your preparation'}
            </p>
          </div>

        </div>

        <div className="flex gap-3">
          <button onClick={onImportClick} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white text-indigo-600 font-semibold text-sm rounded-2xl shadow-lg shadow-slate-200 active:scale-95 transition-all hover:bg-indigo-50 border border-indigo-100">
            <Plus size={18} /> Import PDF
          </button>
          <button onClick={onGenerateClick} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-indigo-600 text-white font-semibold text-sm rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-all hover:bg-indigo-700">
            <Sparkles size={18} /> AI Generate
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 tracking-tight">My Papers ({papers.length})</h3>
        </div>
        {papers.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <p className="text-slate-400 text-sm font-medium">No papers yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {papers.map(paper => (
              <div
                key={paper.id}
                onClick={() => onStartExam(paper)}
                className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group active:scale-95 transition-all cursor-pointer"
              >
                {/* Decorative Circle */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-[100%] -mr-8 -mt-8 opacity-50 pointer-events-none"></div>

                <div className="flex justify-between items-start mb-3 relative z-10">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-indigo-100">{paper.examType || 'Exam'}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePaper(paper.id, paper.title);
                    }}
                    className="w-8 h-8 flex items-center justify-center bg-white rounded-full border border-slate-100 text-slate-300 hover:text-rose-500 hover:border-rose-100 hover:bg-rose-50 transition-all shadow-sm"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <h4 className="font-bold text-slate-900 text-lg mb-1 leading-tight">{paper.title}</h4>
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-400 mb-5">
                  <span>{paper.questions.length} Questions</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span>{paper.subject || 'General'}</span>
                </div>

                <div className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-slate-200">
                  Start Test <ArrowRight size={16} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Mobile */}
      {recentAttempts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Recent Activity</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {recentAttempts.map((attempt, i) => {
              const paper = papers.find(p => p.id === attempt.paperId);
              const percentage = Math.round((attempt.score / (paper?.questions.length || 1)) * 100);
              const isPass = percentage >= 40;
              return (
                <div key={`${attempt.id}-${i}`} onClick={() => onViewAttempt(attempt)} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm active:scale-95 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-md ${isPass ? 'bg-emerald-500 shadow-emerald-200' : 'bg-rose-500 shadow-rose-200'}`}>
                      {percentage}%
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 line-clamp-1 text-sm">{paper?.title || 'Unknown Paper'}</h4>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider mt-0.5">
                        <Calendar size={10} />
                        {new Date(attempt.startTime).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderDesktop = () => (
    <div className="hidden md:flex flex-col h-full overflow-hidden bg-[#F8F9FD] p-8 gap-8">
      {/* Skillify Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back, User</h1>
          <p className="text-slate-400 font-medium mt-1">Ready to create next big thing?</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative">
            <input type="text" placeholder="Search papers..." className="pl-10 pr-4 py-3 bg-white rounded-full border-none shadow-sm text-sm font-medium w-64 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-slate-600 placeholder:text-slate-300" />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <div className="flex -space-x-2">

          </div>
        </div>
      </div>

      {/* Dashboard Content Grid */}
      <div className="flex-1 grid grid-cols-12 gap-8 overflow-y-auto pr-2 pb-20 no-scrollbar">

        {/* Left Main (8 cols) */}
        <div className="col-span-8 flex flex-col gap-8">

          {/* Recommended Section (Content Library) */}
          {(() => {
            // Filter out ones already in "My Papers" to avoid adding duplicate IDs
            // The library prop already contains both Static and Local papers.
            const visibleRecommended = library.filter(rec => !papers.some(p => p.id === rec.id));

            if (visibleRecommended.length === 0) return null;

            return (
              <div>
                <h3 className="font-bold text-slate-900 text-xl mb-4">Recommended / Library</h3>
                <div className="grid grid-cols-1 gap-4">
                  {visibleRecommended.map(paper => (
                    <div key={paper.id} className="bg-white p-5 rounded-[2rem] border border-indigo-100 shadow-sm flex items-center justify-between group hover:border-indigo-300 transition-all relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-[4rem] -mr-4 -mt-4 opacity-50"></div>

                      <div className="flex items-center gap-5 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                          <BookOpen size={28} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-lg">Mock Test</span>
                            {paper.source === 'LOCAL' && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-lg">Saved</span>
                            )}
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded-lg">{paper.questions.length} Qs</span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-lg leading-tight">{paper.title}</h4>
                          <p className="text-xs text-slate-500 font-medium mt-1">{paper.subject || 'General Studies'}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => onAddSamplePaper(paper)}
                        className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200 hover:scale-105 active:scale-95 transition-all"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* "Your Course" Section -> Active Papers List */}
          <div className="bg-transparent">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 text-xl">My Papers</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAllPapers(!showAllPapers)}
                  className="text-slate-400 hover:text-indigo-600 font-bold text-xs mr-2 transition-colors"
                >
                  {showAllPapers ? 'Show Less' : 'View All'}
                </button>
                <button onClick={onGenerateClick} className="px-5 py-2 bg-white text-indigo-600 border border-indigo-100 rounded-full text-xs font-bold shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-2">
                  <Sparkles size={14} /> AI Generate
                </button>
                <button onClick={onImportClick} className="px-5 py-2 bg-indigo-600 text-white rounded-full text-xs font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2">
                  <Plus size={14} /> Import New
                </button>
              </div>
            </div>

            {papers.length === 0 && jobs.length === 0 ? (
              <div className="bg-white p-12 rounded-[2rem] text-center shadow-sm">
                <p className="text-slate-400 font-bold">No papers found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active Jobs (Processing) rendered as cards */}
                {jobs.map(job => (
                  <div key={job.id} className="bg-white p-4 pr-6 rounded-[2rem] flex items-center gap-4 shadow-sm border border-indigo-100 relative overflow-hidden">
                    {/* Background Progress */}
                    {job.status === 'parsing' && (
                      <div className="absolute bottom-0 left-0 h-1 bg-indigo-100 w-full">
                        <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${job.progress}%` }}></div>
                      </div>
                    )}

                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${job.status === 'paused' ? 'bg-amber-100 text-amber-600' :
                      job.status === 'review' ? 'bg-emerald-50 text-emerald-600' :
                        job.status === 'failed' ? 'bg-rose-50 text-rose-600' :
                          'bg-indigo-50 text-indigo-600'
                      }`}>
                      {job.status === 'review' ? <CheckCircle2 size={24} /> :
                        job.status === 'paused' ? <AlertCircle size={24} /> :
                          job.status === 'failed' ? <AlertCircle size={24} /> :
                            <Loader2 size={24} className="animate-spin" />}
                    </div>

                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-lg mb-1">
                        {job.status === 'review' ? 'Ready for Review' :
                          job.status === 'paused' ? 'Extraction Paused' :
                            job.status === 'failed' ? 'Extraction Failed' :
                              'Digitizing Paper...'}
                      </h4>
                      <p className={`text-xs font-bold uppercase tracking-wider ${job.status === 'paused' ? 'text-amber-500' :
                        job.status === 'failed' ? 'text-rose-500' :
                          'text-slate-400'
                        }`}>
                        {job.status === 'review' ? 'Waiting for approval' :
                          job.status === 'paused' ? `Limit Reached • ${job.completedBatches ? job.completedBatches * 30 : 0} Questions Saved` :
                            job.progressMsg}
                      </p>
                    </div>

                    <div className="mr-8 flex items-center gap-2">
                      {job.status === 'review' && (
                        <button onClick={() => onReviewJob(job)} className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2">
                          Review Now <ArrowRight size={14} />
                        </button>
                      )}

                      {job.status === 'paused' && (
                        <button onClick={() => onResumeJob(job)} className="px-5 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all flex items-center gap-2 animate-pulse">
                          <Play size={14} fill="currentColor" /> Resume
                        </button>
                      )}

                      {(job.status === 'paused' || job.status === 'failed') && (
                        <button onClick={() => onDeleteJob(job.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {(showAllPapers ? papers : papers.slice(0, 3)).map((paper, i) => (
                  <div key={paper.id} className="bg-white p-4 pr-6 rounded-[2rem] flex items-center gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border border-indigo-50 border-transparent" onClick={() => onStartExam(paper)}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0 ${i % 2 === 0 ? 'bg-[#98ABEE]' : 'bg-[#F9E8C9] text-orange-400'}`}>
                      <FileText />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-lg mb-1">{paper.title}</h4>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{paper.subject || 'General Studies'}</p>
                    </div>
                    <div className="hidden lg:block text-right mr-8">
                      <p className="text-xs font-bold text-slate-400 uppercase">Questions</p>
                      <p className="font-bold text-slate-900">{paper.questions.length}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSaveTemplate(paper);
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all"
                        title="Save as Template"
                      >
                        <Bookmark size={18} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePaper(paper.id, paper.title);
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                        title="Delete Paper"
                      >
                        <Trash2 size={18} />
                      </button>
                      <div className="w-12 h-12 rounded-full border-2 border-slate-100 flex items-center justify-center text-slate-300 group-hover:border-indigo-600 group-hover:text-indigo-600 transition-all">
                        <ArrowRight size={20} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* "Hours Activity" -> Chart */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 z-10 relative">
              <div>
                <h3 className="font-bold text-slate-900 text-xl">Performance Activity</h3>
                <p className="text-xs text-emerald-500 font-bold mt-1 flex items-center gap-1"><ArrowRight size={12} className="-rotate-45" /> +4.5% increased</p>
              </div>
              <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold cursor-pointer">Weekly</div>
            </div>
            <BarChart data={recentAttempts} />
          </div>

          {/* "Recent Activity" Table Section */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 text-xl">Recent Activity</h3>
              <button className="text-slate-400 hover:text-indigo-600 font-bold text-xs">View All</button>
            </div>

            <div className="w-full overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-wider pl-4">Paper Name</th>
                    <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-wider text-right pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="space-y-4">
                  {/* Recent Attempts Rows */}
                  {recentAttempts.map((attempt, i) => {
                    const paper = papers.find(p => p.id === attempt.paperId);
                    const pct = Math.round((attempt.score / (paper?.questions.length || 1)) * 100);
                    const isPass = pct >= 40;

                    return (
                      <tr key={`${attempt.id}-${i}`} className="group border-b border-transparent hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer" onClick={() => onViewAttempt(attempt)}>
                        <td className="py-4 pl-4 first:rounded-l-2xl">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs ${isPass ? 'bg-emerald-400' : 'bg-rose-400'}`}>
                              {paper?.title.substring(0, 1)}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{paper?.title || 'Unknown Paper'}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{paper?.examType || 'Exam'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-sm font-bold text-slate-500">{new Date(attempt.startTime).toLocaleDateString()}</td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${isPass ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {isPass ? 'Passed' : 'Failed'}
                          </span>
                        </td>
                        <td className="py-4 pr-4 last:rounded-r-2xl text-right">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                            View Result <ArrowRight size={12} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                  {recentAttempts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-bold text-sm">No recent activity found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Artificial Intelligence Analysis */}
          <TopicAnalysis attempts={attempts} papers={papers} />

        </div>

        {/* Right Sidebar (4 cols) */}
        <div className="col-span-4 flex flex-col gap-8">

          {/* "Join Our Class" -> Import Promo */}
          <div className="bg-black rounded-[2.5rem] p-8 text-white relative overflow-hidden min-h-[280px] flex flex-col justify-center items-start shadow-xl cursor-pointer group" onClick={onImportClick}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500 rounded-full blur-[60px] opacity-60 translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-400 rounded-full blur-[50px] opacity-40 -translate-x-1/2 translate-y-1/2"></div>

            <h2 className="text-4xl font-black leading-tight mb-4 relative z-10">Digitize<br />Your Exams<br /><span className="text-indigo-400">Instantly.</span></h2>
            <div className="flex items-center gap-4 mt-auto">
              <span className="px-4 py-2 bg-orange-400 text-black text-xs font-black rounded-full shadow-lg shadow-orange-200/50">-50% Time</span>
              <button className="px-6 py-2 bg-indigo-600 rounded-full text-xs font-bold hover:bg-indigo-500 transition-colors">Start Import</button>
            </div>
          </div>

          {/* "Daily Schedule" -> Calendar Widget (Placeholder) */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 text-xl">Daily Schedule</h3>
              <Calendar size={20} className="text-slate-400" />
            </div>
            {/* Calendar Grid Aesthetic */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold mb-4">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="text-slate-400">{d}</span>)}
              {Array.from({ length: 31 }).map((_, i) => {
                const dayNum = i + 1;
                const today = new Date();
                const isToday = dayNum === today.getDate();

                const hasAttempt = recentAttempts.some(a => {
                  const d = new Date(a.startTime);
                  return d.getDate() === dayNum && d.getMonth() === today.getMonth();
                });

                let tileClass = "text-slate-700 hover:bg-slate-50";
                if (isToday) {
                  tileClass = "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110";
                } else if (hasAttempt) {
                  tileClass = "bg-orange-100 text-orange-600 border border-orange-200 font-black";
                }

                return (
                  <div key={i} className={`aspect-square flex items-center justify-center rounded-full cursor-pointer transition-all duration-300 text-[10px] md:text-xs font-bold ${tileClass}`}>
                    {dayNum}
                  </div>
                )
              })}
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-[#FFF4F0] border border-orange-100">
                <div className="w-10 h-10 rounded-full bg-orange-400 text-white flex items-center justify-center font-black text-xs">AI</div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Review Papers</h4>
                  <p className="text-[10px] text-slate-400 font-bold">12:00 PM</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div >
    </div >
  );

  return (
    <div className="p-4 md:p-8 h-full w-full">
      {renderMobile()}
      {renderDesktop()}
    </div>
  );
};

export default Dashboard;
