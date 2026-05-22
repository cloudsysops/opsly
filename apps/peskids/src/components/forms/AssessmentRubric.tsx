'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@intcloudsysops/components';

export interface RubricCriterion {
  id: string;
  name: string;
  description?: string;
  maxPoints: number;
  levels: {
    points: number;
    label: string;
    description: string;
  }[];
}

export interface RubricAssessment {
  submissionId: string;
  criteria: Record<string, number>; // criterionId -> points awarded
  feedback: string;
  totalScore: number;
}

interface AssessmentRubricProps {
  submissionId: string;
  rubric: RubricCriterion[];
  onSubmit: (assessment: RubricAssessment) => void;
  isLoading?: boolean;
}

export function AssessmentRubric({ submissionId, rubric, onSubmit, isLoading }: AssessmentRubricProps) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState('');

  const handleScoreChange = (criterionId: string, points: number) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: points,
    }));
  };

  const calculateTotal = (): number => {
    return Object.values(scores).reduce((sum, score) => sum + (score || 0), 0);
  };

  const getMaxScore = (): number => {
    return rubric.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  };

  const handleSubmit = () => {
    const assessment: RubricAssessment = {
      submissionId,
      criteria: scores,
      feedback,
      totalScore: calculateTotal(),
    };
    onSubmit(assessment);
  };

  const totalScore = calculateTotal();
  const maxScore = getMaxScore();
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Score Summary */}
      <Card className="border-ops-blue/50 bg-ops-surface/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ops-gray">Total Score</p>
              <p className="text-3xl font-bold text-neutral-100">
                {totalScore}
                <span className="text-lg text-ops-gray">/{maxScore}</span>
              </p>
              <p className="mt-2 text-sm text-ops-blue">{percentage}%</p>
            </div>
            <div className="h-24 w-24 rounded-full border-4 border-ops-blue flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-ops-blue">{percentage}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rubric Criteria */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-100">Assessment Criteria</h3>
        {rubric.map((criterion) => (
          <Card key={criterion.id} className="hover:border-ops-border/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-neutral-100">{criterion.name}</CardTitle>
                  {criterion.description && (
                    <CardDescription className="mt-1 text-ops-gray">{criterion.description}</CardDescription>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-ops-gray">Max: {criterion.maxPoints} pts</p>
                  <p className="text-lg font-bold text-ops-blue">
                    {scores[criterion.id] ?? 0} pts
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {criterion.levels.map((level) => (
                  <label
                    key={`${criterion.id}-${level.points}`}
                    className={`block rounded-lg border p-3 cursor-pointer transition ${
                      scores[criterion.id] === level.points
                        ? 'border-ops-blue bg-ops-blue/10'
                        : 'border-ops-border hover:border-ops-border/80'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name={criterion.id}
                        value={level.points}
                        checked={scores[criterion.id] === level.points}
                        onChange={(e) => handleScoreChange(criterion.id, parseInt(e.target.value))}
                        className="mt-1 h-4 w-4"
                      />
                      <div>
                        <p className="font-medium text-neutral-100">
                          {level.label}
                          <span className="ml-2 text-ops-blue">{level.points} pts</span>
                        </p>
                        <p className="mt-1 text-sm text-ops-gray">{level.description}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Feedback Section */}
      <div className="space-y-2">
        <label htmlFor="feedback" className="block text-sm font-medium text-neutral-100">
          Overall Feedback
        </label>
        <textarea
          id="feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Provide constructive feedback for the student..."
          className="w-full rounded-lg border border-ops-border bg-ops-surface px-4 py-2 text-neutral-100 placeholder-ops-gray focus:border-ops-blue focus:outline-none"
          rows={4}
        />
      </div>

      {/* Submit Button */}
      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={isLoading || Object.keys(scores).length === 0}
          className="flex-1 bg-ops-green hover:bg-ops-green/90 disabled:opacity-50"
        >
          {isLoading ? 'Submitting...' : 'Submit Assessment'}
        </Button>
      </div>
    </div>
  );
}
