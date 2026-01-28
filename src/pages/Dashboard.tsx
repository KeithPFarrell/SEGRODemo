import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Calendar, Database } from 'lucide-react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Timeline from '../components/Timeline';
import { useStore } from '../store';
import { formatDateTime, formatTimeAgo } from '../utils/formatters';

export default function Dashboard() {
  const navigate = useNavigate();
  const { cycles, exceptions, dataFreshness, loadCycles, loadExceptionsFromMultipleCycles, loadDataFreshness } = useStore();

  useEffect(() => {
    loadCycles();
    loadDataFreshness();
  }, [loadCycles, loadDataFreshness]);

  // Load exceptions from all active cycles
  useEffect(() => {
    const activeCycles = cycles.filter(c => c.status === 'awaiting_verification' || c.status === 'in_progress');
    if (activeCycles.length > 0) {
      const cycleIds = activeCycles.map(c => c.id);
      loadExceptionsFromMultipleCycles(cycleIds);
    }
  }, [cycles, loadExceptionsFromMultipleCycles]);

  // Get all active cycles and find the most recent one (by scheduled date)
  const activeCycles = cycles.filter(c => c.status === 'awaiting_verification' || c.status === 'in_progress');
  const currentCycle = activeCycles.sort((a, b) =>
    new Date(b.scheduledStartDate).getTime() - new Date(a.scheduledStartDate).getTime()
  )[0];

  // Count exceptions by type (only open exceptions, not resolved)
  const openExceptions = exceptions.filter(e => e.status !== 'resolved');
  const meterExceptions = openExceptions.filter(e => e.type === 'Registry').length;
  const dataExceptions = openExceptions.filter(e => e.type === 'Reading' || e.type === 'UploadFailure').length;

  // Count resolved exceptions by type
  const resolvedExceptions = exceptions.filter(e => e.status === 'resolved');
  const resolvedMeterExceptions = resolvedExceptions.filter(e => e.type === 'Registry').length;
  const resolvedDataExceptions = resolvedExceptions.filter(e => e.type === 'Reading' || e.type === 'UploadFailure').length;

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
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-r from-segro-charcoal to-segro-midgray rounded-2xl overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative px-8 py-12 text-white">
          <h1 className="text-4xl font-bold mb-4">Sustainability Dashboard</h1>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-segro-teal-accent rounded-full animate-pulse"></div>
            <span className="text-sm">Live orchestration monitoring</span>
          </div>
        </div>
      </div>

      {/* Key Metrics Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Current Cycle */}
        <Card hover onClick={() => navigate('/cycles')}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-segro-midgray text-sm font-medium mb-1">Current Cycle</div>
              <div className="text-2xl font-bold text-segro-charcoal mb-2">
                {currentCycle?.name.split(' ')[0] || 'None'}
              </div>
              {currentCycle && (
                <Badge variant={currentCycle.status === 'awaiting_verification' ? 'warning' : 'info'} size="sm">
                  {currentCycle.status.replace('_', ' ')}
                </Badge>
              )}
            </div>
            <div className="bg-segro-teal/10 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-segro-teal" />
            </div>
          </div>
        </Card>

        {/* Meter Exceptions */}
        <Card hover onClick={() => navigate('/exceptions', { state: { typeFilter: 'meter' } })}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-segro-midgray text-sm font-medium mb-1">Meter Exceptions</div>
              <div className="text-2xl font-bold text-segro-charcoal mb-2">{meterExceptions}</div>
              <div className="flex space-x-2">
                <Badge variant="success" size="sm">
                  {resolvedMeterExceptions} Resolved
                </Badge>
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>

        {/* Data Exceptions Count */}
        <Card hover onClick={() => navigate('/exceptions', { state: { typeFilter: 'data' } })}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-segro-midgray text-sm font-medium mb-1">Data Exceptions</div>
              <div className="text-2xl font-bold text-segro-charcoal mb-2">{dataExceptions}</div>
              <div className="flex space-x-2">
                <Badge variant="success" size="sm">
                  {resolvedDataExceptions} Resolved
                </Badge>
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-segro-red" />
            </div>
          </div>
        </Card>

        {/* Data Freshness */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-segro-midgray text-sm font-medium mb-1">Data Freshness</div>
              <div className="text-2xl font-bold text-segro-charcoal mb-2">
                {dataFreshness.filter(d => d.status === 'current').length}/{dataFreshness.length}
              </div>
              <div className="text-xs text-segro-midgray">Markets up to date</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <Database className="w-6 h-6 text-segro-teal-accent" />
            </div>
          </div>
        </Card>
      </div>

      {/* Current Cycle Details & Timeline */}
      {currentCycle && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <Card className="lg:col-span-2">
            <h2 className="text-xl font-bold text-segro-charcoal mb-6">Orchestration Progress</h2>
            <Timeline
              steps={orchestrationSteps}
              currentStep={currentCycle.currentStep}
              stepTimestamps={currentCycle.stepTimestamps}
            />
          </Card>

          {/* Cycle Info */}
          <Card>
            <h2 className="text-xl font-bold text-segro-charcoal mb-4">Cycle Details</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-segro-midgray mb-1">Markets</div>
                <div className="flex flex-wrap gap-2">
                  {currentCycle.markets.map(market => (
                    <Badge key={market} variant="info" size="sm">
                      {market}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm text-segro-midgray mb-1">Started</div>
                <div className="text-sm font-medium">
                  {currentCycle.actualStartDate ? formatDateTime(currentCycle.actualStartDate) : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-segro-midgray mb-1">UL 360 Status</div>
                <Badge
                  variant={
                    currentCycle.ul360Status === 'verified'
                      ? 'success'
                      : currentCycle.ul360Status === 'failed'
                      ? 'error'
                      : 'info'
                  }
                  size="sm"
                >
                  {currentCycle.ul360Status}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Data Freshness by Market */}
      <Card>
        <h2 className="text-xl font-bold text-segro-charcoal mb-6">Market Data Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dataFreshness.map(df => (
            <div key={df.market} className="border border-segro-lightgray rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg text-segro-charcoal">{df.market}</h3>
                <Badge
                  variant={df.status === 'current' ? 'success' : df.status === 'stale' ? 'warning' : 'error'}
                  size="sm"
                >
                  {df.status}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-segro-midgray">Records</span>
                  <span className="font-medium">{df.recordCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-segro-midgray">Last Update</span>
                  <span className="font-medium">{formatTimeAgo(df.lastUpdateTime)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Leona Attribution */}
      <div className="flex justify-center">
        <p className="text-xs sm:text-sm font-bold px-2 sm:px-3 py-1 rounded-md shadow-lg border-l-4 border-purple-500 animate-pulse bg-white">
          <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            ✨ Built by Leona - Vibe coding Agent from HCL Software
          </span>
        </p>
      </div>
    </div>
  );
}
