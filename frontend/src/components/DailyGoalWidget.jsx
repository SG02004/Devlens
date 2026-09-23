import React from "react";
import { Target, CheckCircle2 } from "lucide-react";

export const DailyGoalWidget = ({
  todayReadCount,
  dailyGoal,
  onGoalChange,
}) => {
  const goalProgressCount = Math.min(todayReadCount, dailyGoal);
  const goalProgressPercent = Math.round((goalProgressCount / Math.max(1, dailyGoal)) * 100);
  const isGoalReached = todayReadCount >= dailyGoal;

  return (
    <div
      id="daily-learning-goal-widget"
      className="card p-5 text-left border-2 border-[var(--ink)] bg-[var(--bg-surface)] shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            <Target className="w-3 h-3 text-[var(--accent)]" />
            <span>[TARGET] DAILY LEARNING GOAL</span>
          </div>
          <p className="mt-2 font-display text-xl sm:text-2xl font-extrabold text-[var(--ink)]">
            {todayReadCount} / {dailyGoal} <span className="font-mono text-xs font-normal text-[var(--ink-muted)]">ARTICLES</span>
            {isGoalReached && (
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#111113] bg-[var(--accent)] px-2 py-0.5 shadow-sm">
                COMPLETE
              </span>
            )}
          </p>
          <p className="mt-1 font-mono text-xs text-[var(--ink-muted)]">
            {isGoalReached
              ? "Goal unlocked. Velocity maintained."
              : "Continuous reading sharpens distributed systems intuition."}
          </p>
        </div>

        <label className="text-right flex flex-col items-end gap-1 text-[10px] font-mono font-bold text-[var(--ink-muted)] uppercase tracking-widest">
          <span>GOAL</span>
          <input
            id="input-daily-goal"
            type="number"
            min={1}
            max={20}
            value={dailyGoal}
            onChange={(e) => onGoalChange(Math.max(1, Math.min(20, Number(e.target.value) || 5)))}
            className="w-14 bg-transparent border-b-2 border-[var(--ink)] text-center font-mono font-bold text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] py-1"
          />
        </label>
      </div>

      {/* Progress Track */}
      <div className="mt-4 h-2 w-full bg-[var(--bg)] border border-[var(--border-dim)] overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] transition-all duration-300"
          style={{ width: `${Math.min(goalProgressPercent, 100)}%` }}
        />
      </div>
    </div>
  );
};
