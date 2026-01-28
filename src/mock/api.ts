import {
  ReportingCycle,
  ExceptionItem,
  UL360File,
  ActivityLogEntry,
  OrchestrationStep,
  User,
  DataFreshness,
} from '../types';
import {
  generateMockCycles,
  generateMockExceptions,
  generateMockUL360Files,
  generateMockDataFreshness,
  generateMockUsers,
} from './dataGenerator';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// In-memory storage - Initialize exceptions first
let exceptions: Record<string, ExceptionItem[]> = {
  'cycle-2026-01': [
    ...generateMockExceptions('cycle-2026-01', 42),
    // Exception 1: Amsterdam South - Gas Meter - Registry exception (Demo Step 3)
    {
      id: 'exc-cycle-2026-01-registry-demo',
      type: 'Registry',
      status: 'open',
      meterMetadata: {
        name: 'Amsterdam South - Gas Meter',
        meterId: 'MEU9234',
        site: 'Amsterdam South',
        market: 'EU',
        utilityType: 'Gas',
      },
      violations: [
        {
          type: 'missing_field',
          field: 'meterId',
          message: 'Meter ID not found in registry',
          actualValue: 'MEU9234',
        },
      ],
      suggestions: [
        {
          action: 'Update Meter Registry',
          description: 'Add this meter to the central registry',
          autoFixAvailable: false,
        },
      ],
      createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
      comments: [],
      lineageSource: 'SFTP Upload',
    },
    // Exception 2: Prague Central - Electricity Meter 4 - Unit mismatch (Demo Step 4)
    {
      id: 'exc-cycle-2026-01-unit-mismatch',
      type: 'Reading',
      status: 'open',
      meterMetadata: {
        name: 'Prague Central - Electricity Meter 4',
        meterId: 'MCZ2678',
        regionSID: 'RCZ201',
        site: 'Prague Central',
        market: 'CZ',
        utilityType: 'Electricity',
      },
      period: {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      },
      value: 1250,
      units: 'm³',
      violations: [
        {
          type: 'unit_mismatch',
          field: 'units',
          message: 'Unit mismatch: received m³, expected kWh for reporting',
          expectedValue: 'kWh',
          actualValue: 'm³',
        },
      ],
      suggestions: [
        {
          action: 'Convert Units',
          description: 'Convert from m³ to kWh using standard conversion factor',
          autoFixAvailable: true,
        },
      ],
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      comments: [],
      lineageSource: 'API Import',
    },
    // Exception 2: Berlin West - Gas Meter 3 - Missing end date
    {
      id: 'exc-cycle-2026-01-missing-enddate',
      type: 'Reading',
      status: 'open',
      meterMetadata: {
        name: 'Berlin West - Gas Meter 3',
        meterId: 'MEU3812',
        regionSID: 'REU456',
        site: 'Berlin West',
        market: 'EU',
        utilityType: 'Gas',
      },
      period: {
        startDate: '2026-01-01',
        endDate: '',
      },
      value: 22400,
      units: 'kWh',
      violations: [
        {
          type: 'missing_field',
          field: 'endDate',
          message: 'Required field is missing: end date',
        },
      ],
      suggestions: [
        {
          action: 'Fill Missing Field',
          description: 'Enter the end date for this reading period',
          autoFixAvailable: false,
        },
      ],
      createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      comments: [],
      lineageSource: 'Email Ingestion',
    },
    // Exception 3: Date error (existing)
    {
      id: 'exc-cycle-2026-01-date-error',
      type: 'Reading',
      status: 'open',
      meterMetadata: {
        name: 'Berlin West - Electricity Meter 7',
        meterId: 'MEU5678',
        regionSID: 'REU456',
        site: 'Berlin West',
        market: 'EU',
        utilityType: 'Electricity',
      },
      period: {
        startDate: '2026-01-31',
        endDate: '2026-01-01',
      },
      value: 18500,
      units: 'kWh',
      violations: [
        {
          type: 'date_range_invalid',
          field: 'period',
          message: 'Start date must be before end date',
          expectedValue: '2026-01-01 < 2026-01-31',
          actualValue: '2026-01-31 >= 2026-01-01',
        },
      ],
      suggestions: [
        {
          action: 'Correct Date Range',
          description: 'Swap start and end dates',
          autoFixAvailable: true,
        },
      ],
      createdAt: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
      comments: [],
      lineageSource: 'SFTP Upload',
    },
  ],
  'cycle-2025-12': [],
};

// Generate cycles and sync exception counts
let cycles = generateMockCycles();

// Update cycle exception counts to match actual exceptions
function syncExceptionCounts() {
  cycles.forEach(cycle => {
    const cycleExceptions = exceptions[cycle.id] || [];
    const meterCount = cycleExceptions.filter(e => e.status !== 'resolved' && e.type === 'Registry').length;
    const dataCount = cycleExceptions.filter(e => e.status !== 'resolved' && e.type === 'Reading').length;
    const meterResolvedCount = cycleExceptions.filter(e => e.status === 'resolved' && e.type === 'Registry').length;
    const dataResolvedCount = cycleExceptions.filter(e => e.status === 'resolved' && e.type === 'Reading').length;

    cycle.exceptionCounts = {
      meter: meterCount,
      data: dataCount,
      meterResolved: meterResolvedCount,
      dataResolved: dataResolvedCount,
    };
  });
}

// Initial sync
syncExceptionCounts();

let ul360Files = generateMockUL360Files();
let activityLog: ActivityLogEntry[] = [];
let users = generateMockUsers();

// Activity log helper
function logActivity(
  actor: string,
  action: string,
  target: string,
  details: string,
  cycleId?: string,
  exceptionId?: string
) {
  const entry: ActivityLogEntry = {
    id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    actor,
    action,
    target,
    details,
    cycleId,
    exceptionId,
  };
  activityLog.unshift(entry);

  // Add to cycle's activity log
  if (cycleId) {
    const cycle = cycles.find(c => c.id === cycleId);
    if (cycle) {
      cycle.activityLog.unshift(entry);
    }
  }

  return entry;
}

// Orchestration simulation
const orchestrationSteps: OrchestrationStep[] = [
  'Ingest',
  'Normalize',
  'Apply Rules',
  'Validate',
  'Prepare UL 360',
  'Await Verification',
  'Archive',
];

export async function runReportingCycle(cycleId: string, currentUser: string): Promise<ReportingCycle> {
  await delay(500);

  const cycle = cycles.find(c => c.id === cycleId);
  if (!cycle) throw new Error('Cycle not found');

  // Start the cycle
  cycle.status = 'in_progress';
  cycle.actualStartDate = new Date().toISOString();
  cycle.currentStep = 'Ingest';

  logActivity(
    currentUser,
    'Started Reporting Cycle',
    `Cycle: ${cycle.name}`,
    'Manual trigger initiated orchestration',
    cycleId
  );

  // Simulate orchestration progression
  simulateOrchestration(cycle);

  return cycle;
}

async function simulateOrchestration(cycle: ReportingCycle) {
  for (let i = 0; i < orchestrationSteps.length - 2; i++) {
    await delay(2000 + Math.random() * 1000);

    const step = orchestrationSteps[i];
    cycle.currentStep = step;
    cycle.stepTimestamps[step] = new Date().toISOString();

    logActivity(
      'HCL Universal Orchestrator',
      `Completed Step: ${step}`,
      `Cycle: ${cycle.name}`,
      `Orchestration step completed successfully`,
      cycle.id
    );

    // Generate exceptions during validation step
    if (step === 'Validate') {
      let newExceptions: ExceptionItem[];

      // For February 2026, generate specific exceptions to match expected counts (1 meter, 3 data)
      if (cycle.id === 'cycle-2026-02') {
        newExceptions = [
          // 1 Meter exception
          {
            id: `exc-${cycle.id}-meter-1`,
            type: 'Registry',
            status: 'open',
            meterMetadata: {
              name: 'Birmingham East - Gas Meter',
              meterId: 'MUK8765',
              site: 'Birmingham East',
              market: 'UK',
              utilityType: 'Gas',
            },
            violations: [
              {
                type: 'missing_field',
                field: 'meterId',
                message: 'Meter ID not found in registry',
                actualValue: 'MUK8765',
              },
            ],
            suggestions: [
              {
                action: 'Update Meter Registry',
                description: 'Add this meter to the central registry',
                autoFixAvailable: false,
              },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            comments: [],
            lineageSource: 'SFTP Upload',
          },
          // 3 Data exceptions
          {
            id: `exc-${cycle.id}-data-1`,
            type: 'Reading',
            status: 'open',
            meterMetadata: {
              name: 'Tilbury - Electricity Meter 5',
              meterId: 'MUK5432',
              site: 'Tilbury',
              market: 'UK',
              utilityType: 'Electricity',
            },
            period: {
              startDate: '2026-02-15',
              endDate: '2026-02-10',
            },
            value: 15340,
            units: 'kWh',
            violations: [
              {
                type: 'date_range_invalid',
                field: 'period',
                message: 'Start date must be before end date',
                expectedValue: '2026-02-10 < 2026-02-15',
                actualValue: '2026-02-15 >= 2026-02-10',
              },
            ],
            suggestions: [
              {
                action: 'Correct Date Range',
                description: 'Swap start and end dates',
                autoFixAvailable: true,
              },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            comments: [],
            lineageSource: 'SFTP Upload',
          },
          {
            id: `exc-${cycle.id}-data-2`,
            type: 'Reading',
            status: 'open',
            meterMetadata: {
              name: 'Heathrow - Gas Meter 8',
              meterId: 'MUK6789',
              site: 'Heathrow',
              market: 'UK',
              utilityType: 'Gas',
              regionSID: 'RUK124',
            },
            period: {
              startDate: '2026-02-01',
              endDate: '2026-02-28',
            },
            value: 8950,
            units: 'm³',
            violations: [
              {
                type: 'unit_mismatch',
                field: 'units',
                message: 'Unit mismatch for utility type',
                expectedValue: 'kWh',
                actualValue: 'm³',
              },
            ],
            suggestions: [
              {
                action: 'Convert to kWh',
                description: 'Apply conversion factor for gas',
                autoFixAvailable: true,
              },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            comments: [],
            lineageSource: 'SFTP Upload',
          },
          {
            id: `exc-${cycle.id}-data-3`,
            type: 'Reading',
            status: 'open',
            meterMetadata: {
              name: 'Park Royal - Gas Meter 3',
              meterId: 'MUK3456',
              site: 'Park Royal',
              market: 'UK',
              utilityType: 'Gas',
            },
            period: {
              startDate: '2026-02-01',
              endDate: '2026-02-28',
            },
            value: -450,
            units: 'kWh',
            violations: [
              {
                type: 'negative_value',
                field: 'value',
                message: 'Reading value cannot be negative',
                expectedValue: '>= 0',
                actualValue: -450,
              },
            ],
            suggestions: [
              {
                action: 'Correct Value',
                description: 'Enter positive meter reading',
                autoFixAvailable: false,
              },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            comments: [],
            lineageSource: 'SFTP Upload',
          },
        ];
      } else {
        // For other cycles, generate random exceptions
        newExceptions = generateMockExceptions(cycle.id, Date.now());
      }

      exceptions[cycle.id] = newExceptions;

      // Sync exception counts with actual generated exceptions
      syncExceptionCounts();

      logActivity(
        'HCL Universal Orchestrator',
        'Generated Exceptions',
        `Cycle: ${cycle.name}`,
        `Found ${newExceptions.length} exceptions during validation`,
        cycle.id
      );
    }

    // Prepare UL360 files
    if (step === 'Prepare UL 360') {
      cycle.ul360Status = 'prepared';

      // Generate new UL360 file for this cycle
      const baseUrl = typeof window !== 'undefined' ? (import.meta.env.BASE_URL || '/') : '/';
      const attemptNumber = cycle.reportSummaries.length + 1;
      const newFileId = `ul360-generated-${cycle.id}-attempt-${attemptNumber}-${Date.now()}`;
      const cycleExceptions = exceptions[cycle.id] || [];
      const totalEntries = 1000 + Math.floor(Math.random() * 500); // Random total entries
      const failedEntries = cycleExceptions.filter(e => e.status !== 'resolved').length;
      const successfulEntries = totalEntries - failedEntries;

      // Extract reporting period from cycle name (e.g., "February 2026 Reporting" -> "February 2026")
      const reportingPeriod = cycle.name.replace(' Reporting', '');

      const newFile = {
        id: newFileId,
        cycleId: cycle.id,
        filename: `${cycle.markets[0]} Upload File - ${reportingPeriod}${attemptNumber > 1 ? ` (Attempt ${attemptNumber})` : ''}.xlsx`,
        market: cycle.markets[0],
        generatedAt: new Date().toISOString(),
        size: 82944 + Math.floor(Math.random() * 10000), // Random size around 81-91KB
        recordCount: totalEntries,
        status: 'uploaded' as const,
        downloadUrl: `${baseUrl}uk-october-2025.xlsx`, // Use existing file as template
      };

      ul360Files.push(newFile);

      // Add report summary to cycle
      const newSummary = {
        attemptNumber,
        totalEntries,
        successfulEntries,
        failedEntries,
        generatedFileId: newFileId,
        timestamp: new Date().toISOString(),
      };
      cycle.reportSummaries.push(newSummary);

      logActivity(
        'HCL Universal Orchestrator',
        `Prepared UL 360 Files${attemptNumber > 1 ? ` (Attempt ${attemptNumber})` : ''}`,
        `Cycle: ${cycle.name}`,
        `Generated upload files for ${cycle.markets.join(', ')} markets - ${successfulEntries} successful, ${failedEntries} failed`,
        cycle.id
      );
    }
  }

  // Move to await verification
  cycle.currentStep = 'Await Verification';
  cycle.stepTimestamps['Await Verification'] = new Date().toISOString();
  cycle.status = 'awaiting_verification';
  cycle.ul360Status = 'uploaded';

  logActivity(
    'HCL Universal Orchestrator',
    'Awaiting Verification',
    `Cycle: ${cycle.name}`,
    'Files uploaded to UL 360, awaiting human verification',
    cycle.id
  );
}

export async function getCycles(): Promise<ReportingCycle[]> {
  await delay(300);
  return cycles;
}

export async function getCycle(cycleId: string): Promise<ReportingCycle | null> {
  await delay(200);
  return cycles.find(c => c.id === cycleId) || null;
}

export async function getExceptions(cycleId: string): Promise<ExceptionItem[]> {
  await delay(300);
  return exceptions[cycleId] || [];
}

export async function getException(exceptionId: string): Promise<ExceptionItem | null> {
  await delay(200);
  for (const cycleExceptions of Object.values(exceptions)) {
    const exception = cycleExceptions.find(e => e.id === exceptionId);
    if (exception) return exception;
  }
  return null;
}

export async function updateException(
  exceptionId: string,
  updates: Partial<ExceptionItem>,
  currentUser: string
): Promise<ExceptionItem> {
  await delay(400);

  for (const cycleExceptions of Object.values(exceptions)) {
    const exception = cycleExceptions.find(e => e.id === exceptionId);
    if (exception) {
      Object.assign(exception, updates);
      exception.updatedAt = new Date().toISOString();

      logActivity(
        currentUser,
        'Updated Exception',
        `Exception: ${exception.id}`,
        `Modified ${Object.keys(updates).join(', ')}`,
        undefined,
        exceptionId
      );

      // Sync exception counts
      syncExceptionCounts();

      return exception;
    }
  }

  throw new Error('Exception not found');
}

export async function resolveException(
  exceptionId: string,
  currentUser: string,
  resolution: string
): Promise<ExceptionItem> {
  await delay(500);

  for (const [cycleId, cycleExceptions] of Object.entries(exceptions)) {
    const exception = cycleExceptions.find(e => e.id === exceptionId);
    if (exception) {
      exception.status = 'resolved';
      exception.updatedAt = new Date().toISOString();

      logActivity(
        currentUser,
        'Resolved Exception',
        `Exception: ${exception.id}`,
        resolution,
        cycleId,
        exceptionId
      );

      // Sync exception counts
      syncExceptionCounts();

      return exception;
    }
  }

  throw new Error('Exception not found');
}

export async function addExceptionComment(
  exceptionId: string,
  text: string,
  currentUser: string
): Promise<ExceptionItem> {
  await delay(300);

  for (const cycleExceptions of Object.values(exceptions)) {
    const exception = cycleExceptions.find(e => e.id === exceptionId);
    if (exception) {
      const comment = {
        id: `comment-${Date.now()}`,
        author: currentUser,
        text,
        timestamp: new Date().toISOString(),
      };
      exception.comments.push(comment);
      exception.updatedAt = new Date().toISOString();

      logActivity(
        currentUser,
        'Added Comment',
        `Exception: ${exception.id}`,
        `Comment: ${text.substring(0, 50)}...`,
        undefined,
        exceptionId
      );

      return exception;
    }
  }

  throw new Error('Exception not found');
}

export async function verifyUL360Upload(
  cycleId: string,
  currentUser: string,
  success: boolean
): Promise<{ cycle: ReportingCycle; verificationFailed?: boolean; newExceptionsCount?: number }> {
  await delay(800);

  const cycle = cycles.find(c => c.id === cycleId);
  if (!cycle) throw new Error('Cycle not found');

  // Increment verification attempts
  cycle.verificationAttempts += 1;

  if (success) {
    // On first verification attempt, simulate finding 2 additional exceptions
    if (cycle.verificationAttempts === 1) {
      // Generate 2 new exceptions discovered during verification
      const cycleExceptions = exceptions[cycle.id] || [];

      // Create 2 verification exceptions - 1 meter, 1 data
      const verificationException1: ExceptionItem = {
        id: `exc-${cycle.id}-verification-meter-${Date.now()}`,
        type: 'Registry',
        status: 'open',
        meterMetadata: {
          name: 'Manchester West - Gas Meter 12',
          meterId: 'MUK9871',
          site: 'Manchester West',
          market: 'UK',
          utilityType: 'Gas',
        },
        violations: [
          {
            type: 'missing_region_sid',
            field: 'regionSID',
            message: 'Region SID missing in upload file',
          },
        ],
        suggestions: [
          {
            action: 'Add Region SID',
            description: 'Populate missing Region SID from meter registry',
            autoFixAvailable: true,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        lineageSource: 'UL 360 Verification',
      };

      const verificationException2: ExceptionItem = {
        id: `exc-${cycle.id}-verification-data-${Date.now()}`,
        type: 'Reading',
        status: 'open',
        meterMetadata: {
          name: 'Leeds North - Electricity Meter 8',
          meterId: 'MUK6543',
          site: 'Leeds North',
          market: 'UK',
          utilityType: 'Electricity',
          regionSID: 'RUK145',
        },
        period: {
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        },
        value: 45000,
        units: 'kWh',
        violations: [
          {
            type: 'unusual_value',
            field: 'value',
            message: 'Reading value significantly higher than historical average',
            expectedValue: '< 30000',
            actualValue: 45000,
          },
        ],
        suggestions: [
          {
            action: 'Verify Reading',
            description: 'Confirm with site manager that reading is accurate',
            autoFixAvailable: false,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        lineageSource: 'UL 360 Verification',
      };

      // Add the new exceptions
      cycleExceptions.push(verificationException1, verificationException2);
      exceptions[cycle.id] = cycleExceptions;

      // Sync exception counts
      syncExceptionCounts();

      // Keep status as awaiting_verification since new exceptions were found
      cycle.ul360Status = 'uploaded';

      logActivity(
        currentUser,
        'Verification Failed - New Exceptions Found',
        `Cycle: ${cycle.name}`,
        'UL 360 verification found 2 additional exceptions (1 meter, 1 data). Reprocessing failed entries...',
        cycleId
      );

      // Return immediately with failure indicator
      // Reprocessing will happen asynchronously
      const resultToReturn = { cycle, verificationFailed: true, newExceptionsCount: 2 };

      // Trigger reprocessing automatically after delay
      setTimeout(async () => {
        // Reprocess only the failed entries
        const baseUrl = typeof window !== 'undefined' ? (import.meta.env.BASE_URL || '/') : '/';
        const attemptNumber = cycle.reportSummaries.length + 1;
        const newFileId = `ul360-generated-${cycle.id}-attempt-${attemptNumber}-${Date.now()}`;

        // Get current exceptions for this cycle
        const currentExceptions = exceptions[cycle.id] || [];
        const openExceptions = currentExceptions.filter(e => e.status !== 'resolved');

        // Calculate entries - reprocessing only previously failed + new exceptions
        const previousSummary = cycle.reportSummaries[cycle.reportSummaries.length - 1];
        const totalEntries = previousSummary.failedEntries + 2; // Previously failed + 2 new
        const failedEntries = openExceptions.length;
        const successfulEntries = totalEntries - failedEntries;

        // Extract reporting period from cycle name
        const reportingPeriod = cycle.name.replace(' Reporting', '');

        const newFile = {
          id: newFileId,
          cycleId: cycle.id,
          filename: `${cycle.markets[0]} Upload File - ${reportingPeriod} (Attempt ${attemptNumber}).xlsx`,
          market: cycle.markets[0],
          generatedAt: new Date().toISOString(),
          size: 82944 + Math.floor(Math.random() * 10000),
          recordCount: totalEntries,
          status: 'uploaded' as const,
          downloadUrl: `${baseUrl}uk-october-2025.xlsx`,
        };

        ul360Files.push(newFile);

        // Add new report summary
        const newSummary = {
          attemptNumber,
          totalEntries,
          successfulEntries,
          failedEntries,
          generatedFileId: newFileId,
          timestamp: new Date().toISOString(),
        };
        cycle.reportSummaries.push(newSummary);

        logActivity(
          'HCL Universal Orchestrator',
          `Reprocessed Failed Entries (Attempt ${attemptNumber})`,
          `Cycle: ${cycle.name}`,
          `Reprocessed ${totalEntries} entries - ${successfulEntries} successful, ${failedEntries} failed`,
          cycle.id
        );

        // Trigger cycle reload in UI
        syncExceptionCounts();
      }, 3000); // 3 second delay for reprocessing

      return resultToReturn;

    } else {
      // Second or later verification - success
      cycle.ul360Status = 'verified';
      cycle.status = 'completed';
      cycle.currentStep = 'Archive';
      cycle.completedDate = new Date().toISOString();
      cycle.stepTimestamps['Archive'] = new Date().toISOString();

      logActivity(
        currentUser,
        'Verified UL 360 Upload',
        `Cycle: ${cycle.name}`,
        'Upload verified successfully, cycle archived',
        cycleId
      );

      return { cycle };
    }
  } else {
    cycle.ul360Status = 'failed';

    logActivity(
      currentUser,
      'Rejected UL 360 Upload',
      `Cycle: ${cycle.name}`,
      'Upload verification failed, requires regeneration',
      cycleId
    );

    return { cycle };
  }
}

export async function uploadFailureFile(
  cycleId: string,
  file: File,
  currentUser: string
): Promise<ReportingCycle> {
  await delay(1000);

  const cycle = cycles.find(c => c.id === cycleId);
  if (!cycle) throw new Error('Cycle not found');

  // Simulate file processing
  cycle.ul360Status = 'prepared';
  cycle.currentStep = 'Prepare UL 360';

  logActivity(
    currentUser,
    'Uploaded Failure File',
    `Cycle: ${cycle.name}`,
    `Uploaded ${file.name}, triggering regeneration`,
    cycleId
  );

  // Simulate regeneration
  setTimeout(() => {
    cycle.ul360Status = 'uploaded';
    cycle.currentStep = 'Await Verification';
    logActivity(
      'HCL Universal Orchestrator',
      'Regenerated UL 360 Files',
      `Cycle: ${cycle.name}`,
      'Files regenerated successfully',
      cycleId
    );
  }, 2000);

  return cycle;
}

export async function getUL360Files(cycleId?: string): Promise<UL360File[]> {
  await delay(300);
  if (cycleId) {
    return ul360Files.filter(f => f.cycleId === cycleId);
  }
  return ul360Files;
}

export async function getActivityLog(cycleId?: string): Promise<ActivityLogEntry[]> {
  await delay(200);
  if (cycleId) {
    return activityLog.filter(log => log.cycleId === cycleId);
  }
  return activityLog;
}

export async function getUsers(): Promise<User[]> {
  await delay(100);
  return users;
}

export async function getDataFreshness(): Promise<DataFreshness[]> {
  await delay(200);
  return generateMockDataFreshness();
}

// Reset all data to initial state
export async function resetAllData(): Promise<void> {
  await delay(500);

  // Reset exceptions
  exceptions = {
    'cycle-2026-01': [
      ...generateMockExceptions('cycle-2026-01', 42),
      // Exception 1: Amsterdam South - Gas Meter - Registry exception (Demo Step 3)
      {
        id: 'exc-cycle-2026-01-registry-demo',
        type: 'Registry',
        status: 'open',
        meterMetadata: {
          name: 'Amsterdam South - Gas Meter',
          meterId: 'MEU9234',
          site: 'Amsterdam South',
          market: 'EU',
          utilityType: 'Gas',
        },
        violations: [
          {
            type: 'missing_field',
            field: 'meterId',
            message: 'Meter ID not found in registry',
            actualValue: 'MEU9234',
          },
        ],
        suggestions: [
          {
            action: 'Update Meter Registry',
            description: 'Add this meter to the central registry',
            autoFixAvailable: false,
          },
        ],
        createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
        comments: [],
        lineageSource: 'SFTP Upload',
      },
      // Exception 2: Prague Central - Electricity Meter 4 - Unit mismatch (Demo Step 4)
      {
        id: 'exc-cycle-2026-01-unit-mismatch',
        type: 'Reading',
        status: 'open',
        meterMetadata: {
          name: 'Prague Central - Electricity Meter 4',
          meterId: 'MCZ2678',
          regionSID: 'RCZ201',
          site: 'Prague Central',
          market: 'CZ',
          utilityType: 'Electricity',
        },
        period: {
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        },
        value: 1250,
        units: 'm³',
        violations: [
          {
            type: 'unit_mismatch',
            field: 'units',
            message: 'Unit mismatch: received m³, expected kWh for reporting',
            expectedValue: 'kWh',
            actualValue: 'm³',
          },
        ],
        suggestions: [
          {
            action: 'Convert Units',
            description: 'Convert from m³ to kWh using standard conversion factor',
            autoFixAvailable: true,
          },
        ],
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        comments: [],
        lineageSource: 'API Import',
      },
      // Exception 2: Berlin West - Gas Meter 3 - Missing end date
      {
        id: 'exc-cycle-2026-01-missing-enddate',
        type: 'Reading',
        status: 'open',
        meterMetadata: {
          name: 'Berlin West - Gas Meter 3',
          meterId: 'MEU3812',
          regionSID: 'REU456',
          site: 'Berlin West',
          market: 'EU',
          utilityType: 'Gas',
        },
        period: {
          startDate: '2026-01-01',
          endDate: '',
        },
        value: 22400,
        units: 'kWh',
        violations: [
          {
            type: 'missing_field',
            field: 'endDate',
            message: 'Required field is missing: end date',
          },
        ],
        suggestions: [
          {
            action: 'Fill Missing Field',
            description: 'Enter the end date for this reading period',
            autoFixAvailable: false,
          },
        ],
        createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        comments: [],
        lineageSource: 'Email Ingestion',
      },
      // Exception 3: Date error
      {
        id: 'exc-cycle-2026-01-date-error',
        type: 'Reading',
        status: 'open',
        meterMetadata: {
          name: 'Berlin West - Electricity Meter 7',
          meterId: 'MEU5678',
          regionSID: 'REU456',
          site: 'Berlin West',
          market: 'EU',
          utilityType: 'Electricity',
        },
        period: {
          startDate: '2026-01-31',
          endDate: '2026-01-01',
        },
        value: 18500,
        units: 'kWh',
        violations: [
          {
            type: 'date_range_invalid',
            field: 'period',
            message: 'Start date must be before end date',
            expectedValue: '2026-01-01 < 2026-01-31',
            actualValue: '2026-01-31 >= 2026-01-01',
          },
        ],
        suggestions: [
          {
            action: 'Correct Date Range',
            description: 'Swap start and end dates',
            autoFixAvailable: true,
          },
        ],
        createdAt: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        comments: [],
        lineageSource: 'SFTP Upload',
      },
    ],
    'cycle-2025-12': [],
  };

  // Reset cycles
  cycles = generateMockCycles();
  syncExceptionCounts();

  // Reset other data
  ul360Files = generateMockUL360Files();
  activityLog = [];
  users = generateMockUsers();
}
