
import React, { useState, useEffect, useRef } from 'react';
import { Page, AppState, Exam, Attempt, Language } from './types';
import Sidebar from './components/Sidebar';
import ExamRoom from './components/ExamRoom';
import { 
  FileUp, Plus, Clock, Award, BookOpen, AlertCircle, 
  Trash2, Loader2, Menu, TrendingUp, Calendar, ChevronRight,
  GraduationCap, Settings, ArrowRight, Languages, CheckCircle, X,
  Info, History
} from 'lucide-react';
import { extractTextFromPdf } from './services/pdfProcessor';
import { parseExamPaperToStaging, extractPaperMetadata } from './services/geminiService';
import { databaseService } from './services/databaseService';

const BPSC_SUBJECTS = [
  "Computer Science", "Geography", "History", "Political Science", 
  "Economics", "Mathematics", "Physics", "Chemistry", "Biology", 
  "Hindi", "English", "General Studies", "Social Science"
];

const TRE_YEARS = [
  { label: "TRE 1.0 (2023)", value: "TRE 1" },
  { label: "TRE 2.0 (2023)", value: "TRE 2" },
  { label: "TRE 3.0 (2024)", value: "TRE 3" },
  { label: "TRE 4.0 (Upcoming)", value: "TRE 4" }
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('exampro_v2_state');
    return saved ? JSON.parse(saved) : {
      exams: [],
      history: [],
      activePage: Page.DASHBOARD,
      currentExam: null,
      activeAttempt: null,
      lastResult: null,
      preferredLanguage: 'en'
    };
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  const [importYear, setImportYear] = useState(TRE_YEARS[2].value);
  const [importSubject, setImportSubject] = useState(BPSC_SUBJECTS[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('exampro_v2_state', JSON.stringify(state));
  }, [state]);

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setShowImportModal(false);
      setError(null);
      setUploadProgress(5);

      // 1. Extract raw text from PDF (Progress 5-25)
      const pagesText = await extractTextFromPdf(selectedFile, (p) => setUploadProgress(5 + (p * 0.2)));
      
      // 2. Extract initial metadata (Progress 25-35)
      const metadata = await extractPaperMetadata(pagesText[0] + "\n" + (pagesText[1] || ""));
      const maxQuestions = metadata.totalQuestions || 120;
      setUploadProgress(35);

      // 3. Batch processing of pages (Progress 35-90)
      // Reduced BATCH_SIZE from 12 to 6 for better reliability and faster feedback
      const BATCH_SIZE = 6;
      const allParsedQuestions: any[] = [];
      const numPages = pagesText.length;
      const totalBatches = Math.ceil(numPages / BATCH_SIZE);

      for (let i = 0; i < totalBatches; i++) {
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, numPages);
        const batchChunks = pagesText.slice(start, end);
        
        // Brief delay to prevent rate limit spikes
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 500));

        const stagedBatch = await parseExamPaperToStaging(batchChunks, maxQuestions);
        
        if (stagedBatch.questions && Array.isArray(stagedBatch.questions)) {
          allParsedQuestions.push(...stagedBatch.questions);
        }
        
        // Update progress more frequently
        setUploadProgress(35 + (((i + 1) / totalBatches) * 55));
      }

      // 4. Consolidate and Deduplicate (Progress 90-95)
      const uniqueQuestionsMap = new Map();
      allParsedQuestions.forEach(q => {
        if (!uniqueQuestionsMap.has(q.order) || (q.contentEn && q.contentEn.length > (uniqueQuestionsMap.get(q.order)?.contentEn?.length || 0))) {
          uniqueQuestionsMap.set(q.order, q);
        }
      });
      const finalQuestions = Array.from(uniqueQuestionsMap.values())
        .sort((a, b) => a.order - b.order)
        .filter(q => q.order > 0 && q.order <= maxQuestions);

      const stagedData = {
        metadata: { 
          title: metadata.paperTitle, 
          totalQuestions: finalQuestions.length, 
          durationMinutes: metadata.durationMinutes 
        },
        questions: finalQuestions
      };

      const examMetadata = {
        paperTitle: metadata.paperTitle,
        examName: `BPSC Bihar T.R.E ${importYear}`,
        year: parseInt(importYear.match(/\d+/)?.at(0) || "2024"),
        type: importYear,
        subject: importSubject
      };

      // 5. Final persistence (Progress 95-100)
      const finalExam = await databaseService.persistStagedExam(stagedData, examMetadata);

      setState(prev => ({ ...prev, exams: [finalExam, ...prev.exams] }));
      setUploadProgress(100);
      
      setTimeout(() => { 
        setIsUploading(false); 
        setSelectedFile(null); 
        setUploadProgress(0);
      }, 800);

    } catch (err: any) {
      console.error("Batch Import Failed:", err);
      setError(err.message || "BPSC Extraction Logic failed.");
      setIsUploading(false);
    }
  };

  const startExam = (exam: Exam, lang: Language) => {
    const newAttempt: Attempt = {
      id: `att_${Date.now()}`,
      examId: exam.id,
      examTitle: exam.title,
      startTime: Date.now(),
      status: 'IN_PROGRESS',
      userAnswers: []
    };
    setState(prev => ({ 
      ...prev, 
      currentExam: exam, 
      activeAttempt: newAttempt, 
      preferredLanguage: lang,
      activePage: Page.INSTRUCTIONS 
    }));
  };

  const finishExam = (attempt: Attempt) => {
    if (!state.currentExam) return;
    const results = databaseService.calculateScore(state.currentExam, attempt.userAnswers);
    const completedAttempt: Attempt = {
      ...attempt,
      status: 'COMPLETED',
      endTime: Date.now(),
      ...results
    };

    setState(prev => ({
      ...prev,
      history: [completedAttempt, ...prev.history],
      lastResult: completedAttempt,
      activePage: Page.RESULTS,
      activeAttempt: null,
      currentExam: null
    }));
  };

  const renderInstructions = () => (
    <div className="min-h-screen bg-slate-50 p-10 flex items-center justify-center">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-12 max-w-2xl w-full">
        <h1 className="text-2xl font-black mb-6 uppercase">Ready to Begin?</h1>
        <div className="space-y-4 mb-10">
          <p className="text-slate-600 font-medium">Exam: <span className="text-slate-900 font-bold">{state.currentExam?.title}</span></p>
          <p className="text-slate-600 font-medium">Language: <span className="text-indigo-600 font-bold uppercase">{state.preferredLanguage}</span></p>
          <div className="h-px bg-slate-100 my-6" />
          <ul className="space-y-3">
             <li className="flex items-center gap-3 text-sm font-bold text-slate-500"><Clock className="w-4 h-4" /> {state.currentExam?.durationMinutes} Minutes</li>
             <li className="flex items-center gap-3 text-sm font-bold text-slate-500"><Award className="w-4 h-4" /> {state.currentExam?.questions.length} Questions</li>
             <li className="flex items-center gap-3 text-sm font-bold text-slate-500"><AlertCircle className="w-4 h-4" /> 0.25 Negative Marking</li>
          </ul>
        </div>
        <button 
          onClick={() => setState(prev => ({ ...prev, activePage: Page.EXAM_ROOM }))}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
        >
          Confirm & Start Exam
        </button>
      </div>
    </div>
  );

  if (state.activePage === Page.EXAM_ROOM && state.currentExam && state.activeAttempt) {
    return (
      <ExamRoom 
        paper={state.currentExam} 
        initialLanguage={state.preferredLanguage} 
        onFinish={finishExam} 
        onCancel={() => setState(prev => ({ ...prev, activePage: Page.DASHBOARD, currentExam: null, activeAttempt: null }))} 
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-900 overflow-hidden">
      <Sidebar activePage={state.activePage} onNavigate={(p) => setState(prev => ({ ...prev, activePage: p }))} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 lg:hidden bg-white border-b flex items-center px-4">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400"><Menu className="w-5 h-5" /></button>
          <div className="ml-3 flex items-center gap-2 font-black uppercase text-sm">EXAMPRO</div>
        </header>
        <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {state.activePage === Page.DASHBOARD && (
            <div className="max-w-7xl mx-auto space-y-10">
              <header className="flex justify-between items-center">
                <h1 className="text-2xl font-black uppercase">Dashboard</h1>
                <button onClick={() => setShowImportModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"><FileUp className="w-4 h-4" /> Import PDF</button>
              </header>

              {isUploading && (
                <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-xl">
                  <div className="flex justify-between text-xs font-black uppercase mb-2">
                    <span>Processing Batch...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-500" style={{width: `${uploadProgress}%`}} />
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-600 text-sm font-bold">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {state.exams.map(exam => (
                  <div key={exam.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded mb-4 inline-block">{exam.type}</span>
                    <h3 className="font-black text-lg mb-2 truncate uppercase">{exam.title}</h3>
                    <p className="text-xs text-slate-400 font-bold mb-6 italic">{exam.examName}</p>
                    <button 
                      onClick={() => { setState(prev => ({ ...prev, currentExam: exam })); setShowLanguageModal(true); }}
                      className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      Attempt Test <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {state.activePage === Page.HISTORY && (
            <div className="max-w-4xl mx-auto space-y-4">
               <h1 className="text-2xl font-black uppercase mb-8">Attempt History</h1>
               {state.history.length === 0 ? (
                 <div className="bg-white p-12 rounded-[2rem] border-2 border-dashed border-slate-100 text-center text-slate-300 font-black uppercase tracking-widest">
                    No Attempts Found
                 </div>
               ) : (
                 state.history.map(att => (
                   <div key={att.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold uppercase text-slate-900">{att.examTitle}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase">{new Date(att.startTime).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-lg font-black text-indigo-600">{att.score?.toFixed(2)}</p>
                         <p className="text-[9px] font-black text-slate-300 uppercase">Final Score</p>
                      </div>
                   </div>
                 ))
               )}
            </div>
          )}
        </main>
      </div>
      
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 animate-in zoom-in-95">
             <h2 className="text-xl font-black uppercase mb-6">Import BPSC Paper</h2>
             <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Examination Year</label>
                  <select value={importYear} onChange={e => setImportYear(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-indigo-600 outline-none">
                     {TRE_YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Subject Filter</label>
                  <select value={importSubject} onChange={e => setImportSubject(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-indigo-600 outline-none">
                     {BPSC_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center cursor-pointer hover:bg-slate-50 transition-colors">
                   <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                   {selectedFile ? (
                     <div className="text-indigo-600 font-bold flex flex-col items-center">
                        <CheckCircle className="w-8 h-8 mb-2" />
                        {selectedFile.name}
                     </div>
                   ) : (
                     <div className="text-slate-400 font-black uppercase text-xs flex flex-col items-center">
                        <FileUp className="w-8 h-8 mb-2 opacity-20" />
                        Select Question Paper PDF
                     </div>
                   )}
                </div>
                <div className="flex gap-4 pt-4">
                   <button onClick={() => setShowImportModal(false)} className="flex-1 font-black uppercase text-slate-400 py-4 hover:text-slate-600 transition-colors">Cancel</button>
                   <button disabled={!selectedFile} onClick={handleFileUpload} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase shadow-xl shadow-indigo-500/30 active:scale-95 disabled:opacity-50 transition-all">Start Ingestion</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {showLanguageModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-10 rounded-[3rem] text-center max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black uppercase mb-8">Choose Medium</h3>
            <div className="grid gap-3">
              <button onClick={() => { if (state.currentExam) startExam(state.currentExam, 'en'); setShowLanguageModal(false); }} className="p-6 border-2 border-slate-100 rounded-3xl font-black uppercase text-sm hover:border-indigo-600 hover:bg-indigo-50/50 transition-all">English Medium</button>
              <button onClick={() => { if (state.currentExam) startExam(state.currentExam, 'hi'); setShowLanguageModal(false); }} className="p-6 border-2 border-slate-100 rounded-3xl font-black uppercase text-sm hover:border-indigo-600 hover:bg-indigo-50/50 transition-all">Hindi Medium (हिंदी)</button>
            </div>
            <button onClick={() => setShowLanguageModal(false)} className="mt-6 text-[10px] font-black uppercase text-slate-300 hover:text-slate-500 transition-colors">Go Back</button>
          </div>
        </div>
      )}

      {state.activePage === Page.INSTRUCTIONS && renderInstructions()}
      {state.activePage === Page.RESULTS && (
         <div className="fixed inset-0 bg-white z-[200] p-10 overflow-y-auto">
            <div className="max-w-4xl mx-auto text-center">
               <div className="bg-indigo-600 w-24 h-24 rounded-full flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-indigo-200 animate-bounce">
                  <Award className="w-12 h-12" />
               </div>
               <h1 className="text-4xl font-black uppercase mb-2 tracking-tighter">Practice Complete</h1>
               <p className="text-slate-400 font-bold uppercase tracking-[0.2em] mb-12">{state.lastResult?.examTitle}</p>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                  <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100"><p className="text-4xl font-black text-slate-900">{state.lastResult?.score?.toFixed(2)}</p><p className="text-[10px] font-black uppercase text-slate-400 mt-1">Final Score</p></div>
                  <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100"><p className="text-4xl font-black text-emerald-600">{state.lastResult?.correctCount}</p><p className="text-[10px] font-black uppercase text-emerald-400 mt-1">Correct</p></div>
                  <div className="bg-rose-50 p-8 rounded-3xl border border-rose-100"><p className="text-4xl font-black text-rose-600">{state.lastResult?.wrongCount}</p><p className="text-[10px] font-black uppercase text-rose-400 mt-1">Wrong</p></div>
                  <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100"><p className="text-4xl font-black text-slate-600">{state.lastResult?.skippedCount}</p><p className="text-[10px] font-black uppercase text-slate-400 mt-1">Skipped</p></div>
               </div>

               <button onClick={() => setState(prev => ({ ...prev, activePage: Page.DASHBOARD, lastResult: null }))} className="bg-slate-900 text-white px-16 py-6 rounded-3xl font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Return to Dashboard</button>
            </div>
         </div>
      )}
    </div>
  );
};

export default App;
