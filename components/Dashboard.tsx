
import React from 'react';
import { Plus, Trash2, ArrowRight, BookOpen, Clock, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ExamPaper, ParsingJob } from '../types';

interface DashboardProps {
  papers: ExamPaper[];
  jobs: ParsingJob[];
  onStartExam: (paper: ExamPaper) => void;
  onImportClick: () => void;
  onDeletePaper: (id: string) => void;
  onReviewJob: (job: ParsingJob) => void;
  onDeleteJob: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  papers, 
  jobs, 
  onStartExam, 
  onImportClick, 
  onDeletePaper,
  onReviewJob,
  onDeleteJob
}) => {
  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">My Question Papers</h2>
          <p className="text-slate-500 mt-1 font-medium">Practice with AI-curated competitive exams</p>
        </div>
        <button 
          onClick={onImportClick}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus size={20} />
          Import New PDF
        </button>
      </div>

      {/* Active Parsing Jobs Section */}
      {jobs.length > 0 && (
        <div className="mb-12 space-y-4">
          <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
            Processing Jobs
            <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs">{jobs.length}</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.map(job => (
              <div key={job.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${job.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      {job.status === 'parsing' ? <Loader2 size={20} className="animate-spin" /> : 
                       job.status === 'review' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 truncate max-w-[200px]">{job.title}</h4>
                      <p className="text-xs text-slate-400 font-medium">{job.fileName}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onDeleteJob(job.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className={job.status === 'failed' ? 'text-red-600' : 'text-indigo-600'}>
                      {job.progressMsg}
                    </span>
                    <span className="text-slate-400">{job.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${job.status === 'failed' ? 'bg-red-500' : 'bg-indigo-600'}`} 
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>

                {job.status === 'review' && (
                  <button 
                    onClick={() => onReviewJob(job)}
                    className="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg text-sm hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100"
                  >
                    Review & Approve
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {papers.length === 0 && jobs.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
            <FileText size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Papers Imported Yet</h3>
          <p className="text-slate-500 max-w-sm mb-8">Upload your exam PDFs and let our AI extract questions and prepare practice tests for you.</p>
          <button 
            onClick={onImportClick}
            className="text-indigo-600 font-bold hover:underline"
          >
            Start by importing your first paper
          </button>
        </div>
      ) : papers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {papers.map(paper => (
            <div key={paper.id} className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:shadow-indigo-50/50 transition-all flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider">
                  {paper.examType || 'Practice'}
                </div>
                <button 
                  onClick={() => {
                    if (confirm('Delete this paper and all attempt history?')) onDeletePaper(paper.id);
                  }}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <h3 className="text-xl font-bold text-slate-800 line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
                {paper.title}
              </h3>
              <div className="mt-auto space-y-3 pt-4">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <BookOpen size={16} />
                  <span>{paper.questions.length} Questions</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Clock size={16} />
                  <span>{new Date(paper.createdAt).toLocaleDateString()}</span>
                </div>
                <button 
                  onClick={() => onStartExam(paper)}
                  className="w-full flex items-center justify-center gap-2 py-3 mt-4 bg-slate-900 text-white font-bold rounded-xl group-hover:bg-indigo-600 transition-all shadow-md group-hover:shadow-indigo-100"
                >
                  Start Exam
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
