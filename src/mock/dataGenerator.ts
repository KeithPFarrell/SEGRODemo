import {
  Market,
  ExceptionItem,
  ReportingCycle,
  UL360File,
  DataFreshness,
  User,
  Violation,
  ViolationType,
} from '../types';

// Deterministic pseudo-random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
}

const markets: Market[] = ['UK', 'CZ', 'EU'];

// Map sites to their correct markets
const sitesByMarket: Record<Market, string[]> = {
  'UK': ['Park Royal', 'Heathrow'],
  'CZ': ['Prague Central'],
  'EU': ['Berlin West', 'Amsterdam South'],
};

const utilityTypes: Array<'Electricity' | 'Gas' | 'Water'> = ['Electricity', 'Gas', 'Water'];

export function generateMockUsers(): User[] {
  return [
    { id: 'u1', name: 'Sarah Mitchell', email: 's.mitchell@segro.com', role: 'admin' },
    { id: 'u2', name: 'James Chen', email: 'j.chen@segro.com', role: 'analyst' },
    { id: 'u3', name: 'Emma Rodriguez', email: 'e.rodriguez@segro.com', role: 'reviewer' },
    { id: 'u4', name: 'Thomas Weber', email: 't.weber@segro.com', role: 'analyst' },
  ];
}

export function generateMockExceptions(cycleId: string, seed: number = 42): ExceptionItem[] {
  const rng = new SeededRandom(seed);
  const exceptionCount = rng.nextInt(3, 8);
  const exceptions: ExceptionItem[] = [];
  const now = new Date();

  for (let i = 0; i < exceptionCount; i++) {
    const market = rng.pick(markets);
    const site = rng.pick(sitesByMarket[market]); // Pick site from correct market
    const utilityType = rng.pick(utilityTypes);
    const meterId = `M${market}${rng.nextInt(1000, 9999)}`;

    let violations: Violation[] = [];
    let exceptionType: 'Registry' | 'Reading' | 'UploadFailure';

    // Determine exception type and violations
    if (rng.next() > 0.7) {
      exceptionType = 'Registry';
      violations = [
        {
          type: 'missing_field',
          field: 'meterId',
          message: 'Meter ID not found in registry',
          actualValue: meterId,
        },
      ];
    } else if (rng.next() > 0.8) {
      exceptionType = 'UploadFailure';
      violations = [
        {
          type: 'unit_mismatch',
          field: 'units',
          message: 'UL 360 upload rejected due to unit mismatch',
          expectedValue: 'kWh',
          actualValue: 'm³',
        },
      ];
    } else {
      exceptionType = 'Reading';

      // Generate reading validation violations
      const allViolations: ViolationType[] = [
        'missing_field',
        'date_range_invalid',
        'negative_value',
        'unit_mismatch',
        'missing_region_sid',
        'unusual_value',
        'duplicate_period',
      ];
      const violationType = rng.pick(allViolations);

      switch (violationType) {
        case 'missing_field':
          violations.push({
            type: 'missing_field',
            field: rng.pick(['startDate', 'endDate', 'value']),
            message: 'Required field is missing',
          });
          break;
        case 'date_range_invalid':
          violations.push({
            type: 'date_range_invalid',
            field: 'period',
            message: 'Start date must be before end date',
            expectedValue: '2026-01-01 < 2026-01-31',
            actualValue: '2026-01-31 >= 2026-01-01',
          });
          break;
        case 'negative_value':
          violations.push({
            type: 'negative_value',
            field: 'value',
            message: 'Reading value cannot be negative',
            expectedValue: '>= 0',
            actualValue: -123.45,
          });
          break;
        case 'unit_mismatch':
          violations.push({
            type: 'unit_mismatch',
            field: 'units',
            message: market === 'CZ' ? 'CZ market requires kWh for gas' : 'Unit mismatch for utility type',
            expectedValue: 'kWh',
            actualValue: 'm³',
          });
          break;
        case 'missing_region_sid':
          violations.push({
            type: 'missing_region_sid',
            field: 'regionSID',
            message: 'Region SID is missing but can be inferred',
          });
          break;
        case 'unusual_value':
          violations.push({
            type: 'unusual_value',
            field: 'value',
            message: 'Value deviates significantly from historical average',
            expectedValue: '15000 ± 2000',
            actualValue: 25000,
          });
          break;
        case 'duplicate_period':
          violations.push({
            type: 'duplicate_period',
            field: 'period',
            message: 'Duplicate reading for this period',
          });
          break;
      }
    }

    const suggestions = generateSuggestions(exceptionType, violations);

    exceptions.push({
      id: `exc-${cycleId}-${i + 1}`,
      type: exceptionType,
      status: 'open',
      meterMetadata: {
        name: `${site} - ${utilityType} Meter ${i + 1}`,
        meterId,
        regionSID: violations.some(v => v.type === 'missing_region_sid')
          ? undefined
          : `R${market}${rng.nextInt(100, 999)}`,
        site,
        market,
        utilityType: utilityType as 'Electricity' | 'Gas' | 'Water',
      },
      period: exceptionType === 'Reading' ? {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      } : undefined,
      value: exceptionType === 'Reading' ? rng.nextInt(10000, 30000) : undefined,
      units: exceptionType === 'Reading' ? (utilityType === 'Gas' ? 'kWh' : 'kWh') : undefined,
      violations,
      suggestions,
      createdAt: new Date(now.getTime() - rng.nextInt(1, 24) * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - rng.nextInt(0, 12) * 60 * 60 * 1000).toISOString(),
      comments: [],
      lineageSource: rng.pick(['SFTP Upload', 'Email Ingestion', 'API Import', 'Manual Entry']),
    });
  }

  return exceptions;
}

function generateSuggestions(
  exceptionType: 'Registry' | 'Reading' | 'UploadFailure',
  violations: Violation[]
) {
  const suggestions = [];

  if (exceptionType === 'Registry') {
    suggestions.push({
      action: 'Update Meter Registry',
      description: 'Add this meter to the central registry',
      autoFixAvailable: false,
    });
  }

  for (const violation of violations) {
    switch (violation.type) {
      case 'missing_field':
        suggestions.push({
          action: 'Fill Missing Field',
          description: `Enter value for ${violation.field}`,
          autoFixAvailable: false,
        });
        break;
      case 'date_range_invalid':
        suggestions.push({
          action: 'Correct Date Range',
          description: 'Swap start and end dates',
          autoFixAvailable: true,
        });
        break;
      case 'negative_value':
        suggestions.push({
          action: 'Use Absolute Value',
          description: 'Convert to positive value',
          autoFixAvailable: true,
        });
        break;
      case 'unit_mismatch':
        suggestions.push({
          action: 'Convert Units',
          description: 'Apply unit conversion formula',
          autoFixAvailable: true,
        });
        break;
      case 'missing_region_sid':
        suggestions.push({
          action: 'Infer Region SID',
          description: 'Auto-populate from site location',
          autoFixAvailable: true,
        });
        break;
      case 'unusual_value':
        suggestions.push({
          action: 'Review with Site Manager',
          description: 'Confirm reading is accurate',
          autoFixAvailable: false,
        });
        break;
      case 'duplicate_period':
        suggestions.push({
          action: 'Keep Latest Reading',
          description: 'Discard older duplicate',
          autoFixAvailable: true,
        });
        break;
    }
  }

  return suggestions;
}

export function generateMockCycles(): ReportingCycle[] {
  const cycles: ReportingCycle[] = [];

  // Current active cycle - January 2026
  cycles.push({
    id: 'cycle-2026-01',
    name: 'January 2026 Reporting',
    markets: ['UK', 'CZ', 'EU'],
    status: 'awaiting_verification',
    currentStep: 'Await Verification',
    ul360Status: 'uploaded',
    scheduledStartDate: '2026-02-01T00:00:00Z',
    actualStartDate: '2026-02-01T08:30:00Z',
    exceptionCounts: {
      total: 5,
      resolved: 0,
    },
    stepTimestamps: {
      'Ingest': '2026-02-01T08:30:00Z',
      'Normalize': '2026-02-01T08:45:00Z',
      'Apply Rules': '2026-02-01T09:00:00Z',
      'Validate': '2026-02-01T09:30:00Z',
      'Prepare UL 360': '2026-02-01T10:00:00Z',
      'Await Verification': '2026-02-01T10:15:00Z',
      'Archive': null,
    },
    activityLog: [],
  });

  // Completed cycle - December 2025
  cycles.push({
    id: 'cycle-2025-12',
    name: 'December 2025 Reporting',
    markets: ['UK', 'CZ', 'EU'],
    status: 'completed',
    currentStep: 'Archive',
    ul360Status: 'verified',
    scheduledStartDate: '2026-01-01T00:00:00Z',
    actualStartDate: '2026-01-01T08:00:00Z',
    completedDate: '2026-01-01T16:30:00Z',
    exceptionCounts: {
      total: 7,
      resolved: 7,
    },
    stepTimestamps: {
      'Ingest': '2026-01-01T08:00:00Z',
      'Normalize': '2026-01-01T08:20:00Z',
      'Apply Rules': '2026-01-01T08:40:00Z',
      'Validate': '2026-01-01T09:15:00Z',
      'Prepare UL 360': '2026-01-01T14:00:00Z',
      'Await Verification': '2026-01-01T15:00:00Z',
      'Archive': '2026-01-01T16:30:00Z',
    },
    activityLog: [],
  });

  // Scheduled future cycle - February 2026
  cycles.push({
    id: 'cycle-2026-02',
    name: 'February 2026 Reporting',
    markets: ['UK', 'CZ', 'EU'],
    status: 'scheduled',
    currentStep: 'Ingest',
    ul360Status: 'pending',
    scheduledStartDate: '2026-03-01T00:00:00Z',
    exceptionCounts: {
      total: 0,
      resolved: 0,
    },
    stepTimestamps: {
      'Ingest': null,
      'Normalize': null,
      'Apply Rules': null,
      'Validate': null,
      'Prepare UL 360': null,
      'Await Verification': null,
      'Archive': null,
    },
    activityLog: [],
  });

  return cycles;
}

export function generateMockUL360Files(): UL360File[] {
  // Use BASE_URL to ensure files are accessible with correct path prefix
  const baseUrl = import.meta.env.BASE_URL || '/';

  return [
    {
      id: 'ul360-2025-10-uk',
      cycleId: 'cycle-2026-01',
      filename: 'UK Stark Electricity Upload File - October 25.xlsx',
      market: 'UK',
      generatedAt: '2025-11-07T10:00:00Z',
      size: 82944, // 81KB
      recordCount: 856,
      status: 'uploaded',
      downloadUrl: `${baseUrl}uk-october-2025.xlsx`,
    },
    {
      id: 'ul360-2025-11-uk',
      cycleId: 'cycle-2026-01',
      filename: 'UK Stark Electricity Upload File - November 25.xlsx',
      market: 'UK',
      generatedAt: '2026-01-15T10:05:00Z',
      size: 91136, // 89KB
      recordCount: 923,
      status: 'uploaded',
      downloadUrl: `${baseUrl}uk-november-2025.xlsx`,
    },
    {
      id: 'ul360-2025-12-uk',
      cycleId: 'cycle-2026-01',
      filename: 'UK Stark Electricity Upload File - December 25.xlsx',
      market: 'UK',
      generatedAt: '2026-01-19T10:08:00Z',
      size: 35840, // 35KB
      recordCount: 412,
      status: 'uploaded',
      downloadUrl: `${baseUrl}uk-december-2025.xlsx`,
    },
  ];
}

export function generateMockDataFreshness(): DataFreshness[] {
  const now = new Date();
  return markets.map((market, idx) => ({
    market,
    lastUpdateTime: new Date(now.getTime() - idx * 2 * 60 * 60 * 1000).toISOString(),
    recordCount: 1000 + idx * 200,
    status: idx === 0 ? 'current' : idx === 1 ? 'current' : 'stale',
  })) as DataFreshness[];
}
