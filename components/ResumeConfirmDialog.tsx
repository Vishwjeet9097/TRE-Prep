import React from 'react';
import { Play, RotateCcw, X, History } from 'lucide-react';

interface ResumeConfirmDialogProps {
    isOpen: boolean;
    paperTitle: string;
    onResume: () => void;
    onStartNew: () => void;
    onCancel: () => void;
}

const ResumeConfirmDialog: React.FC<ResumeConfirmDialogProps> = ({
    isOpen,
    paperTitle,
    onResume,
    onStartNew,
    onCancel,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 md:p-8 transform transition-all animate-in zoom-in-95 duration-200 border border-white/20">
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                >
                    <X size={20} />
                </button>

                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-inner">
                    <History size={32} />
                </div>

                <div className="text-center space-y-2 mb-8">
                    <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Resume Exam?</h3>
                    <p className="text-slate-500 font-medium leading-relaxed">
                        You have an unfinished attempt for <span className="font-bold text-slate-700">{paperTitle}</span>.
                        Do you want to continue where you left off?
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onResume}
                        className="w-full py-3.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Play size={18} fill="currentColor" /> Resume
                    </button>

                    <button
                        onClick={onStartNew}
                        className="w-full py-3.5 rounded-xl font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={16} /> Start New
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResumeConfirmDialog;
