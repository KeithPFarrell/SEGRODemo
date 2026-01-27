import { createContext, useContext, useState, ReactNode } from 'react';

export interface DemoStep {
  id: number;
  title: string;
  description: string;
  route: string;
  highlightSelector?: string;
  autoFillAction?: string;
  targetCycleId?: string;
  targetExceptionName?: string;
}

export const demoSteps: DemoStep[] = [
  {
    id: 1,
    title: 'Start a Reporting Cycle',
    description: 'Navigate to Reporting Cycles and click "Run Report Now" to trigger the orchestration (HITL Task 1).',
    route: '/cycles',
    highlightSelector: '[data-demo="run-report-btn"]',
    autoFillAction: 'run-report',
    targetCycleId: 'cycle-2026-02', // February 2026 Reporting
  },
  {
    id: 2,
    title: 'View Generated Exceptions',
    description: 'See the exceptions queue populated with validation failures discovered during orchestration.',
    route: '/exceptions',
    highlightSelector: '[data-demo="exceptions-list"]',
  },
  {
    id: 3,
    title: 'Resolve Registry Exception',
    description: 'Select a Registry exception and mark the meter as added to the central registry (HITL Task 2).',
    route: '/exceptions',
    highlightSelector: '[data-demo="registry-resolution"]',
    autoFillAction: 'resolve-registry',
    targetExceptionName: 'Amsterdam South - Water Meter',
  },
  {
    id: 4,
    title: 'Fix Reading Exception',
    description: 'Resolve a meter reading exception by correcting the date range (HITL Task 3).',
    route: '/exceptions',
    highlightSelector: '[data-demo="apply-date-correction"]',
    autoFillAction: 'fix-reading',
    targetExceptionName: 'Berlin West - Electricity Meter 7',
  },
  {
    id: 5,
    title: 'UL 360 File Prepared',
    description: 'View the automatically prepared UL 360 upload file ready for submission.',
    route: '/ul360',
    highlightSelector: '[data-demo="ul360-files"]',
  },
  {
    id: 6,
    title: 'Verify Upload Success',
    description: 'Choose the success path: Mark the UL 360 upload as verified (HITL Task 4).',
    route: '/cycles',
    highlightSelector: '[data-demo="verify-upload"]',
    autoFillAction: 'verify-upload',
    targetCycleId: 'cycle-2026-02', // February 2026 Reporting
  },
  {
    id: 7,
    title: 'View Activity Log',
    description: 'Review the complete activity log showing all orchestration steps, user actions, and system events.',
    route: '/activity',
    highlightSelector: '[data-demo="activity-log"]',
  },
];

interface DemoModeContextType {
  isDemoMode: boolean;
  currentStep: number;
  toggleDemoMode: () => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  resetDemo: () => void;
  impactMetrics: {
    hoursAvoided: number;
    exceptionsResolved: number;
    timeReduction: number;
  };
  updateImpactMetrics: (updates: Partial<DemoModeContextType['impactMetrics']>) => void;
  triggerStepAction: (stepId: number) => void;
  stepActionCallbacks: Map<number, () => void>;
  registerStepCallback: (stepId: number, callback: () => void) => void;
  unregisterStepCallback: (stepId: number) => void;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [impactMetrics, setImpactMetrics] = useState({
    hoursAvoided: 0,
    exceptionsResolved: 0,
    timeReduction: 0,
  });
  const [stepActionCallbacks] = useState<Map<number, () => void>>(new Map());

  const toggleDemoMode = () => {
    setIsDemoMode(!isDemoMode);
    if (!isDemoMode) {
      setCurrentStep(1);
      setImpactMetrics({
        hoursAvoided: 0,
        exceptionsResolved: 0,
        timeReduction: 0,
      });
    }
  };

  const nextStep = () => {
    if (currentStep < demoSteps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetDemo = () => {
    setCurrentStep(1);
    setImpactMetrics({
      hoursAvoided: 0,
      exceptionsResolved: 0,
      timeReduction: 0,
    });
  };

  const updateImpactMetrics = (updates: Partial<typeof impactMetrics>) => {
    setImpactMetrics(prev => ({ ...prev, ...updates }));
  };

  const registerStepCallback = (stepId: number, callback: () => void) => {
    stepActionCallbacks.set(stepId, callback);
  };

  const unregisterStepCallback = (stepId: number) => {
    stepActionCallbacks.delete(stepId);
  };

  const triggerStepAction = (stepId: number) => {
    const callback = stepActionCallbacks.get(stepId);
    if (callback) {
      callback();
    }
  };

  return (
    <DemoModeContext.Provider
      value={{
        isDemoMode,
        currentStep,
        toggleDemoMode,
        setCurrentStep,
        nextStep,
        previousStep,
        resetDemo,
        impactMetrics,
        updateImpactMetrics,
        triggerStepAction,
        stepActionCallbacks,
        registerStepCallback,
        unregisterStepCallback,
      }}
    >
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}
