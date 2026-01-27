import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, ChevronLeft, PlayCircle, CheckCircle2, X, RotateCcw } from 'lucide-react';
import { useDemoMode, demoSteps } from '../contexts/DemoModeContext';
import { useStore } from '../store';
import Button from './Button';
import Card from './Card';

export default function DemoGuidePanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentStep, setCurrentStep, nextStep, previousStep, toggleDemoMode, triggerStepAction, resetDemo } = useDemoMode();
  const { resetAllData } = useStore();

  const currentStepData = demoSteps[currentStep - 1];
  const isOnCorrectRoute = location.pathname === currentStepData.route;

  const handleJumpToStep = () => {
    // Navigate to the route
    navigate(currentStepData.route);

    // Trigger any registered action for this step (e.g., selecting a cycle)
    // Delay slightly to ensure the page has mounted
    setTimeout(() => {
      triggerStepAction(currentStep);
    }, 100);
  };

  const handleReset = async () => {
    // Reset all application data
    await resetAllData();

    // Reset demo mode state
    resetDemo();

    // Navigate to dashboard
    navigate('/');
  };

  return (
    <div className="fixed right-0 top-0 h-screen w-96 bg-white border-l-4 border-segro-red shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-segro-red to-red-700 text-white p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <PlayCircle className="w-6 h-6" />
            <h2 className="text-xl font-bold">Demo Guide</h2>
          </div>
          <button
            onClick={toggleDemoMode}
            className="text-white hover:text-gray-200 transition-colors"
            aria-label="Close demo mode"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <p className="text-sm opacity-90">Presenter Mode Active</p>
      </div>

      {/* Progress Indicator */}
      <div className="px-6 py-4 bg-segro-offwhite border-b border-segro-lightgray">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-segro-charcoal">
            Step {currentStep} of {demoSteps.length}
          </span>
          <span className="text-xs text-segro-midgray">
            {Math.round((currentStep / demoSteps.length) * 100)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-segro-red h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / demoSteps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Step Details */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <Card>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-segro-red text-white rounded-full flex items-center justify-center font-bold">
                {currentStep}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-segro-charcoal mb-2">
                  {currentStepData.title}
                </h3>
                <p className="text-sm text-segro-midgray leading-relaxed">
                  {currentStepData.description}
                </p>
              </div>
            </div>

            {!isOnCorrectRoute && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                <p className="text-sm text-yellow-800">
                  You're not on the correct page for this step.
                </p>
              </div>
            )}

            <Button
              variant="primary"
              onClick={handleJumpToStep}
              className="w-full"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Jump to This Step
            </Button>
          </div>
        </Card>

        {/* All Steps Overview */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-segro-charcoal uppercase tracking-wide">
            All Steps
          </h4>
          {demoSteps.map((step) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                step.id === currentStep
                  ? 'border-segro-red bg-red-50 shadow-sm'
                  : step.id < currentStep
                  ? 'border-green-200 bg-green-50'
                  : 'border-segro-lightgray bg-white hover:bg-segro-offwhite'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.id === currentStep
                      ? 'bg-segro-red text-white'
                      : step.id < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {step.id < currentStep ? <CheckCircle2 className="w-4 h-4" /> : step.id}
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${
                    step.id === currentStep ? 'text-segro-red' : 'text-segro-charcoal'
                  }`}>
                    {step.title}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="p-6 bg-segro-offwhite border-t border-segro-lightgray space-y-3">
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={previousStep}
            disabled={currentStep === 1}
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          {currentStep === demoSteps.length ? (
            <Button
              variant="primary"
              onClick={handleReset}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Demo
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={nextStep}
              className="flex-1"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
        <p className="text-xs text-center text-segro-midgray">
          {currentStep === demoSteps.length
            ? 'Click Reset to restore all data to initial state'
            : 'Use arrow buttons or click steps above to navigate'}
        </p>
      </div>
    </div>
  );
}
