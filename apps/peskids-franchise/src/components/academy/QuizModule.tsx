"use client";

import { useState } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface QuizData {
  questions: QuizQuestion[];
  passingScore: number; // Percentage (0-100)
}

interface QuizModuleProps {
  quizData: QuizData;
  moduleTitle: string;
  points: number;
  onComplete: (score: number, passed: boolean) => void;
  isCompleted?: boolean;
  previousScore?: number | null;
}

export default function QuizModule({
  quizData,
  moduleTitle,
  points,
  onComplete,
  isCompleted = false,
  previousScore,
}: QuizModuleProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const { questions, passingScore } = quizData;
  const totalQuestions = questions.length;

  const handleSelectAnswer = (optionIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Show results
      setShowResults(true);
      submitQuiz();
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        correct++;
      }
    });
    return Math.round((correct / totalQuestions) * 100);
  };

  const submitQuiz = async () => {
    setSubmitting(true);
    const score = calculateScore();
    const passed = score >= passingScore;
    await onComplete(score, passed);
    setSubmitting(false);
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setHasStarted(true);
  };

  const score = calculateScore();
  const passed = score >= passingScore;

  // Show previous completion state
  if (isCompleted && !hasStarted) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
            <CheckCircleSolid className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Quiz Completed!
          </h3>
          <p className="text-slate-600 mb-2">
            You scored <span className="font-bold text-brand-navy">{previousScore}%</span> on this quiz.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            You earned {points} points for completing this module.
          </p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  // Show start screen
  if (!hasStarted && !isCompleted) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-navy/10 mb-4">
            <span className="text-2xl">📝</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Knowledge Check
          </h3>
          <p className="text-slate-600 mb-4">
            Test your understanding of {moduleTitle} with this {totalQuestions}-question quiz.
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-slate-500 mb-6">
            <span className="flex items-center gap-1">
              <span className="font-medium text-slate-700">{totalQuestions}</span> questions
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1">
              <span className="font-medium text-slate-700">{passingScore}%</span> to pass
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1">
              <span className="font-medium text-slate-700">{points}</span> points
            </span>
          </div>
          <button
            onClick={() => setHasStarted(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-navy text-white rounded-lg hover:bg-[#3a3c9e] transition-colors font-medium"
          >
            Start Quiz
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Show results
  if (showResults) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="text-center">
          {passed ? (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-4">
                <CheckCircleSolid className="h-10 w-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Congratulations!
              </h3>
              <p className="text-slate-600 mb-4">
                You scored <span className="font-bold text-emerald-600">{score}%</span> and passed the quiz!
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 mb-4">
                <XCircleIcon className="h-10 w-10 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Almost There!
              </h3>
              <p className="text-slate-600 mb-4">
                You scored <span className="font-bold text-amber-600">{score}%</span>. You need {passingScore}% to pass.
              </p>
            </>
          )}

          {/* Results breakdown */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left max-h-64 overflow-y-auto">
            <h4 className="font-medium text-slate-900 mb-3">Results</h4>
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  {selectedAnswers[idx] === q.correctIndex ? (
                    <CheckCircleIcon className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="text-sm">
                    <p className="text-slate-700">{q.question}</p>
                    {selectedAnswers[idx] !== q.correctIndex && (
                      <p className="text-emerald-600 text-xs mt-1">
                        Correct: {q.options[q.correctIndex]}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Try Again
            </button>
            {passed && (
              <a
                href="/portal/learning/90-day-launch"
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-[#3a3c9e] transition-colors text-sm font-medium"
              >
                Continue Journey
                <ArrowRightIcon className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show current question
  const question = questions[currentQuestion];
  const hasAnswered = selectedAnswers[currentQuestion] !== undefined;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Progress bar */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
          <span>Question {currentQuestion + 1} of {totalQuestions}</span>
          <span>{Math.round(((currentQuestion + 1) / totalQuestions) * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-navy transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="p-6">
        <h3 className="text-lg font-medium text-slate-900 mb-6">
          {question.question}
        </h3>

        <div className="space-y-3 mb-6">
          {question.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectAnswer(idx)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedAnswers[currentQuestion] === idx
                  ? "border-brand-navy bg-brand-navy/5"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedAnswers[currentQuestion] === idx
                      ? "border-brand-navy bg-brand-navy"
                      : "border-slate-300"
                  }`}
                >
                  {selectedAnswers[currentQuestion] === idx && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <span className="text-slate-700">{option}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleNext}
            disabled={!hasAnswered || submitting}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-navy text-white rounded-lg hover:bg-[#3a3c9e] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                Submitting...
              </>
            ) : currentQuestion === totalQuestions - 1 ? (
              <>
                Submit Quiz
                <CheckCircleIcon className="h-5 w-5" />
              </>
            ) : (
              <>
                Next Question
                <ArrowRightIcon className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
