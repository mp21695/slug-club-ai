import React, { useState } from 'react';
import { Play, CheckCircle2, BarChart2, Sparkles } from 'lucide-react';

export const BenchmarkRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<any>(null);

  const runBenchmark = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/datasets/benchmark?samples_per_category=15', { method: 'POST' });
      const data = await res.json();
      setResults(data.metrics);
    } catch (err) {
      console.error('Benchmark failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif-magic text-xl text-white font-bold flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-emerald-400" />
            AI Benchmark & Dialogue Evaluation
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluate the multi-head scoring pipeline across 9 dialogue categories (450 synthetic benchmark samples).
          </p>
        </div>

        <button
          onClick={runBenchmark}
          disabled={isRunning}
          className="py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Benchmarking...' : 'Run Dataset Benchmark'}</span>
        </button>
      </div>

      {results ? (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-slate-900/70 border border-white/5 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Samples</span>
              <p className="text-xl font-bold text-white mt-0.5">{results.total_samples}</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/70 border border-white/5 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Overall MAE</span>
              <p className="text-xl font-bold text-emerald-400 mt-0.5">{results.overall_mae}</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/70 border border-white/5 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Overall RMSE</span>
              <p className="text-xl font-bold text-teal-400 mt-0.5">{results.overall_rmse}</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/70 border border-white/5 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">State Macro-F1</span>
              <p className="text-xl font-bold text-amber-400 mt-0.5">{results.state_macro_f1}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Dimension Mean Absolute Errors (MAE)
            </h4>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-[10px] text-slate-400 block">Engagement</span>
                <span className="font-bold text-emerald-400">{results.engagement_mae}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-[10px] text-slate-400 block">Mutuality</span>
                <span className="font-bold text-teal-400">{results.mutuality_mae}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-[10px] text-slate-400 block">Positivity</span>
                <span className="font-bold text-amber-400">{results.positivity_mae}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-[10px] text-slate-400 block">Depth</span>
                <span className="font-bold text-indigo-400">{results.depth_mae}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-[10px] text-slate-400 block">Flow</span>
                <span className="font-bold text-cyan-400">{results.flow_mae}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-900/30 border border-white/5 text-center text-xs text-slate-400">
          Click "Run Dataset Benchmark" to evaluate the 9 synthetic conversation categories against ground truth targets.
        </div>
      )}
    </div>
  );
};
