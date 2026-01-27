import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { OrchestrationStep } from '../types';

interface OrchestrationProgressProps {
  currentStep: OrchestrationStep;
  isOrchestrating: boolean;
}

// Define sub-steps for each orchestration stage
const stageMessages: Record<OrchestrationStep, string[]> = {
  'Ingest': [
    'Getting UK meter reading data.',
    'Getting CZ meter reading data.',
  ],
  'Normalize': [
    'Extracting UK meter reading data.',
    'Transforming CZ meter reading data.',
  ],
  'Apply Rules': [
    'Checking the UK meter registry.',
    'Checking CZ data integrity.',
  ],
  'Validate': [
    'Identifying duplicates.',
    'Flagging exceptions.',
  ],
  'Prepare UL 360': [
    'Finalising UL 360 upload file.',
  ],
  'Await Verification': [],
  'Archive': [],
};

export default function OrchestrationProgress({ currentStep, isOrchestrating }: OrchestrationProgressProps) {
  const [displayedMessages, setDisplayedMessages] = useState<string[]>([]);
  const messages = stageMessages[currentStep] || [];

  // Reset when step changes
  useEffect(() => {
    setDisplayedMessages([]);
  }, [currentStep]);

  // Cycle through messages for the current step
  useEffect(() => {
    if (!isOrchestrating || messages.length === 0) {
      return;
    }

    // Show first message immediately
    if (displayedMessages.length === 0) {
      setDisplayedMessages([messages[0]]);
    }

    // Cycle through remaining messages
    const interval = setInterval(() => {
      setDisplayedMessages((prevMessages) => {
        const currentIndex = prevMessages.length;
        if (currentIndex < messages.length) {
          // Add next message in sequence
          return [...prevMessages, messages[currentIndex]];
        }
        // All messages shown, keep them visible
        return prevMessages;
      });
    }, 1200); // Add new message every 1.2 seconds

    return () => clearInterval(interval);
  }, [isOrchestrating, messages, displayedMessages.length]);

  if (!isOrchestrating || messages.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <Loader2 className="w-5 h-5 text-segro-teal animate-spin flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="font-medium text-segro-charcoal">
            Processing: {currentStep}
          </div>
          <div className="space-y-1">
            {displayedMessages.map((message, idx) => (
              <div
                key={idx}
                className={`text-sm ${
                  idx === displayedMessages.length - 1
                    ? 'text-segro-charcoal font-medium'
                    : 'text-segro-midgray'
                }`}
              >
                {message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
