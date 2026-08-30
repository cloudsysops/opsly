"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

type SurveyType = "MILESTONE_PREWORK" | "MILESTONE_30DAY" | "MILESTONE_90DAY" | "QUARTERLY";

const SURVEY_TYPE_LABELS: Record<SurveyType, string> = {
  MILESTONE_PREWORK: "Pre-Work Completion",
  MILESTONE_30DAY: "30-Day Check-In",
  MILESTONE_90DAY: "90-Day Check-In",
  QUARTERLY: "Quarterly Feedback",
};

interface SurveyFormProps {
  alreadyCompleted: boolean;
  surveyType: SurveyType;
}

export default function SurveyForm({ alreadyCompleted, surveyType }: SurveyFormProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Answers
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [cesScore, setCesScore] = useState<number | null>(null);
  const [usabilityScore, setUsabilityScore] = useState<number | null>(null);
  const [helpfulnessScore, setHelpfulnessScore] = useState<number | null>(null);
  const [reliabilityScore, setReliabilityScore] = useState<number | null>(null);
  const [whatWorksWell, setWhatWorksWell] = useState("");
  const [whatToImprove, setWhatToImprove] = useState("");

  const totalSteps = 7;

  if (alreadyCompleted) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="bg-white rounded-2xl shadow-lg p-10">
          <div className="w-16 h-16 bg-brand-cyan/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-brand-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-brand-navy mb-3">You&apos;ve Already Submitted Feedback</h2>
          <p className="text-gray-600 mb-8">
            Thank you for your recent {SURVEY_TYPE_LABELS[surveyType]} feedback.
            We&apos;ll reach out when the next survey period opens.
          </p>
          <a
            href="/portal/dashboard"
            className="inline-block px-6 py-3 bg-brand-navy text-white rounded-lg font-medium hover:bg-brand-navy/90 transition-colors"
          >
            Back to Portal
          </a>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="bg-white rounded-2xl shadow-lg p-10">
          <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-brand-navy mb-3">Thank You!</h2>
          <p className="text-gray-600 mb-8">
            Your feedback helps us improve the franchise portal for everyone. We read every response.
          </p>
          <a
            href="/portal/dashboard"
            className="inline-block px-6 py-3 bg-brand-navy text-white rounded-lg font-medium hover:bg-brand-navy/90 transition-colors"
          >
            Back to Portal
          </a>
        </div>
      </div>
    );
  }

  const canAdvance = (): boolean => {
    switch (step) {
      case 0: return npsScore !== null;
      case 1: return cesScore !== null;
      case 2: return usabilityScore !== null;
      case 3: return helpfulnessScore !== null;
      case 4: return reliabilityScore !== null;
      case 5: return true; // open text, optional
      case 6: return true; // open text, optional
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (npsScore === null || cesScore === null || usabilityScore === null || helpfulnessScore === null || reliabilityScore === null) {
      setError("Please complete all required questions.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyType,
          npsScore,
          cesScore,
          usabilityScore,
          helpfulnessScore,
          reliabilityScore,
          whatWorksWell: whatWorksWell.trim() || undefined,
          whatToImprove: whatToImprove.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit survey");
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-brand-navy mb-2">
          {SURVEY_TYPE_LABELS[surveyType]} Survey
        </h1>
        <p className="text-gray-600">Help us improve your franchise portal experience</p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Question {step + 1} of {totalSteps}</span>
          <span>{Math.round(((step + 1) / totalSteps) * 100)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-navy rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 min-h-[320px] flex flex-col">
        <div className="flex-1">
          {step === 0 && (
            <NpsQuestion value={npsScore} onChange={setNpsScore} />
          )}
          {step === 1 && (
            <CesQuestion value={cesScore} onChange={setCesScore} />
          )}
          {step === 2 && (
            <StarQuestion
              label="The portal is easy to navigate and understand."
              value={usabilityScore}
              onChange={setUsabilityScore}
            />
          )}
          {step === 3 && (
            <StarQuestion
              label="The content and tools help me run my franchise."
              value={helpfulnessScore}
              onChange={setHelpfulnessScore}
            />
          )}
          {step === 4 && (
            <StarQuestion
              label="The portal works without errors or issues."
              value={reliabilityScore}
              onChange={setReliabilityScore}
            />
          )}
          {step === 5 && (
            <OpenQuestion
              label="What's working well?"
              placeholder="Tell us what you like about the portal..."
              value={whatWorksWell}
              onChange={setWhatWorksWell}
            />
          )}
          {step === 6 && (
            <OpenQuestion
              label="What should we improve?"
              placeholder="Tell us what could be better..."
              value={whatToImprove}
              onChange={setWhatToImprove}
            />
          )}
        </div>

        {error && (
          <p className="text-red-600 text-sm mt-4">{error}</p>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="px-5 py-2.5 text-gray-600 hover:text-brand-navy disabled:opacity-0 disabled:pointer-events-none transition-colors font-medium"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!canAdvance() || submitting}
            className="px-6 py-2.5 bg-brand-navy text-white rounded-lg font-medium hover:bg-brand-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Submitting...
              </span>
            ) : step === totalSteps - 1 ? (
              "Submit Feedback"
            ) : (
              "Next"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Question Components ─── */

function NpsQuestion({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        How likely are you to recommend this portal to a fellow franchisee?
      </h2>
      <p className="text-sm text-gray-500 mb-6">0 = Not at all likely, 10 = Extremely likely</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`w-12 h-12 rounded-lg font-semibold text-sm transition-all ${
              value === i
                ? i <= 6
                  ? "bg-red-500 text-white shadow-md scale-110"
                  : i <= 8
                  ? "bg-brand-yellow text-gray-900 shadow-md scale-110"
                  : "bg-brand-green text-white shadow-md scale-110"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {i}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-3 px-1">
        <span>Not likely</span>
        <span>Extremely likely</span>
      </div>
    </div>
  );
}

const CES_LABELS = [
  "Strongly disagree",
  "Disagree",
  "Somewhat disagree",
  "Neutral",
  "Somewhat agree",
  "Agree",
  "Strongly agree",
];

function CesQuestion({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        The portal makes it easy to complete my tasks.
      </h2>
      <p className="text-sm text-gray-500 mb-6">Rate from 1 (Strongly disagree) to 7 (Strongly agree)</p>
      <div className="space-y-2">
        {CES_LABELS.map((label, idx) => {
          const score = idx + 1;
          const isSelected = value === score;
          return (
            <button
              key={score}
              onClick={() => onChange(score)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                isSelected
                  ? "bg-brand-navy text-white shadow-md"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                isSelected ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
              }`}>
                {score}
              </span>
              <span className="text-sm font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StarQuestion({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-6">{label}</h2>
      <div className="flex justify-center gap-3">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = hovered !== null ? star <= hovered : value !== null && star <= value;
          return (
            <button
              key={star}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(null)}
              className="transition-transform hover:scale-110"
            >
              <svg
                className={`w-12 h-12 transition-colors ${
                  filled ? "text-brand-yellow" : "text-gray-300"
                }`}
                fill={filled ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-3 px-4">
        <span>Poor</span>
        <span>Excellent</span>
      </div>
    </div>
  );
}

function OpenQuestion({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{label}</h2>
      <p className="text-sm text-gray-500 mb-4">Optional — but we&apos;d love to hear from you</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={5}
        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy outline-none resize-none transition-colors"
        maxLength={2000}
      />
      <p className="text-xs text-gray-400 mt-1 text-right">{value.length}/2000</p>
    </div>
  );
}
