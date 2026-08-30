import React, { useState, useEffect, useRef } from 'react';
import { HourglassCanvas } from '../simulation/HourglassCanvas';
import { EvaluationResult, SimulationState } from '../types';
import { STATE_CONFIGS } from '../simulation/stateMapper';
import { Mic, MicOff, Sparkles, ShieldCheck, HeartHandshake, Volume2 } from 'lucide-react';

interface MainLiveWidgetProps {
  currentEvaluation: EvaluationResult | null;
  onEvaluationChange: (evalResult: EvaluationResult) => void;
  onOpenFeedback: () => void;
  sessionId: string;
  onResetSession: () => Promise<string>;
}

export const MainLiveWidget: React.FC<MainLiveWidgetProps> = ({
  currentEvaluation,
  onEvaluationChange,
  onOpenFeedback,
  sessionId,
  onResetSession,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const currentSessionIdRef = useRef<string>(sessionId);

  useEffect(() => {
    currentSessionIdRef.current = sessionId;
  }, [sessionId]);

  const state: SimulationState = currentEvaluation?.state || 'neutral';
  const visualParams = currentEvaluation?.visual_params || STATE_CONFIGS[state];
  const smoothedScore = currentEvaluation?.smoothed_overall ?? 0.50;
  const confidence = currentEvaluation?.confidence ?? 0.50;

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const startListening = async () => {
    setErrorMessage('');
    try {
      const newSessionId = await onResetSession();
      currentSessionIdRef.current = newSessionId;
      setLiveTranscript('');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && currentSessionIdRef.current) {
          const formData = new FormData();
          formData.append('file', e.data, 'chunk.wav');
          try {
            const res = await fetch(`/api/sessions/${currentSessionIdRef.current}/audio`, {
              method: 'POST',
              body: formData,
            });
            if (res.ok) {
              const evalResult: EvaluationResult = await res.json();
              onEvaluationChange(evalResult);
            }
          } catch (err) {
            console.error('Audio chunk error:', err);
          }
        }
      };

      recorder.start(3000);

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let activeSpeaker = 'Speaker_A';

        recognition.onresult = async (event: any) => {
          let currentChunk = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentChunk += event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              const finalText = event.results[i][0].transcript.trim();
              if (finalText && currentSessionIdRef.current) {
                setLiveTranscript(finalText);
                try {
                  const res = await fetch(`/api/sessions/${currentSessionIdRef.current}/text`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ speaker: activeSpeaker, text: finalText }),
                  });
                  if (res.ok) {
                    const evalResult: EvaluationResult = await res.json();
                    onEvaluationChange(evalResult);
                  }
                  activeSpeaker = activeSpeaker === 'Speaker_A' ? 'Speaker_B' : 'Speaker_A';
                } catch (err) {
                  console.error('Text turn error:', err);
                }
              }
            }
          }
          if (!event.results[event.results.length - 1].isFinal) {
            setLiveTranscript(currentChunk);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition warning:', e.error);
        };

        recognition.onend = () => {
          if (isListening && recognitionRef.current) {
            try {
              recognition.start();
            } catch (err) {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      setIsListening(true);
    } catch (err: any) {
      console.error('Failed to start listening:', err);
      setErrorMessage('Microphone access is required. Please grant permission to listen.');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsListening(false);
    setAudioLevel(0);
  };

  const handleToggle = () => {
    if (isListening) {
      stopListening();
      onOpenFeedback();
    } else {
      startListening();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center justify-center space-y-6 py-2 animate-fade-in">
      {/* Main Slytherin Glass Widget Card */}
      <div
        style={{ '--glow-color': visualParams.color } as React.CSSProperties}
        className="glass-widget w-full rounded-3xl p-8 flex flex-col items-center relative border border-emerald-500/20 shadow-2xl transition-all duration-700 hover:border-emerald-500/35"
      >
        {/* Top Status Header */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full animate-pulse shadow-md"
              style={{ backgroundColor: visualParams.color }}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-slytherin-silverLight font-serif">
              {visualParams.display_name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isListening && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300 animate-pulse">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Listening Live</span>
              </div>
            )}
            <button
              onClick={onOpenFeedback}
              title="Reflect on Session"
              className="p-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-slytherin-gold border border-emerald-500/30 transition-colors shadow-sm"
            >
              <HeartHandshake className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Large Central Animated Canvas */}
        <div className="my-3 py-2 flex items-center justify-center">
          <HourglassCanvas
            state={state}
            visualParams={visualParams}
            score={smoothedScore}
            width={260}
            height={370}
          />
        </div>

        {/* Atmospheric Explanation */}
        <div className="w-full text-center px-4 min-h-[44px] flex items-center justify-center">
          <p className="text-sm text-slytherin-silverLight italic font-light leading-relaxed">
            "{currentEvaluation?.explanation || 'A living digital hourglass that slows down when conversation feels meaningful.'}"
          </p>
        </div>

        {/* Live Audio & Transcript Indicator */}
        {isListening && (
          <div className="w-full mt-3 p-3 rounded-2xl bg-black/60 border border-emerald-500/20 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between text-[11px] text-slytherin-silver">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Microphone Active</span>
              </span>
              <span className="font-mono text-emerald-400">{audioLevel}% Resonance</span>
            </div>

            <div className="w-full h-1 bg-emerald-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-100"
                style={{ width: `${audioLevel}%` }}
              />
            </div>

            {liveTranscript && (
              <p className="text-xs text-slytherin-silverLight italic truncate text-center">
                “{liveTranscript}”
              </p>
            )}
          </div>
        )}

        {/* Key Metrics Pill */}
        <div className="w-full grid grid-cols-2 gap-3 my-4 p-3 rounded-2xl bg-black/50 border border-emerald-500/15">
          <div className="flex flex-col items-center justify-center border-r border-emerald-500/15">
            <span className="text-[10px] uppercase font-bold text-slytherin-silver tracking-wider">Time Slowing</span>
            <span className="text-xl font-bold font-mono" style={{ color: visualParams.color }}>
              {Math.round(smoothedScore * 100)}%
            </span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase font-bold text-slytherin-silver tracking-wider">Confidence</span>
            <span className="text-xl font-bold font-mono text-slytherin-silverLight">
              {confidence === 0 ? '—' : `${Math.round(confidence * 100)}%`}
            </span>
          </div>
        </div>

        {/* Primary Start / Stop Button */}
        <div className="w-full pt-1">
          <button
            onClick={handleToggle}
            className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl font-serif tracking-wider ${
              isListening
                ? 'bg-rose-950/70 text-rose-300 border border-rose-500/50 hover:bg-rose-900/80 animate-pulse'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 hover:scale-[1.01] border border-emerald-400/40'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-5 h-5" />
                <span>Stop Session & Reflect</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span>Start Listening to Conversation</span>
              </>
            )}
          </button>
        </div>

        {errorMessage && (
          <p className="text-xs text-rose-400 mt-3 text-center">{errorMessage}</p>
        )}
      </div>

      {/* Privacy Footer */}
      <div className="flex items-center gap-1.5 text-xs text-slytherin-silver/80">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Volatile memory audio analysis • Slytherin House Privacy Protocol</span>
      </div>
    </div>
  );
};
