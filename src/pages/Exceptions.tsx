import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle, MessageSquare } from 'lucide-react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { useStore } from '../store';
import { useDemoMode } from '../contexts/DemoModeContext';
import { formatTimeAgo } from '../utils/formatters';
import { ExceptionItem } from '../types';

// Helper function to format exception status display
const getExceptionStatusDisplay = (exception: ExceptionItem): string => {
  // For meter (Registry) exceptions that are open, show "Pending manual fixes"
  if (exception.type === 'Registry' && exception.status === 'open') {
    return 'Pending manual fixes';
  }
  // For all other cases, use the normal status
  return exception.status.replace('_', ' ');
};

export default function Exceptions() {
  const location = useLocation();
  const {
    cycles,
    exceptions,
    selectedException,
    loadCycles,
    loadExceptions,
    loadException,
    clearSelectedException,
    updateException,
    resolveException,
    addComment,
  } = useStore();
  const { isDemoMode, currentStep, updateImpactMetrics, impactMetrics, registerStepCallback, unregisterStepCallback } = useDemoMode();

  // Get initial filters from location state if provided
  const initialTypeFilter = (location.state as any)?.typeFilter || 'meter';
  const initialStatusFilter = (location.state as any)?.statusFilter || 'open';
  const initialCycleId = (location.state as any)?.cycleId;

  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>(initialStatusFilter);
  const [typeFilter, setTypeFilter] = useState<'meter' | 'data'>(initialTypeFilter);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<any>({});
  const [commentText, setCommentText] = useState('');
  const [showBulkResolveModal, setShowBulkResolveModal] = useState(false);
  const [isBulkResolving, setIsBulkResolving] = useState(false);

  useEffect(() => {
    loadCycles();
  }, [loadCycles]);

  // Set default cycle: from navigation state, or first cycle with open exceptions
  useEffect(() => {
    if (cycles.length > 0 && selectedCycleId === null) {
      if (initialCycleId) {
        // Use cycle from navigation state
        setSelectedCycleId(initialCycleId);
      } else {
        // Find first cycle with open exceptions
        const cycleWithExceptions = cycles.find(c =>
          (c.status === 'awaiting_verification' || c.status === 'in_progress') &&
          (c.exceptionCounts.meter > 0 || c.exceptionCounts.data > 0)
        );

        if (cycleWithExceptions) {
          setSelectedCycleId(cycleWithExceptions.id);
        } else {
          // If no cycle with open exceptions, use first active cycle
          const activeCycle = cycles.find(c => c.status === 'awaiting_verification' || c.status === 'in_progress');
          if (activeCycle) {
            setSelectedCycleId(activeCycle.id);
          }
        }
      }
    }
  }, [cycles, selectedCycleId, initialCycleId]);

  // Load exceptions from selected cycle
  useEffect(() => {
    if (selectedCycleId) {
      loadExceptions(selectedCycleId);
    }
  }, [selectedCycleId, loadExceptions]);

  // Filter exceptions based on status and type
  const filteredExceptions = exceptions.filter(exc => {
    // Status filter
    let statusMatch = true;
    if (statusFilter === 'open') statusMatch = exc.status === 'open' || exc.status === 'in_review';
    else if (statusFilter === 'resolved') statusMatch = exc.status === 'resolved';

    // Type filter - always either 'meter' or 'data' (no 'all' option)
    const typeMatch = typeFilter === 'meter'
      ? exc.type === 'Registry'
      : exc.type === 'Reading' || exc.type === 'UploadFailure';

    return statusMatch && typeMatch;
  });

  // Auto-select first exception from filtered list when exceptions load or filters change
  useEffect(() => {
    if (filteredExceptions.length > 0) {
      // Check if the currently selected exception is in the filtered list
      const selectedInList = selectedException && filteredExceptions.some(exc => exc.id === selectedException.id);

      // Only auto-select if there's no selection or the selected exception is not in the filtered list
      if (!selectedInList) {
        const firstException = filteredExceptions[0];
        loadException(firstException.id);
        setEditingValues({
          value: firstException.value ?? 0,
          units: firstException.units,
          startDate: firstException.period?.startDate,
          endDate: firstException.period?.endDate,
          regionSID: firstException.meterMetadata.regionSID,
        });
      }
    } else {
      // Clear selection if no exceptions in filtered list
      if (selectedException) {
        clearSelectedException();
        setEditingValues({});
      }
    }
  }, [filteredExceptions.length, statusFilter, typeFilter, selectedCycleId]); // Removed selectedException from deps to prevent re-triggering

  // Register demo mode callbacks for Steps 3, 4, 5, 7, 8 - Auto-select specific exceptions
  useEffect(() => {
    if (isDemoMode) {
      // Step 3: Auto-select Tilbury - Electricity Meter 5 (Date correction exception - Data tab)
      const selectStep3Exception = () => {
        setTypeFilter('data'); // Switch to data tab
        const targetException = exceptions.find(
          exc => exc.meterMetadata.name === 'Tilbury - Electricity Meter 5'
        );
        if (targetException) {
          handleSelectException(targetException);
        }
      };

      // Step 4: Auto-select Heathrow - Gas Meter 8 (Unit mismatch - Data tab)
      const selectStep4Exception = () => {
        setTypeFilter('data'); // Ensure data tab is selected
        const targetException = exceptions.find(
          exc => exc.meterMetadata.name === 'Heathrow - Gas Meter 8'
        );
        if (targetException) {
          handleSelectException(targetException);
        }
      };

      // Step 5: Auto-select Park Royal - Gas Meter 3 (Negative value - Data tab)
      const selectStep5Exception = () => {
        setTypeFilter('data'); // Ensure data tab is selected
        const targetException = exceptions.find(
          exc => exc.meterMetadata.name === 'Park Royal - Gas Meter 3'
        );
        if (targetException) {
          handleSelectException(targetException);
        }
      };

      // Step 7: Auto-select Manchester West - Gas Meter 12 (Meter Registry - Meter tab)
      const selectStep7Exception = () => {
        setTypeFilter('meter'); // Switch to meter tab
        const targetException = exceptions.find(
          exc => exc.meterMetadata.name === 'Manchester West - Gas Meter 12'
        );
        if (targetException) {
          handleSelectException(targetException);
        }
      };

      // Step 8: Auto-select Leeds North - Electricity Meter 8 (Unusual value - Data tab)
      const selectStep8Exception = () => {
        setTypeFilter('data'); // Switch to data tab
        const targetException = exceptions.find(
          exc => exc.meterMetadata.name === 'Leeds North - Electricity Meter 8'
        );
        if (targetException) {
          handleSelectException(targetException);
        }
      };

      registerStepCallback(3, selectStep3Exception);
      registerStepCallback(4, selectStep4Exception);
      registerStepCallback(5, selectStep5Exception);
      registerStepCallback(7, selectStep7Exception);
      registerStepCallback(8, selectStep8Exception);

      return () => {
        unregisterStepCallback(3);
        unregisterStepCallback(4);
        unregisterStepCallback(5);
        unregisterStepCallback(7);
        unregisterStepCallback(8);
      };
    }
  }, [isDemoMode, exceptions, registerStepCallback, unregisterStepCallback]);

  const handleSelectException = (exc: ExceptionItem) => {
    loadException(exc.id);
    setEditingValues({
      value: exc.value ?? 0, // Use nullish coalescing to handle undefined/null
      units: exc.units,
      startDate: exc.period?.startDate,
      endDate: exc.period?.endDate,
      regionSID: exc.meterMetadata.regionSID,
    });
  };

  const handleResolveRegistry = async () => {
    if (!selectedException) return;
    await resolveException(selectedException.id, 'Meter Registry Updated - meter ID added to central registry');

    // Update demo mode metrics
    if (isDemoMode) {
      updateImpactMetrics({
        hoursAvoided: impactMetrics.hoursAvoided + 0.5,
        exceptionsResolved: impactMetrics.exceptionsResolved + 1,
        timeReduction: Math.min(impactMetrics.timeReduction + 5, 85),
      });
    }

    loadException(selectedException.id);
  };

  const handleApplyFix = async (field: string, value: any) => {
    if (!selectedException) return;

    const updates: any = {};
    let resolutionMessage = '';

    if (field === 'value') {
      updates.value = Math.abs(value);
      resolutionMessage = `Negative value corrected to positive: ${Math.abs(value)}`;
    } else if (field === 'units') {
      updates.units = value;
      resolutionMessage = `Units converted to ${value}`;
    } else if (field === 'valueAndUnits') {
      // Handle combined value and unit conversion
      updates.value = value.value;
      updates.units = value.units;
      resolutionMessage = `Value converted from ${selectedException.units} to ${value.units}: ${value.value.toFixed(2)} ${value.units}`;
    } else if (field === 'dates') {
      updates.period = {
        startDate: editingValues.startDate || selectedException.period?.startDate,
        endDate: editingValues.endDate || selectedException.period?.endDate,
      };
      resolutionMessage = `Date range corrected: ${updates.period.startDate} to ${updates.period.endDate}`;
    } else if (field === 'regionSID') {
      updates.meterMetadata = {
        ...selectedException.meterMetadata,
        regionSID: value,
      };
      resolutionMessage = `Region SID populated: ${value}`;
    }

    await updateException(selectedException.id, updates);

    // After applying the fix, check if this resolves the primary violation
    // For hard validations (negative_value, date_range_invalid, unit_mismatch, missing_field),
    // we can auto-resolve the exception
    const hasHardViolations = selectedException.violations.some(v =>
      ['negative_value', 'date_range_invalid', 'unit_mismatch', 'missing_field'].includes(v.type)
    );

    if (hasHardViolations && resolutionMessage) {
      // Resolve the exception with the appropriate message
      await resolveException(selectedException.id, resolutionMessage);

      // Update demo mode metrics
      if (isDemoMode) {
        updateImpactMetrics({
          hoursAvoided: impactMetrics.hoursAvoided + 0.5,
          exceptionsResolved: impactMetrics.exceptionsResolved + 1,
          timeReduction: Math.min(impactMetrics.timeReduction + 5, 85),
        });
      }
    }

    loadException(selectedException.id);
  };

  const handleResolveException = async (resolution: string) => {
    if (!selectedException) return;
    await resolveException(selectedException.id, resolution);
    loadException(selectedException.id);
  };

  const handleAutoFix = async (suggestion: any) => {
    if (!selectedException) return;

    // Map suggestion actions to the corresponding fix
    switch (suggestion.action) {
      case 'Correct Date Range':
        // Swap start and end dates
        if (selectedException.period) {
          // Update editing values first to ensure they're set correctly
          setEditingValues({
            ...editingValues,
            startDate: selectedException.period.endDate,
            endDate: selectedException.period.startDate,
          });
          await handleApplyFix('dates', {
            startDate: selectedException.period.endDate,
            endDate: selectedException.period.startDate,
          });
        }
        break;

      case 'Use Absolute Value':
        // Convert to positive value
        if (selectedException.value !== undefined) {
          await handleApplyFix('value', selectedException.value);
        }
        break;

      case 'Convert Units':
        // Convert units (typically for CZ market gas meters)
        await handleApplyFix('units', 'kWh');
        break;

      case 'Infer Region SID':
        // Auto-populate Region SID
        const inferredSID = `R${selectedException.meterMetadata.market}${Math.floor(Math.random() * 900) + 100}`;
        await handleApplyFix('regionSID', inferredSID);
        break;

      case 'Keep Latest Reading':
        // Mark as resolved (would typically remove duplicate in real system)
        await resolveException(selectedException.id, 'Duplicate period removed, kept latest reading');
        break;

      default:
        console.log('No auto-fix handler for:', suggestion.action);
    }
  };

  const handleAddComment = async () => {
    if (!selectedException || !commentText.trim()) return;
    await addComment(selectedException.id, commentText);
    setCommentText('');
    loadException(selectedException.id);
  };

  const handleBulkResolve = async () => {
    if (!selectedCycleId) return;

    setIsBulkResolving(true);

    try {
      // Get all open meter exceptions in the current filtered list
      const meterExceptionsToResolve = filteredExceptions.filter(
        exc => exc.type === 'Registry' && (exc.status === 'open' || exc.status === 'in_review')
      );

      // Resolve each exception
      for (const exception of meterExceptionsToResolve) {
        await resolveException(
          exception.id,
          'Bulk resolved - All meter exceptions manually verified and corrected'
        );
      }

      // Reload exceptions and cycles
      await loadExceptions(selectedCycleId);
      await loadCycles();

      // Clear selected exception if it was resolved
      if (selectedException && meterExceptionsToResolve.some(e => e.id === selectedException.id)) {
        clearSelectedException();
      }

      setShowBulkResolveModal(false);

      // Update demo mode metrics if applicable
      if (isDemoMode) {
        updateImpactMetrics({
          hoursAvoided: impactMetrics.hoursAvoided + (meterExceptionsToResolve.length * 0.5),
          timeReduction: Math.min(impactMetrics.timeReduction + 5, 85),
        });
      }
    } catch (error) {
      console.error('Error during bulk resolve:', error);
      alert('Failed to resolve all exceptions. Please try again.');
    } finally {
      setIsBulkResolving(false);
    }
  };

  const selectedCycle = cycles.find(c => c.id === selectedCycleId);

  // Count open meter exceptions for bulk resolve button
  const openMeterExceptionsCount = filteredExceptions.filter(
    exc => exc.type === 'Registry' && (exc.status === 'open' || exc.status === 'in_review')
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-segro-charcoal">Exceptions Queue</h1>
      </div>

      {/* Cycle Selection */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-segro-midgray">Reporting Cycle:</label>
        <select
          value={selectedCycleId || ''}
          onChange={(e) => setSelectedCycleId(e.target.value)}
          className="flex-1 max-w-md px-4 py-2 border border-segro-lightgray rounded-lg bg-white text-segro-charcoal focus:outline-none focus:ring-2 focus:ring-segro-teal"
        >
          {cycles
            .filter(c => c.status === 'awaiting_verification' || c.status === 'in_progress' || c.status === 'completed')
            .map(cycle => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name} - {cycle.exceptionCounts.meter + cycle.exceptionCounts.data} open, {cycle.exceptionCounts.meterResolved + cycle.exceptionCounts.dataResolved} resolved
              </option>
            ))}
        </select>
        {selectedCycle && (
          <div className="text-sm text-segro-midgray">
            Status: <span className="font-medium text-segro-charcoal">{selectedCycle.status.replace('_', ' ')}</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Status Filter */}
        <div className="flex-1">
          <label className="text-sm font-medium text-segro-midgray mb-2 block">Filter by Status</label>
          <div className="flex space-x-2">
            <Button
              variant={statusFilter === 'all' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All ({exceptions.length})
            </Button>
            <Button
              variant={statusFilter === 'open' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('open')}
            >
              Open ({exceptions.filter(e => e.status === 'open' || e.status === 'in_review').length})
            </Button>
            <Button
              variant={statusFilter === 'resolved' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('resolved')}
            >
              Resolved ({exceptions.filter(e => e.status === 'resolved').length})
            </Button>
          </div>
        </div>

        {/* Type Filter - Tab Style */}
        <div className="flex-1">
          <div className="border-b border-segro-lightgray">
            <div className="flex space-x-1">
              <button
                onClick={() => setTypeFilter('meter')}
                className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                  typeFilter === 'meter'
                    ? 'text-segro-red border-b-2 border-segro-red'
                    : 'text-segro-midgray hover:text-segro-charcoal'
                }`}
              >
                Meter Registry Exceptions ({exceptions.filter(e => e.type === 'Registry').length})
              </button>
              <button
                onClick={() => setTypeFilter('data')}
                className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                  typeFilter === 'data'
                    ? 'text-segro-red border-b-2 border-segro-red'
                    : 'text-segro-midgray hover:text-segro-charcoal'
                }`}
              >
                Data Validation Errors ({exceptions.filter(e => e.type === 'Reading' || e.type === 'UploadFailure').length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Resolve Button - Only visible for meter exceptions */}
      {typeFilter === 'meter' && openMeterExceptionsCount > 0 && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={() => setShowBulkResolveModal(true)}
            disabled={isBulkResolving}
            data-demo="bulk-resolve-button"
            className={isDemoMode && currentStep === 7 ? 'ring-4 ring-yellow-300 ring-offset-2 animate-pulse' : ''}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Bulk Resolve All Meter Exceptions ({openMeterExceptionsCount})
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exceptions List */}
        <div className="lg:col-span-1 space-y-3 max-h-[800px] overflow-y-auto p-1 scrollbar-hide" data-demo="exceptions-list">
          {filteredExceptions.length === 0 ? (
            <Card>
              <div className="text-center text-segro-midgray py-8">
                No exceptions found
              </div>
            </Card>
          ) : (
            filteredExceptions.map(exc => (
              <Card
                key={exc.id}
                hover
                onClick={() => handleSelectException(exc)}
                className={selectedException?.id === exc.id ? 'ring-2 ring-segro-red' : ''}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-segro-charcoal">
                        {exc.meterMetadata.name}
                      </div>
                      <div className="text-xs text-segro-midgray">
                        {exc.meterMetadata.meterId}
                      </div>
                    </div>
                    <Badge
                      variant={exc.status === 'resolved' ? 'success' : exc.status === 'in_review' ? 'warning' : 'error'}
                      size="sm"
                    >
                      {getExceptionStatusDisplay(exc)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="default" size="sm">
                      {exc.type}
                    </Badge>
                    <span className="text-segro-midgray">
                      {formatTimeAgo(exc.createdAt)}
                    </span>
                  </div>

                  {exc.violations.length > 0 && (
                    <div className="text-xs text-segro-midgray">
                      {exc.violations[0].message}
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Exception Details */}
        <div className="lg:col-span-2">
          {selectedException ? (
            <div className="space-y-6">
              {/* Header */}
              <Card>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-segro-charcoal">
                      {selectedException.meterMetadata.name}
                    </h2>
                    <div className="text-sm text-segro-midgray mt-1">
                      {selectedException.meterMetadata.meterId} • {selectedException.meterMetadata.site}
                    </div>
                  </div>
                  <Badge variant={selectedException.status === 'resolved' ? 'success' : 'default'}>
                    {getExceptionStatusDisplay(selectedException)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-segro-midgray">Type:</span>
                    <span className="ml-2 font-medium">{selectedException.type}</span>
                  </div>
                  <div>
                    <span className="text-segro-midgray">Market:</span>
                    <span className="ml-2 font-medium">{selectedException.meterMetadata.market}</span>
                  </div>
                  <div>
                    <span className="text-segro-midgray">Utility:</span>
                    <span className="ml-2 font-medium">{selectedException.meterMetadata.utilityType}</span>
                  </div>
                  <div>
                    <span className="text-segro-midgray">Source:</span>
                    <span className="ml-2 font-medium">{selectedException.lineageSource}</span>
                  </div>
                </div>
              </Card>

              {/* Violations */}
              <Card>
                <h3 className="text-lg font-bold text-segro-charcoal mb-4">Violations</h3>
                <div className="space-y-3">
                  {selectedException.violations.map((violation, idx) => (
                    <div key={idx} className="bg-red-50 border-l-4 border-segro-red p-4 rounded">
                      <div className="font-medium text-segro-charcoal mb-2">
                        {violation.message}
                      </div>
                      {violation.expectedValue !== undefined && (
                        <div className="text-sm text-segro-midgray">
                          Expected: <span className="font-mono">{violation.expectedValue}</span>
                          {violation.actualValue !== undefined && (
                            <> • Actual: <span className="font-mono">{violation.actualValue}</span></>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* HITL Resolution Actions */}
              {selectedException.status !== 'resolved' && (
                <Card>
                  <h3 className="text-lg font-bold text-segro-charcoal mb-4">Resolution Actions</h3>

                  {/* Registry Exception - HITL Task 2 */}
                  {selectedException.type === 'Registry' && (
                    <div className="space-y-4" data-demo="registry-resolution">
                      <p className="text-sm text-segro-midgray">
                        This meter is not found in the central registry. Once you've updated the registry,
                        click the button below to mark this exception as resolved.
                      </p>
                      <Button
                        variant="primary"
                        onClick={handleResolveRegistry}
                        className={isDemoMode ? 'ring-4 ring-yellow-300 ring-offset-2' : ''}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Meter Registry Updated
                      </Button>
                    </div>
                  )}

                  {/* Reading Validation - HITL Task 3 */}
                  {selectedException.type === 'Reading' && (
                    <div className="space-y-6" data-demo="reading-resolution">
                      {/* Missing Field Editor */}
                      {selectedException.violations.some(v => v.type === 'missing_field') && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-segro-charcoal">Fill Missing Fields</h4>
                          {selectedException.violations
                            .filter(v => v.type === 'missing_field')
                            .map((violation, idx) => (
                              <div key={idx} className="space-y-2">
                                {violation.field === 'endDate' ? (
                                  // Calendar widget for end date
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-segro-midgray">
                                      Missing End Date
                                    </label>
                                    <div className="flex items-center space-x-3">
                                      <input
                                        type="date"
                                        value={editingValues.endDate || ''}
                                        onChange={(e) => setEditingValues({ ...editingValues, endDate: e.target.value })}
                                        className="flex-1 px-3 py-2 border border-segro-lightgray rounded-lg focus:ring-2 focus:ring-segro-red focus:border-transparent"
                                        placeholder="Select end date"
                                      />
                                      <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => handleApplyFix('dates', null)}
                                      >
                                        Apply Date
                                      </Button>
                                    </div>
                                    {selectedException.period?.startDate && (
                                      <p className="text-xs text-segro-midgray">
                                        Period starts: {selectedException.period.startDate}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  // Generic text input for other fields
                                  <div className="flex items-center space-x-3">
                                    <label className="text-sm font-medium w-24">{violation.field}:</label>
                                    <input
                                      type="text"
                                      className="flex-1 px-3 py-2 border border-segro-lightgray rounded-lg focus:ring-2 focus:ring-segro-red focus:border-transparent"
                                      placeholder={`Enter ${violation.field}`}
                                    />
                                    <Button variant="primary" size="sm">
                                      Apply
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Date Range Editor */}
                      {selectedException.violations.some(v => v.type === 'date_range_invalid') && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-segro-charcoal">Correct Date Range</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium text-segro-midgray">Start Date</label>
                              <input
                                type="date"
                                value={editingValues.startDate || ''}
                                onChange={(e) => setEditingValues({ ...editingValues, startDate: e.target.value })}
                                className="w-full mt-1 px-3 py-2 border border-segro-lightgray rounded-lg focus:ring-2 focus:ring-segro-red"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-segro-midgray">End Date</label>
                              <input
                                type="date"
                                value={editingValues.endDate || ''}
                                onChange={(e) => setEditingValues({ ...editingValues, endDate: e.target.value })}
                                className="w-full mt-1 px-3 py-2 border border-segro-lightgray rounded-lg focus:ring-2 focus:ring-segro-red"
                              />
                            </div>
                          </div>
                          <Button
                            variant="primary"
                            onClick={() => handleApplyFix('dates', null)}
                            data-demo="apply-date-correction"
                            className={isDemoMode && currentStep === 3 ? 'ring-4 ring-yellow-300 ring-offset-2 animate-pulse' : ''}
                          >
                            Apply Date Correction
                          </Button>
                        </div>
                      )}

                      {/* Negative Value Editor */}
                      {selectedException.violations.some(v => v.type === 'negative_value') && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-segro-charcoal">Fix Negative Value</h4>
                          <div className="flex items-center space-x-3">
                            <input
                              type="number"
                              value={editingValues.value ?? 0}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                setEditingValues({ ...editingValues, value: isNaN(val) ? 0 : val });
                              }}
                              className="flex-1 px-3 py-2 border border-segro-lightgray rounded-lg focus:ring-2 focus:ring-segro-red"
                              placeholder="Enter value"
                            />
                            <Button
                              variant="primary"
                              onClick={() => handleApplyFix('value', editingValues.value ?? 0)}
                              data-demo="use-absolute-value"
                              className={isDemoMode && currentStep === 5 ? 'ring-4 ring-yellow-300 ring-offset-2 animate-pulse' : ''}
                            >
                              Use Absolute Value
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Unit Conversion - All Markets */}
                      {selectedException.violations.some(v => v.type === 'unit_mismatch') && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-segro-charcoal">Convert Units</h4>
                          <p className="text-sm text-segro-midgray mb-3">
                            Current value: {selectedException.value} {selectedException.units}
                          </p>
                          <div className="bg-segro-offwhite p-4 rounded-lg space-y-3">
                            <div className="flex items-center space-x-3">
                              <div className="flex-1">
                                <label className="text-sm font-medium text-segro-midgray">Value in m³</label>
                                <input
                                  type="number"
                                  value={editingValues.value ?? selectedException.value ?? 0}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                    setEditingValues({ ...editingValues, value: isNaN(val) ? 0 : val });
                                  }}
                                  className="w-full mt-1 px-3 py-2 border border-segro-lightgray rounded-lg focus:ring-2 focus:ring-segro-red"
                                  placeholder="Enter value in m³"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-sm font-medium text-segro-midgray">Converted to kWh</label>
                                <input
                                  type="number"
                                  value={((editingValues.value ?? selectedException.value ?? 0) * 10.55).toFixed(2)}
                                  readOnly
                                  className="w-full mt-1 px-3 py-2 border border-segro-lightgray rounded-lg bg-gray-50 text-segro-midgray"
                                  placeholder="Converted value"
                                />
                              </div>
                            </div>
                            <p className="text-xs text-segro-midgray">
                              Using standard conversion factor: 1 m³ = 10.55 kWh
                            </p>
                          </div>
                          <Button
                            variant="primary"
                            onClick={() => {
                              const convertedValue = (editingValues.value ?? selectedException.value ?? 0) * 10.55;
                              handleApplyFix('valueAndUnits', {
                                value: convertedValue,
                                units: 'kWh'
                              });
                            }}
                            data-demo="apply-conversion"
                            className={isDemoMode && currentStep === 4 ? 'ring-4 ring-yellow-300 ring-offset-2 animate-pulse' : ''}
                          >
                            Apply Conversion (m³ → kWh)
                          </Button>
                        </div>
                      )}

                      {/* Missing Region SID - Soft Check */}
                      {selectedException.violations.some(v => v.type === 'missing_region_sid') && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-segro-charcoal">Infer Region SID</h4>
                          <p className="text-sm text-segro-midgray">
                            Auto-populate Region SID based on site location?
                          </p>
                          <Button
                            variant="primary"
                            onClick={() => handleApplyFix('regionSID', `R${selectedException.meterMetadata.market}${Math.floor(Math.random() * 900) + 100}`)}
                          >
                            Auto-Populate Region SID
                          </Button>
                        </div>
                      )}

                      {/* Unusual Value - Sparkline Visualization */}
                      {selectedException.violations.some(v => v.type === 'unusual_value') && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-segro-charcoal">Unusual Value Detected</h4>
                          <div className="bg-segro-offwhite p-4 rounded-lg">
                            <div className="flex items-end space-x-1 h-20">
                              {[12, 14, 13, 15, 14, 13, 25, 14].map((val, idx) => (
                                <div
                                  key={idx}
                                  className={`flex-1 ${idx === 6 ? 'bg-segro-red' : 'bg-segro-teal'} rounded-t`}
                                  style={{ height: `${(val / 25) * 100}%` }}
                                />
                              ))}
                            </div>
                            <p className="text-xs text-segro-midgray mt-2">
                              Historical trend showing unusual spike
                            </p>
                          </div>
                          <div className="flex space-x-3">
                            <Button
                              variant="primary"
                              onClick={() => handleResolveException('Value confirmed accurate with site manager')}
                              data-demo="confirm-value"
                              className={isDemoMode && currentStep === 8 ? 'ring-4 ring-yellow-300 ring-offset-2 animate-pulse' : ''}
                            >
                              Confirm Value
                            </Button>
                            <Button variant="secondary">
                              Contact Site Manager
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )}

              {/* Suggestions */}
              {selectedException.suggestions.length > 0 && selectedException.status !== 'resolved' && (
                <Card>
                  <h3 className="text-lg font-bold text-segro-charcoal mb-4">Suggested Actions</h3>
                  <div className="space-y-2">
                    {selectedException.suggestions.map((suggestion, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-segro-offwhite rounded-lg hover:bg-gray-100 transition-colors">
                        <div>
                          <div className="font-medium text-segro-charcoal">{suggestion.action}</div>
                          <div className="text-sm text-segro-midgray">{suggestion.description}</div>
                        </div>
                        {suggestion.autoFixAvailable && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleAutoFix(suggestion)}
                          >
                            Auto-fix
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Comments & Collaboration */}
              <Card>
                <h3 className="text-lg font-bold text-segro-charcoal mb-4 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Comments ({selectedException.comments.length})
                </h3>

                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                  {selectedException.comments.map(comment => (
                    <div key={comment.id} className="bg-segro-offwhite p-3 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-segro-charcoal">{comment.author}</span>
                        <span className="text-xs text-segro-midgray">{formatTimeAgo(comment.timestamp)}</span>
                      </div>
                      <p className="text-sm text-segro-midgray">{comment.text}</p>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 border border-segro-lightgray rounded-lg focus:ring-2 focus:ring-segro-red focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                  <Button variant="primary" onClick={handleAddComment}>
                    Post
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center text-segro-midgray">
                <p className="text-lg">Select an exception to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Bulk Resolve Confirmation Modal */}
      {showBulkResolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <h3 className="text-xl font-bold text-segro-charcoal mb-4">Confirm Bulk Resolve</h3>
            <p className="text-sm text-segro-midgray mb-6">
              Are you sure you want to resolve all <span className="font-bold text-segro-charcoal">{openMeterExceptionsCount}</span> open meter exceptions?
            </p>
            <p className="text-sm text-segro-midgray mb-6">
              This action will mark all meter exceptions as resolved with the note:
              <span className="italic text-segro-charcoal"> "Bulk resolved - All meter exceptions manually verified and corrected"</span>
            </p>

            <div className="flex space-x-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowBulkResolveModal(false)}
                disabled={isBulkResolving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleBulkResolve}
                disabled={isBulkResolving}
              >
                {isBulkResolving ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Resolving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Resolve All
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
