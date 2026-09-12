import React, { useState, useEffect } from "react";
import {
  X,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Loader2
} from "lucide-react";
import { Article, QuizQuestion } from "../types";

interface QuizModalProps {
  article: Article | null;
  allArticles: Article[];
  onClose: () => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  article,
  allArticles,
  onClose,
}) => {
  const [selectedArticleId, setSelectedArticleId] = useState<string>(
    article?.id || allArticles[0]?.id || ""
  );
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const activeArticle =
    allArticles.find((a) => a.id === selectedArticleId) || article || allArticles[0];

  // Fetch or generate quiz questions for the selected article
  useEffect(() => {
    if (!activeArticle) return;

    let isMounted = true;
    async function loadQuiz() {
      setIsLoading(true);
      setCurrentQuestionIndex(0);
      setUserAnswers([]);
      setSelectedOption(null);
      setHasAnsweredCurrent(false);
      setIsQuizComplete(false);

      try {
        const res = await fetch(`/api/quiz/generate?articleId=${activeArticle.id}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.questions) && data.questions.length > 0) {
            setQuestions(data.questions);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Fallback below
      }

      // Fallback deterministic questions
      if (isMounted) {
        const fallbackQuestions: QuizQuestion[] = [
          {
            id: `q1-${activeArticle.id}`,
            question: `What primary engineering challenge does "${activeArticle.title}" address?`,
            options: [
              `Optimizing distributed latency through asynchronous non-blocking pipelines`,
              `Replacing relational transactional integrity with eventual document storage`,
              `Eliminating algorithmic caching layers to conserve random access memory`,
              `Deprecating container orchestration in favor of bare-metal manual deployments`,
            ],
            correctIndex: 0,
            explanation:
              "The architecture emphasizes horizontal throughput scaling and non-blocking asynchronous event loops to maintain strict SLA guarantees.",
            keywordsCovered: activeArticle.skillsExtracted?.slice(0, 2) || ["Distributed Systems"],
          },
          {
            id: `q2-${activeArticle.id}`,
            question: `Which tradeoff is most critical when adopting the pattern in ${activeArticle.categoryLabel}?`,
            options: [
              `Reduced network bandwidth vs higher client-side battery consumption`,
              `Higher architectural complexity vs bounded tail latency under high load`,
              `Complete loss of schema validation vs immediate compile-time safety`,
              `Single point of failure creation vs reduced log verbosity`,
            ],
            correctIndex: 1,
            explanation:
              "Distributed and decoupled systems introduce operational complexity but protect against cascading failure during traffic spikes.",
            keywordsCovered: ["Resilience", "Latency"],
          },
          {
            id: `q3-${activeArticle.id}`,
            question: `Why is idempotency essential for the mechanisms discussed in this article?`,
            options: [
              `To allow rapid database schema drops during live traffic migrations`,
              `To ensure repeated retries after network timeouts do not cause duplicate state mutations`,
              `To enforce monotonic clock synchronization across isolated geographic regions`,
              `To compress telemetry payloads prior to TLS handshake completion`,
            ],
            correctIndex: 1,
            explanation:
              "In real-world networks, retries are inevitable. Idempotent keys guarantee that re-delivering a payload produces the exact same outcome safely.",
            keywordsCovered: ["Idempotency", "Networking"],
          },
        ];
        setQuestions(fallbackQuestions);
        setIsLoading(false);
      }
    }

    loadQuiz();
    return () => {
      isMounted = false;
    };
  }, [activeArticle?.id]);

  const handleSelectOption = (index: number) => {
    if (hasAnsweredCurrent) return;
    setSelectedOption(index);
  };

  const handleConfirmAnswer = () => {
    if (selectedOption === null) return;
    setHasAnsweredCurrent(true);
    setUserAnswers((prev) => [...prev, selectedOption]);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setHasAnsweredCurrent(false);
    } else {
      setIsQuizComplete(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setSelectedOption(null);
    setHasAnsweredCurrent(false);
    setIsQuizComplete(false);
  };

  const currentQ = questions[currentQuestionIndex];
  const score = userAnswers.reduce((acc, ans, idx) => {
    return ans === questions[idx]?.correctIndex ? acc + 1 : acc;
  }, 0);

  return (
    <div
      id="quiz-modal-backdrop"
      className="modal-backdrop animate-fade-in-up"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        id="quiz-modal-card"
        className="modal-card p-6 sm:p-10 relative border-2 border-[var(--ink)] bg-[var(--bg-surface)] text-left font-mono shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 z-10 w-9 h-9 border border-[var(--ink)] bg-[var(--bg-surface)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-[#111113] text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="pb-6 border-b-2 border-[var(--border-dim)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="meta-tag">TECHNICAL QUIZ ASSESSMENT</span>
            {questions.length > 0 && !isQuizComplete && (
              <span className="text-xs font-bold text-[var(--accent)]">
                QUESTION {currentQuestionIndex + 1} OF {questions.length}
              </span>
            )}
          </div>

          <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[var(--ink)] tracking-tight">
            Knowledge Verification
          </h2>

          {/* Article Selector Dropdown */}
          <div className="pt-2">
            <label className="block text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)] mb-1.5">
              ANCHORED TO PAPER:
            </label>
            <select
              value={selectedArticleId}
              onChange={(e) => setSelectedArticleId(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--ink)] text-xs text-[var(--ink)] px-3 py-2.5 focus:border-[var(--accent)] outline-none font-mono"
            >
              {allArticles.map((art) => (
                <option key={art.id} value={art.id}>
                  [{art.categoryLabel.toUpperCase()}] {art.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--accent)]" />
            <p className="text-xs text-[var(--ink-muted)] uppercase tracking-widest">
              Extracting domain concepts & generating questions...
            </p>
          </div>
        ) : isQuizComplete ? (
          /* Quiz Results */
          <div className="py-8 space-y-6">
            <div className="p-8 border-2 border-[var(--accent)] bg-[var(--accent-muted)] text-center space-y-4">
              <Award className="w-12 h-12 text-[var(--accent)] mx-auto" />
              <h3 className="font-display text-3xl font-extrabold text-[var(--ink)]">
                Assessment Complete
              </h3>
              <p className="text-sm text-[var(--ink)]">
                You scored <span className="text-[var(--accent)] font-bold text-lg">{score}</span> out of {questions.length} ({Math.round((score / Math.max(1, questions.length)) * 100)}%)
              </p>
              <p className="text-xs text-[var(--ink-muted)] max-w-md mx-auto">
                {score === questions.length
                  ? "Perfect proficiency. You demonstrated clear comprehension of architectural tradeoffs and distributed semantics."
                  : "Good effort. Review the technical explanations below to fortify your understanding."}
              </p>
            </div>

            {/* Answer Review */}
            <div className="space-y-4">
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)]">
                QUESTION REVIEW & EXPLANATIONS
              </h4>
              {questions.map((q, idx) => {
                const userAns = userAnswers[idx];
                const isCorrect = userAns === q.correctIndex;

                return (
                  <div
                    key={q.id}
                    className={`p-4 border ${
                      isCorrect
                        ? "border-[var(--border-dim)] bg-[var(--bg-surface)]"
                        : "border-rose-500/50 bg-rose-500/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-[var(--ink)]">
                        {idx + 1}. {q.question}
                      </p>
                      {isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--ink-muted)] mt-2">
                      <span className="font-bold text-[var(--accent)]">Explanation: </span>
                      {q.explanation}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={handleRestartQuiz}
                className="border-2 border-[var(--accent)] bg-[var(--accent)] text-[#111113] hover:bg-transparent hover:text-[var(--accent)] px-5 py-2.5 text-xs font-display font-bold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RETAKE ASSESSMENT</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="border border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)] px-5 py-2.5 text-xs font-display font-bold uppercase tracking-wider transition-colors ml-auto cursor-pointer"
              >
                RETURN TO FEED
              </button>
            </div>
          </div>
        ) : currentQ ? (
          /* Active Question */
          <div className="py-6 space-y-6">
            {/* Question Text */}
            <div className="space-y-2">
              <p className="text-base sm:text-lg font-bold text-[var(--ink)] leading-snug">
                {currentQ.question}
              </p>
              {currentQ.keywordsCovered && (
                <div className="flex gap-2 pt-1">
                  {currentQ.keywordsCovered.map((kw) => (
                    <span
                      key={kw}
                      className="text-[9px] uppercase tracking-widest text-[var(--accent)] border border-[var(--accent)]/30 px-2 py-0.5"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {currentQ.options.map((opt, optIdx) => {
                let borderStyle = "border-[var(--border-dim)] hover:border-[var(--ink)]";
                let bgStyle = "bg-[var(--bg)]";
                let textStyle = "text-[var(--ink)]";

                if (selectedOption === optIdx && !hasAnsweredCurrent) {
                  borderStyle = "border-[var(--accent)]";
                  bgStyle = "bg-[var(--accent-muted)]";
                  textStyle = "text-[var(--accent)] font-bold";
                }

                if (hasAnsweredCurrent) {
                  if (optIdx === currentQ.correctIndex) {
                    borderStyle = "border-[var(--accent)]";
                    bgStyle = "bg-[var(--accent-muted)]";
                    textStyle = "text-[var(--accent)] font-bold";
                  } else if (selectedOption === optIdx) {
                    borderStyle = "border-rose-500";
                    bgStyle = "bg-rose-500/10";
                    textStyle = "text-rose-500";
                  }
                }

                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(optIdx)}
                    disabled={hasAnsweredCurrent}
                    className={`w-full p-4 border text-left text-xs transition-all flex items-start gap-3 cursor-pointer ${borderStyle} ${bgStyle} ${textStyle}`}
                  >
                    <span className="w-5 h-5 border border-current flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="leading-relaxed">{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Feedback Explanation Callout */}
            {hasAnsweredCurrent && (
              <div
                className={`p-4 border text-xs leading-relaxed space-y-1 ${
                  selectedOption === currentQ.correctIndex
                    ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--ink)]"
                    : "border-rose-500 bg-rose-500/10 text-[var(--ink)]"
                }`}
              >
                <div className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  {selectedOption === currentQ.correctIndex ? (
                    <span className="text-[var(--accent)]">✓ CORRECT ANSWER</span>
                  ) : (
                    <span className="text-rose-500">✗ INCORRECT</span>
                  )}
                </div>
                <p>{currentQ.explanation}</p>
              </div>
            )}

            {/* Next / Confirm Actions */}
            <div className="pt-4 border-t border-[var(--border-dim)] flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)]">
                {hasAnsweredCurrent ? "PROCEED TO NEXT QUESTION" : "SELECT YOUR ANSWER"}
              </span>

              {!hasAnsweredCurrent ? (
                <button
                  type="button"
                  onClick={handleConfirmAnswer}
                  disabled={selectedOption === null}
                  className="border-2 border-[var(--accent)] bg-[var(--accent)] text-[#111113] hover:bg-transparent hover:text-[var(--accent)] px-6 py-2.5 text-xs font-display font-bold uppercase tracking-wider transition-colors disabled:opacity-30 cursor-pointer"
                >
                  CONFIRM ANSWER
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="border-2 border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-[#111113] px-6 py-2.5 text-xs font-display font-bold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>
                    {currentQuestionIndex + 1 < questions.length ? "NEXT QUESTION" : "VIEW RESULTS"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
