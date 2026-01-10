import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, FileText, FolderOpen, Layers } from 'lucide-react';
import { StorageService } from '../../store';
import { ExamPaper, Question } from '../../types';
import QuestionEditor from './QuestionEditor';
import { toast } from 'sonner';

interface ManualWizardProps {
    onBack: () => void;
    onComplete: () => void;
}

type WizardMode = 'select_mode' | 'metadata' | 'editor';
type EntryMode = 'new' | 'existing';

const ManualWizard: React.FC<ManualWizardProps> = ({ onBack, onComplete }) => {
    const [mode, setMode] = useState<WizardMode>('select_mode');
    const [entryMode, setEntryMode] = useState<EntryMode>('new');

    // Metadata State
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [year, setYear] = useState(new Date().getFullYear());
    const [examType, setExamType] = useState('General');

    // Existing Paper State
    const [existingPapers, setExistingPapers] = useState<ExamPaper[]>([]);
    const [selectedPaperId, setSelectedPaperId] = useState('');

    // Editor State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [showEditor, setShowEditor] = useState(false);

    useEffect(() => {
        // Load local papers only for "Add to Existing"
        const papers = StorageService.getPapers().filter(p => p.source === 'LOCAL');
        setExistingPapers(papers);
    }, []);

    const handleModeSelect = (selected: EntryMode) => {
        setEntryMode(selected);
        if (selected === 'new') {
            setMode('metadata');
        } else {
            if (existingPapers.length === 0) {
                toast.error("No manual papers found to edit. Create a new one first.");
                return;
            }
            setMode('metadata'); // Re-use metadata screen for selection
        }
    };

    const handleMetadataNext = () => {
        if (entryMode === 'new') {
            if (!title.trim() || !subject.trim()) {
                toast.error("Please fill in all details");
                return;
            }
        } else {
            if (!selectedPaperId) {
                toast.error("Please select a paper");
                return;
            }
            // Load existing questions
            const paper = existingPapers.find(p => p.id === selectedPaperId);
            if (paper) {
                setQuestions(paper.questions);
                setTitle(paper.title); // Just for display contexts
            }
        }
        setMode('editor');
    };

    const handleSaveQuestion = (q: Question) => {
        if (editingQuestion) {
            setQuestions(prev => prev.map(item => item.id === q.id ? q : item));
        } else {
            setQuestions(prev => [...prev, q]);
        }
        setShowEditor(false);
        setEditingQuestion(null);
    };

    const handleFinish = () => {
        if (questions.length === 0) {
            toast.error("Add at least one question");
            return;
        }

        if (entryMode === 'new') {
            const newPaper: ExamPaper = {
                id: `manual_${Date.now()}`,
                title,
                subject,
                year,
                examType,
                questions,
                status: 'published',
                createdAt: Date.now(),
                source: 'LOCAL'
            };
            StorageService.savePaper(newPaper);
            toast.success("Question Bank Created!");
        } else {
            StorageService.updatePaper(selectedPaperId, { questions });
            toast.success("Question Bank Updated!");
        }
        onComplete();
    };

    const deleteQuestion = (id: string) => {
        setQuestions(prev => prev.filter(q => q.id !== id));
    };

    // --- RENDER STEPS ---

    if (mode === 'select_mode') {
        return (
            <div className="flex flex-col h-full items-center justify-center space-y-8 p-8 pb-32 overflow-y-auto animate-in fade-in zoom-in duration-300">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-slate-800">Manual Entry Mode</h2>
                    <p className="text-slate-500">Create professional question banks manually.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                    <button
                        onClick={() => handleModeSelect('new')}
                        className="flex flex-col items-center p-8 bg-white border border-slate-200 rounded-3xl hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all group"
                    >
                        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Plus size={32} className="text-indigo-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Create New Set</h3>
                        <p className="text-sm text-slate-400 text-center mt-2">Start a fresh collection for a new subject or exam.</p>
                    </button>

                    <button
                        onClick={() => handleModeSelect('existing')}
                        className="flex flex-col items-center p-8 bg-white border border-slate-200 rounded-3xl hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/10 transition-all group"
                    >
                        <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <FolderOpen size={32} className="text-orange-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Add to Existing</h3>
                        <p className="text-sm text-slate-400 text-center mt-2">Append new questions to an existing manual set.</p>
                    </button>
                </div>
                <button onClick={onBack} className="text-slate-400 hover:text-slate-600 font-bold text-sm">
                    Cancel
                </button>
            </div>
        );
    }

    if (mode === 'metadata') {
        return (
            <div className="max-w-xl mx-auto w-full pt-10 px-6 animate-in slide-in-from-right duration-300">
                <button onClick={() => setMode('select_mode')} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold mb-8">
                    <ArrowLeft size={18} /> Back
                </button>

                <h2 className="text-3xl font-black text-slate-800 mb-2">
                    {entryMode === 'new' ? 'Set Details' : 'Select Set'}
                </h2>
                <p className="text-slate-500 mb-8">Define where these questions belong.</p>

                <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">

                    {entryMode === 'new' ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Title / Name</label>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Science Mock Test 1"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Subject</label>
                                <input
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="e.g. Physics"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Select Existing Set</label>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {existingPapers.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => setSelectedPaperId(p.id)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${selectedPaperId === p.id ? 'bg-indigo-50 border-indigo-500' : 'bg-slate-50 border-slate-200 hover:border-indigo-300'}`}
                                    >
                                        <div>
                                            <h4 className="font-bold text-slate-800">{p.title}</h4>
                                            <p className="text-xs text-slate-500">{p.subject} • {p.questions.length} Qs</p>
                                        </div>
                                        {selectedPaperId === p.id && <div className="w-4 h-4 bg-indigo-500 rounded-full" />}
                                    </div>
                                ))}
                                {existingPapers.length === 0 && (
                                    <p className="text-center text-slate-400 py-4 italic">No existing manual papers found.</p>
                                )}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleMetadataNext}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 mt-4"
                    >
                        Continue <ArrowLeft className="rotate-180" size={18} />
                    </button>
                </div>
            </div>
        );
    }

    // --- EDITOR MODE ---

    if (showEditor) {
        return (
            <div className="h-full p-4 md:p-6 animate-in zoom-in duration-200">
                <QuestionEditor
                    questionNumber={questions.length + 1}
                    initialQuestion={editingQuestion || undefined}
                    onSave={handleSaveQuestion}
                    onCancel={() => {
                        setShowEditor(false);
                        setEditingQuestion(null);
                    }}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Top Bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => setMode('metadata')} className="text-slate-400 hover:text-slate-600">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 leading-tight">{entryMode === 'existing' ? existingPapers.find(p => p.id === selectedPaperId)?.title : title}</h2>
                        <p className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                            <Layers size={12} /> {questions.length} Questions Added
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleFinish}
                    className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 shadow-lg shadow-green-600/20 flex items-center gap-2 transition-all"
                >
                    <Save size={16} /> Finish & Save
                </button>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-6 md:max-w-3xl md:mx-auto w-full space-y-4">

                {questions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50">
                        <FileText size={48} className="text-slate-300" />
                        <p className="text-slate-400 font-medium">No questions added yet.<br />Click below to start.</p>
                    </div>
                ) : (
                    questions.map((q, idx) => (
                        <div key={q.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors group relative">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex gap-4">
                                    <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0">
                                        {idx + 1}
                                    </span>
                                    <div>
                                        <p className="font-bold text-slate-800 line-clamp-2 mb-1">{q.content.en || "No English Text"}</p>
                                        <p className="font-medium text-slate-500 text-sm line-clamp-2">{q.content.hi || "हिंदी टेक्स्ट नहीं है"}</p>
                                        <div className="mt-3 flex gap-2">
                                            <span className="px-2 py-1 rounded-md bg-green-50 text-green-700 text-[10px] font-bold border border-green-100 uppercase">
                                                Ans: {q.correctOptionId}
                                            </span>
                                            <span className="px-2 py-1 rounded-md bg-slate-50 text-slate-500 text-[10px] font-bold border border-slate-100 uppercase">
                                                {q.options.length} Options
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => {
                                            setEditingQuestion(q);
                                            setShowEditor(true);
                                        }}
                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                    >
                                        <FileText size={16} />
                                    </button>
                                    <button
                                        onClick={() => deleteQuestion(q.id)}
                                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 size={16} /> {/* Note: Trash2 needs import */}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}

                <button
                    onClick={() => {
                        setEditingQuestion(null);
                        setShowEditor(true);
                    }}
                    className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-2xl flex items-center justify-center gap-2 text-indigo-600 font-bold hover:bg-indigo-50 hover:border-indigo-300 transition-all group"
                >
                    <Plus size={20} className="group-hover:scale-110 transition-transform" />
                    Add Question
                </button>
                <div className="h-20" /> {/* Bottom Spacer */}
            </div>
        </div>
    );
};

// Add missing icon
import { Trash2 } from 'lucide-react';

export default ManualWizard;
