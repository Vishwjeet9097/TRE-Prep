
import React, { useState } from 'react';
import { ArrowRight, Sparkles, CheckCircle2, Globe, ShieldCheck } from 'lucide-react';
import { UserProfile, UserService } from '../store';

interface OnboardingProps {
    onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);

    // Logo from public folder
    const logoSrc = "/logo.png";

    const handleNext = () => {
        setIsAnimating(true);
        setTimeout(() => {
            setStep(2);
            setIsAnimating(false);
        }, 300);
    };

    const handleFinish = () => {
        if (!name.trim()) return;

        const initials = name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

        const newProfile: UserProfile = {
            name,
            phone,
            location: '', // Optional logic to ask later
            initials,
            isBilingual: true,
            isOnboarded: true,
            apiKey: ''
        };

        UserService.saveProfile(newProfile);
        onComplete();
    };

    const openPortfolio = () => {
        window.open('https://vishwjeet.me/', '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#FAFAFA] font-sans overflow-hidden">

            {/* Full Screen Glass Noise/Texture - Optional for "Premium" feel without gradients */}
            <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl z-0 pointer-events-none" />

            {/* Main Full-Height Content */}
            <div className={`relative z-10 w-full h-full flex flex-col md:max-w-md md:mx-auto transition-all duration-700 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>

                {step === 1 ? (
                    /* STEP 1: WELCOME - Full Height */
                    <div className="flex-1 flex flex-col items-center p-8 xs:p-10 relative">

                        {/* Top Spacer */}
                        <div className="flex-[0.5]" />

                        {/* Hero Section */}
                        <div className="w-full flex flex-col items-center gap-10 text-center">

                            {/* Logo - Premium 3D Shadow */}
                            <div className="relative group perspective-1000">
                                <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center shadow-[0_30px_60px_-15px_rgba(79,70,229,0.25)] ring-1 ring-black/[0.04] transform transition-transform duration-500 hover:rotate-2 hover:scale-105">
                                    <img src={logoSrc} alt="App Logo" className="w-18 h-18 object-contain" />
                                </div>
                                {/* Subtle Floor Shadow */}
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-24 h-5 bg-indigo-900/10 blur-xl rounded-full" />
                            </div>

                            {/* Typography */}
                            <div className="space-y-3">
                                <span className="block text-lg font-bold text-slate-400 tracking-widest uppercase mb-2">
                                    Master Your
                                </span>
                                <h1 className="text-6xl font-black tracking-tight leading-none text-indigo-700 drop-shadow-sm">
                                    BPSC TRE
                                </h1>
                                <span className="block text-2xl font-bold text-slate-800 tracking-tight mt-1">
                                    Exam with AI
                                </span>
                            </div>

                            {/* Subtitle */}
                            <p className="text-slate-500 text-base font-medium leading-relaxed max-w-[280px]">
                                Your personalized AI tutor for smart preparation.
                            </p>
                        </div>

                        {/* Bottom Section */}
                        <div className="flex-1 w-full flex flex-col justify-end space-y-8 pb-10">

                            <button
                                onClick={handleNext}
                                className="w-full py-5 bg-[#1E1B4B] text-white rounded-[28px] font-bold text-xl hover:bg-[#312E81] hover:shadow-2xl hover:shadow-indigo-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1 shadow-lg"
                            >
                                <span>Get Started</span>
                                <ArrowRight size={22} className="text-indigo-200" />
                            </button>

                            <div
                                onClick={openPortfolio}
                                className="inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                            >
                                <span>Developed by</span>
                                <span className="border-b-2 border-slate-200 hover:border-indigo-600 transition-colors pb-0.5">Vishwjeet</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* STEP 2: PROFILE SETUP (Light Theme) */
                    <div className="flex-1 flex flex-col justify-center px-8 md:px-12 py-10 relative space-y-10">
                        <div className="space-y-4 text-center">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-100 text-indigo-600 ring-1 ring-black/5">
                                <ShieldCheck size={32} />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900">Setup Profile</h2>
                            <p className="text-slate-500 font-medium">Your data stays on this device.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Your Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Vishwjeet Kumar"
                                    className="w-full px-6 py-5 bg-white border-0 ring-1 ring-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all text-lg font-semibold"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Phone <span className="text-[10px] opacity-60 normal-case">(Optional)</span></label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+91 ...."
                                    className="w-full px-6 py-5 bg-white border-0 ring-1 ring-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all text-lg font-semibold"
                                />
                            </div>
                        </div>

                        <div className="pt-8 space-y-6">
                            <button
                                onClick={handleFinish}
                                disabled={!name.trim()}
                                className={`w-full py-5 rounded-3xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-xl ${name.trim()
                                    ? 'bg-slate-900 text-white shadow-slate-900/20 hover:bg-slate-800'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                Start Learning
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Re-using simplified Feature Pill (though not used in Step 1 now to reduce info)
const FeaturePill = ({ icon, text }: { icon: any, text: string }) => null;

export default Onboarding;
