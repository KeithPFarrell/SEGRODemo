import { useEffect, useState } from 'react';
import { Activity, Filter } from 'lucide-react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { useStore } from '../store';
import { formatDateTime, formatTimeAgo } from '../utils/formatters';

export default function ActivityLog() {
  const { activityLog, cycles, loadActivityLog, loadCycles } = useStore();
  const [selectedCycle, setSelectedCycle] = useState<string>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');

  useEffect(() => {
    loadCycles();
    loadActivityLog();
  }, [loadCycles, loadActivityLog]);

  const handleCycleFilter = (cycleId: string) => {
    setSelectedCycle(cycleId);
    if (cycleId === 'all') {
      loadActivityLog();
    } else {
      loadActivityLog(cycleId);
    }
  };

  const uniqueActors = Array.from(new Set(activityLog.map(log => log.actor)));

  const filteredLog = activityLog.filter(log => {
    if (actorFilter !== 'all' && log.actor !== actorFilter) return false;
    return true;
  });

  const getActionColor = (action: string) => {
    if (action.includes('Started') || action.includes('Initiated')) return 'text-segro-teal';
    if (action.includes('Completed') || action.includes('Resolved') || action.includes('Verified'))
      return 'text-segro-teal-accent';
    if (action.includes('Failed') || action.includes('Rejected')) return 'text-segro-red';
    if (action.includes('Updated') || action.includes('Modified')) return 'text-yellow-600';
    return 'text-segro-charcoal';
  };

  const getActionIcon = (action: string) => {
    if (action.includes('Completed') || action.includes('Resolved')) return '✓';
    if (action.includes('Failed') || action.includes('Rejected')) return '✗';
    if (action.includes('Started') || action.includes('Initiated')) return '▶';
    if (action.includes('Updated')) return '✎';
    if (action.includes('Uploaded')) return '↑';
    return '•';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="w-8 h-8 text-segro-red" />
          <div>
            <h1 className="text-3xl font-bold text-segro-charcoal">Activity Log</h1>
            <p className="text-segro-midgray mt-1">Complete audit trail of all system activities</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-segro-midgray" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cycle Filter */}
            <div>
              <label className="text-sm font-medium text-segro-midgray mb-2 block">Filter by Cycle</label>
              <select
                value={selectedCycle}
                onChange={(e) => handleCycleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-segro-lightgray rounded-lg focus:ring-2 focus:ring-segro-red focus:border-transparent"
              >
                <option value="all">All Cycles</option>
                {cycles.map(cycle => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Actor Filter */}
            <div>
              <label className="text-sm font-medium text-segro-midgray mb-2 block">Filter by Actor</label>
              <select
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                className="w-full px-3 py-2 border border-segro-lightgray rounded-lg focus:ring-2 focus:ring-segro-red focus:border-transparent"
              >
                <option value="all">All Actors</option>
                {uniqueActors.map(actor => (
                  <option key={actor} value={actor}>
                    {actor}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedCycle !== 'all' || actorFilter !== 'all' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCycle('all');
                setActorFilter('all');
                loadActivityLog();
              }}
            >
              Clear Filters
            </Button>
          ) : null}
        </div>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <div className="space-y-0 max-h-[600px] overflow-y-auto" data-demo="activity-log">
          {filteredLog.length === 0 ? (
            <div className="text-center text-segro-midgray py-12">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No activity recorded</p>
              <p className="text-sm mt-2">Activity will appear here as actions are performed</p>
            </div>
          ) : (
            filteredLog.map((log, index) => (
              <div
                key={log.id}
                className={`flex items-start space-x-4 p-4 ${
                  index !== filteredLog.length - 1 ? 'border-b border-segro-lightgray' : ''
                } hover:bg-segro-offwhite transition-colors`}
              >
                {/* Timeline Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-segro-offwhite flex items-center justify-center font-bold text-lg">
                  <span className={getActionColor(log.action)}>{getActionIcon(log.action)}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className={`font-bold ${getActionColor(log.action)}`}>{log.action}</h3>
                      <p className="text-sm text-segro-midgray mt-1">{log.details}</p>
                      <div className="flex items-center space-x-3 mt-2">
                        <Badge variant="default" size="sm">
                          {log.actor}
                        </Badge>
                        {log.target && (
                          <span className="text-xs text-segro-midgray">{log.target}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 ml-4 text-right">
                      <div className="text-sm font-medium text-segro-charcoal">
                        {formatTimeAgo(log.timestamp)}
                      </div>
                      <div className="text-xs text-segro-midgray mt-1">
                        {formatDateTime(log.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Statistics */}
      <Card>
        <h2 className="text-xl font-bold text-segro-charcoal mb-6">Activity Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-segro-charcoal">{activityLog.length}</div>
            <div className="text-sm text-segro-midgray mt-1">Total Activities</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-segro-teal-accent">
              {activityLog.filter(l => l.actor === 'HCL Universal Orchestrator').length}
            </div>
            <div className="text-sm text-segro-midgray mt-1">System Actions</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-segro-teal">
              {activityLog.filter(l => l.actor !== 'HCL Universal Orchestrator').length}
            </div>
            <div className="text-sm text-segro-midgray mt-1">User Actions</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-segro-charcoal">{uniqueActors.length}</div>
            <div className="text-sm text-segro-midgray mt-1">Active Users</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
