
import React, { useState } from 'react';
import { Sparkles, ArrowLeft, Wand2, BookOpen, Loader2, Save, Send, RotateCcw, CheckCircle, FileText, Library, Shuffle } from 'lucide-react';
import { generateQuestionsByTopic } from '../services/geminiService';
import { ExamPaper, Question } from '../types';
import { StorageService } from '../store';
import { toast } from 'sonner';
import RichTextRenderer from './RichTextRenderer';

interface TopicGeneratorProps {
    onBack: () => void;
    onSave: (paper: ExamPaper) => void;
}

type GenerationStep = 'input' | 'generating' | 'review';

const TopicGenerator: React.FC<TopicGeneratorProps> = ({ onBack, onSave }) => {
    const [step, setStep] = useState<GenerationStep>('input');
    const [topic, setTopic] = useState('');
    const [subTopic, setSubTopic] = useState('');
    const [progressMsg, setProgressMsg] = useState('');
    const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
    const [langMode, setLangMode] = useState<'en' | 'hi' | 'both'>('both');
    const [mode, setMode] = useState<'AI' | 'LIBRARY'>('AI');
    const [libraryCount, setLibraryCount] = useState(0);
    const [mixSize, setMixSize] = useState(30);

    React.useEffect(() => {
        setLibraryCount(StorageService.getAllQuestions().length);
    }, []);

    const SUGGESTIONS = [
        "Gandhian Era in Bihar", "Indian Polity - Preamble", "Modern History 1857 Revolt",
        "Bihar Geography - Rivers", "Current Affairs - National", "Science - Biology Basics"
    ];

    const handleGenerate = async () => {
        if (!topic.trim()) return;

        setStep('generating');
        const fullTopic = subTopic ? `${topic} - ${subTopic}` : topic;

        try {
            const questions = await generateQuestionsByTopic(fullTopic, (msg) => setProgressMsg(msg));
            setGeneratedQuestions(questions);
            setStep('review');
        } catch (error: any) {
            console.error("Original Error:", error);

            let userMessage = "Something went wrong. Please check your connection and try again.";
            const errorStr = JSON.stringify(error?.message || error || "");

            if (errorStr.includes('429') || errorStr.toLowerCase().includes('quota') || errorStr.toLowerCase().includes('limit')) {
                userMessage = "Daily AI Limit Reached. Please try again later or use your own API Key in settings.";
            } else if (errorStr.includes('SAFETY')) {
                userMessage = "Content could not be generated due to safety guidelines. Please try a different topic.";
            }

            toast.error("Generation Failed", { description: userMessage });
            setStep('input');
        }
    };

    const handleLibraryMix = () => {
        const allQuestions = StorageService.getAllQuestions();
        if (allQuestions.length < 10) {
            toast.error("Not Enough Questions", { description: "You need at least 10 questions in your library to generate a mix." });
            return;
        }

        if (allQuestions.length < mixSize) {
            toast.error("Library Size Low", { description: `You requested ${mixSize} questions but only have ${allQuestions.length}. We'll use all available.` });
        }

        setStep('generating');
        setProgressMsg(`Shuffling your library for ${mixSize} questions...`);

        // Simple Shuffle
        setTimeout(() => {
            const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
            const count = Math.min(mixSize, allQuestions.length);
            const selected = shuffled.slice(0, count);
            setGeneratedQuestions(selected);

            // Calculate Set Number
            const existingSets = StorageService.getPapers().filter(p => p.title.startsWith("TRE-Practice-SET"));
            const nextSetNum = existingSets.length + 1;
            const newTitle = `TRE-Practice-SET-${nextSetNum}`;

            setTopic(newTitle);
            setSubTopic(`${count} Questions • Mixed Revision`);
            setStep('review');
        }, 800);
    };

    const handleSave = () => {
        const paper: ExamPaper = {
            id: Math.random().toString(36).substr(2, 9),
            title: mode === 'LIBRARY' ? topic : (subTopic ? `${topic}: ${subTopic}` : topic),
            examType: mode === 'LIBRARY' ? 'MOCK-MIX' : 'AI-GEN',
            year: new Date().getFullYear(),
            subject: mode === 'LIBRARY' ? 'Mixed Revision' : topic,
            questions: generatedQuestions,
            status: 'published',
            createdAt: Date.now(),
            source: 'LOCAL'
        };
        StorageService.savePaper(paper);
        onSave(paper);
    };

    return (
        <div className="min-h-full flex flex-col bg-[#F8F9FD] overflow-y-auto no-scrollbar">
            {/* Header */}
            <div className="px-4 py-6 md:px-8 md:py-8 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="w-12 h-12 bg-white/80 backdrop-blur-md border border-white/20 hover:border-indigo-300 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all shadow-sm hover:-translate-x-1"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-lg md:text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Sparkles className="text-amber-400" size={20} fill="currentColor" />
                            AI Generator
                        </h2>
                        <p className="text-xs md:text-sm font-semibold text-slate-400">Create custom BPSC sets</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 px-4 md:px-8 pb-12 max-w-4xl mx-auto w-full">

                {step === 'input' && (
                    <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Hero Input Section */}
                        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-12 shadow-[0_20px_50px_-20px_rgba(99,102,241,0.2)] border border-indigo-50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 md:w-64 h-32 md:h-64 bg-indigo-50 rounded-full blur-3xl -mr-16 md:-mr-32 -mt-16 md:-mt-32 opacity-50" />
                            <div className="absolute bottom-0 left-0 w-32 md:w-64 h-32 md:h-64 bg-amber-50 rounded-full blur-3xl -ml-16 md:-ml-32 -mb-16 md:-mb-32 opacity-50" />

                            <div className="relative z-10 space-y-8">
                                {/* Mode Toggles */}
                                <div className="flex justify-center">
                                    <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1">
                                        <button
                                            onClick={() => setMode('AI')}
                                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${mode === 'AI' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            <Wand2 size={16} /> AI Forge
                                        </button>
                                        <button
                                            onClick={() => setMode('LIBRARY')}
                                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${mode === 'LIBRARY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            <Library size={16} /> Library Mix
                                        </button>
                                    </div>
                                </div>

                                {mode === 'AI' ? (
                                    <>
                                        <div className="text-center space-y-2">
                                            <h3 className="text-xl md:text-4xl font-bold text-slate-900 tracking-tight">What do you want to master?</h3>
                                            <p className="text-slate-500 font-medium text-xs md:text-lg">Enter a subject or topic for your 20-question challenge.</p>
                                        </div>

                                        <div className="space-y-4 max-w-xl mx-auto">
                                            <div className="bg-slate-50 p-2 rounded-[1.5rem] border-2 border-slate-100 flex items-center gap-4 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100 transition-all shadow-inner">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-indigo-600 shrink-0">
                                                    <Wand2 size={24} />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={topic}
                                                    onChange={(e) => setTopic(e.target.value)}
                                                    placeholder="e.g. Modern History, Bihar Geography..."
                                                    className="flex-1 bg-transparent border-none outline-none font-bold text-lg text-slate-800 placeholder:text-slate-400"
                                                    autoFocus
                                                />
                                            </div>

                                            <div className="flex gap-2 justify-center flex-wrap">
                                                {SUGGESTIONS.map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => setTopic(s)}
                                                        className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-500 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex justify-center pt-4">
                                            <button
                                                onClick={handleGenerate}
                                                disabled={!topic.trim()}
                                                className="w-full md:w-auto px-12 py-5 bg-slate-900 text-white rounded-3xl font-bold text-lg hover:bg-indigo-600 hover:scale-105 hover:shadow-xl hover:shadow-indigo-200 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
                                            >
                                                <Sparkles className="animate-pulse" />
                                                Generate Practice Set
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-center space-y-2">
                                            <h3 className="text-xl md:text-4xl font-bold text-slate-900 tracking-tight">Smart Library Mixer</h3>
                                            <p className="text-slate-500 font-medium text-xs md:text-lg">Create a "Surprise Mock Test" from your existing papers.</p>
                                        </div>

                                        <div className="max-w-xl mx-auto bg-slate-50 rounded-[2rem] p-8 border border-slate-200 text-center space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
                                                    <div className="text-3xl md:text-4xl font-black text-indigo-600 mb-1">{libraryCount}</div>
                                                    <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Questions Available</div>
                                                </div>
                                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3">
                                                    <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Select Test Size</div>
                                                    <div className="flex bg-slate-100 rounded-xl p-1 gap-1 w-full justify-between">
                                                        {[10, 20, 30, 50].map(size => (
                                                            <button
                                                                key={size}
                                                                onClick={() => setMixSize(size)}
                                                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mixSize === size ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                                                            >
                                                                {size}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleLibraryMix}
                                                disabled={libraryCount < 10}
                                                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                            >
                                                <Shuffle size={20} />
                                                Generate Mixed Test
                                            </button>

                                            {libraryCount < 10 && (
                                                <p className="text-xs text-rose-500 font-bold">Import more papers to unlock this feature.</p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Features Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FeatureCard
                                icon={<BookOpen className="text-emerald-500" />}
                                title="Strict BPSC Pattern"
                                desc="5 Options (A-E) with 'More than one' and 'None' correctly implemented."
                            />
                            <FeatureCard
                                icon={<RotateCcw className="text-amber-500" />}
                                title="Infinite Practice"
                                desc="Never run out of questions. Every set is uniquely generated for you."
                            />
                            <FeatureCard
                                icon={<FileText className="text-purple-500" />}
                                title="Bilingual Content"
                                desc="Seamlessly switch between Hindi and English while practicing."
                            />
                        </div>
                    </div>
                )}

                {step === 'generating' && (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8 animate-in zoom-in-95 duration-500">
                        <div className="relative">
                            <div className="w-32 h-32 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className="text-indigo-600 animate-pulse" size={40} />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-bold text-slate-900">Crafting your Exam</h3>
                            <p className="text-slate-500 font-medium animate-pulse">{progressMsg || "Initializing AI..."}</p>
                        </div>
                    </div>
                )}

                {step === 'review' && (
                    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-8 duration-500">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl md:text-3xl font-bold text-slate-900 break-words">{topic}</h3>
                                <p className="text-slate-500 font-bold text-xs md:text-sm">20 Questions • Bilingual • BPSC Pattern</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex bg-white p-1 rounded-xl border border-slate-200 order-2 sm:order-1">
                                    {(['en', 'hi', 'both'] as const).map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setLangMode(m)}
                                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${langMode === m ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {m.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={handleSave}
                                    className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 hover:scale-105 order-1 sm:order-2"
                                >
                                    <Save size={20} /> Save to Workspace
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-4 md:gap-6">
                            {generatedQuestions.map((q, i) => (
                                <div key={i} className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-3xl border border-slate-200 hover:border-indigo-100 transition-all shadow-sm">
                                    <div className="flex gap-4">
                                        <span className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0">#{i + 1}</span>
                                        <div className="space-y-4 flex-1">
                                            <div className="space-y-2">
                                                {(langMode === 'en' || langMode === 'both') && <div className="text-sm md:text-lg font-bold text-slate-800 leading-relaxed"><RichTextRenderer content={q.content.en} /></div>}
                                                {(langMode === 'hi' || langMode === 'both') && <div className="text-sm md:text-lg font-medium text-slate-600 hindi-text leading-relaxed"><RichTextRenderer content={q.content.hi} /></div>}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {q.options.map(opt => (
                                                    <div key={opt.id} className={`p-4 rounded-xl border flex items-center gap-3 ${opt.id === q.correctOptionId ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}>
                                                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${opt.id === q.correctOptionId ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                            {opt.id.toUpperCase()}
                                                        </span>
                                                        <div className="text-sm font-semibold text-slate-700 w-full">
                                                            <RichTextRenderer content={(langMode === 'en' || !opt.text.hi) ? opt.text.en : (opt.text.hi || '')} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="bg-indigo-50 p-4 rounded-2xl flex items-start gap-3">
                                                <CheckCircle size={20} className="text-indigo-600 shrink-0 mt-0.5" />
                                                <div className="text-sm text-indigo-900 font-medium w-full">
                                                    <span className="font-bold block mb-1">Explanation:</span>
                                                    <RichTextRenderer content={(langMode === 'en' || langMode === 'both') ? q.explanation.en : (q.explanation.hi || '')} />
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

const FeatureCard = ({ icon, title, desc }: { icon: any, title: string, desc: string }) => (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 text-xl">
            {icon}
        </div>
        <h4 className="text-lg font-bold text-slate-900 mb-2">{title}</h4>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
);

export default TopicGenerator;
