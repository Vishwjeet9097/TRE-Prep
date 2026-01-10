
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { ArrowLeft, Upload, FileSpreadsheet, Download, CheckCircle, AlertTriangle, FileText, Layers, Save } from 'lucide-react';
import { toast } from 'sonner';
import { ExamPaper, Question, Translation, Option } from '../types';
import { StorageService } from '../store';

interface ExcelImportWizardProps {
    onBack: () => void;
    onComplete: () => void;
}

type WizardStep = 'upload' | 'preview' | 'metadata';

const ExcelImportWizard: React.FC<ExcelImportWizardProps> = ({ onBack, onComplete }) => {
    const [step, setStep] = useState<WizardStep>('upload');
    const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
    const [fileStats, setFileStats] = useState<{ name: string; size: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Metadata State
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');

    // --- TEMPLATE DOWNLOAD ---
    const downloadTemplate = async () => {
        const headers = [
            'Question (En)', 'Question (Hi)',
            'Option A (En)', 'Option A (Hi)',
            'Option B (En)', 'Option B (Hi)',
            'Option C (En)', 'Option C (Hi)',
            'Option D (En)', 'Option D (Hi)',
            'Option E (En)', 'Option E (Hi)',
            'Correct Option (A-E)',
            'Explanation (En)', 'Explanation (Hi)'
        ];

        const sampleRow = [
            'What is the unit of Force?', 'बल का मात्रक क्या है?',
            'Newton', 'न्यूटन',
            'Joule', 'जूल',
            'Watt', 'वाट',
            'Pascal', 'पास्कल',
            '', '',
            'A',
            'Newton is the unit of force.', 'न्यूटन बल का मात्रक है।'
        ];

        const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);

        // Adjust column widths
        const wscols = headers.map(() => ({ wch: 20 }));
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");

        try {
            // Check if running on Android/iOS via Capacitor
            const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNative;

            if (isNative) {
                // Native Download Logic using Filesystem
                const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
                const fileName = `TRE_Prep_Template_${Date.now()}.xlsx`;

                // Dynamically import to avoid server-side issues (though this is client-side)
                const { Filesystem, Directory } = await import('@capacitor/filesystem');
                const { Share } = await import('@capacitor/share');

                // Write file to cache first
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: wbout,
                    directory: Directory.Cache
                });

                // Share the file so user can save it anywhere
                await Share.share({
                    title: 'Download Template',
                    text: 'Here is your Excel template for TRE Prep.',
                    url: result.uri,
                    dialogTitle: 'Save Template'
                });

                toast.success("Template Ready! Select where to save.");
            } else {
                // Web Fallback
                XLSX.writeFile(wb, "TRE_Prep_Template.xlsx");
                toast.success("Template downloaded!");
            }
        } catch (e) {
            console.error("Download failed", e);
            toast.error("Failed to download template. Please try again.");
        }
    };

    // --- FILE PARSING ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileStats({
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB'
        });

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

                parseData(data as any[][]);
            } catch (error) {
                console.error(error);
                toast.error("Failed to parse Excel file. Ensure valid format.");
            }
        };
        reader.readAsBinaryString(file);
    };

    const parseData = (rows: any[][]) => {
        // Skip header row (index 0)
        const questions: Question[] = [];

        // Expected Indexes based on template:
        // 0: Q(En), 1: Q(Hi)
        // 2: A(En), 3: A(Hi)
        // 4: B(En), 5: B(Hi)
        // 6: C(En), 7: C(Hi)
        // 8: D(En), 9: D(Hi)
        // 10: E(En), 11: E(Hi)
        // 12: Correct Option
        // 13: Exp(En), 14: Exp(Hi)

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row[0]) continue; // Skip empty rows

            const options: Option[] = [];
            const optionLetters = ['A', 'B', 'C', 'D', 'E'];

            // Iterate A though E (pairs of columns)
            for (let j = 0; j < 5; j++) {
                const enIdx = 2 + (j * 2);
                const hiIdx = enIdx + 1;

                if (row[enIdx]) {
                    options.push({
                        id: optionLetters[j],
                        text: {
                            en: String(row[enIdx]),
                            hi: String(row[hiIdx] || "") // Optional Hindi
                        }
                    });
                }
            }

            // Normalize Correct Option
            let correct = String(row[12] || "").trim().toUpperCase();
            // Handle if user typed "Option A" or just "A"
            if (correct.length > 1) correct = correct.charAt(correct.length - 1);
            if (!['A', 'B', 'C', 'D', 'E'].includes(correct)) correct = 'A'; // Default fallback

            const q: Question = {
                id: `excel_${Date.now()}_${i}`,
                number: i,
                content: {
                    en: String(row[0]),
                    hi: String(row[1] || "")
                },
                options,
                correctOptionId: correct,
                explanation: {
                    en: String(row[13] || ""),
                    hi: String(row[14] || "")
                }
            };
            questions.push(q);
        }

        if (questions.length === 0) {
            toast.error("No valid questions found!");
            return;
        }

        setParsedQuestions(questions);
        setStep('preview');
        toast.success(`Found ${questions.length} questions!`);
    };

    // --- FINISH ---
    const handleFinish = () => {
        if (!title.trim() || !subject.trim()) {
            toast.error("Please enter Title and Subject");
            return;
        }

        const newPaper: ExamPaper = {
            id: `excel_${Date.now()}`,
            title,
            subject,
            year: new Date().getFullYear(),
            examType: 'General',
            questions: parsedQuestions,
            status: 'published',
            createdAt: Date.now(),
            source: 'LOCAL'
        };

        StorageService.savePaper(newPaper);
        toast.success("Import Successful!");
        onComplete();
    };

    // --- RENDER ---
    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => {
                        if (step === 'upload') onBack();
                        else if (step === 'preview') setStep('upload');
                        else if (step === 'metadata') setStep('preview');
                    }} className="text-slate-400 hover:text-slate-600">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 leading-tight">Import from Excel</h2>
                        <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                            {step === 'upload' && 'Step 1: Upload File'}
                            {step === 'preview' && 'Step 2: Verify Content'}
                            {step === 'metadata' && 'Step 3: Paper Details'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">

                {/* STEP 1: UPLOAD */}
                {step === 'upload' && (
                    <div className="w-full max-w-2xl space-y-8 animate-in fade-in zoom-in duration-300">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm text-indigo-600">
                                <FileSpreadsheet size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-indigo-900">1. Download Template</h3>
                                <p className="text-indigo-600/80 text-sm max-w-xs mx-auto mt-2">Use our pre-formatted Excel sheet to ensure your questions are imported correctly.</p>
                            </div>
                            <button
                                onClick={downloadTemplate}
                                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 hover:scale-105 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 mx-auto"
                            >
                                <Download size={18} /> Download Template
                            </button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">Then</span>
                            </div>
                        </div>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-3 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-white rounded-3xl p-12 text-center cursor-pointer transition-all group"
                        >
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <div className="w-20 h-20 bg-slate-100 group-hover:bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors">
                                <Upload size={32} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-700 mb-2">Upload Completed Excel</h3>
                            <p className="text-slate-400 font-medium">Click to browse or drag file here</p>
                        </div>
                    </div>
                )}

                {/* STEP 2: PREVIEW */}
                {step === 'preview' && (
                    <div className="w-full max-w-3xl space-y-6 animate-in slide-in-from-right duration-300">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                                <CheckCircle size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-emerald-800">Parsed Successfully!</h4>
                                <p className="text-xs font-bold text-emerald-600">{parsedQuestions.length} valid questions found from {fileStats?.name}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {parsedQuestions.slice(0, 5).map((q, idx) => (
                                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm opacity-75 hover:opacity-100 transition-opacity">
                                    <div className="flex gap-4">
                                        <span className="font-bold text-slate-300">Q{idx + 1}</span>
                                        <div className="space-y-2 flex-1">
                                            <p className="font-bold text-slate-800">{q.content.en}</p>
                                            {q.content.hi && <p className="text-sm text-slate-500 font-medium">{q.content.hi}</p>}

                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                {q.options.map(opt => (
                                                    <div key={opt.id} className={`text-xs p-2 rounded border ${opt.id === q.correctOptionId ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                                        {opt.id}. {opt.text.en}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {parsedQuestions.length > 5 && (
                                <p className="text-center text-slate-400 font-bold text-xs uppercase tracking-widest py-4">
                                    + {parsedQuestions.length - 5} more questions
                                </p>
                            )}
                        </div>

                        <button
                            onClick={() => setStep('metadata')}
                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                        >
                            Looks Good, Continue
                        </button>
                    </div>
                )}

                {/* STEP 3: METADATA */}
                {step === 'metadata' && (
                    <div className="w-full max-w-xl space-y-6 animate-in slide-in-from-right duration-300 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-black text-slate-800">Final Details</h2>
                            <p className="text-slate-500">Name your imported papers.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Input Title / Name</label>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Science Class 10th Mock"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Subject</label>
                                <input
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="e.g. Science"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleFinish}
                            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2 mt-4"
                        >
                            <Save size={18} /> Complete Import
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ExcelImportWizard;
