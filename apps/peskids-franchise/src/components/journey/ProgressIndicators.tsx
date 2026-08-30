"use client";

interface PhaseProgressProps {
  name: string;
  completedTasks: number;
  totalTasks: number;
  progress: number;
  isComplete: boolean;
  isCurrent?: boolean;
}

export function PhaseProgress({
  name,
  completedTasks,
  totalTasks,
  progress,
  isComplete,
  isCurrent = false,
}: PhaseProgressProps) {
  return (
    <div
      className={`p-4 rounded-xl border ${
        isComplete
          ? "bg-green-50 border-green-200"
          : isCurrent
            ? "bg-brand-light border-brand-cyan"
            : "bg-gray-50 border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-brand-navy">
          {isComplete && <span className="mr-1">✅</span>}
          {name}
        </h3>
        <span className="text-sm text-gray-600">
          {completedTasks}/{totalTasks} tasks
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            isComplete ? "bg-green-500" : "bg-brand-cyan"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">{progress}% complete</p>
    </div>
  );
}

interface WeekProgressProps {
  name: string;
  weekNumber: number;
  completedTasks: number;
  totalTasks: number;
  isComplete: boolean;
  isCurrentWeek?: boolean;
}

export function WeekProgress({
  name,
  weekNumber,
  completedTasks,
  totalTasks,
  isComplete,
  isCurrentWeek = false,
}: WeekProgressProps) {
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg ${
        isComplete
          ? "bg-green-50"
          : isCurrentWeek
            ? "bg-brand-light"
            : "bg-gray-50"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
          isComplete
            ? "bg-green-500 text-white"
            : isCurrentWeek
              ? "bg-brand-cyan text-brand-navy"
              : "bg-gray-200 text-gray-600"
        }`}
      >
        {isComplete ? "✓" : weekNumber}
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{name}</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${isComplete ? "bg-green-500" : "bg-brand-cyan"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">
            {completedTasks}/{totalTasks}
          </span>
        </div>
      </div>
    </div>
  );
}

interface OverallProgressProps {
  completedTasks: number;
  totalTasks: number;
  currentDay: number;
  completedMilestones: number;
  totalMilestones: number;
}

export function OverallProgress({
  completedTasks,
  totalTasks,
  currentDay,
  completedMilestones,
  totalMilestones,
}: OverallProgressProps) {
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      {/* Progress Ring */}
      <div className="relative w-44 h-44">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="88"
            cy="88"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
          />
          {/* Progress circle */}
          <circle
            cx="88"
            cy="88"
            r={radius}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34B256" />
              <stop offset="100%" stopColor="#50C8DF" />
            </linearGradient>
          </defs>
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-brand-navy">{progress}%</span>
          <span className="text-sm text-gray-500">Complete</span>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-brand-navy">Day {currentDay}</p>
          <p className="text-xs text-gray-500">of 90</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-brand-navy">{completedTasks}</p>
          <p className="text-xs text-gray-500">of {totalTasks} tasks</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-brand-navy">{completedMilestones}</p>
          <p className="text-xs text-gray-500">of {totalMilestones} milestones</p>
        </div>
      </div>
    </div>
  );
}

interface DeadlineIndicatorProps {
  targetDay: number;
  currentDay: number;
  isCompleted: boolean;
}

export function DeadlineIndicator({
  targetDay,
  currentDay,
  isCompleted,
}: DeadlineIndicatorProps) {
  if (isCompleted) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-green-600">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        Completed
      </span>
    );
  }

  const daysUntilDue = targetDay - currentDay;

  if (daysUntilDue < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-red-600 font-medium">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        {Math.abs(daysUntilDue)} day{Math.abs(daysUntilDue) > 1 ? "s" : ""} overdue
      </span>
    );
  }

  if (daysUntilDue === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-orange-600 font-medium">
        <span className="w-2 h-2 rounded-full bg-orange-500" />
        Due today
      </span>
    );
  }

  if (daysUntilDue <= 3) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-orange-500">
        <span className="w-2 h-2 rounded-full bg-orange-400" />
        Due in {daysUntilDue} day{daysUntilDue > 1 ? "s" : ""}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm text-gray-500">
      <span className="w-2 h-2 rounded-full bg-gray-300" />
      Due Day {targetDay}
    </span>
  );
}
