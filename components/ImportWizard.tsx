
import React, { useState, useCallback } from 'react';
import { Upload, X, Check, Loader2, AlertCircle, Eye, Trash2, ArrowLeft, Languages, FileCheck, ChevronDown } from 'lucide-react';
import { Question, ParsingJob, ExamPaper } from '../types';
import { StorageService } from '../store';

interface ImportWizardProps {
  initialJob?: ParsingJob | null;
  onStartParsing: (file: File, metadata: any) => void;
  onSuccess: () => void;
  onCancel: () => void;
}

type LangMode = 'en' | 'hi' | 'both';

const ImportWizard: React.FC<ImportWizardProps> = ({ initialJob, onStartParsing, onSuccess, onCancel }) => {
  const [step, setStep] = useState<'upload' | 'review'>(initialJob?.status === 'review' ? 'review' : 'upload');
  const [isDragging, setIsDragging] = useState(false);
  const [langMode, setLangMode] = useState<LangMode>('both');
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>(initialJob?.parsedQuestions || []);
  const [metadata, setMetadata] = useState(initialJob?.metadata || {
    title: initialJob?.title || '',
    examType: 'BPSC',
    year: 2024,
    subject: 'General Studies'
  });

  const handleFileUpload = (file: File) => {
    onStartParsing(file, { ...metadata, title: metadata.title || file.name.replace('.pdf', '') });
    onSuccess();
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      handleFileUpload(file);
    } else {
      alert('Please upload a valid PDF file.');
    }
  }, [metadata]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleApprove = () => {
    const paper: ExamPaper = {
      id: Math.random().toString(36).substr(2, 9),
      title: initialJob?.title || metadata.title,
      examType: metadata.examType,
      year: metadata.year,
      subject: metadata.subject,
      questions: parsedQuestions,
      status: 'published',
      createdAt: Date.now()
    };
    StorageService.savePaper(paper);
    onSuccess();
  };

  return (
    <div className="h-full flex flex-col bg-[#F8F9FD]">
      <div className="px-6 py-5 md:px-10 md:py-6 flex justify-between items-center bg-transparent shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="w-10 h-10 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              {step === 'review' ? 'Verify Extraction' : 'Import New Paper'}
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {step === 'review' ? initialJob?.title : 'PDF Ingestion Pipeline'}
            </p>
          </div>
        </div>

        {step === 'review' && (
          <div className="flex items-center gap-3 md:gap-4">
            <div className="hidden md:flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              {(['en', 'hi', 'both'] as LangMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setLangMode(m)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${langMode === m ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                >
                  {m === 'en' ? 'ENG' : m === 'hi' ? 'HIN' : 'BOTH'}
                </button>
              ))}
            </div>
            <button
              onClick={handleApprove}
              className="px-6 py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 text-sm"
            >
              <Check size={18} />
              <span className="hidden md:inline">Publish Paper</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-8">
        {step === 'upload' && (
          <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
              {/* Decorative background blob */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-[80px] -z-10 translate-x-1/2 -translate-y-1/2"></div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Configure Extraction</h3>
                  <p className="text-slate-500 font-medium">Set the metadata for your new exam paper before uploading.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Paper Title (Optional)</label>
                    <input
                      type="text"
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-medium"
                      placeholder="e.g. BPSC Prelims 2024 - Set A"
                      value={metadata.title}
                      onChange={e => setMetadata({ ...metadata, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Subject</label>
                    <div className="relative">
                      <select
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none appearance-none font-bold text-slate-700"
                        value={metadata.subject}
                        onChange={e => setMetadata({ ...metadata, subject: e.target.value })}
                      >
                        <option>Computer Science</option>
                        <option>Physics</option>
                        <option>Mathematics</option>
                        <option>General Studies</option>
                        <option>Social Science</option>
                        <option>Hindi</option>
                        <option>English</option>
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Year</label>
                    <input
                      type="number"
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
                      value={metadata.year}
                      onChange={e => setMetadata({ ...metadata, year: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3">Upload PDF Document</label>
                  <div
                    className={`relative group h-64 transition-all duration-300 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center text-center p-8 cursor-pointer overflow-hidden ${isDragging
                      ? 'border-indigo-500 bg-indigo-500/5 scale-[1.01]'
                      : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
                      }`}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                  >
                    <input
                      type="file"
                      accept="application/pdf"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      onChange={handleFileChange}
                    />

                    <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-6 transition-all duration-500 relative z-10 ${isDragging ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-110 rotate-6' : 'bg-white border border-slate-100 text-indigo-500 shadow-sm group-hover:scale-110 group-hover:-rotate-6'}`}>
                      <Upload size={32} strokeWidth={2.5} className={isDragging ? 'animate-bounce' : ''} />
                    </div>

                    <div className="relative z-10 space-y-1">
                      <h3 className="text-xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {isDragging ? 'Drop to Upload!' : 'Click or Drag PDF'}
                      </h3>
                      <p className="text-xs font-bold text-slate-400 px-8">
                        Supported Format: PDF (Text-selectable preferred)
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 text-center mt-6 flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    AI will automatically detect questions, options, and explanations
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="max-w-4xl mx-auto space-y-8 pb-24 animate-in fade-in duration-700">
            {/* Review Header Stats */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-inner">
                  <FileCheck size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Extraction Complete</h3>
                  <p className="text-slate-500 font-medium flex items-center gap-2">
                    Found <span className="text-indigo-600 font-black text-lg">{parsedQuestions.length}</span> questions in your document
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100/50">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Check size={16} strokeWidth={3} />
                </div>
                <div className="text-xs font-black uppercase tracking-widest">
                  Ready to Publish
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-6">
              {parsedQuestions.map((q) => (
                <div key={q.id} className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 group">
                  {/* Card Header */}
                  <div className="bg-slate-50/50 px-8 py-5 border-b border-slate-100 flex justify-between items-center backdrop-blur-sm">
                    <span className="font-black text-slate-400 text-xs uppercase tracking-[0.2em]">Question {q.number}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black bg-white border border-slate-200 text-slate-400 px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-sm">Multiple Choice</span>
                    </div>
                  </div>

                  {/* Main Content Grid */}
                  <div className={`grid ${langMode === 'both' ? 'md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100' : 'grid-cols-1'}`}>
                    {(langMode === 'en' || langMode === 'both') && (
                      <div className="p-8 md:p-10 space-y-6">
                        <p className="text-slate-800 font-black text-xl leading-snug tracking-tight">{q.content.en}</p>
                        <div className="space-y-3">
                          {q.options.map(o => (
                            <div key={o.id} className={`p-4 md:p-5 rounded-2xl border-2 text-sm md:text-base font-bold flex items-start gap-4 transition-all ${o.id === q.correctOptionId ? 'bg-emerald-50 border-emerald-500/20 text-emerald-900 shadow-emerald-100' : 'bg-white border-slate-100 text-slate-500'}`}>
                              <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm mt-0.5 ${o.id === q.correctOptionId ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{o.id.toUpperCase()}</span>
                              <span className="leading-relaxed">{o.text.en}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(langMode === 'hi' || langMode === 'both') && (
                      <div className="p-8 md:p-10 space-y-6 bg-slate-50/30">
                        <p className="text-slate-700 font-bold leading-relaxed hindi-text text-xl">{q.content.hi}</p>
                        <div className="space-y-3">
                          {q.options.map(o => (
                            <div key={o.id} className={`p-4 md:p-5 rounded-2xl border-2 text-sm md:text-base font-medium flex items-start gap-4 transition-all ${o.id === q.correctOptionId ? 'bg-emerald-50 border-emerald-500/20 text-emerald-900' : 'bg-white border-slate-100 text-slate-500'}`}>
                              <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm mt-0.5 ${o.id === q.correctOptionId ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{o.id.toUpperCase()}</span>
                              <span className="hindi-text leading-relaxed">{o.text.hi}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Explanation Footer */}
                  <div className="p-8 md:p-10 bg-slate-900 text-white relative overflow-hidden">
                    {/* Decorative gradients */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-[80px] opacity-20 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-600 rounded-full blur-[60px] opacity-10 pointer-events-none -translate-x-1/3 translate-y-1/3"></div>

                    <div className="relative z-10 flex items-start gap-4">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-indigo-400 shrink-0 border border-white/5">
                        <AlertCircle size={20} />
                      </div>
                      <div className="space-y-3 flex-1">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Logic & Reasoning</p>
                        <div className="space-y-4">
                          {langMode !== 'hi' && <p className="text-base text-slate-200 leading-relaxed font-medium border-l-2 border-indigo-500/30 pl-4">{q.explanation.en}</p>}
                          {langMode !== 'en' && <p className="text-base hindi-text leading-relaxed text-slate-400 italic opacity-90 border-l-2 border-slate-700 pl-4">{q.explanation.hi}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportWizard;
