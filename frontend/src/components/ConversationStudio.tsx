import React, { useState, useEffect, useRef } from 'react';
import { HourglassCanvas } from '../simulation/HourglassCanvas';
import { EvaluationResult, ConversationTurn, SimulationState } from '../types';
import { STATE_CONFIGS } from '../simulation/stateMapper';
import {
  Send,
  Play,
  RotateCcw,
  Sparkles,
  MessageSquare,
  Mic,
  MicOff,
  UploadCloud,
  FileText,
  Activity,
  Layers,
  ChevronRight,
  HelpCircle,
  BarChart3
} from 'lucide-react';

interface ConversationStudioProps {
  currentEvaluation: EvaluationResult | null;
  onEvaluationChange: (evalResult: EvaluationResult) => void;
  onOpenFeedback: () => void;
}

const PRESET_CONVERSATIONS: Record<string, { title: string; category: string; turns: { speaker: string; text: string }[] }> = {
  deep_personal: {
    title: 'Deep Personal Reflection',
    category: 'Deep Connection',
    turns: [
      { speaker: 'Speaker_A', text: "I've been reflecting on what truly makes our work feel meaningful." },
      { speaker: 'Speaker_B', text: "I love that question. In your experience, when do you feel most aligned?" },
      { speaker: 'Speaker_A', text: "When we build things that help people connect deeply and feel understood." },
      { speaker: 'Speaker_B', text: "That resonates completely with my own values. How can we weave more of that in?" },
      { speaker: 'Speaker_A', text: "By prioritizing presence and empathy over rush and superficial metrics." },
      { speaker: 'Speaker_B', text: "Completely agreed. Let's make that our guiding principle starting today." }
    ]
  },
  technical: {
    title: 'Technical Collaboration',
    category: 'Problem-Solving',
    turns: [
      { speaker: 'Speaker_A', text: "I'm optimizing the transformer inference latency, but the KV cache memory is spiking." },
      { speaker: 'Speaker_B', text: "Are you using dynamic sequence length padding or fixed max length?" },
      { speaker: 'Speaker_A', text: "Dynamic padding with FlashAttention, but context scaling is linear." },
      { speaker: 'Speaker_B', text: "Have you tried PagedAttention? That cut our memory overhead by 60%." },
      { speaker: 'Speaker_A', text: "Brilliant! Did you need custom CUDA kernels or is the PyTorch binding sufficient?" },
      { speaker: 'Speaker_B', text: "Default PyTorch binding hit our 18 FPS target without manual CUDA code." }
    ]
  },
  playful_banter: {
    title: 'Playful Banter & Humor',
    category: 'Humor & Joy',
    turns: [
      { speaker: 'Speaker_A', text: "I just spent 45 minutes debugging only to realize I commented out the main function haha!" },
      { speaker: 'Speaker_B', text: "Peak developer moment! Please tell me you didn't restart the computer first lol." },
      { speaker: 'Speaker_A', text: "I restarted it twice and questioned all my life choices!" },
      { speaker: 'Speaker_B', text: "Haha! Coffee is definitely on me today. You've earned the Senior Debugger award!" }
    ]
  },
  supportive: {
    title: 'Supportive / Empathetic Exchange',
    category: 'Emotional Warmth',
    turns: [
      { speaker: 'Speaker_A', text: "I got the rejection email for the fellowship today. Feeling really discouraged." },
      { speaker: 'Speaker_B', text: "I'm so sorry. I know how much heart and late nights you put into that." },
      { speaker: 'Speaker_A', text: "It just feels like every time I get close, the door closes." },
      { speaker: 'Speaker_B', text: "It's completely valid to feel exhausted right now. Today is just for resting; I'm right here with you." }
    ]
  },
  one_sided: {
    title: 'One-Sided Monologue',
    category: 'Disconnected',
    turns: [
      { speaker: 'Speaker_A', text: "So then I told him the design system needs a revamp, and then I bought three monitors, and then my cat jumped on the table..." },
      { speaker: 'Speaker_B', text: "Oh." },
      { speaker: 'Speaker_A', text: "And then I reorganized my bookshelves by color for four hours, and then I called my cousin to explain my workout routine!" },
      { speaker: 'Speaker_B', text: "Cool." }
    ]
  },
  conflict: {
    title: 'Emotionally Intense / Conflict',
    category: 'Tension',
    turns: [
      { speaker: 'Speaker_A', text: "You completely ignored what I asked you to do and ruined the entire presentation!" },
      { speaker: 'Speaker_B', text: "Stop shouting! You didn't give me any clear instructions until two hours before!" },
      { speaker: 'Speaker_A', text: "I sent three emails last week! This is so frustrating and unprofessional!" },
      { speaker: 'Speaker_B', text: "I hate dealing with your constant blame games! I'm completely sick of this!" }
    ]
  }
};

export const ConversationStudio: React.FC<ConversationStudioProps> = ({
  currentEvaluation,
  onEvaluationChange,
  onOpenFeedback,
}) => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'paste' | 'voice'>('simulator');
  const [selectedPreset, setSelectedPreset] = useState<string>('deep_personal');
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [turnsHistory, setTurnsHistory] = useState<ConversationTurn[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('Speaker_A');
  const [pasteContent, setPasteContent] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [scoreHistory, setScoreHistory] = useState<{ index: number; score: number; state: string }[]>([]);
  
  // Audio state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input_type: 'text', title: 'Studio Session' }),
        });
        const data = await res.json();
        setSessionId(data.session_id);
      } catch (err) {
        console.error('Failed to create session:', err);
      }
    };
    initSession();
  }, []);

  const handleSendTurn = async (textToSend?: string, spk?: string) => {
    const text = textToSend || inputText;
    const speaker = spk || currentSpeaker;
    if (!text.trim() || !sessionId) return;

    try {
      const res = await fetch(`/api/sessions/${sessionId}/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speaker, text }),
      });
      const evalResult: EvaluationResult = await res.json();
      
      const newTurn: ConversationTurn = {
        speaker,
        text,
        message_index: turnsHistory.length,
      };

      setTurnsHistory((prev) => [...prev, newTurn]);
      onEvaluationChange(evalResult);
      setScoreHistory((prev) => [
        ...prev,
        { index: prev.length + 1, score: evalResult.smoothed_overall, state: evalResult.state },
      ]);
      setInputText('');
      setCurrentSpeaker(speaker === 'Speaker_A' ? 'Speaker_B' : 'Speaker_A');
    } catch (err) {
      console.error('Failed to send turn:', err);
    }
  };

  const handleStepPreset = () => {
    const preset = PRESET_CONVERSATIONS[selectedPreset];
    if (!preset) return;
    if (currentTurnIndex < preset.turns.length) {
      const turn = preset.turns[currentTurnIndex];
      handleSendTurn(turn.text, turn.speaker);
      setCurrentTurnIndex((prev) => prev + 1);
    }
  };

  const handleResetSimulator = () => {
    setTurnsHistory([]);
    setCurrentTurnIndex(0);
    setScoreHistory([]);
    onEvaluationChange({
      engagement: 0.5,
      mutuality: 0.5,
      positivity: 0.5,
      depth: 0.5,
      flow: 0.5,
      overall: 0.5,
      smoothed_overall: 0.5,
      confidence: 0.0,
      state: 'insufficient_data',
      reason_codes: ['insufficient_data'],
      explanation: 'Awaiting conversation turns...',
      visual_params: STATE_CONFIGS.insufficient_data,
    });
  };

  const handleImportTranscript = async () => {
    if (!pasteContent.trim() || !sessionId) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_transcript: pasteContent }),
      });
      const data = await res.json();
      onEvaluationChange(data.evaluation);
    } catch (err) {
      console.error('Failed to import transcript:', err);
    }
  };

  // Voice recording chunk handler
  const handleToggleVoice = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = async (e) => {
          if (e.data.size > 0 && sessionId) {
            const formData = new FormData();
            formData.append('file', e.data, 'chunk.wav');
            try {
              const res = await fetch(`/api/sessions/${sessionId}/audio`, {
                method: 'POST',
                body: formData,
              });
              const evalResult = await res.json();
              onEvaluationChange(evalResult);
            } catch (err) {
              console.error('Audio chunk upload failed:', err);
            }
          }
        };

        recorder.start(3000); // 3-second chunk streaming
        setIsRecording(true);
      } catch (err) {
        alert('Microphone access permission required for live voice analysis.');
      }
    }
  };

  const state: SimulationState = currentEvaluation?.state || 'neutral';
  const visualParams = currentEvaluation?.visual_params || STATE_CONFIGS[state];
  const smoothedScore = currentEvaluation?.smoothed_overall ?? 0.5;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Interactive Inputs & Chat Stream (7 Cols) */}
      <div className="lg:col-span-7 space-y-5">
        {/* Navigation Tabs */}
        <div className="glass-panel p-1.5 rounded-2xl flex items-center gap-1 border border-white/10">
          {[
            { id: 'simulator', label: 'Dialogue Simulator', icon: Sparkles },
            { id: 'paste', label: 'Paste / Import Chat', icon: FileText },
            { id: 'voice', label: 'Voice & Microphone Lab', icon: Mic },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 border border-white/10 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Simulator */}
        {activeTab === 'simulator' && (
          <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif-magic text-base font-bold text-white">Preset Scenarios</h3>
                <p className="text-xs text-slate-400">Step through authentic dialogues to witness dynamic time slowing.</p>
              </div>

              <button
                onClick={handleResetSimulator}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors border border-white/5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Preset Selector Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(PRESET_CONVERSATIONS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedPreset(key);
                    handleResetSimulator();
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedPreset === key
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">{p.category}</span>
                  <span className="text-xs font-semibold leading-tight line-clamp-1 mt-0.5">{p.title}</span>
                </button>
              ))}
            </div>

            {/* Step Next Turn Action Bar */}
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-300">
                <span className="text-slate-400">Progress:</span> Turn {currentTurnIndex} of{' '}
                {PRESET_CONVERSATIONS[selectedPreset]?.turns.length || 0}
              </div>

              <button
                onClick={handleStepPreset}
                disabled={currentTurnIndex >= (PRESET_CONVERSATIONS[selectedPreset]?.turns.length || 0)}
                className="py-2 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:opacity-95 transition-all shadow-md flex items-center gap-1.5 disabled:opacity-40"
              >
                <span>Step Next Turn</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Live Message History Stream */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {turnsHistory.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs italic">
                  Click "Step Next Turn" or type a message below to feed the AI pipeline.
                </div>
              ) : (
                turnsHistory.map((t, idx) => {
                  const isA = t.speaker === 'Speaker_A';
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl text-xs max-w-[85%] animate-fade-in ${
                        isA
                          ? 'ml-auto bg-emerald-500/15 border border-emerald-500/30 text-emerald-100'
                          : 'mr-auto bg-slate-800/80 border border-white/5 text-slate-200'
                      }`}
                    >
                      <span className="text-[10px] font-bold opacity-60 uppercase block mb-0.5">
                        {isA ? 'Speaker A' : 'Speaker B'}
                      </span>
                      <p className="leading-relaxed">{t.text}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Manual Turn Input */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <button
                onClick={() => setCurrentSpeaker((prev) => (prev === 'Speaker_A' ? 'Speaker_B' : 'Speaker_A'))}
                className="px-2.5 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 border border-white/10 hover:bg-slate-700"
              >
                {currentSpeaker === 'Speaker_A' ? 'Spk A' : 'Spk B'}
              </button>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendTurn()}
                placeholder="Type a custom conversation turn..."
                className="flex-1 rounded-xl bg-slate-900/80 border border-white/10 px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-400 placeholder:text-slate-500"
              />
              <button
                onClick={() => handleSendTurn()}
                className="p-2.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Paste / Import Transcript */}
        {activeTab === 'paste' && (
          <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4">
            <div>
              <h3 className="font-serif-magic text-base font-bold text-white">Import Conversation Transcript</h3>
              <p className="text-xs text-slate-400">
                Paste WhatsApp, iMessage, Zoom, or plain text logs. PII is sanitized in memory.
              </p>
            </div>

            <textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder={`Example:\nAlex: I finished the project today!\nSam: That's amazing! How did the testing go?\nAlex: It reached 18 FPS with zero memory leaks.`}
              rows={8}
              className="w-full rounded-2xl bg-slate-900/80 border border-white/10 p-3.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-400 placeholder:text-slate-500 font-mono leading-relaxed"
            />

            <button
              onClick={handleImportTranscript}
              className="w-full py-3 rounded-2xl font-bold text-xs bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Parse, Sanitize & Analyze Multi-Turn Transcript</span>
            </button>
          </div>
        )}

        {/* Tab 3: Voice Laboratory */}
        {activeTab === 'voice' && (
          <div className="glass-panel p-6 rounded-3xl border border-white/10 text-center space-y-4">
            <div className="max-w-md mx-auto">
              <h3 className="font-serif-magic text-lg font-bold text-white">Live Microphone Stream</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Stream 3-second audio windows to extract pitch, vocal energy, speaking rate, and pause dynamics.
              </p>
            </div>

            <div className="py-6 flex flex-col items-center justify-center">
              <button
                onClick={handleToggleVoice}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl border-4 ${
                  isRecording
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse scale-110'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:scale-105'
                }`}
              >
                {isRecording ? <Mic className="w-10 h-10" /> : <MicOff className="w-10 h-10" />}
              </button>
              <span className="text-xs font-semibold mt-4 text-slate-300">
                {isRecording ? 'Listening & Streaming Audio Chunks...' : 'Tap to Start Live Voice Analysis'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-[11px] text-slate-400 text-left">
              <strong>Zero-Retention Guarantee:</strong> Raw audio chunks are processed in volatile memory for acoustic prosody and immediately discarded.
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Hourglass Simulation & AI Scorecard (5 Cols) */}
      <div className="lg:col-span-5 space-y-5">
        {/* Hourglass Visual Display Card */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 flex flex-col items-center relative">
          <div className="w-full flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
              Visual State Engine
            </span>
            <span
              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: `${visualParams.color}25`, color: visualParams.color }}
            >
              {visualParams.display_name}
            </span>
          </div>

          <div className="my-2">
            <HourglassCanvas
              state={state}
              visualParams={visualParams}
              score={smoothedScore}
              width={220}
              height={300}
            />
          </div>

          {/* Explanation Banner */}
          <div className="w-full text-center p-3 rounded-2xl bg-slate-900/70 border border-white/5 min-h-[50px] flex items-center justify-center">
            <p className="text-xs text-slate-300 italic leading-relaxed">
              "{currentEvaluation?.explanation || 'Awaiting dialogue signals to illuminate the hourglass...'}"
            </p>
          </div>
        </div>

        {/* 5-Head Scorecard */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Multidimensional Quality Heads</h3>
            </div>
            <button
              onClick={onOpenFeedback}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
            >
              Calibrate
            </button>
          </div>

          <div className="space-y-2.5">
            {[
              { label: 'Engagement (E)', val: currentEvaluation?.engagement ?? 0.5, color: 'bg-emerald-500' },
              { label: 'Mutuality (M)', val: currentEvaluation?.mutuality ?? 0.5, color: 'bg-teal-500' },
              { label: 'Emotional Positivity (P)', val: currentEvaluation?.positivity ?? 0.5, color: 'bg-amber-500' },
              { label: 'Conversation Depth (D)', val: currentEvaluation?.depth ?? 0.5, color: 'bg-indigo-500' },
              { label: 'Conversational Flow (F)', val: currentEvaluation?.flow ?? 0.5, color: 'bg-cyan-500' },
            ].map((head) => (
              <div key={head.label} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">{head.label}</span>
                  <span className="font-bold text-white">{Math.round(head.val * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                  <div
                    className={`h-full ${head.color} transition-all duration-700`}
                    style={{ width: `${Math.max(4, head.val * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Reason Code Badges */}
          {currentEvaluation?.reason_codes && currentEvaluation.reason_codes.length > 0 && (
            <div className="pt-2 border-t border-white/5 flex flex-wrap gap-1.5">
              {currentEvaluation.reason_codes.map((code) => (
                <span
                  key={code}
                  className="px-2 py-0.5 rounded-lg bg-slate-900 text-slate-300 border border-white/10 text-[10px] font-medium"
                >
                  #{code.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
