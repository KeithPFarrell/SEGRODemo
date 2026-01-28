// Core types for SEGRO ESG Utilities Dashboard

export type Market = 'UK' | 'CZ' | 'EU';

export type OrchestrationStep =
  | 'Ingest'
  | 'Normalize'
  | 'Apply Rules'
  | 'Validate'
  | 'Prepare UL 360'
  | 'Await Verification'
  | 'Archive';

export type CycleStatus =
  | 'scheduled'
  | 'in_progress'
  | 'awaiting_verification'
  | 'completed'
  | 'failed';

export type UL360Status =
  | 'pending'
  | 'prepared'
  | 'uploaded'
  | 'verified'
  | 'failed';

export type ExceptionType =
  | 'Registry'
  | 'Reading'
  | 'UploadFailure';

export type ExceptionStatus =
  | 'open'
  | 'in_review'
  | 'resolved'
  | 'dismissed';

export type ViolationType =
  | 'missing_field'
  | 'date_range_invalid'
  | 'negative_value'
  | 'unit_mismatch'
  | 'missing_region_sid'
  | 'unusual_value'
  | 'duplicate_period'
  | 'overlapping_period';

export interface Violation {
  type: ViolationType;
  field?: string;
  message: string;
  expectedValue?: string | number;
  actualValue?: string | number;
}

export interface Suggestion {
  action: string;
  description: string;
  autoFixAvailable: boolean;
}

export interface MeterMetadata {
  name: string;
  meterId: string;
  regionSID?: string;
  site: string;
  market: Market;
  utilityType: 'Electricity' | 'Gas';
}

export interface ReadingPeriod {
  startDate: string;
  endDate: string;
}

export interface ExceptionItem {
  id: string;
  type: ExceptionType;
  status: ExceptionStatus;
  meterMetadata: MeterMetadata;
  period?: ReadingPeriod;
  value?: number;
  units?: string;
  violations: Violation[];
  suggestions: Suggestion[];
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  comments: Comment[];
  lineageSource?: string;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface ReportSummary {
  attemptNumber: number; // 1, 2, 3, etc.
  totalEntries: number;
  successfulEntries: number;
  failedEntries: number;
  generatedFileId?: string; // Reference to the UL360 file
  timestamp: string;
}

export interface ReportingCycle {
  id: string;
  name: string;
  markets: Market[];
  status: CycleStatus;
  currentStep: OrchestrationStep;
  ul360Status: UL360Status;
  scheduledStartDate: string;
  actualStartDate?: string;
  completedDate?: string;
  exceptionCounts: {
    meter: number; // Open Registry exceptions
    data: number; // Open Reading exceptions
    meterResolved: number; // Resolved Registry exceptions
    dataResolved: number; // Resolved Reading exceptions
  };
  stepTimestamps: Record<OrchestrationStep, string | null>;
  activityLog: ActivityLogEntry[];
  reportSummaries: ReportSummary[]; // Array to track multiple processing attempts
  verificationAttempts: number; // Track how many times verification has been attempted
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  details: string;
  cycleId?: string;
  exceptionId?: string;
}

export interface UL360File {
  id: string;
  cycleId: string;
  filename: string;
  market: Market;
  generatedAt: string;
  size: number;
  recordCount: number;
  status: 'prepared' | 'uploaded' | 'verified' | 'failed';
  downloadUrl?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'analyst' | 'reviewer';
}

export interface DataFreshness {
  market: Market;
  lastUpdateTime: string;
  recordCount: number;
  status: 'current' | 'stale' | 'outdated';
}
