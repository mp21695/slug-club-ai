import React, { useState } from 'react';
import { HourglassCanvas } from '../simulation/HourglassCanvas';
import { EvaluationResult, ConversationTurn, SimulationState } from '../types';
import { STATE_CONFIGS } from '../simulation/stateMapper';
import {
  Send,
  Sparkles,
  FileText,
  MessageSquare,
  RotateCcw,
  ChevronRight,
  UploadCloud
} from 'lucide-react';

interface TestingLabProps {
  currentEvaluation: EvaluationResult | null;
  onEvaluationChange: (evalResult: EvaluationResult) => void;
  sessionId: string;
  onOpenFeedback: () => void;
}

const PRESET_SCENARIOS: Record<string, { title: string; desc: string; turns: { speaker: string; text: string }[] }> = {
  deep_connection: {
    title: 'Meaningful & Deep',
    desc: 'Deep personal reflection, mutual presence',
    turns: [
      { speaker: 'Speaker_A', text: "I've been reflecting on what truly makes our work feel meaningful." },
      { speaker: 'Speaker_B', text: "I love that question. In your experience, when do you feel most aligned?" },
      { speaker: 'Speaker_A', text: "When we build things that help people connect deeply and feel understood." },
      { speaker: 'Speaker_B', text: "That resonates completely with my own values. How can we weave more of that in?" },
      { speaker: 'Speaker_A', text: "By prioritizing presence and empathy over rush and superficial metrics." }
    ]
  },
  heated_conflict: {
    title: 'Heated / Conflict',
    desc: 'Tension, accusations, frustration',
    turns: [
      { speaker: 'Speaker_A', text: "You completely ruined the project and I hate dealing with this!" },
      { speaker: 'Speaker_B', text: "Stop shouting at me! You didn't give me any clear instructions!" },
      { speaker: 'Speaker_A', text: "I sent three emails! This is so frustrating and unprofessional!" },
      { speaker: 'Speaker_B', text: "I hate your constant blame games! Figure it out yourself!" }
    ]
  },
  apology_reconcile: {
    title: 'Apology / Reconcile',
    desc: 'Repairing conflict with apology',
    turns: [
      { speaker: 'Speaker_B', text: "I am really sorry, please forgive me, let us calm down." },
      { speaker: 'Speaker_A', text: "Thank you, I appreciate you apologizing. Let's work on this together." }
    ]
  },
  playful_banter: {
    title: 'Playful Banter',
    desc: 'Humor, jokes, positive excitement',
    turns: [
      { speaker: 'Speaker_A', text: "I spent 45 minutes debugging only to realize I commented out main haha!" },
      { speaker: 'Speaker_B', text: "Peak developer moment! Please tell me you didn't restart the PC first lol." },
      { speaker: 'Speaker_A', text: "I restarted twice and reinstalled node_modules haha!" },
      { speaker: 'Speaker_B', text: "Coffee is on me today, you earned the Senior Debugger award!" }
    ]
  },
  one_sided: {
    title: 'One-Sided Disconnected',
    desc: 'Monologue and one-word replies',
    turns: [
      { speaker: 'Speaker_A', text: "So then I told him that the design system needs a revamp, and then I bought three monitors, and then my cat jumped on the desk..." },
      { speaker: 'Speaker_B', text: "Oh." },
      { speaker: 'Speaker_A', text: "And then I reorganized my bookshelves by color for four hours!" },
      { speaker: 'Speaker_B', text: "Cool." }
    ]
  }
};

export const TestingLab: React.FC<TestingLabProps> = ({
  currentEvaluation,
  onEvaluationChange,
  sessionId,
  onOpenFeedback,
}) => {
  const [tab, setTab] = useState<'type' | 'paste' | 'presets'>('type');
  const [inputText, setInputText] = useState<string>('');
  const [speaker, setSpeaker] = useState<string>('Speaker_A');
  const [pasteText, setPasteText] = useState<string>('');
  const [turns, setTurns] = useState<ConversationTurn[]>([]);

  const handleSendTurn = async (textToSend?: string, spk?: string) => {
    const text = textToSend || inputText;
    const currentSpk = spk || speaker;
    if (!text.trim() || !sessionId) return;

    try {
      const res = await fetch(`/api/sessions/${sessionId}/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speaker: currentSpk, text }),
      });
      if (res.ok) {
        const data: EvaluationResult = await res.json();
        onEvaluationChange(data);
        setTurns((prev) => [...prev, { speaker: currentSpk, text, message_index: prev.length }]);
        setInputText('');
        setSpeaker(currentSpk === 'Speaker_A' ? 'Speaker_B' : 'Speaker_A');
      }
    } catch (err) {
      console.error('Turn send failed:', err);
    }
  };

  const handleApplyPreset = async (key: string) => {
    const preset = PRESET_SCENARIOS[key];
    if (!preset) return;

    for (const t of preset.turns) {
      await handleSendTurn(t.text, t.speaker);
    }
  };

  const handlePasteAnalyze = async () => {
    if (!pasteText.trim() || !sessionId) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_transcript: pasteText }),
      });
      if (res.ok) {
        const data = await res.json();
        onEvaluationChange(data.evaluation);
      }
    } catch (err) {
      console.error('Paste analyze failed:', err);
    }
  };

  const handleReset = () => {
    setTurns([]);
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
      explanation: 'Awaiting conversation turns to gauge the atmosphere...',
      visual_params: STATE_CONFIGS.insufficient_data,
    });
  };

  const state: SimulationState = currentEvaluation?.state || 'neutral';
  const visualParams = currentEvaluation?.visual_params || STATE_CONFIGS[state];
  const smoothedScore = currentEvaluation?.smoothed_overall ?? 0.5;

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in py-1">
      {/* Left Column: Input Test Controls (7 Cols) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Mode Switcher */}
        <div className="glass-panel p-1 rounded-2xl flex items-center border border-emerald-500/20">
          {[
            { id: 'type', label: '1. Type Turns', icon: MessageSquare },
            { id: 'presets', label: '2. Quick Scenarios', icon: Sparkles },
            { id: 'paste', label: '3. Paste Transcript', icon: FileText },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  active
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slytherin-silver hover:text-slytherin-silverLight'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Type Turn-by-Turn */}
        {tab === 'type' && (
          <div className="glass-panel p-5 rounded-3xl border border-emerald-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slytherin-silverLight uppercase tracking-wider font-serif">
                  Turn-by-Turn Testing
                </h3>
                <p className="text-xs text-slytherin-silver">Send messages to watch the hourglass shift atmosphere.</p>
              </div>

              <button
                onClick={handleReset}
                className="p-1.5 px-3 rounded-xl bg-black/60 text-xs text-slytherin-silver hover:bg-black/80 flex items-center gap-1 border border-emerald-500/20"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>

            {/* Message Stream */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {turns.length === 0 ? (
                <div className="text-center py-10 text-slytherin-silver/60 text-xs italic">
                  Type a message below or select a quick scenario to begin testing.
                </div>
              ) : (
                turns.map((t, i) => {
                  const isA = t.speaker === 'Speaker_A';
                  return (
                    <div
                      key={i}
                      className={`p-2.5 rounded-2xl text-xs max-w-[85%] animate-fade-in ${
                        isA
                          ? 'ml-auto bg-emerald-950/80 border border-emerald-500/30 text-emerald-200'
                          : 'mr-auto bg-black/70 border border-emerald-500/15 text-slytherin-silverLight'
                      }`}
                    >
                      <span className="text-[10px] font-bold opacity-70 uppercase block mb-0.5 font-serif">
                        {isA ? 'Speaker A' : 'Speaker B'}
                      </span>
                      <p>{t.text}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/15">
              <button
                onClick={() => setSpeaker((p) => (p === 'Speaker_A' ? 'Speaker_B' : 'Speaker_A'))}
                className="px-3 py-2 rounded-xl bg-black/70 text-xs font-bold text-slytherin-silver border border-emerald-500/20 hover:bg-black"
              >
                {speaker === 'Speaker_A' ? 'Spk A' : 'Spk B'}
              </button>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendTurn()}
                placeholder="Type next conversation turn..."
                className="flex-1 rounded-xl bg-black/60 border border-emerald-500/20 px-3.5 py-2 text-xs text-slytherin-silverLight focus:outline-none focus:border-emerald-400 placeholder:text-slytherin-silver/50"
              />
              <button
                onClick={() => handleSendTurn()}
                className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 hover:from-emerald-500 hover:to-teal-500 transition-colors shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Quick Presets */}
        {tab === 'presets' && (
          <div className="glass-panel p-5 rounded-3xl border border-emerald-500/20 space-y-3">
            <h3 className="text-xs font-bold text-slytherin-silverLight uppercase tracking-wider font-serif">
              Quick Dialogue Scenarios
            </h3>
            <p className="text-xs text-slytherin-silver">Click any preset to inject an instant test conversation into the pipeline.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {Object.entries(PRESET_SCENARIOS).map(([k, p]) => (
                <button
                  key={k}
                  onClick={() => handleApplyPreset(k)}
                  className="p-3 rounded-2xl bg-black/60 border border-emerald-500/20 hover:border-emerald-400/50 hover:bg-emerald-950/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slytherin-silverLight group-hover:text-emerald-300 font-serif">{p.title}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slytherin-silver group-hover:text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-slytherin-silver mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Paste Transcript */}
        {tab === 'paste' && (
          <div className="glass-panel p-5 rounded-3xl border border-emerald-500/20 space-y-3">
            <h3 className="text-xs font-bold text-slytherin-silverLight uppercase tracking-wider font-serif">
              Paste Chat Transcript
            </h3>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`Alex: I'm really excited about our progress today!\nSam: That's wonderful! What part did you finish?\nAlex: The multimodal AI hourglass simulation.`}
              rows={6}
              className="w-full rounded-2xl bg-black/60 border border-emerald-500/20 p-3 text-xs text-slytherin-silverLight focus:outline-none focus:border-emerald-400 font-mono leading-relaxed"
            />
            <button
              onClick={handlePasteAnalyze}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md flex items-center justify-center gap-1.5 font-serif"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Analyze Transcript</span>
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Hourglass Display & 5-Head Scores (5 Cols) */}
      <div className="lg:col-span-5 space-y-4">
        {/* Hourglass Card */}
        <div className="glass-panel p-5 rounded-3xl border border-emerald-500/20 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase font-bold text-slytherin-silver tracking-wider font-serif">Live Atmosphere</span>
            <span
              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider font-serif"
              style={{ backgroundColor: `${visualParams.color}25`, color: visualParams.color }}
            >
              {visualParams.display_name}
            </span>
          </div>

          <div className="my-1">
            <HourglassCanvas
              state={state}
              visualParams={visualParams}
              score={smoothedScore}
              width={200}
              height={280}
            />
          </div>

          <p className="text-xs text-slytherin-silverLight italic text-center min-h-[36px] flex items-center justify-center px-2">
            "{currentEvaluation?.explanation || 'Awaiting dialogue signals to illuminate the hourglass...'}"
          </p>
        </div>

        {/* 5 Quality Dimensions */}
        <div className="glass-panel p-4 rounded-3xl border border-emerald-500/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slytherin-silverLight uppercase tracking-wider font-serif">5 Quality Heads</span>
            <button onClick={onOpenFeedback} className="text-[11px] text-slytherin-gold hover:underline font-semibold font-serif">
              Calibrate
            </button>
          </div>

          {[
            { label: 'Engagement', val: currentEvaluation?.engagement ?? 0.5, color: 'bg-emerald-500' },
            { label: 'Mutuality', val: currentEvaluation?.mutuality ?? 0.5, color: 'bg-teal-400' },
            { label: 'Positivity', val: currentEvaluation?.positivity ?? 0.5, color: 'bg-amber-400' },
            { label: 'Depth', val: currentEvaluation?.depth ?? 0.5, color: 'bg-emerald-300' },
            { label: 'Flow', val: currentEvaluation?.flow ?? 0.5, color: 'bg-teal-300' },
          ].map((h) => (
            <div key={h.label} className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slytherin-silver">{h.label}</span>
                <span className="font-bold text-slytherin-silverLight">{Math.round(h.val * 100)}%</span>
              </div>
              <div className="w-full h-1 bg-black/80 rounded-full overflow-hidden">
                <div
                  className={`h-full ${h.color} transition-all duration-500`}
                  style={{ width: `${Math.max(4, h.val * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
