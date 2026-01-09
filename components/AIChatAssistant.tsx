
import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Mic,
  X,
  Send,
  Sparkles,
  Loader2,
  Minimize2,
  Maximize2,
  BrainCircuit,
  Languages,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  LogOut,
  ChevronRight,
  Trophy,
  ChevronDown,
  ChevronUp,
  FileText,
  Lightbulb,
  Check
} from 'lucide-react';

import { GoogleGenAI, Modality } from '@google/genai';
import { StorageService } from '../store';
import { Question } from '../types';

interface Message {
  role: 'user' | 'model';
  text: string;
  type?: 'text' | 'quiz' | 'result' | 'onboarding';
  quizData?: {
    question: string;
    options: { id: string; text: string }[];
    localData?: {
      correctOptionId: string;
      explanation: string;
    };
  };
  resultData?: {
    isCorrect: boolean;
    correctOption: string;
    explanation: string;
    userChoice?: string;
  };
}

type OnboardingStep = 'language' | 'subject' | 'ready';

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

const BPSC_TRE_4_SYSTEM_PROMPT = `You are a premium, professional BPSC TRE 4.0 (2026) specialist AI Tutor. 
You possess deep expertise in the Bihar Teacher Recruitment Examination structure and syllabus.

EXAM CONTEXT (TRE 4.0 - 2026):
- Total Questions: 150 | Total Marks: 150 | Time: 150 Mins.
- Negative Marking: NONE (0 marks deducted for wrong answers).
- Part I: Language (30 Qs) - 8 English (compulsory), 22 Hindi/Urdu/Bengali. Qualifying: 30% (9 marks).
- Part II: General Studies (40 Qs) - Elementary Math, Reasoning, Science, INM (History), Geography, Current Affairs.
- Part III: Concerned Subject (80 Qs) - Specialized knowledge for Classes 6-8, 9-10, or 11-12.

SYLLABUS FOCUS:
- Part II: Focus on Indian National Movement (Bihar's role), SCERT/NCERT Science, and Mental Ability.
- Part III Computer Science: Architecture, OS, Python/C++, DBMS/SQL, Networking, and Cyber Laws (IT Act).

STRICT INTERACTION PROTOCOL:
1. QUIZ GENERATION: Use only professional, BPSC-standard terminology. Output:
   **Question:** [Detailed question text]
   A) [Option A]
   B) [Option B]
   C) [Option C]
   D) More than one of the above
   E) None of the above
   
2. EVALUATION:
   **CORRECT** or **INCORRECT**.
   The correct answer is **[X]) [Text]**.
   **Explanation:** [Concise but deep pedagogical reasoning mentioning SCERT/NCERT context].

Tone: Authoritative, supportive, and highly focused on Bihar-specific exam nuances.`;

const AIChatAssistant: React.FC<{ initialContext?: string; variant?: 'floating' | 'full-page' }> = ({ initialContext, variant = 'floating' }) => {
  const [isOpen, setIsOpen] = useState(variant === 'full-page');
  const [isMinimized, setIsMinimized] = useState(false);
  const [mode, setMode] = useState<'chat' | 'voice'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [showBubble, setShowBubble] = useState(false);

  const [step, setStep] = useState<OnboardingStep>('language');
  const [selectedLang, setSelectedLang] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [lastQuiz, setLastQuiz] = useState<Message['quizData'] | null>(null);
  const [showExplanationId, setShowExplanationId] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<any>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (variant === 'full-page') {
      setIsOpen(true);
      setIsMinimized(false);
    }
  }, [variant]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'model',
        text: "Namaste! I am your AI Smart Tutor for BPSC TRE 4.0 (2026). Let's customize your study plan.",
        type: 'onboarding'
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialContext) {
      if (variant === 'floating') setIsOpen(true);
      setIsMinimized(false);
      handleSendMessage(initialContext);
    }
  }, [initialContext]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && variant === 'floating') {
      setShowBubble(false);
      return;
    }

    if (variant === 'full-page' || isOpen) return;

    const startLoop = () => {
      // Show immediately (or after short delay)
      setShowBubble(true);

      // Hide after 3s
      const hideTimer = setTimeout(() => {
        setShowBubble(false);

        // Schedule next appearance after 30s
        const nextLoopTimer = setTimeout(() => {
          startLoop();
        }, 30000);

        return () => clearTimeout(nextLoopTimer);
      }, 3000);

      return () => clearTimeout(hideTimer);
    };

    // Initial start delay
    const initialTimer = setTimeout(startLoop, 2000);
    return () => clearTimeout(initialTimer);
  }, [isOpen, variant]);

  const getRandomLocalQuestion = (): Message | null => {
    const papers = StorageService.getPapers();
    const allQuestions = papers.flatMap(p => p.questions);

    if (allQuestions.length === 0) return null;

    const randomQ = allQuestions[Math.floor(Math.random() * allQuestions.length)];
    const lang = selectedLang === 'Hindi' ? 'hi' : 'en';

    return {
      role: 'model',
      text: "Here is a practice question from your imported papers (Offline Mode):",
      type: 'quiz',
      quizData: {
        question: randomQ.content[lang] || randomQ.content['en'],
        options: randomQ.options.map(o => ({
          id: o.id,
          text: o.text[lang] || o.text['en']
        })),
        localData: {
          correctOptionId: randomQ.correctOptionId,
          explanation: randomQ.explanation[lang] || randomQ.explanation['en']
        }
      }
    };
  };

  const parseQuizFromText = (text: string) => {
    const questionHeader = "**Question:**";
    const headerIndex = text.indexOf(questionHeader);
    if (headerIndex === -1) return null;

    const contentAfterHeader = text.substring(headerIndex + questionHeader.length);
    const firstOptionIndex = contentAfterHeader.search(/\n\s*[A-E]\)/);
    if (firstOptionIndex === -1) return null;

    const questionText = contentAfterHeader.substring(0, firstOptionIndex).trim();
    const optionsBlock = contentAfterHeader.substring(firstOptionIndex);

    const options: { id: string; text: string }[] = [];
    const optionMatches = [...optionsBlock.matchAll(/([A-E])\)\s*(.*?)(?=\n\s*[A-E]\)|$)/gs)];

    if (optionMatches.length >= 4) {
      optionMatches.forEach(m => options.push({ id: m[1].toUpperCase(), text: m[2].trim() }));
      return { question: questionText, options };
    }
    return null;
  };

  const parseResultFromText = (text: string, userChoice: string) => {
    const upperText = text.toUpperCase();
    const isCorrect = upperText.includes('**CORRECT**') || (upperText.includes('CORRECT ANSWER') && !upperText.includes('INCORRECT'));
    const correctOptionMatch = text.match(/(?:correct answer is|answer:?)\s*\**([A-E])\)?\**/i);
    const explanationMatch = text.match(/\*\*Explanation:\*\*\s*(.*)/is);

    if (correctOptionMatch) {
      return {
        isCorrect,
        correctOption: correctOptionMatch[1].toUpperCase(),
        explanation: explanationMatch ? explanationMatch[1].trim() : "Deep logic review required.",
        userChoice: userChoice.toUpperCase()
      };
    }
    return null;
  };

  const handleSendMessage = async (customText?: string) => {
    const text = (customText || inputText).trim();
    if (!text) return;

    const userMsg: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInputText('');

    // Check if answering a local question
    if (lastQuiz?.localData) {
      if (text.toLowerCase().includes('next') || text.toLowerCase().includes('question') || text.toLowerCase().includes('quiz')) {
        const localQ = getRandomLocalQuestion();
        if (localQ) {
          setLastQuiz(localQ.quizData || null);
          setMessages(prev => [...prev, localQ]);
          return;
        }
      }

      const selectedId = text.toUpperCase().match(/([A-E])/)?.[1] || text.toUpperCase();
      const reallyCorrect = selectedId === lastQuiz.localData.correctOptionId;

      const resultMsg: Message = {
        role: 'model',
        text: `You selected ${selectedId}.`,
        type: 'result',
        resultData: {
          isCorrect: reallyCorrect,
          correctOption: lastQuiz.localData.correctOptionId,
          explanation: lastQuiz.localData.explanation,
          userChoice: selectedId
        }
      };

      setTimeout(() => {
        setMessages(prev => [...prev, resultMsg]);
      }, 500);
      return;
    }

    setIsTyping(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [...messages, userMsg].map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
        config: {
          systemInstruction: `${BPSC_TRE_4_SYSTEM_PROMPT}\nUser Preference: Language: ${selectedLang || 'English'}, Subject: ${selectedSubject || 'General Studies'}.`
        }
      });

      const aiText = response.text || "";
      const resultData = parseResultFromText(aiText, text);
      const quizData = parseQuizFromText(aiText);

      const aiMsg: Message = {
        role: 'model',
        text: aiText,
        type: resultData ? 'result' : quizData ? 'quiz' : 'text',
        quizData: quizData || undefined,
        resultData: resultData || undefined
      };

      if (quizData) setLastQuiz(quizData);
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);

      // Fallback for Quota Exceeded (429)
      if (err.toString().includes('429') || err.message?.includes('Quota exceeded') || JSON.stringify(err).includes('429')) {
        const localQ = getRandomLocalQuestion();
        if (localQ) {
          setLastQuiz(localQ.quizData || null);
          setMessages(prev => [...prev, { role: 'model', text: "API Quota Exceeded. Switching to Offline Mode... Here is a question from your imported papers:" }, localQ]);
        } else {
          setMessages(prev => [...prev, { role: 'model', text: "API Limit Reached and no local papers found. Please import a PDF to continue practicing." }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'model', text: "Service busy. Please try again." }]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleOnboardingAction = (type: 'language' | 'subject', value: string) => {
    if (type === 'language') {
      setSelectedLang(value);
      setStep('subject');
      setMessages(prev => [...prev, { role: 'user', text: value }, {
        role: 'model',
        text: `Language set to ${value}. Now, choose your target subject for TRE 4.0.`,
        type: 'onboarding'
      }]);
    } else {
      setSelectedSubject(value);
      setStep('ready');
      setMessages(prev => [...prev, { role: 'user', text: value }, {
        role: 'model',
        text: `Excellent. Configured for ${value}. Let's master the 2026 exam together!`
      }]);
    }
  };

  const startVoiceSession = async () => {
    try {
      setIsVoiceActive(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      let nextStartTime = 0;
      const sources = new Set<AudioBufferSourceNode>();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (m: any) => {
            const data = m.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (data && outputAudioContextRef.current) {
              const buffer = await decodeAudioData(decode(data), outputAudioContextRef.current, 24000, 1);
              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = buffer;
              source.connect(outputAudioContextRef.current.destination);
              nextStartTime = Math.max(nextStartTime, outputAudioContextRef.current.currentTime);
              source.start(nextStartTime);
              nextStartTime += buffer.duration;
              sources.add(source);
            }
          },
          onclose: () => stopVoiceSession()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are the BPSC TRE 4.0 Voice Mentor. Act professionally. ${BPSC_TRE_4_SYSTEM_PROMPT}`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) { console.error(e); stopVoiceSession(); }
  };

  const stopVoiceSession = () => {
    setIsVoiceActive(false);
    if (sessionRef.current) sessionRef.current.close();
    if (inputAudioContextRef.current) inputAudioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    setMode('chat');
  };

  useEffect(() => {
    if (isOpen && variant === 'floating') {
      setShowBubble(false);
      return;
    }

    if (variant === 'full-page' || isOpen) return;

    const startLoop = () => {
      // Show immediately (or after short delay)
      setShowBubble(true);

      // Hide after 3s
      const hideTimer = setTimeout(() => {
        setShowBubble(false);

        // Schedule next appearance after 30s
        const nextLoopTimer = setTimeout(() => {
          startLoop();
        }, 30000);

        return () => clearTimeout(nextLoopTimer);
      }, 3000);

      return () => clearTimeout(hideTimer);
    };

    // Initial start delay
    const initialTimer = setTimeout(startLoop, 2000);
    return () => clearTimeout(initialTimer);
  }, [isOpen]);

  if (variant === 'floating' && !isOpen) return (
    <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[100] flex flex-col items-end gap-4 pointer-events-none">
      {/* Engagement Bubble */}
      <div className={`transition-all duration-500 transform ${showBubble ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'} origin-bottom-right`}>
        <div className="bg-white px-5 py-3 rounded-2xl rounded-tr-sm shadow-xl border border-indigo-50 relative pointer-events-auto max-w-[200px]">
          <p className="text-xs font-bold text-slate-700 leading-snug">
            Hey! I'm your <span className="text-indigo-600 font-black">AI Tutor</span>. Ready to study?
          </p>
          {/* Tail */}
          <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white rotate-45 border-b border-r border-indigo-50 shadow-sm"></div>
        </div>
      </div>

      <button
        onClick={() => setIsOpen(true)}
        className="w-14 h-14 md:w-16 md:h-16 bg-white text-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 hover:scale-110 transition-all animate-bounce overflow-hidden border-2 border-white pointer-events-auto"
      >
        <img src="/logo.png" alt="AI" className="w-full h-full object-cover" />
      </button>
    </div>
  );

  const containerClasses = variant === 'full-page'
    ? "w-full h-full flex flex-col bg-[#F9FBFF] relative overflow-hidden"
    : `fixed z-[200] transition-all duration-300 ease-in-out bg-white overflow-hidden shadow-2xl border border-slate-200 flex flex-col font-sans ${isMinimized
      ? 'bottom-24 right-4 w-16 h-16 md:bottom-8 md:right-8 md:w-64 md:h-16 rounded-[2rem]'
      : 'inset-0 md:inset-auto md:bottom-8 md:right-8 md:w-[520px] md:h-[760px] md:max-h-[90vh] rounded-none md:rounded-[3rem]'}`;

  const headerClasses = variant === 'full-page'
    ? "relative shrink-0 flex items-center justify-between text-white overflow-hidden transition-all duration-300 h-20 md:h-24 bg-indigo-600 px-8 lg:px-12 shadow-md z-30"
    : `relative shrink-0 flex items-center justify-between text-white overflow-hidden transition-all duration-300 ${isMinimized ? 'h-full px-0 justify-center md:px-6 md:justify-between bg-indigo-600' : 'h-16 md:h-24 bg-indigo-600 px-4 md:px-6'}`;

  return (
    <div className={containerClasses}>
      {/* Premium Header */}
      <div className={headerClasses}>

        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 blur-3xl rounded-full -mr-40 -mt-40 pointer-events-none" />

        {isMinimized && variant === 'floating' ? (
          <div onClick={() => setIsMinimized(false)} className="absolute inset-0 flex items-center justify-center md:justify-between px-4 cursor-pointer gap-3">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="AI" className="w-8 h-8 rounded-lg shadow-lg border border-white/20" />
              <span className="hidden md:block font-black text-sm tracking-widest text-white">AI TUTOR</span>
            </div>
            <Maximize2 size={20} className="md:hidden" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-9 h-9 md:w-12 md:h-12 bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl flex items-center justify-center border border-white/20 shadow-inner overflow-hidden p-1">
                <img src="/logo.png" alt="AI" className="w-full h-full object-cover rounded-lg md:rounded-xl shadow-sm" />
              </div>
              <div>
                <h4 className="font-black text-sm md:text-xl tracking-tight leading-none">BPSC AI</h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                  <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Online</p>
                </div>
              </div>
            </div>
            {variant === 'floating' && (
              <div className="flex items-center gap-1 relative z-10">
                <button onClick={() => setIsMinimized(true)} className="p-2 md:p-3 hover:bg-white/10 rounded-xl transition-all">
                  <Minimize2 size={18} className="md:w-5 md:h-5" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2 md:p-3 hover:bg-white/10 rounded-xl transition-all">
                  <X size={18} className="md:w-5 md:h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {!isMinimized && (
        <>

          {/* Mode Switcher - Only for Floating Variant */}
          {variant === 'floating' && (
            <div className="flex bg-slate-50/80 p-1.5 md:p-2 border-b border-slate-100 shrink-0 gap-2">
              <button onClick={() => setMode('chat')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 md:py-3.5 text-[10px] md:text-[11px] font-black tracking-[0.2em] rounded-xl md:rounded-2xl transition-all ${mode === 'chat' ? 'bg-white text-indigo-600 shadow-md border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                <MessageSquare size={14} /> CHAT
              </button>
              <button onClick={() => { setMode('voice'); startVoiceSession(); }} className={`flex-1 flex items-center justify-center gap-2 py-2.5 md:py-3.5 text-[10px] md:text-[11px] font-black tracking-[0.2em] rounded-xl md:rounded-2xl transition-all ${mode === 'voice' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
                <Mic size={14} /> VOICE
              </button>
            </div>
          )}

          <div className="flex-1 overflow-hidden flex flex-col bg-[#F9FBFF] w-full relative">
            {mode === 'chat' ? (
              <>
                <div ref={scrollRef} className={`flex-1 overflow-y-auto ${variant === 'full-page' ? 'w-full max-w-5xl mx-auto px-6 py-8 md:px-12 md:py-12' : 'p-4 md:p-6'} space-y-6 md:space-y-12 no-scrollbar pb-32 md:pb-32`}>
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start md:pr-12'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                      <div className={`max-w-[85%] md:max-w-[90%] ${m.role === 'user' ? 'bg-indigo-600 text-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] rounded-tr-none shadow-md' : 'w-full'}`}>
                        {m.role === 'user' ? (
                          <p className="font-medium text-sm md:text-base leading-relaxed">{m.text}</p>
                        ) : (
                          <div className="space-y-6">
                            {/* Standard Message */}
                            {(!m.type || m.type === 'text') && (
                              <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-200 shadow-sm">
                                {m.text.split('\n').map((line, idx) => (
                                  <p key={idx} className={`${idx > 0 ? 'mt-3 md:mt-4' : ''} text-sm md:text-base leading-relaxed font-medium text-slate-700`}>{line}</p>
                                ))}
                              </div>
                            )}

                            {/* Onboarding UI */}
                            {m.type === 'onboarding' && (
                              <div className="space-y-4 md:space-y-6">
                                <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-sm font-bold text-slate-700 leading-relaxed text-sm md:text-lg">{m.text}</div>
                                <div className="grid grid-cols-2 gap-3 md:gap-4">
                                  {step === 'language' ? (
                                    ['English', 'Hindi'].map(l => (
                                      <SelectionCard key={l} icon={<Languages size={18} />} label={l} onClick={() => handleOnboardingAction('language', l)} />
                                    ))
                                  ) : step === 'subject' ? (
                                    ['General Studies', 'Computer Science', 'History', 'Physics'].map(s => (
                                      <SelectionCard key={s} icon={<BookOpen size={18} />} label={s} onClick={() => handleOnboardingAction('subject', s)} />
                                    ))
                                  ) : null}
                                </div>
                              </div>
                            )}

                            {/* Quiz Interface */}
                            {m.type === 'quiz' && m.quizData && (
                              <div className="bg-white p-5 md:p-10 rounded-2xl md:rounded-[3rem] shadow-sm border border-slate-100 space-y-6 md:space-y-10">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-50 text-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center">
                                    <FileText size={16} className="md:w-5 md:h-5" />
                                  </div>
                                  <span className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">TRE 4.0 Challenge</span>
                                </div>
                                <h3 className="font-black text-slate-900 text-lg md:text-2xl leading-snug tracking-tight whitespace-pre-wrap">{m.quizData.question}</h3>
                                <div className="grid grid-cols-1 gap-3 md:gap-4">
                                  {m.quizData.options.map(opt => (
                                    <button
                                      key={opt.id}
                                      onClick={() => handleSendMessage(opt.id)}
                                      className="group w-full p-4 md:p-6 rounded-xl md:rounded-[2rem] border-2 border-slate-50 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left flex items-start gap-4 md:gap-5"
                                    >
                                      <span className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white rounded-xl md:rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-all border border-slate-100">
                                        {opt.id}
                                      </span>
                                      <span className="font-bold text-slate-700 group-hover:text-indigo-950 pt-2 text-sm md:text-lg transition-colors leading-snug">{opt.text}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Result Analysis */}
                            {m.type === 'result' && m.resultData && lastQuiz && (
                              <div className="bg-white rounded-2xl md:rounded-[3rem] border border-slate-200 overflow-hidden shadow-xl md:shadow-2xl">
                                <div className={`px-5 py-4 md:p-8 flex items-center justify-between ${m.resultData.isCorrect ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-100' : 'bg-rose-50 text-rose-700 border-b border-rose-100'}`}>
                                  <div className="flex items-center gap-3 md:gap-4">
                                    {m.resultData.isCorrect ? <CheckCircle2 size={24} className="md:w-[28px]" /> : <XCircle size={24} className="md:w-[28px]" />}
                                    <span className="font-black text-[10px] md:text-sm uppercase tracking-[0.2em] md:tracking-[0.3em]">{m.resultData.isCorrect ? 'Correct Solved' : 'Review Attempt'}</span>
                                  </div>
                                </div>

                                <div className="p-5 md:p-10 space-y-6 md:space-y-8">
                                  <div className="space-y-2 md:space-y-3">
                                    {lastQuiz.options.map(opt => {
                                      const isCorrect = opt.id === m.resultData?.correctOption;
                                      const isUserChoice = opt.id === m.resultData?.userChoice;
                                      let borderClass = "border-slate-50 bg-slate-50/20 opacity-30";
                                      let badgeClass = "bg-slate-100 text-slate-400";

                                      if (isCorrect) {
                                        borderClass = "border-emerald-500 bg-emerald-50 shadow-md ring-1 ring-emerald-200 opacity-100";
                                        badgeClass = "bg-emerald-600 text-white";
                                      } else if (isUserChoice && !isCorrect) {
                                        borderClass = "border-rose-500 bg-rose-50 opacity-100";
                                        badgeClass = "bg-rose-600 text-white";
                                      }

                                      return (
                                        <div key={opt.id} className={`p-4 md:p-5 rounded-xl md:rounded-2xl border-2 flex items-start gap-4 md:gap-5 transition-all duration-500 ${borderClass}`}>
                                          <span className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center font-black text-xs md:text-sm shrink-0 ${badgeClass}`}>
                                            {opt.id}
                                          </span>
                                          <span className="font-bold text-slate-800 text-sm md:text-base pt-1 md:pt-2">{opt.text}</span>
                                          {isCorrect && <Check size={18} className="ml-auto text-emerald-600 md:w-5 md:h-5" />}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <div className="pt-4 md:pt-6 border-t border-slate-100 space-y-4">
                                    <button
                                      onClick={() => setShowExplanationId(showExplanationId === i ? null : i)}
                                      className="w-full flex items-center justify-between p-4 md:p-5 bg-slate-900 text-white rounded-2xl md:rounded-3xl hover:bg-slate-800 transition-all group"
                                    >
                                      <div className="flex items-center gap-3 md:gap-4">
                                        <Lightbulb size={18} className="text-amber-400 md:w-5 md:h-5" />
                                        <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.25em]">2026 Strategy Insight</span>
                                      </div>
                                      {showExplanationId === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>

                                    {showExplanationId === i && (
                                      <div className="p-6 md:p-8 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-100 animate-in slide-in-from-top-4 duration-300">
                                        <p className="text-sm md:text-base font-bold leading-relaxed text-slate-600 whitespace-pre-wrap">
                                          {m.resultData.explanation}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 gap-3 md:gap-4 pt-2">
                                    <ActionButton icon={<ArrowRight size={16} />} label="Next" onClick={() => handleSendMessage("Ask me next practice question")} primary className="w-full h-12 md:h-16" />
                                    <ActionButton icon={<LogOut size={16} />} label="Finish" onClick={() => setMessages(prev => [...prev, { role: 'model', text: "Excellent practice session. Review your progress in the history tab!" }])} danger className="h-12 md:h-16" />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Ready Menu */}
                  {!isTyping && step === 'ready' && messages[messages.length - 1]?.role === 'model' && !messages[messages.length - 1].quizData && !messages[messages.length - 1].resultData && (
                    <div className="flex flex-wrap gap-2 md:gap-3">
                      <ActionButton icon={<Sparkles size={14} className="md:w-4 md:h-4" />} label="Start BPSC Quiz" onClick={() => handleSendMessage("Give me a BPSC practice question")} primary />
                      <ActionButton icon={<BrainCircuit size={14} className="md:w-4 md:h-4" />} label="2026 Syllabus" onClick={() => handleSendMessage("Explain the key topics of this subject for BPSC TRE 4.0")} />
                    </div>
                  )}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 px-6 py-4 rounded-[1.5rem] rounded-tl-none shadow-sm flex gap-2">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Fixed Input Area for Mobile & Desktop */}
                <div className={`absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-white/80 backdrop-blur-xl border-t border-indigo-50 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-20 flex justify-center`}>
                  <div className={`flex gap-3 md:gap-5 w-full ${variant === 'full-page' ? 'max-w-4xl' : ''}`}>
                    <div className="flex-1 relative group">
                      <div className="absolute inset-0 bg-indigo-500/5 rounded-2xl md:rounded-[1.5rem] blur-sm group-focus-within:blur-md transition-all duration-500 opacity-50" />
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={variant === 'full-page' ? "Ask anything about BPSC TRE 4.0 (Syllabus, Questions, Strategy)..." : "Ask about TRE-4.0..."}
                        className="w-full bg-white relative border border-slate-200 rounded-2xl md:rounded-[1.5rem] pl-5 md:pl-8 pr-12 md:pr-24 py-3.5 md:py-5 text-sm md:text-lg font-medium text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 shadow-sm"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 h-8 flex items-center gap-2 px-3 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-400 select-none uppercase hidden md:flex">
                        <span>Enter</span>
                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                        <Send size={12} />
                      </div>
                    </div>
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!inputText.trim()}
                      className="w-12 h-12 md:w-[4.5rem] md:h-[4.5rem] bg-indigo-600 text-white rounded-xl md:rounded-[1.5rem] flex items-center justify-center hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                      <ArrowRight size={24} className="md:w-[28px] relative z-10" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-14 text-center space-y-8 md:space-y-14 bg-slate-900 text-white relative h-full">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent opacity-70 pointer-events-none" />
                <div className="relative">
                  <div className={`w-40 h-40 md:w-64 md:h-64 rounded-full bg-indigo-500/5 flex items-center justify-center ${isVoiceActive ? 'animate-pulse' : ''}`}>
                    <div className={`w-32 h-32 md:w-48 md:h-48 rounded-full bg-indigo-500/10 flex items-center justify-center ${isVoiceActive ? 'animate-ping duration-[6000ms]' : ''}`}>
                      <div className="w-20 h-20 md:w-32 md:h-32 bg-indigo-600 rounded-[2rem] md:rounded-[3rem] flex items-center justify-center shadow-[0_0_100px_rgba(79,70,229,0.8)] relative z-10">
                        <Mic size={32} className={`md:w-[56px] ${isVoiceActive ? 'animate-pulse' : ''}`} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 md:space-y-6">
                  <h3 className="text-2xl md:text-4xl font-black tracking-tight">AI Listening</h3>
                  <p className="text-xs md:text-base text-slate-400 font-bold max-w-[240px] md:max-w-[300px] mx-auto leading-relaxed opacity-70 italic">Speak freely about BPSC TRE 2026. I'm ready to evaluate your spoken answers.</p>
                </div>
                <button onClick={stopVoiceSession} className="px-8 py-4 md:px-16 md:py-6 bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl font-black text-[9px] md:text-[11px] tracking-[0.3em] md:tracking-[0.4em] hover:bg-red-500 hover:text-white transition-all group flex items-center gap-3 md:gap-5">
                  <X size={16} className="group-hover:rotate-90 transition-transform md:w-5 md:h-5" /> END SESSION
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const SelectionCard = ({ icon, label, onClick }: any) => (
  <button
    onClick={onClick}
    className="bg-white border-2 border-slate-100 p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] hover:border-indigo-500 hover:bg-indigo-50/50 transition-all flex flex-col items-center gap-3 md:gap-4 shadow-sm group w-full"
  >
    <div className="p-4 md:p-6 bg-slate-50 rounded-xl md:rounded-2xl text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all scale-100 md:scale-110">
      {icon}
    </div>
    <span className="font-black text-slate-800 text-xs md:text-base text-center">{label}</span>
  </button>
);

const ActionButton = ({ icon, label, onClick, primary, danger, className }: any) => (
  <button
    onClick={onClick}
    className={`px-4 py-3 md:px-7 md:py-5 rounded-xl md:rounded-[1.5rem] text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.25em] flex items-center justify-center gap-2 md:gap-4 transition-all shadow-md active:scale-95 whitespace-nowrap ${primary
      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
      : danger
        ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white'
        : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 shadow-slate-100'
      } ${className}`}
  >
    {icon} {label}
  </button>
);

export default AIChatAssistant;
