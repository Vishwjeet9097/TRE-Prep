
import React, { useState, useCallback } from 'react';
import { Upload, X, Check, Loader2, AlertCircle, Eye, Trash2, ArrowLeft, Languages, FileCheck } from 'lucide-react';
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
    <div className="h-full flex flex-col bg-white">
      <div className="p-6 border-b flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {step === 'review' ? 'Review Extraction' : 'Import Paper'}
            </h2>
            <p className="text-sm text-slate-500 font-medium truncate max-w-[200px]">
              {step === 'review' ? initialJob?.title : 'AI-powered PDF Ingestion'}
            </p>
          </div>
        </div>

        {step === 'review' && (
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-200 p-1 rounded-xl">
              {(['en', 'hi', 'both'] as LangMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setLangMode(m)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${langMode === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {m === 'en' ? 'ENG' : m === 'hi' ? 'HIN' : 'BOTH'}
                </button>
              ))}
            </div>
            <button 
              onClick={handleApprove}
              className="px-8 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-100 transition-all"
            >
              Approve & Publish
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-8">
        {step === 'upload' && (
          <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
               <h3 className="text-lg font-bold text-slate-800">Exam Details</h3>
               <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-2">
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Paper Title (Optional)</label>
                   <input 
                     type="text" 
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                     placeholder="If empty, filename will be used"
                     value={metadata.title}
                     onChange={e => setMetadata({...metadata, title: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
                   <input 
                     type="text" 
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                     value={metadata.subject}
                     onChange={e => setMetadata({...metadata, subject: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Year</label>
                   <input 
                     type="number" 
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                     value={metadata.year}
                     onChange={e => setMetadata({...metadata, year: parseInt(e.target.value)})}
                   />
                 </div>
               </div>
            </div>

            <div 
              className={`relative group h-80 transition-all duration-300 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-center p-8 ${
                isDragging 
                  ? 'border-indigo-600 bg-indigo-50/50 scale-[1.02]' 
                  : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
              }`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <input 
                type="file" 
                accept="application/pdf"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={handleFileChange}
              />
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${isDragging ? 'bg-indigo-600 text-white shadow-xl rotate-12' : 'bg-indigo-50 text-indigo-600'}`}>
                <Upload size={40} className={isDragging ? 'animate-bounce' : ''} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">{isDragging ? 'Drop it here!' : 'Drop PDF or Click to Browse'}</h3>
              <p className="text-slate-500 text-sm mt-2">AI will process 150+ questions. Track progress on dashboard.</p>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
               <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                    <FileCheck size={32} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Review Extraction</h3>
                    <p className="text-slate-500 font-bold flex items-center gap-2">
                      Successfully parsed <span className="text-indigo-600 text-lg">{parsedQuestions.length}</span> questions
                    </p>
                  </div>
               </div>
               <div className="flex items-center gap-2 text-green-600 bg-green-50 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-green-100">
                 <Check size={18} />
                 Scan Complete
               </div>
            </div>

            {parsedQuestions.map((q) => (
              <div key={q.id} className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center">
                  <span className="font-black text-slate-700 text-sm uppercase tracking-widest">Question #{q.number}</span>
                  <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-2 py-1 rounded-md">BILINGUAL</span>
                </div>
                <div className={`grid ${langMode === 'both' ? 'md:grid-cols-2 divide-x divide-slate-100' : 'grid-cols-1'} border-b border-slate-100`}>
                   {(langMode === 'en' || langMode === 'both') && (
                     <div className="p-8 space-y-5">
                        <p className="text-slate-800 font-extrabold text-lg leading-snug">{q.content.en}</p>
                        <div className="grid gap-2.5">
                          {q.options.map(o => (
                            <div key={o.id} className={`p-4 rounded-xl border-2 text-sm flex items-center gap-4 transition-all ${o.id === q.correctOptionId ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold' : 'bg-white border-slate-100 text-slate-600'}`}>
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${o.id === q.correctOptionId ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{o.id.toUpperCase()}</span>
                              {o.text.en}
                            </div>
                          ))}
                        </div>
                     </div>
                   )}
                   {(langMode === 'hi' || langMode === 'both') && (
                     <div className="p-8 space-y-5 bg-slate-50/20">
                        <p className="text-slate-700 font-bold leading-relaxed hindi-text text-lg">{q.content.hi}</p>
                        <div className="grid gap-2.5">
                          {q.options.map(o => (
                            <div key={o.id} className={`p-4 rounded-xl border-2 text-sm flex items-center gap-4 transition-all ${o.id === q.correctOptionId ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold' : 'bg-white border-slate-100 text-slate-600'}`}>
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${o.id === q.correctOptionId ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{o.id.toUpperCase()}</span>
                              <span className="hindi-text">{o.text.hi}</span>
                            </div>
                          ))}
                        </div>
                     </div>
                   )}
                </div>
                <div className="p-6 bg-slate-900 text-white relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Solution Reasoning</p>
                   <div className="space-y-2">
                     {langMode !== 'hi' && <p className="text-sm font-medium leading-relaxed text-slate-300"><span className="text-indigo-400 font-black mr-2">EN:</span> {q.explanation.en}</p>}
                     {langMode !== 'en' && <p className="text-sm hindi-text leading-relaxed text-slate-400 italic opacity-90"><span className="text-indigo-400 font-black mr-2">HI:</span> {q.explanation.hi}</p>}
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportWizard;
