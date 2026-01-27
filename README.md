# SEGRO ESG Utilities Dashboard

A high-fidelity, frontend-only demo application showcasing a near real-time ESG utilities data backbone for SEGRO Sustainability. This application demonstrates agentic orchestration using HCL Universal Orchestrator for meter data transposition and site data reconciliation.

## Overview

This Single-Page Application (SPA) simulates the complete workflow of:
- **Meter Data Transposition**: Automated ingestion, normalization, validation, and preparation of utility meter data
- **Site Data Reconciliation**: Human-in-the-loop (HITL) review of data mismatches between local and UL 360 systems
- **Exception Management**: Comprehensive handling of data quality issues with intelligent suggestions and validation rules

## Technology Stack

- **Vite**: Fast build tool with Hot Module Replacement (HMR)
- **React 18**: Modern React with functional components and hooks
- **TypeScript**: Full type safety across the application
- **Tailwind CSS**: Utility-first CSS with SEGRO design tokens
- **Zustand**: Lightweight state management
- **React Router**: Client-side routing
- **date-fns**: Date formatting utilities
- **Lucide React**: Modern icon library

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server (runs on http://localhost:5173)
npm run dev
```

The application will open in your browser with hot module replacement enabled.

### Building for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

The built files will be in the `dist/` directory.

## High-Level Architecture

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Application                     │
├─────────────────────────────────────────────────────────┤
│  Pages: Dashboard | Cycles | Exceptions | UL360 | etc.  │
├─────────────────────────────────────────────────────────┤
│        Zustand Store (Global State Management)          │
├─────────────────────────────────────────────────────────┤
│              Mock API Layer (Async Simulation)           │
├─────────────────────────────────────────────────────────┤
│       Mock Data Generator (Deterministic Random)         │
└─────────────────────────────────────────────────────────┘
```

### Key Components

1. **State Management** (`src/store/`): Centralized Zustand store managing cycles, exceptions, reconciliation data, and activity logs

2. **Mock API** (`src/mock/api.ts`): Simulates backend operations with async delays and realistic orchestration progression

3. **Data Models** (`src/types/`): Comprehensive TypeScript types for all data entities

4. **UI Components** (`src/components/`): Reusable SEGRO-branded components (Buttons, Cards, Badges, Timeline, Layout)

5. **Pages** (`src/pages/`): Six main application views corresponding to different workflows

### Design System

The application uses SEGRO's design tokens:

- **Primary Red**: `#C8191F` (Actions, current states)
- **Teal**: `#73AFB6` (Panels, info states)
- **Teal Accent**: `#00AAA5` (Success, completion)
- **Charcoal**: `#2B2B2B` (Headers, dark text)
- **Off-white**: `#F3F8FD` (Background)

## Application Features

### 1. Dashboard
- Real-time view of current reporting cycle status
- Key metrics tiles (cycle status, exceptions, data freshness)
- Orchestration timeline visualization
- Market-level data status monitoring

### 2. Reporting Cycles (HITL Task 1, 4, 5)
- List of all reporting cycles (scheduled, in-progress, completed)
- **HITL Task 1**: "Run Report Now" - Manually trigger cycle execution
- Detailed orchestration timeline showing step progression
- **HITL Task 4**: "Verify UL 360 Upload" - Confirm successful upload
- **HITL Task 5**: "Upload Failure File" - Drag-and-drop interface to trigger regeneration
- Real-time activity log for each cycle

### 3. Exceptions Queue (HITL Task 2, 3)
- Filterable list of all exceptions (open, resolved)
- Three exception types: Registry, Reading, Upload Failure
- **HITL Task 2**: "Meter Registry Updated" - Resolve registry mismatches
- **HITL Task 3**: Reading validation editors:
  - Fill missing fields
  - Correct date ranges with date picker
  - Fix negative values
  - Convert units (special CZ market handling)
  - Auto-populate Region SID
  - Review unusual values with sparkline visualization
- Collaboration features (comments, assignments)
- Violation details with suggested actions

### 4. UL 360 Files
- List of prepared upload files for each market
- File preview (CSV format)
- Download functionality
- Upload statistics and status tracking

### 5. Reconciliation
- Side-by-side comparison of local vs. UL 360 values
- Reviewer controls:
  - Accept local value
  - Reject UL 360 value
  - Modify and provide notes
- Visual difference highlighting
- Review notes and audit trail

### 6. Activity Log
- Complete audit trail of all system and user actions
- Filterable by cycle and actor
- Timeline visualization with action icons
- Statistics on system vs. user actions

## Validation Rules

### Hard Validations (Must be fixed)
- Missing required fields (startDate, endDate, value)
- Invalid date ranges (startDate >= endDate)
- Negative values
- Unit mismatches (e.g., Gas meter with wrong units)

### Soft Validations (Can be auto-resolved)
- Missing Region SID (can be inferred from site)
- Unusual values (significant deviation from historical average)
- Duplicate periods
- Overlapping periods

## Orchestration Simulation

The application simulates HCL Universal Orchestrator with these steps:

1. **Ingest**: Load data from sources (SFTP, Email, API)
2. **Normalize**: Standardize formats and units
3. **Apply Rules**: Execute validation rules
4. **Validate**: Generate exceptions (3-8 deterministic exceptions)
5. **Prepare UL 360**: Generate upload files
6. **Await Verification**: HITL approval required
7. **Archive**: Complete and store cycle

Each step includes realistic delays (2-3 seconds) and automatic state transitions.

## Mock Data Generation

All data is generated deterministically using a seeded pseudo-random number generator, ensuring:
- Consistent data across sessions
- Realistic exception scenarios
- Proper type safety and validation
- Varied markets (UK, CZ, EU), sites, and utility types

## User Management

The application includes mock users with different roles:
- **Admin**: Sarah Mitchell
- **Analyst**: James Chen, Thomas Weber
- **Reviewer**: Emma Rodriguez

Users can be switched via the top navigation dropdown to simulate different perspectives.

## File Structure

```
/home/node/txai-projects/project/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/           # Main application pages
│   ├── store/           # Zustand state management
│   ├── mock/            # Mock API and data generation
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions (formatters)
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles and Tailwind imports
├── public/              # Static assets
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## Human-in-the-Loop (HITL) Journeys

### Journey 1: Running a Reporting Cycle
1. Navigate to "Reporting Cycles"
2. Select a scheduled cycle
3. Click "Run Report Now"
4. Watch orchestration progress in real-time
5. Exceptions generated during validation step

### Journey 2: Resolving Registry Exceptions
1. Navigate to "Exceptions"
2. Filter by "Open" status
3. Select a Registry exception
4. Click "Meter Registry Updated" to resolve

### Journey 3: Validating Reading Exceptions
1. Navigate to "Exceptions"
2. Select a Reading exception
3. Use appropriate editor based on violation type
4. Apply corrections or use auto-fix suggestions
5. Add comments for collaboration

### Journey 4: Verifying UL 360 Upload
1. Navigate to "Reporting Cycles"
2. Select cycle in "awaiting_verification" status
3. Click "Verify UL 360 Upload" to complete cycle

### Journey 5: Handling Upload Failures
1. Navigate to "Reporting Cycles"
2. Select cycle with failed upload
3. Click "Upload Failure File"
4. Drag and drop failure file
5. System automatically regenerates upload files

### Journey 6: Reconciliation Review
1. Navigate to "Reconciliation"
2. Review mismatches between local and UL 360 data
3. Click "Review" on a mismatch
4. Choose action: Accept, Reject, or Modify
5. Add review notes
6. Confirm decision

## Development Notes

- All data is stored in-memory; refreshing the page resets state
- The orchestration simulation runs automatically after triggering
- Mock API calls include realistic delays (200-1000ms)
- No backend required; fully self-contained frontend demo
- Responsive design works on desktop, tablet, and mobile devices

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

Built by Leona - Vibe coding Agent from HCL Software

---

**Note**: This is a demonstration application with mocked data and simulated orchestration. In a production environment, these would be replaced with real API endpoints and backend services.
