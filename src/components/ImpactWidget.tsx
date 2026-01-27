import { useEffect, useState } from 'react';
import { TrendingUp, Clock, CheckCircle, Zap } from 'lucide-react';
import { useDemoMode } from '../contexts/DemoModeContext';
import Card from './Card';

export default function ImpactWidget() {
  const { impactMetrics } = useDemoMode();
  const [animatedMetrics, setAnimatedMetrics] = useState({
    hoursAvoided: 0,
    exceptionsResolved: 0,
    timeReduction: 0,
  });

  // Animate metrics when they change
  useEffect(() => {
    const duration = 1000; // 1 second animation
    const steps = 30;
    const interval = duration / steps;

    const startValues = { ...animatedMetrics };
    const differences = {
      hoursAvoided: impactMetrics.hoursAvoided - startValues.hoursAvoided,
      exceptionsResolved: impactMetrics.exceptionsResolved - startValues.exceptionsResolved,
      timeReduction: impactMetrics.timeReduction - startValues.timeReduction,
    };

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setAnimatedMetrics({
        hoursAvoided: startValues.hoursAvoided + differences.hoursAvoided * progress,
        exceptionsResolved: startValues.exceptionsResolved + differences.exceptionsResolved * progress,
        timeReduction: startValues.timeReduction + differences.timeReduction * progress,
      });

      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedMetrics(impactMetrics);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [impactMetrics]);

  return (
    <Card className="bg-gradient-to-br from-segro-teal/10 via-blue-50 to-green-50 border-2 border-segro-teal">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="bg-segro-teal p-2 rounded-lg">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-segro-charcoal">Live Impact Metrics</h3>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Hours Avoided */}
          <div className="bg-white rounded-lg p-4 border border-segro-lightgray">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-segro-midgray">
                  Manual Hours Avoided
                </span>
              </div>
              <Zap className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-segro-charcoal">
                {animatedMetrics.hoursAvoided.toFixed(1)}
              </span>
              <span className="text-sm text-segro-midgray">hours</span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000"
                style={{ width: `${Math.min((animatedMetrics.hoursAvoided / 13.5) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Exceptions Resolved */}
          <div className="bg-white rounded-lg p-4 border border-segro-lightgray">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-segro-midgray">
                  Exceptions Resolved Today
                </span>
              </div>
              <Zap className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-segro-charcoal">
                {Math.floor(animatedMetrics.exceptionsResolved)}
              </span>
              <span className="text-sm text-segro-midgray">issues</span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-1000"
                style={{ width: `${Math.min((animatedMetrics.exceptionsResolved / 10) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Time Reduction */}
          <div className="bg-white rounded-lg p-4 border border-segro-lightgray">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-segro-teal" />
                <span className="text-sm font-medium text-segro-midgray">
                  Reporting Readiness
                </span>
              </div>
              <Zap className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-segro-charcoal">
                {Math.floor(animatedMetrics.timeReduction)}%
              </span>
              <span className="text-sm text-segro-midgray">faster</span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-segro-teal to-teal-600 transition-all duration-1000"
                style={{ width: `${Math.min(animatedMetrics.timeReduction, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 border border-segro-lightgray">
          <p className="text-xs text-segro-midgray text-center">
            <span className="font-bold text-segro-charcoal">Real-time automation impact</span>
            <br />
            Metrics update as you complete demo steps
          </p>
        </div>
      </div>
    </Card>
  );
}
