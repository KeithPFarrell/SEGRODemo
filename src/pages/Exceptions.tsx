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

export default function Exceptions() {
  const location = useLocation();
  const {
    cycles,
    exceptions,
    selectedException,
    loadCycles,
    loadExceptionsFromMultipleCycles,
    loadException,
    updateException,
    resolveException,
    addComment,
  } = useStore();
  const { isDemoMode, currentStep, updateImpactMetrics, impactMetrics, registerStepCallback, unregisterStepCallback } = useDemoMode();

  // Get initial filter from location state if provided
  const initialTypeFilter = (location.state as any)?.typeFilter || 'all';

  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [typeFilter, setTypeFilter] = useState<'all' | 'meter' | 'data'>(initialTypeFilter);
  const [editingValues, setEditingValues] = useState<any>({});
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    loadCycles();
  }, [loadCycles]);

  useEffect(() => {
    // Load exceptions from all active cycles
    const activeCycles = cycles.filter(c => c.status === 'awaiting_verification' || c.status === 'in_progress');

    if (activeCycles.length > 0) {
      // Load exceptions from ALL active cycles
      const cycleIds = activeCycles.map(c => c.id);
      loadExceptionsFromMultipleCycles(cycleIds);
    }
  }, [cycles, loadExceptionsFromMultipleCycles]);

  // Auto-select first exception when exceptions load
  useEffect(() => {
    if (exceptions.length > 0 && !selectedException) {
      const firstException = exceptions[0];
      loadException(firstException.id);
      setEditingValues({
        value: firstException.value ?? 0,
        units: firstException.units,
        startDate: firstException.period?.startDate,
        endDate: firstException.period?.endDate,
        regionSID: firstException.meterMetadata.regionSID,
      });
    }
  }, [exceptions.length, selectedException, loadException]); // Use length to avoid re-triggering on every exception change

  // Register demo mode callbacks for Steps 3 & 4 - Auto-select specific exceptions
  useEffect(() => {
    if (isDemoMode) {
      // Step 3: Auto-select Amsterdam South - Water Meter (Registry exception)
      const selectStep3Exception = () => {
        const targetException = exceptions.find(
          exc => exc.meterMetadata.name === 'Amsterdam South - Water Meter'
        );
        if (targetException) {
          handleSelectException(targetException);
        }
      };

      // Step 4: Auto-select Berlin West - Electricity Meter 7 (Date correction exception)
      const selectStep4Exception = () => {
        const targetException = exceptions.find(
          exc => exc.meterMetadata.name === 'Berlin West - Electricity Meter 7'
        );
        if (targetException) {
          handleSelectException(targetException);
        }
      };

      registerStepCallback(3, selectStep3Exception);
      registerStepCallback(4, selectStep4Exception);

      return () => {
        unregisterStepCallback(3);
        unregisterStepCallback(4);
      };
    }
  }, [isDemoMode, exceptions, registerStepCallback, unregisterStepCallback]);

  const filteredExceptions = exceptions.filter(exc => {
    // Status filter
    let statusMatch = true;
    if (statusFilter === 'open') statusMatch = exc.status === 'open' || exc.status === 'in_review';
    else if (statusFilter === 'resolved') statusMatch = exc.status === 'resolved';

    // Type filter
    let typeMatch = true;
    if (typeFilter === 'meter') typeMatch = exc.type === 'Registry';
    else if (typeFilter === 'data') typeMatch = exc.type === 'Reading' || exc.type === 'UploadFailure';

    return statusMatch && typeMatch;
  });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-segro-charcoal">Exceptions Queue</h1>
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

        {/* Type Filter */}
        <div className="flex-1">
          <label className="text-sm font-medium text-segro-midgray mb-2 block">Filter by Type</label>
          <div className="flex space-x-2">
            <Button
              variant={typeFilter === 'all' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter('all')}
            >
              All ({exceptions.length})
            </Button>
            <Button
              variant={typeFilter === 'meter' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter('meter')}
            >
              Meter errors ({exceptions.filter(e => e.type === 'Registry').length})
            </Button>
            <Button
              variant={typeFilter === 'data' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter('data')}
            >
              Data errors ({exceptions.filter(e => e.type === 'Reading' || e.type === 'UploadFailure').length})
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exceptions List */}
        <div className="lg:col-span-1 space-y-3 max-h-[800px] overflow-y-auto" data-demo="exceptions-list">
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
                    <div>
                      <div className="font-medium text-segro-charcoal">
                        {exc.meterMetadata.name}
                      </div>
                      <div className="text-xs text-segro-midgray">
                        {exc.meterMetadata.meterId}
                      </div>
                    </div>
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
                    {selectedException.status}
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
                            className={isDemoMode && currentStep === 4 ? 'ring-4 ring-yellow-300 ring-offset-2 animate-pulse' : ''}
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
    </div>
  );
}
