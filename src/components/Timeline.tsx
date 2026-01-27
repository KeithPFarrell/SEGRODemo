import { Check, Clock, Circle } from 'lucide-react';
import { OrchestrationStep } from '../types';

interface TimelineProps {
  steps: OrchestrationStep[];
  currentStep: OrchestrationStep;
  stepTimestamps: Record<OrchestrationStep, string | null>;
  compact?: boolean;
}

export default function Timeline({ steps, currentStep, stepTimestamps, compact = false }: TimelineProps) {
  const getCurrentStepIndex = () => steps.indexOf(currentStep);
  const currentStepIndex = getCurrentStepIndex();

  const getStepStatus = (index: number) => {
    const step = steps[index];
    // Check if it's the current step first (should show as active/current)
    if (index === currentStepIndex) {
      // If current step has a timestamp AND it's the last step (Archive), show as completed
      if (stepTimestamps[step] && index === steps.length - 1) return 'completed';
      // Otherwise, current step shows as active
      return 'current';
    }
    // If it's before the current step, it's completed
    if (index < currentStepIndex) return 'completed';
    // If this step has a timestamp but it's not current, it's completed
    if (stepTimestamps[step]) return 'completed';
    return 'pending';
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${compact ? 'items-center space-x-2' : 'flex-col space-y-4'}`}>
      {steps.map((step, index) => {
        const status = getStepStatus(index);
        const timestamp = stepTimestamps[step];

        return (
          <div key={step} className={`flex items-center ${compact ? '' : 'space-x-3'}`}>
            {/* Icon */}
            <div className="flex-shrink-0">
              {status === 'completed' && (
                <div className="w-8 h-8 rounded-full bg-segro-teal-accent flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}
              {status === 'current' && (
                <div className="w-8 h-8 rounded-full bg-segro-red flex items-center justify-center animate-pulse">
                  <Clock className="w-5 h-5 text-white" />
                </div>
              )}
              {status === 'pending' && (
                <div className="w-8 h-8 rounded-full border-2 border-segro-lightgray flex items-center justify-center">
                  <Circle className="w-4 h-4 text-segro-midgray" />
                </div>
              )}
            </div>

            {/* Text */}
            {!compact && (
              <div className="flex-1">
                <div
                  className={`font-medium ${
                    status === 'current'
                      ? 'text-segro-red'
                      : status === 'completed'
                      ? 'text-segro-teal-accent'
                      : 'text-segro-midgray'
                  }`}
                >
                  {step}
                </div>
                {timestamp && (
                  <div className="text-sm text-segro-midgray">{formatTime(timestamp)}</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
