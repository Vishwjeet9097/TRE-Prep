import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'neutral' | 'success';
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = 'neutral',
    onConfirm,
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

                {/* Icon based on variant */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-inner ${variant === 'danger' ? 'bg-rose-50 text-rose-500' :
                    variant === 'success' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-indigo-50 text-indigo-600'
                    }`}>
                    {variant === 'danger' ? <AlertTriangle size={32} /> :
                        variant === 'success' ? <Check size={32} /> :
                            <AlertTriangle size={32} />
                    }
                </div>

                <div className="text-center space-y-2 mb-8">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h3>
                    <p className="text-slate-500 font-medium leading-relaxed">{description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onCancel}
                        className="w-full py-3.5 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 ${variant === 'danger' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' :
                            variant === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' :
                                'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                            }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
