
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

interface Message {
  role: 'user' | 'model';
  text: string;
  type?: 'text' | 'quiz' | 'result' | 'onboarding';
  quizData?: {
    question: string;
    options: { id: string; text: string }[];
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

const AIChatAssistant: React.FC<{ initialContext?: string }> = ({ initialContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [mode, setMode] = useState<'chat' | 'voice'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  
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
      setIsOpen(true);
      setIsMinimized(false);
      handleSendMessage(initialContext);
    }
  }, [initialContext]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

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
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: "Service busy. Please try again." }]);
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

  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-2xl hover:bg-indigo-700 transition-all animate-bounce"
    >
      <BrainCircuit size={32} />
    </button>
  );

  return (
    <div className={`fixed bottom-8 right-8 z-[100] flex flex-col transition-all duration-500 ease-in-out ${isMinimized ? 'h-16 w-64' : 'h-[760px] w-[520px] max-w-[95vw]'} bg-white rounded-[3rem] shadow-[0_60px_160px_-40px_rgba(0,0,0,0.45)] border border-slate-200 overflow-hidden`}>
      {/* Header */}
      <div className="h-24 bg-indigo-600 p-6 flex items-center justify-between text-white shrink-0 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 blur-3xl rounded-full -mr-40 -mt-40" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-2xl rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
            <BrainCircuit size={28} className="text-white" />
          </div>
          <div>
            <h4 className="font-black text-xl tracking-tight leading-none">BPSC TRE 4.0 AI</h4>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">TRE 2026 Specialist</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 relative z-10">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-3 hover:bg-white/10 rounded-2xl transition-all">
            {isMinimized ? <Maximize2 size={20} /> : <Minimize2 size={20} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-all">
            <X size={20} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="flex bg-slate-50/80 p-2 border-b border-slate-100 shrink-0">
            <button onClick={() => setMode('chat')} className={`flex-1 flex items-center justify-center gap-3 py-3.5 text-[11px] font-black tracking-[0.2em] rounded-2xl transition-all ${mode === 'chat' ? 'bg-white text-indigo-600 shadow-md border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
              <MessageSquare size={14} /> TEXT STUDY
            </button>
            <button onClick={() => { setMode('voice'); startVoiceSession(); }} className={`flex-1 flex items-center justify-center gap-3 py-3.5 text-[11px] font-black tracking-[0.2em] rounded-2xl transition-all ${mode === 'voice' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
              <Mic size={14} /> VOICE LIVE
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col bg-[#F9FBFF]">
            {mode === 'chat' ? (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-12 no-scrollbar">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                      <div className={`max-w-[94%] ${m.role === 'user' ? 'bg-indigo-600 text-white p-6 rounded-[2.5rem] rounded-tr-none shadow-2xl' : 'w-full'}`}>
                        {m.role === 'user' ? (
                          <p className="font-bold text-base leading-relaxed">{m.text}</p>
                        ) : (
                          <div className="space-y-8">
                            {/* Onboarding UI */}
                            {m.type === 'onboarding' && (
                              <div className="space-y-8">
                                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm font-bold text-slate-700 leading-relaxed text-lg">{m.text}</div>
                                <div className="grid grid-cols-2 gap-4">
                                  {step === 'language' ? (
                                    ['English', 'Hindi'].map(l => (
                                      <SelectionCard key={l} icon={<Languages size={24}/>} label={l} onClick={() => handleOnboardingAction('language', l)} />
                                    ))
                                  ) : step === 'subject' ? (
                                    ['General Studies', 'Computer Science', 'History', 'Physics'].map(s => (
                                      <SelectionCard key={s} icon={<BookOpen size={24}/>} label={s} onClick={() => handleOnboardingAction('subject', s)} />
                                    ))
                                  ) : null}
                                </div>
                              </div>
                            )}

                            {/* Quiz Interface */}
                            {m.type === 'quiz' && m.quizData && (
                              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-10 animate-in zoom-in-95 duration-500">
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                      <FileText size={20} />
                                   </div>
                                   <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">TRE 4.0 Challenge</span>
                                </div>
                                <h3 className="font-black text-slate-900 text-2xl leading-[1.3] tracking-tight whitespace-pre-wrap">{m.quizData.question}</h3>
                                <div className="grid grid-cols-1 gap-4">
                                  {m.quizData.options.map(opt => (
                                    <button 
                                      key={opt.id}
                                      onClick={() => handleSendMessage(opt.id)}
                                      className="group w-full p-6 rounded-[2rem] border-2 border-slate-50 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left flex items-start gap-5"
                                    >
                                      <span className="w-12 h-12 bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-all border border-slate-100">
                                        {opt.id}
                                      </span>
                                      <span className="font-bold text-slate-700 group-hover:text-indigo-950 pt-2.5 text-lg transition-colors leading-snug">{opt.text}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Result Analysis */}
                            {m.type === 'result' && m.resultData && lastQuiz && (
                              <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 duration-500">
                                <div className={`p-8 flex items-center justify-between ${m.resultData.isCorrect ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-100' : 'bg-rose-50 text-rose-700 border-b border-rose-100'}`}>
                                  <div className="flex items-center gap-4">
                                    {m.resultData.isCorrect ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
                                    <span className="font-black text-sm uppercase tracking-[0.3em]">{m.resultData.isCorrect ? 'Correct Solved' : 'Review Attempt'}</span>
                                  </div>
                                  <Trophy size={24} className="opacity-40" />
                                </div>

                                <div className="p-10 space-y-8">
                                   <div className="space-y-3">
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
                                          <div key={opt.id} className={`p-5 rounded-2xl border-2 flex items-start gap-5 transition-all duration-500 ${borderClass}`}>
                                            <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${badgeClass}`}>
                                              {opt.id}
                                            </span>
                                            <span className="font-bold text-slate-800 text-base pt-2">{opt.text}</span>
                                            {isCorrect && <Check size={20} className="ml-auto text-emerald-600" />}
                                          </div>
                                        );
                                      })}
                                   </div>

                                   <div className="pt-6 border-t border-slate-100 space-y-4">
                                      <button 
                                        onClick={() => setShowExplanationId(showExplanationId === i ? null : i)}
                                        className="w-full flex items-center justify-between p-5 bg-slate-900 text-white rounded-3xl hover:bg-slate-800 transition-all group"
                                      >
                                        <div className="flex items-center gap-4">
                                          <Lightbulb size={20} className="text-amber-400" />
                                          <span className="text-[11px] font-black uppercase tracking-[0.25em]">2026 Strategy Insight</span>
                                        </div>
                                        {showExplanationId === i ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                      </button>
                                      
                                      {showExplanationId === i && (
                                        <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 animate-in slide-in-from-top-4 duration-300">
                                          <p className="text-base font-bold leading-relaxed text-slate-600 whitespace-pre-wrap">
                                            {m.resultData.explanation}
                                          </p>
                                        </div>
                                      )}
                                   </div>

                                   <div className="grid grid-cols-2 gap-4 pt-4">
                                      <ActionButton icon={<ArrowRight size={18}/>} label="Next Question" onClick={() => handleSendMessage("Ask me next practice question")} primary className="w-full h-16" />
                                      <ActionButton icon={<LogOut size={18}/>} label="Finish Lesson" onClick={() => setMessages(prev => [...prev, { role: 'model', text: "Excellent practice session. Review your progress in the history tab!" }])} danger className="h-16" />
                                   </div>
                                </div>
                              </div>
                            )}

                            {/* Standard Message */}
                            {(!m.type || m.type === 'text') && (
                              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                                 {m.text.split('\n').map((line, idx) => (
                                   <p key={idx} className={`${idx > 0 ? 'mt-4' : ''} text-base leading-relaxed font-medium`}>{line}</p>
                                 ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Ready Menu */}
                  {!isTyping && step === 'ready' && messages[messages.length-1]?.role === 'model' && !messages[messages.length-1].quizData && !messages[messages.length-1].resultData && (
                    <div className="flex flex-wrap gap-3">
                      <ActionButton icon={<Sparkles size={16}/>} label="Start BPSC Quiz" onClick={() => handleSendMessage("Give me a BPSC practice question")} primary />
                      <ActionButton icon={<BrainCircuit size={16}/>} label="2026 Syllabus" onClick={() => handleSendMessage("Explain the key topics of this subject for BPSC TRE 4.0")} />
                    </div>
                  )}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 px-8 py-5 rounded-[2rem] rounded-tl-none shadow-sm flex gap-3">
                        <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" />
                        <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-8 bg-white border-t border-slate-200 shadow-[0_-25px_80px_rgba(0,0,0,0.08)] flex gap-5">
                  <div className="flex-1 relative">
                    <input 
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Ask about BPSC TRE 4.0 or pick an option..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] pl-8 pr-20 py-5 text-base font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-200 text-[9px] font-black text-slate-500 select-none uppercase">Enter</div>
                  </div>
                  <button 
                    onClick={() => handleSendMessage()}
                    disabled={!inputText.trim()}
                    className="w-16 h-16 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center hover:bg-indigo-700 shadow-2xl shadow-indigo-200 active:scale-90 transition-all disabled:opacity-30"
                  >
                    <ArrowRight size={30} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-14 text-center space-y-14 bg-slate-900 text-white relative">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent opacity-70" />
                 <div className="relative">
                    <div className={`w-64 h-64 rounded-full bg-indigo-500/5 flex items-center justify-center ${isVoiceActive ? 'animate-pulse' : ''}`}>
                       <div className={`w-48 h-48 rounded-full bg-indigo-500/10 flex items-center justify-center ${isVoiceActive ? 'animate-ping duration-[6000ms]' : ''}`}>
                          <div className="w-32 h-32 bg-indigo-600 rounded-[3rem] flex items-center justify-center shadow-[0_0_100px_rgba(79,70,229,0.8)] relative z-10">
                             <Mic size={56} className={isVoiceActive ? 'animate-pulse' : ''} />
                          </div>
                       </div>
                    </div>
                 </div>
                 <div className="space-y-6">
                    <h3 className="text-4xl font-black tracking-tight">AI Listening</h3>
                    <p className="text-base text-slate-400 font-bold max-w-[300px] mx-auto leading-relaxed opacity-70 italic">Speak freely about BPSC TRE 2026. I'm ready to evaluate your spoken answers.</p>
                 </div>
                 <button onClick={stopVoiceSession} className="px-16 py-6 bg-white/5 border border-white/10 rounded-3xl font-black text-[11px] tracking-[0.4em] hover:bg-red-500 hover:text-white transition-all group flex items-center gap-5">
                    <X size={20} className="group-hover:rotate-90 transition-transform" /> TERMINATE LIVE
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
    className="bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] hover:border-indigo-500 hover:bg-indigo-50/50 transition-all flex flex-col items-center gap-4 shadow-sm group"
  >
    <div className="p-6 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all scale-110">
      {icon}
    </div>
    <span className="font-black text-slate-800 text-base">{label}</span>
  </button>
);

const ActionButton = ({ icon, label, onClick, primary, danger, className }: any) => (
  <button 
    onClick={onClick}
    className={`px-7 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-4 transition-all shadow-md active:scale-95 ${
      primary 
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
