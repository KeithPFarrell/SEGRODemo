import { create } from 'zustand';
import {
  ReportingCycle,
  ExceptionItem,
  UL360File,
  ActivityLogEntry,
  User,
  DataFreshness,
} from '../types';
import * as api from '../mock/api';

interface AppState {
  // Current user
  currentUser: User | null;
  users: User[];
  setCurrentUser: (user: User) => void;
  loadUsers: () => Promise<void>;

  // Cycles
  cycles: ReportingCycle[];
  selectedCycle: ReportingCycle | null;
  loadCycles: () => Promise<void>;
  loadCycle: (cycleId: string) => Promise<void>;
  runCycle: (cycleId: string) => Promise<void>;
  verifyUL360: (cycleId: string, success: boolean) => Promise<{ cycle: ReportingCycle; verificationFailed?: boolean; newExceptionsCount?: number }>;
  uploadFailureFile: (cycleId: string, file: File) => Promise<void>;

  // Exceptions
  exceptions: ExceptionItem[];
  selectedException: ExceptionItem | null;
  loadExceptions: (cycleId: string) => Promise<void>;
  loadExceptionsFromMultipleCycles: (cycleIds: string[]) => Promise<void>;
  loadException: (exceptionId: string) => Promise<void>;
  clearSelectedException: () => void;
  updateException: (exceptionId: string, updates: Partial<ExceptionItem>) => Promise<void>;
  resolveException: (exceptionId: string, resolution: string) => Promise<void>;
  addComment: (exceptionId: string, text: string) => Promise<void>;

  // UL360
  ul360Files: UL360File[];
  loadUL360Files: (cycleId?: string) => Promise<void>;

  // Activity Log
  activityLog: ActivityLogEntry[];
  loadActivityLog: (cycleId?: string) => Promise<void>;

  // Data Freshness
  dataFreshness: DataFreshness[];
  loadDataFreshness: () => Promise<void>;

  // Reset all data
  resetAllData: () => Promise<void>;

  // UI State
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  currentUser: null,
  users: [],
  cycles: [],
  selectedCycle: null,
  exceptions: [],
  selectedException: null,
  ul360Files: [],
  activityLog: [],
  dataFreshness: [],
  loading: false,
  error: null,

  // User actions
  setCurrentUser: (user) => set({ currentUser: user }),

  loadUsers: async () => {
    try {
      const users = await api.getUsers();
      set({ users, currentUser: users[0] }); // Default to first user
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  // Cycle actions
  loadCycles: async () => {
    set({ loading: true, error: null });
    try {
      const cycles = await api.getCycles();
      set({ cycles, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  loadCycle: async (cycleId) => {
    set({ loading: true, error: null });
    try {
      const cycle = await api.getCycle(cycleId);
      set({ selectedCycle: cycle, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  runCycle: async (cycleId) => {
    set({ loading: true, error: null });
    try {
      const currentUser = get().currentUser?.name || 'System';
      const cycle = await api.runReportingCycle(cycleId, currentUser);

      // Update cycles list
      const cycles = get().cycles.map(c => c.id === cycle.id ? cycle : c);
      set({ cycles, selectedCycle: cycle, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  verifyUL360: async (cycleId, success) => {
    set({ loading: true, error: null });
    try {
      const currentUser = get().currentUser?.name || 'System';
      const result = await api.verifyUL360Upload(cycleId, currentUser, success);

      const cycles = get().cycles.map(c => c.id === result.cycle.id ? result.cycle : c);
      set({ cycles, selectedCycle: result.cycle, loading: false });

      // Return the result so the component can handle it
      return result;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  uploadFailureFile: async (cycleId, file) => {
    set({ loading: true, error: null });
    try {
      const currentUser = get().currentUser?.name || 'System';
      const cycle = await api.uploadFailureFile(cycleId, file, currentUser);

      const cycles = get().cycles.map(c => c.id === cycle.id ? cycle : c);
      set({ cycles, selectedCycle: cycle, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Exception actions
  loadExceptions: async (cycleId) => {
    set({ loading: true, error: null });
    try {
      const exceptions = await api.getExceptions(cycleId);
      set({ exceptions, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  loadExceptionsFromMultipleCycles: async (cycleIds) => {
    set({ loading: true, error: null });
    try {
      // Load exceptions from all provided cycle IDs
      const allExceptionsPromises = cycleIds.map(id => api.getExceptions(id));
      const allExceptionsArrays = await Promise.all(allExceptionsPromises);

      // Merge all exceptions into a single array
      const exceptions = allExceptionsArrays.flat();

      set({ exceptions, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  loadException: async (exceptionId) => {
    set({ loading: true, error: null });
    try {
      const exception = await api.getException(exceptionId);
      set({ selectedException: exception, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  clearSelectedException: () => {
    set({ selectedException: null });
  },

  updateException: async (exceptionId, updates) => {
    set({ loading: true, error: null });
    try {
      const currentUser = get().currentUser?.name || 'System';
      const exception = await api.updateException(exceptionId, updates, currentUser);

      const exceptions = get().exceptions.map(e => e.id === exception.id ? exception : e);
      set({ exceptions, selectedException: exception, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  resolveException: async (exceptionId, resolution) => {
    set({ loading: true, error: null });
    try {
      const currentUser = get().currentUser?.name || 'System';
      const exception = await api.resolveException(exceptionId, currentUser, resolution);

      const exceptions = get().exceptions.map(e => e.id === exception.id ? exception : e);
      set({ exceptions, selectedException: exception, loading: false });

      // Reload cycles to update exception counts
      get().loadCycles();
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addComment: async (exceptionId, text) => {
    set({ loading: true, error: null });
    try {
      const currentUser = get().currentUser?.name || 'System';
      const exception = await api.addExceptionComment(exceptionId, text, currentUser);

      const exceptions = get().exceptions.map(e => e.id === exception.id ? exception : e);
      set({ exceptions, selectedException: exception, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  // UL360 actions
  loadUL360Files: async (cycleId) => {
    set({ loading: true, error: null });
    try {
      const ul360Files = await api.getUL360Files(cycleId);
      set({ ul360Files, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Activity Log actions
  loadActivityLog: async (cycleId) => {
    set({ loading: true, error: null });
    try {
      const activityLog = await api.getActivityLog(cycleId);
      set({ activityLog, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Data Freshness actions
  loadDataFreshness: async () => {
    try {
      const dataFreshness = await api.getDataFreshness();
      set({ dataFreshness });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  // Reset all data to initial state
  resetAllData: async () => {
    set({ loading: true, error: null });
    try {
      await api.resetAllData();

      // Reload all data from the reset state
      const [cycles, users, dataFreshness] = await Promise.all([
        api.getCycles(),
        api.getUsers(),
        api.getDataFreshness(),
      ]);

      // Reset store state to initial
      set({
        cycles,
        users,
        dataFreshness,
        selectedCycle: null,
        exceptions: [],
        selectedException: null,
        ul360Files: [],
        activityLog: [],
        loading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Error handling
  setError: (error) => set({ error }),
}));
