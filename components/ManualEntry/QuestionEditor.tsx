import React, { useState, useEffect } from 'react';
import { Question, Option, Translation } from '../../types';
import { Plus, Trash2, Check, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface QuestionEditorProps {
    initialQuestion?: Question;
    questionNumber: number;
    onSave: (question: Question) => void;
    onCancel: () => void;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({ initialQuestion, questionNumber, onSave, onCancel }) => {
    const [language, setLanguage] = useState<'en' | 'hi'>('en');
    const [content, setContent] = useState<Translation>(initialQuestion?.content || { en: '', hi: '' });
    const [explanation, setExplanation] = useState<Translation>(initialQuestion?.explanation || { en: '', hi: '' });

    // Initialize with 5 empty options if new
    const [options, setOptions] = useState<Option[]>(
        initialQuestion?.options || Array.from({ length: 5 }, (_, i) => ({
            id: String.fromCharCode(65 + i), // A, B, C, D, E
            text: { en: '', hi: '' }
        }))
    );

    const [correctOptionId, setCorrectOptionId] = useState<string>(initialQuestion?.correctOptionId || '');

    const handleSave = () => {
        // Validation
        if (!content.en.trim() && !content.hi.trim()) {
            toast.error("Question text is required");
            return;
        }
        if (!correctOptionId) {
            toast.error("Please select a correct option");
            return;
        }

        const question: Question = {
            id: initialQuestion?.id || Math.random().toString(36).substr(2, 9),
            number: questionNumber,
            content,
            options,
            correctOptionId,
            explanation
        };

        onSave(question);
    };

    const updateOptionText = (index: number, text: string) => {
        const newOptions = [...options];
        newOptions[index].text[language] = text;
        setOptions(newOptions);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">
                        {questionNumber}
                    </span>
                    {initialQuestion ? 'Edit Question' : 'New Question'}
                </h3>

                {/* Language Toggle */}
                <div className="flex bg-slate-200 rounded-lg p-1">
                    <button
                        onClick={() => setLanguage('en')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'en' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        EN
                    </button>
                    <button
                        onClick={() => setLanguage('hi')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'hi' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        HI
                    </button>
                </div>
            </div>

            {/* Scrollable Form Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Question Text */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        Question Text ({language.toUpperCase()})
                    </label>
                    <textarea
                        value={content[language]}
                        onChange={(e) => setContent({ ...content, [language]: e.target.value })}
                        placeholder={language === 'en' ? "Type your question here..." : "प्रश्न यहाँ टाइप करें..."}
                        className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none text-slate-700 text-sm leading-relaxed"
                    />
                </div>

                {/* Options */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Options ({language.toUpperCase()})
                    </label>
                    <div className="space-y-2">
                        {options.map((opt, idx) => (
                            <div key={opt.id} className="flex items-center gap-3 group">
                                <button
                                    onClick={() => setCorrectOptionId(opt.id)}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${correctOptionId === opt.id
                                            ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20'
                                            : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                        }`}
                                    title="Mark as correct"
                                >
                                    {correctOptionId === opt.id ? <Check size={18} /> : <span className="font-bold">{opt.id}</span>}
                                </button>

                                <input
                                    type="text"
                                    value={opt.text[language]}
                                    onChange={(e) => updateOptionText(idx, e.target.value)}
                                    placeholder={`Option ${opt.id}...`}
                                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Explanation */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Explanation / Solution ({language.toUpperCase()})
                    </label>
                    <textarea
                        value={explanation[language]}
                        onChange={(e) => setExplanation({ ...explanation, [language]: e.target.value })}
                        placeholder="Explain why the answer is correct..."
                        className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none text-slate-700 text-sm"
                    />
                </div>

            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button
                    onClick={onCancel}
                    className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:bg-slate-200 rounded-xl transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                >
                    <Check size={16} />
                    Save Question
                </button>
            </div>

        </div>
    );
};

export default QuestionEditor;
