import React, { useState } from "react";
import {
  Terminal,
  Play,
  CheckCircle2,
  Clock,
  Database,
  Cpu,
  RefreshCw,
  Search,
  Code2,
  Sliders,
  ShieldCheck,
  Zap,
  ArrowRight,
  Layers,
  Sparkles
} from "lucide-react";
import { PipelineStepLog } from "../types";

interface AgentPipelineViewProps {
  onSyncLive: () => void;
  isSyncing: boolean;
  syncLogs: string[];
}

export const AgentPipelineView: React.FC<AgentPipelineViewProps> = ({
  onSyncLive,
  isSyncing,
  syncLogs,
}) => {
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [sampleTitle, setSampleTitle] = useState(
    "Zero-Copy Memory Serialization with Apache Arrow and Python"
  );
  const [sampleText, setSampleText] = useState(
    "Apache Arrow specifies a standardized language-independent columnar memory format for flat and hierarchical data. It enables zero-copy reads for rapid data access without serialization overhead across PySpark, Polars, and DuckDB."
  );

  const [pipelineSteps, setPipelineSteps] = useState<PipelineStepLog[]>([
    {
      step: 1,
      toolName: "Fetch Tool",
      name: "Multi-Source Crawler",
      description: "Extracts raw payload from Dev.to API, HN Algolia, or arXiv without commercial aggregators.",
      status: "idle",
    },
    {
      step: 2,
      toolName: "Classify Tool",
      name: "Gemini Structured Classification",
      description: "Evaluates article engineering category, target audience, and difficulty using responseSchema.",
      status: "idle",
    },
    {
      step: 3,
      toolName: "Summarize Tool",
      name: "Grounded Synthesis",
      description: "Generates executive summary and placement 'Why it Matters' with temperature locked at 0.1.",
      status: "idle",
    },
    {
      step: 4,
      toolName: "Skill Extractor",
      name: "Tech Stack Tokenizer",
      description: "Extracts canonical technical skill tokens for placement preparation mapping.",
      status: "idle",
    },
    {
      step: 5,
      toolName: "Rank Tool",
      name: "Freshness & Category Scoring (Non-LLM)",
      description: "Calculates priority score using exponential time decay and user category alignment.",
      status: "idle",
    },
    {
      step: 6,
      toolName: "Store Tool",
      name: "Async Deduplication & Persistence",
      description: "Computes SHA-256 URL hash and upserts into SQLAlchemy async session.",
      status: "idle",
    },
  ]);

  const runPipelineSimulation = async () => {
    setIsRunningPipeline(true);

    // Reset steps
    setPipelineSteps(prev =>
      prev.map(s => ({ ...s, status: "idle", outputPreview: undefined, latencyMs: undefined }))
    );

    try {
      const res = await fetch("/api/ai/agent-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleTitle: sampleTitle,
          articleRawText: sampleText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Animate each step sequentially for visual clarity
        for (let i = 0; i < data.steps.length; i++) {
          const stepData = data.steps[i];
          setPipelineSteps(prev =>
            prev.map((s, idx) => (idx === i ? { ...s, status: "running" } : s))
          );
          await new Promise(r => setTimeout(r, 450));
          setPipelineSteps(prev =>
            prev.map((s, idx) =>
              idx === i
                ? {
                    ...s,
                    status: "completed",
                    outputPreview: stepData.outputPreview,
                    latencyMs: stepData.latencyMs,
                  }
                : s
            )
          );
        }
      }
    } catch (err) {
      console.error("Pipeline run error:", err);
    } finally {
      setIsRunningPipeline(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Architecture Explanation Banner */}
      <div className="border-2 border-[#2D3139] bg-[#16191E] p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>Section 5.4 Architecture Specification</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-white">
              6-Tool Custom AI Agent Pipeline
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              &quot;The LLM (Gemini) is one tool the agent calls — like a database call. The custom part is the orchestration: the self-sourcing <strong className="text-white">Fetch step</strong>, <strong className="text-white">Classify call</strong>, <strong className="text-white">Summarize call</strong>, <strong className="text-white">Skill Extractor</strong>, <strong className="text-white">Rank logic</strong>, and <strong className="text-white">DB upsert with deduplication</strong>. That is all original code.&quot;
            </p>
          </div>

          <button
            onClick={onSyncLive}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition-colors shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-black" : "text-black"}`} />
            {isSyncing ? "Ingesting from 3 Sources..." : "Trigger Live Ingestion Sync"}
          </button>
        </div>

        {/* Sync Logs Terminal View (if any) */}
        {syncLogs.length > 0 && (
          <div className="p-3 bg-[#0F1115] border-2 border-[#2D3139] font-mono text-[11px] space-y-1 max-h-36 overflow-y-auto">
            <span className="text-slate-500 uppercase tracking-widest text-[10px] block font-bold">Live Ingestion Telemetry Stream:</span>
            {syncLogs.map((log, i) => (
              <div key={i} className="text-slate-300 flex items-center gap-2">
                <span className="text-amber-500">›</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Pipeline Runner Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 6 Step Execution Visualizer */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              Agent Tool Execution Chain
            </h3>
            <span className="text-xs font-mono text-slate-400">
              6 Discrete Orchestration Tools
            </span>
          </div>

          <div className="space-y-3">
            {pipelineSteps.map((step) => {
              const isDone = step.status === "completed";
              const isRunning = step.status === "running";

              return (
                <div
                  key={step.step}
                  className={`p-4 border-2 transition-all ${
                    isDone
                      ? "bg-[#16191E] border-[#2D3139]"
                      : isRunning
                      ? "bg-[#1A1D23] border-amber-500"
                      : "bg-[#0F1115] border-[#2D3139] opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 border flex items-center justify-center text-xs font-mono font-bold ${
                          isDone
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/60"
                            : isRunning
                            ? "bg-amber-500 text-black border-amber-400 animate-pulse"
                            : "bg-[#0F1115] text-slate-500 border-[#2D3139]"
                        }`}
                      >
                        {step.step}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-white">
                            {step.toolName}: <span className="text-amber-400 font-normal">{step.name}</span>
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">{step.description}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isDone && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/70 px-2 py-0.5 border border-emerald-700 font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          {step.latencyMs}ms
                        </span>
                      )}
                      {isRunning && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-black bg-amber-500 px-2 py-0.5 font-bold uppercase animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Running
                        </span>
                      )}
                    </div>
                  </div>

                  {step.outputPreview && (
                    <div className="mt-2.5 p-2.5 bg-[#0F1115] border border-[#2D3139] font-mono text-[11px] text-slate-300">
                      <span className="text-amber-500 block text-[10px] uppercase font-bold">Output Payload:</span>
                      {step.outputPreview}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Custom Ingestion Test Sandbox */}
        <div className="space-y-4">
          <div className="border-2 border-[#2D3139] bg-[#16191E] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Ingestion Sandbox</h3>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Input any technical excerpt to step through the custom 6-tool orchestration logic.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Article Title:
                </label>
                <input
                  type="text"
                  value={sampleTitle}
                  onChange={e => setSampleTitle(e.target.value)}
                  className="w-full bg-[#0F1115] border border-[#2D3139] px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Raw Content Payload:
                </label>
                <textarea
                  rows={5}
                  value={sampleText}
                  onChange={e => setSampleText(e.target.value)}
                  className="w-full bg-[#0F1115] border border-[#2D3139] px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                />
              </div>

              <button
                onClick={runPipelineSimulation}
                disabled={isRunningPipeline}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 ${isRunningPipeline ? "animate-spin" : ""}`} />
                {isRunningPipeline ? "Executing 6-Tool Pipeline..." : "Execute 6-Tool Pipeline"}
              </button>
            </div>
          </div>

          {/* Deduplication & Storage Technical Note */}
          <div className="border-2 border-[#2D3139] bg-[#0F1115] p-4 space-y-2 text-xs font-mono">
            <span className="text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Deduplication Mechanics
            </span>
            <p className="text-slate-400 leading-relaxed">
              DevLens computes a unique SHA-256 canonical hash of the source URL. Before executing LLM summaries or classification calls, it queries SQLite/PostgreSQL with <code>select(Article).where(Article.source_url == canonical_url)</code>. Duplicate articles are pruned with zero redundant LLM latency or token spend.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
