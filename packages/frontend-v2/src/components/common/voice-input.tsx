import { useState, useEffect, useRef } from 'react';

interface Props {
  onText: (text: string) => void;
  lang?: string; // 'en-IN' or 'hi-IN'
  className?: string;
}

export function VoiceButton({ onText, lang = 'en-IN', className = '' }: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = lang;
    rec.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
      onText(text);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    return () => { try { rec.abort(); } catch {} };
  }, [lang, onText]);

  const toggle = () => {
    if (!recognitionRef.current) return;
    if (listening) { recognitionRef.current.stop(); setListening(false); }
    else { try { recognitionRef.current.start(); setListening(true); } catch {} }
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className={`rounded-full h-10 w-10 flex items-center justify-center transition ${
        listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600 active:bg-gray-200'
      } ${className}`}
      aria-label={listening ? 'Stop recording' : 'Start voice input'}
    >
      {/* Mic icon */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    </button>
  );
}
