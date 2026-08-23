'use client';

import { useEffect, useState, useRef } from 'react';

interface HealthFactor {
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  color: string;
  description: string;
}

interface HealthScoreRingProps {
  score: number;
  previousScore?: number;
  factors?: HealthFactor[];
  size?: 'sm' | 'md' | 'lg';
  showFactors?: boolean;
  animated?: boolean;
}

const defaultFactors: HealthFactor[] = [
  { name: 'Financial', score: 85, maxScore: 100, weight: 30, color: '#059669', description: 'Revenue growth & royalty compliance' },
  { name: 'Operational', score: 78, maxScore: 100, weight: 25, color: '#0891b2', description: 'Systems usage & efficiency' },
  { name: 'Compliance', score: 92, maxScore: 100, weight: 20, color: '#6A469D', description: 'Certifications & requirements' },
  { name: 'Engagement', score: 70, maxScore: 100, weight: 15, color: '#d97706', description: 'Training & communication' },
  { name: 'Growth', score: 88, maxScore: 100, weight: 10, color: '#34B256', description: 'YoY performance improvement' },
];

const sizeConfig = {
  sm: { ring: 120, thickness: 8, fontSize: 'text-3xl', label: 'text-xs' },
  md: { ring: 180, thickness: 12, fontSize: 'text-5xl', label: 'text-sm' },
  lg: { ring: 240, thickness: 16, fontSize: 'text-6xl', label: 'text-base' },
};

function getHealthColor(score: number): string {
  if (score >= 85) return 'var(--health-excellent)';
  if (score >= 70) return 'var(--health-good)';
  if (score >= 50) return 'var(--health-warning)';
  return 'var(--health-critical)';
}

function getHealthLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs Attention';
  return 'Critical';
}

export default function HealthScoreRing({
  score,
  previousScore,
  factors = defaultFactors,
  size = 'md',
  showFactors = true,
  animated = true,
}: HealthScoreRingProps) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredFactor, setHoveredFactor] = useState<string | null>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const config = sizeConfig[size];
  const radius = (config.ring - config.thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  // Intersection observer for triggering animation when visible
  useEffect(() => {
    if (!animated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (ringRef.current) {
      observer.observe(ringRef.current);
    }

    return () => observer.disconnect();
  }, [animated]);

  // Animate score counting up
  useEffect(() => {
    if (!animated || !isVisible) return;

    const duration = 1500;
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(score, Math.round(increment * step));
      setDisplayScore(current);

      if (step >= steps) {
        clearInterval(timer);
        setDisplayScore(score);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score, animated, isVisible]);

  const healthColor = getHealthColor(score);
  const healthLabel = getHealthLabel(score);
  const scoreDelta = previousScore !== undefined ? score - previousScore : null;

  return (
    <div className="flex flex-col lg:flex-row items-center gap-8">
      {/* Main Ring */}
      <div
        ref={ringRef}
        className="relative"
        style={{ width: config.ring, height: config.ring }}
      >
        <svg
          width={config.ring}
          height={config.ring}
          className="transform -rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={config.thickness}
          />
          {/* Progress ring */}
          <circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={radius}
            fill="none"
            stroke={healthColor}
            strokeWidth={config.thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animated && !isVisible ? circumference : strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease',
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-display ${config.fontSize} font-bold tracking-tight`}
            style={{ color: healthColor }}
          >
            {displayScore}
          </span>
          <span className={`font-body ${config.label} font-medium text-gray-500 uppercase tracking-wider`}>
            Health Score
          </span>
          {scoreDelta !== null && (
            <span
              className={`text-xs font-semibold mt-1 ${
                scoreDelta >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {scoreDelta >= 0 ? '+' : ''}{scoreDelta} from last month
            </span>
          )}
        </div>

        {/* Glow effect for excellent scores */}
        {score >= 85 && (
          <div
            className="absolute inset-0 rounded-full animate-pulse-glow"
            style={{ opacity: 0.3 }}
          />
        )}
      </div>

      {/* Health Label & Status */}
      <div className="text-center lg:text-left">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
          style={{
            backgroundColor: `${healthColor}15`,
            color: healthColor,
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: healthColor }}
          />
          {healthLabel}
        </div>
      </div>

      {/* Factor Breakdown */}
      {showFactors && (
        <div className="flex-1 w-full lg:w-auto space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Score Breakdown
          </h4>
          {factors.map((factor, index) => (
            <div
              key={factor.name}
              className="group cursor-pointer"
              onMouseEnter={() => setHoveredFactor(factor.name)}
              onMouseLeave={() => setHoveredFactor(null)}
              style={{
                opacity: animated && !isVisible ? 0 : 1,
                transform: animated && !isVisible ? 'translateY(10px)' : 'translateY(0)',
                transition: `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{factor.name}</span>
                  <span className="text-xs text-gray-400">({factor.weight}%)</span>
                </div>
                <span
                  className="text-sm font-bold"
                  style={{ color: factor.color }}
                >
                  {factor.score}
                </span>
              </div>
              <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: animated && !isVisible ? '0%' : `${factor.score}%`,
                    backgroundColor: factor.color,
                    transitionDelay: `${index * 100}ms`,
                  }}
                />
              </div>
              {/* Tooltip on hover */}
              {hoveredFactor === factor.name && (
                <div className="mt-1 text-xs text-gray-500 animate-fade-in">
                  {factor.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
