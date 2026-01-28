import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, CheckCircle, Upload, X } from 'lucide-react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Timeline from '../components/Timeline';
import OrchestrationProgress from '../components/OrchestrationProgress';
import ReportSummary from '../components/ReportSummary';
import { useStore } from '../store';
import { useDemoMode } from '../contexts/DemoModeContext';
import { formatDateTime, formatTimeAgo } from '../utils/formatters';
import { ReportingCycle } from '../types';

export default function ReportingCycles() {
  const navigate = useNavigate();
  const { cycles, loadCycles, runCycle, verifyUL360, uploadFailureFile, ul360Files, loadUL360Files } = useStore();
  const { isDemoMode, currentStep, updateImpactMetrics, impactMetrics, registerStepCallback, unregisterStepCallback } = useDemoMode();
  const [selectedCycle, setSelectedCycle] = useState<ReportingCycle | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    loadCycles();
    loadUL360Files();
  }, [loadCycles, loadUL360Files]);

  // Auto-select first cycle when cycles load
  useEffect(() => {
    if (cycles.length > 0 && !selectedCycle) {
      setSelectedCycle(cycles[0]);
    }
  }, [cycles, selectedCycle]);

  // Register demo mode callbacks for Steps 1 & 6 - Auto-select February 2026 cycle
  useEffect(() => {
    if (isDemoMode) {
      const selectFebruaryCycle = () => {
        const februaryCycle = cycles.find(c => c.id === 'cycle-2026-02');
        if (februaryCycle) {
          setSelectedCycle(februaryCycle);
        }
      };

      // Both Step 1 and Step 6 need to select February 2026 cycle
      registerStepCallback(1, selectFebruaryCycle);
      registerStepCallback(6, selectFebruaryCycle);

      return () => {
        unregisterStepCallback(1);
        unregisterStepCallback(6);
      };
    }
  }, [isDemoMode, cycles, registerStepCallback, unregisterStepCallback]);

  // Auto-update selected cycle when cycles change
  useEffect(() => {
    if (selectedCycle) {
      const updated = cycles.find(c => c.id === selectedCycle.id);
      if (updated) {
        setSelectedCycle(updated);
      }
    }
  }, [cycles, selectedCycle]);

  // Polling effect for orchestration updates
  useEffect(() => {
    if (isOrchestrating) {
      pollingIntervalRef.current = window.setInterval(() => {
        loadCycles();
      }, 1500); // Poll every 1.5 seconds

      return () => {
        if (pollingIntervalRef.current) {
          window.clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [isOrchestrating, loadCycles]);

  // Stop polling when orchestration completes
  useEffect(() => {
    if (selectedCycle && isOrchestrating) {
      // Check if orchestration is complete
      if (selectedCycle.status === 'awaiting_verification' ||
          selectedCycle.status === 'completed' ||
          selectedCycle.status === 'failed') {
        setIsOrchestrating(false);
      }
    }
  }, [selectedCycle, isOrchestrating]);

  const handleRunCycle = async (cycleId: string) => {
    setIsOrchestrating(true);
    await runCycle(cycleId);
    // Polling will continue to update the UI automatically

    // Update demo mode metrics
    if (isDemoMode) {
      updateImpactMetrics({
        hoursAvoided: impactMetrics.hoursAvoided + 2.5,
        timeReduction: Math.min(impactMetrics.timeReduction + 15, 85),
      });
    }
  };

  const handleVerify = async (success: boolean) => {
    if (!selectedCycle) return;

    // Clear any previous verification message
    setVerificationMessage(null);

    try {
      const result = await verifyUL360(selectedCycle.id, success);

      // Reload cycles and files immediately
      await loadCycles();
      await loadUL360Files();
      const updatedCycle = cycles.find(c => c.id === selectedCycle.id);
      if (updatedCycle) setSelectedCycle(updatedCycle);

      // Check if verification failed (found new exceptions)
      if (result.verificationFailed) {
        setVerificationMessage({
          type: 'error',
          text: `Verification failed: Found ${result.newExceptionsCount} additional exceptions (1 meter, 1 data). Reprocessing will begin automatically...`,
        });

        // Poll for updates to catch the reprocessing (happens after 3 seconds)
        let pollCount = 0;
        const pollInterval = setInterval(async () => {
          pollCount++;
          await loadCycles();
          await loadUL360Files();
          const refreshedCycle = cycles.find(c => c.id === selectedCycle.id);
          if (refreshedCycle) {
            setSelectedCycle(refreshedCycle);
          }

          // Stop polling after 5 seconds (enough time to catch reprocessing)
          if (pollCount >= 5) {
            clearInterval(pollInterval);
            // Update message to indicate reprocessing is complete
            setVerificationMessage({
              type: 'error',
              text: `Verification failed: Found ${result.newExceptionsCount} additional exceptions. Reprocessing complete. Please resolve all exceptions and verify again.`,
            });
          }
        }, 1000);
      } else if (success) {
        // Verification succeeded
        setVerificationMessage({
          type: 'success',
          text: 'Verification successful! Upload verified and cycle archived.',
        });

        // Clear message after 5 seconds
        setTimeout(() => setVerificationMessage(null), 5000);
      }

      // Update demo mode metrics
      if (isDemoMode) {
        updateImpactMetrics({
          hoursAvoided: impactMetrics.hoursAvoided + 1.5,
          timeReduction: Math.min(impactMetrics.timeReduction + 10, 85),
        });
      }
    } catch (error) {
      setVerificationMessage({
        type: 'error',
        text: 'Verification failed: An error occurred. Please try again.',
      });
    }
  };

  const handleUploadFailure = async () => {
    if (!selectedCycle || !uploadFile) return;
    await uploadFailureFile(selectedCycle.id, uploadFile);
    setShowUploadModal(false);
    setUploadFile(null);
    const updatedCycle = cycles.find(c => c.id === selectedCycle.id);
    if (updatedCycle) setSelectedCycle(updatedCycle);
  };

  const handleNavigateToExceptions = (typeFilter: 'meter' | 'data', statusFilter: 'open' | 'resolved') => {
    navigate('/exceptions', {
      state: {
        typeFilter,
        statusFilter,
        cycleId: selectedCycle?.id
      }
    });
  };

  const handleDownloadFile = async (fileId: string) => {
    const file = ul360Files.find(f => f.id === fileId);
    if (file && file.downloadUrl) {
      try {
        // Fetch the file as a blob to ensure proper binary handling
        const response = await fetch(file.downloadUrl);
        const blob = await response.blob();

        // Create a temporary URL for the blob
        const url = window.URL.createObjectURL(blob);

        // Create and trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download failed:', error);
        alert('Failed to download file. Please try again.');
      }
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'info';
      case 'awaiting_verification':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const orchestrationSteps: any[] = [
    'Ingest',
    'Normalize',
    'Apply Rules',
    'Validate',
    'Prepare UL 360',
    'Await Verification',
    'Archive',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-segro-charcoal">Reporting Cycles</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cycles List */}
        <div className="lg:col-span-1 space-y-4">
          {cycles.map(cycle => (
            <Card
              key={cycle.id}
              hover
              onClick={() => setSelectedCycle(cycle)}
              className={selectedCycle?.id === cycle.id ? 'ring-2 ring-segro-red' : ''}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-segro-charcoal">{cycle.name}</h3>
                    <div className="text-sm text-segro-midgray mt-1">
                      {formatDateTime(cycle.scheduledStartDate)}
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(cycle.status)} size="sm">
                    {cycle.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex space-x-2">
                    {cycle.markets.map(market => (
                      <Badge key={market} variant="default" size="sm">
                        {market}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-segro-midgray text-xs">
                    <div>{cycle.exceptionCounts.meter} meter</div>
                    <div>{cycle.exceptionCounts.data} data</div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Cycle Details Panel */}
        <div className="lg:col-span-2">
          {selectedCycle ? (
            <div className="space-y-6">
              {/* Header */}
              <Card>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-segro-charcoal">{selectedCycle.name}</h2>
                    <div className="flex items-center space-x-3 mt-2">
                      <Badge variant={getStatusVariant(selectedCycle.status)}>
                        {selectedCycle.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant={selectedCycle.ul360Status === 'verified' ? 'success' : 'info'}>
                        UL 360: {selectedCycle.ul360Status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedCycle(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* HITL Actions */}
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3">
                    {selectedCycle.status === 'scheduled' && (
                      <Button
                        variant="primary"
                        onClick={() => handleRunCycle(selectedCycle.id)}
                        disabled={isOrchestrating}
                        data-demo="run-report-btn"
                        className={isDemoMode ? 'ring-4 ring-yellow-300 ring-offset-2 animate-pulse' : ''}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Run Report Now
                      </Button>
                    )}

                    {selectedCycle.status === 'awaiting_verification' && (
                      <>
                        <Button
                          variant="primary"
                          onClick={() => handleVerify(true)}
                          disabled={selectedCycle.exceptionCounts.meter > 0 || selectedCycle.exceptionCounts.data > 0}
                          data-demo="verify-upload"
                          className={isDemoMode && currentStep === 6 ? 'ring-4 ring-yellow-300 ring-offset-2 animate-pulse' : ''}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Verify UL 360 Upload
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => setShowUploadModal(true)}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Failure File
                        </Button>
                      </>
                    )}
                  </div>

                  {selectedCycle.status === 'awaiting_verification' && (selectedCycle.exceptionCounts.meter > 0 || selectedCycle.exceptionCounts.data > 0) && (
                    <p className="text-xs text-orange-600 italic">
                      All exceptions must be resolved before verification ({selectedCycle.exceptionCounts.meter} meter, {selectedCycle.exceptionCounts.data} data remaining)
                    </p>
                  )}

                  {/* Verification Status Message */}
                  {verificationMessage && (
                    <div className={`rounded-lg p-4 ${
                      verificationMessage.type === 'error'
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-green-50 border border-green-200'
                    }`}>
                      <p className={`text-sm font-medium ${
                        verificationMessage.type === 'error'
                          ? 'text-red-800'
                          : 'text-green-800'
                      }`}>
                        {verificationMessage.text}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Orchestration Progress Indicator */}
              {isOrchestrating && selectedCycle.status === 'in_progress' && (
                <OrchestrationProgress
                  currentStep={selectedCycle.currentStep}
                  isOrchestrating={isOrchestrating}
                />
              )}

              {/* Report Summary - Shows after report runs */}
              {selectedCycle.reportSummaries && selectedCycle.reportSummaries.length > 0 && (
                <ReportSummary
                  reportSummaries={selectedCycle.reportSummaries}
                  ul360Files={ul360Files.filter(f => selectedCycle.reportSummaries.some(s => s.generatedFileId === f.id))}
                  onDownload={handleDownloadFile}
                />
              )}

              {/* Timeline */}
              <Card>
                <h3 className="text-xl font-bold text-segro-charcoal mb-6">Orchestration Timeline</h3>
                <Timeline
                  steps={orchestrationSteps}
                  currentStep={selectedCycle.currentStep}
                  stepTimestamps={selectedCycle.stepTimestamps}
                />
              </Card>

              {/* Activity Log */}
              <Card>
                <h3 className="text-xl font-bold text-segro-charcoal mb-4">Activity Log</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedCycle.activityLog.length === 0 ? (
                    <div className="text-center text-segro-midgray py-8">
                      No activity recorded yet
                    </div>
                  ) : (
                    selectedCycle.activityLog.map(log => (
                      <div key={log.id} className="border-l-4 border-segro-teal pl-4 py-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-segro-charcoal">{log.action}</div>
                            <div className="text-sm text-segro-midgray">{log.details}</div>
                            <div className="text-xs text-segro-midgray mt-1">
                              {log.actor} • {formatTimeAgo(log.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Exception Summary */}
              <Card>
                <h3 className="text-xl font-bold text-segro-charcoal mb-4">Exception Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className="bg-blue-50 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => handleNavigateToExceptions('meter', 'open')}
                  >
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedCycle.exceptionCounts.meter}
                    </div>
                    <div className="text-sm text-segro-midgray">Meter Open</div>
                  </div>
                  <div
                    className="bg-blue-100 rounded-lg p-4 cursor-pointer hover:bg-blue-200 transition-colors"
                    onClick={() => handleNavigateToExceptions('meter', 'resolved')}
                  >
                    <div className="text-2xl font-bold text-blue-700">
                      {selectedCycle.exceptionCounts.meterResolved}
                    </div>
                    <div className="text-sm text-segro-midgray">Meter Resolved</div>
                  </div>
                  <div
                    className="bg-orange-50 rounded-lg p-4 cursor-pointer hover:bg-orange-100 transition-colors"
                    onClick={() => handleNavigateToExceptions('data', 'open')}
                  >
                    <div className="text-2xl font-bold text-orange-600">
                      {selectedCycle.exceptionCounts.data}
                    </div>
                    <div className="text-sm text-segro-midgray">Data Open</div>
                  </div>
                  <div
                    className="bg-orange-100 rounded-lg p-4 cursor-pointer hover:bg-orange-200 transition-colors"
                    onClick={() => handleNavigateToExceptions('data', 'resolved')}
                  >
                    <div className="text-2xl font-bold text-orange-700">
                      {selectedCycle.exceptionCounts.dataResolved}
                    </div>
                    <div className="text-sm text-segro-midgray">Data Resolved</div>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center text-segro-midgray">
                <p className="text-lg">Select a cycle to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Upload Failure File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <h3 className="text-xl font-bold text-segro-charcoal mb-4">Upload Failure File</h3>
            <p className="text-sm text-segro-midgray mb-4">
              Upload the failure file from UL 360 to trigger regeneration of upload files.
            </p>

            <div
              className="border-2 border-dashed border-segro-lightgray rounded-lg p-8 text-center mb-4 cursor-pointer hover:border-segro-teal transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) setUploadFile(file);
              }}
            >
              <Upload className="w-12 h-12 mx-auto text-segro-midgray mb-2" />
              {uploadFile ? (
                <div className="text-sm font-medium text-segro-charcoal">{uploadFile.name}</div>
              ) : (
                <>
                  <div className="text-sm font-medium text-segro-charcoal mb-1">
                    Click to upload or drag and drop
                  </div>
                  <div className="text-xs text-segro-midgray">CSV or TXT files</div>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setUploadFile(file);
              }}
            />

            <div className="flex space-x-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleUploadFailure}
                disabled={!uploadFile}
              >
                Upload & Regenerate
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
