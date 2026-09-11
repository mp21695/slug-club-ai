import React, { useState, useEffect, useRef } from 'react';
import { HourglassCanvas } from '../simulation/HourglassCanvas';
import { EvaluationResult, SimulationState } from '../types';
import { STATE_CONFIGS } from '../simulation/stateMapper';
import { Mic, MicOff, Sparkles, HeartHandshake, Terminal, Volume2 } from 'lucide-react';

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
          } catch (err) {}
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
                } catch (err) {}
              }
            }
          }
          if (!event.results[event.results.length - 1].isFinal) {
            setLiveTranscript(currentChunk);
          }
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
    } catch (err) {
      alert('Microphone permission required for conversational sensing.');
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

  // Generate ASCII segmented pixel meter string
  const renderPixelMeter = (val: number, maxBlocks: number = 10) => {
    const filled = Math.round(val * maxBlocks);
    return '■'.repeat(filled) + '□'.repeat(maxBlocks - filled);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center space-y-5 animate-fade-in font-mono">
      {/* Mystical Pixel-Art Artifact Terminal */}
      <div className="pixel-panel w-full p-6 sm:p-8 flex flex-col items-center relative">
        {/* Terminal Header Bar */}
        <div className="w-full flex items-center justify-between pb-3 mb-2 border-b-2 border-pixel-border">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3 h-3 shadow-pixel-sm"
              style={{ backgroundColor: visualParams.color }}
            />
            <span className="font-pixel text-xs text-pixel-gold tracking-widest uppercase">
              {visualParams.display_name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isListening && (
              <span className="font-pixel text-[10px] text-pixel-emeraldBright animate-pulse flex items-center gap-1.5">
                <span className="w-2 h-2 bg-pixel-emeraldBright inline-block" />
                <span>REC_STREAM</span>
              </span>
            )}
            <button
              onClick={onOpenFeedback}
              title="Reflect & Calibrate Session"
              className="pixel-btn px-2.5 py-1 text-xs text-pixel-gold flex items-center gap-1.5"
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span className="font-pixel text-[10px]">CALIBRATE</span>
            </button>
          </div>
        </div>

        {/* DOMINANT PIXEL HOURGLASS ARTIFACT */}
        <div className="my-3 py-2 flex flex-col items-center justify-center">
          <HourglassCanvas
            state={state}
            visualParams={visualParams}
            score={smoothedScore}
            width={220}
            height={310}
            interactive={true}
          />
        </div>

        {/* Retro Atmospheric Monospace Telemetry Log */}
        <div className="w-full text-center px-4 min-h-[38px] flex items-center justify-center border-y-2 border-pixel-border py-2 bg-pixel-void/80">
          <p className="text-xs text-pixel-textMain italic leading-relaxed">
            "{currentEvaluation?.explanation || 'Ambient hourglass is observing conversation quality...'}"
          </p>
        </div>

        {/* Live Audio Segmented LED Meter */}
        {isListening && (
          <div className="w-full mt-3 p-3 bg-pixel-void border-2 border-pixel-border space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-pixel-textMuted font-mono">
              <span className="flex items-center gap-1.5 text-pixel-emeraldBright">
                <Volume2 className="w-3.5 h-3.5" />
                <span>MIC RESONANCE</span>
              </span>
              <span className="font-pixel text-[10px] text-pixel-gold">
                {audioLevel}%
              </span>
            </div>

            {/* Segmented Pixel Bar */}
            <div className="text-xs font-mono text-pixel-emeraldBright tracking-wider">
              [ {renderPixelMeter(audioLevel / 100, 24)} ]
            </div>

            {liveTranscript && (
              <p className="text-xs text-pixel-textMain italic truncate text-center pt-1 border-t border-pixel-border">
                &gt; "{liveTranscript}"
              </p>
            )}
          </div>
        )}

        {/* Pixel Metrics Telemetry Grid */}
        <div className="w-full grid grid-cols-2 gap-3 my-4 p-3 bg-pixel-void border-2 border-pixel-border">
          <div className="flex flex-col items-center justify-center border-r-2 border-pixel-border pr-2">
            <span className="font-pixel text-[9px] uppercase text-pixel-textMuted tracking-wider">TIME_SLOWING</span>
            <span className="font-pixel text-lg mt-1" style={{ color: visualParams.color }}>
              {Math.round(smoothedScore * 100)}%
            </span>
            <span className="text-[10px] text-pixel-textMuted font-mono">
              {renderPixelMeter(smoothedScore, 8)}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center pl-2">
            <span className="font-pixel text-[9px] uppercase text-pixel-textMuted tracking-wider">CONFIDENCE</span>
            <span className="font-pixel text-lg mt-1 text-pixel-textBright">
              {confidence === 0 ? '--' : `${Math.round(confidence * 100)}%`}
            </span>
            <span className="text-[10px] text-pixel-textMuted font-mono">
              {renderPixelMeter(confidence, 8)}
            </span>
          </div>
        </div>

        {/* Primary Retro Action Button */}
        <div className="w-full pt-1">
          <button
            onClick={handleToggle}
            className={`w-full py-3.5 text-xs font-pixel tracking-widest flex items-center justify-center gap-2.5 transition-all ${
              isListening
                ? 'pixel-btn-danger animate-pulse'
                : 'pixel-btn-primary'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>[■] PAUSE SENSING &amp; REFLECT</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>[■] START CONVERSATION STREAM (SPACE)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Terminal Lore Footer */}
      <div className="flex items-center gap-2 text-[11px] text-pixel-textMuted">
        <Terminal className="w-3.5 h-3.5 text-pixel-emeraldBright" />
        <span>SLUGHORN_PROTOCOL // ZERO-RETENTION VOLATILE MEMORY DSP</span>
      </div>
    </div>
  );
};
