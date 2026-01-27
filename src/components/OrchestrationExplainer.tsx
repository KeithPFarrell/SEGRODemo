import { useState } from 'react';
import { ChevronDown, ChevronUp, Cpu, Info } from 'lucide-react';
import Card from './Card';

interface StepExplanation {
  step: string;
  agentActivity: string;
  automationValue: string;
}

const orchestrationExplanations: StepExplanation[] = [
  {
    step: 'Ingest',
    agentActivity: 'Agents automatically collect utility data from multiple sources (SFTP, email, APIs) across all markets (UK, CZ, EU). They handle various file formats and normalize data structure.',
    automationValue: 'Eliminates manual file gathering from 15+ sources. Saves ~2 hours per cycle.',
  },
  {
    step: 'Normalize',
    agentActivity: 'Agents transform diverse data formats into a unified schema. They detect column mappings, handle date formats, convert units, and standardize field names automatically.',
    automationValue: 'Removes manual data reformatting work. Saves ~3 hours per cycle.',
  },
  {
    step: 'Apply Rules',
    agentActivity: 'Agents apply business validation rules to detect anomalies: negative values, invalid date ranges, missing fields, unit mismatches, and unusual consumption patterns.',
    automationValue: 'Automated quality checks replace manual review. Saves ~4 hours per cycle.',
  },
  {
    step: 'Validate',
    agentActivity: 'Agents cross-reference meter readings against the central registry, check for duplicates, verify regional compliance requirements, and flag exceptions requiring human review.',
    automationValue: 'Intelligent validation catches errors early. Saves ~2 hours per cycle.',
  },
  {
    step: 'Prepare UL 360',
    agentActivity: 'Agents generate UL 360 compliant CSV files per market with proper formatting, required headers, and validated data ready for upload to the UL 360 portal.',
    automationValue: 'Automates tedious file preparation. Saves ~1.5 hours per cycle.',
  },
  {
    step: 'Await Verification',
    agentActivity: 'Agents pause for human verification (HITL Task 4). Once verified, agents handle file upload and monitor for confirmation or exceptions from UL 360.',
    automationValue: 'Orchestrates human-in-the-loop tasks efficiently.',
  },
  {
    step: 'Archive',
    agentActivity: 'Agents archive completed cycle data, generate audit logs, and prepare metrics for continuous improvement analysis.',
    automationValue: 'Ensures compliance and traceability. Saves ~1 hour per cycle.',
  },
];

export default function OrchestrationExplainer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const toggleStep = (step: string) => {
    setExpandedStep(expandedStep === step ? null : step);
  };

  return (
    <Card className="border-2 border-segro-teal">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center space-x-3">
          <div className="bg-segro-teal/10 p-2 rounded-lg">
            <Cpu className="w-5 h-5 text-segro-teal" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-segro-charcoal">What the Agents Did</h3>
            <p className="text-sm text-segro-midgray">Agentic orchestration explained</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-segro-midgray" />
        ) : (
          <ChevronDown className="w-5 h-5 text-segro-midgray" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-6 space-y-3">
          {orchestrationExplanations.map((explanation) => (
            <div
              key={explanation.step}
              className="border border-segro-lightgray rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleStep(explanation.step)}
                className="w-full bg-segro-offwhite hover:bg-gray-100 transition-colors p-4 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-segro-teal text-white rounded-full flex items-center justify-center text-xs font-bold">
                    <Info className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-segro-charcoal">{explanation.step}</span>
                </div>
                {expandedStep === explanation.step ? (
                  <ChevronUp className="w-4 h-4 text-segro-midgray" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-segro-midgray" />
                )}
              </button>

              {expandedStep === explanation.step && (
                <div className="p-4 bg-white space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-segro-charcoal mb-2">
                      🤖 Agent Activity
                    </h4>
                    <p className="text-sm text-segro-midgray leading-relaxed">
                      {explanation.agentActivity}
                    </p>
                  </div>
                  <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                    <h4 className="text-sm font-bold text-green-800 mb-1">
                      💰 Automation Value
                    </h4>
                    <p className="text-sm text-green-700">
                      {explanation.automationValue}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="mt-4 p-4 bg-gradient-to-r from-segro-teal/10 to-blue-50 rounded-lg border border-segro-teal">
            <h4 className="text-sm font-bold text-segro-charcoal mb-2">
              ⚡ Total Time Saved Per Cycle
            </h4>
            <p className="text-2xl font-bold text-segro-teal">~13.5 hours</p>
            <p className="text-xs text-segro-midgray mt-1">
              Powered by HCL Universal Orchestrator + Agentic AI
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
