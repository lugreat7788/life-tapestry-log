import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { format } from "date-fns";
import { getDailyLog, getAllLogs, getStreakDays, getAllTimePoints } from "@/lib/supabase-store";
import { useAuth } from "@/hooks/useAuth";
import type { DailyLog } from "@/lib/store-types";

interface DataCacheState {
  dailyLogs: Record<string, DailyLog>;       // keyed by date string
  allLogs: Record<string, any> | null;        // full allLogs result
  streakDays: number | null;
  allTimePoints: number | null;
  loading: boolean;
}

interface DataCacheContextType extends DataCacheState {
  /** Get today's log (or a specific date). Returns cached if available, fetches otherwise. */
  getDailyLogCached: (date?: Date) => Promise<DailyLog>;
  /** Get all logs. Returns cached if available. */
  getAllLogsCached: () => Promise<Record<string, any>>;
  /** Get streak days cached */
  getStreakCached: () => Promise<number>;
  /** Get all-time points cached */
  getAllTimePtsCached: () => Promise<number>;
  /** Load all homepage data in one shot */
  loadHomeData: () => Promise<{ log: DailyLog; streak: number; allTimePoints: number; allLogs: Record<string, any> }>;
  /** Optimistically update a daily log in the cache */
  updateDailyLogOptimistic: (dateStr: string, updater: (prev: DailyLog) => DailyLog) => void;
  /** Invalidate all caches (on write failure or explicit refresh) */
  invalidateAll: () => void;
  /** Invalidate a specific date's cache */
  invalidateDate: (dateStr: string) => void;
}

const DataCacheContext = createContext<DataCacheContextType | null>(null);

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<DataCacheState>({
    dailyLogs: {},
    allLogs: null,
    streakDays: null,
    allTimePoints: null,
    loading: false,
  });

  // Prevent duplicate in-flight requests
  const inflightRef = useRef<Record<string, Promise<any>>>({});

  const getDailyLogCached = useCallback(async (date?: Date): Promise<DailyLog> => {
    if (!user) return { date: "", entries: {}, totalPoints: 0 };
    const dateStr = format(date || new Date(), "yyyy-MM-dd");

    // Return cached
    if (state.dailyLogs[dateStr]) return state.dailyLogs[dateStr];

    // Deduplicate inflight
    const key = `daily_${dateStr}`;
    if (!inflightRef.current[key]) {
      inflightRef.current[key] = getDailyLog(user.id, date).then((data) => {
        setState((prev) => ({
          ...prev,
          dailyLogs: { ...prev.dailyLogs, [dateStr]: data },
        }));
        delete inflightRef.current[key];
        return data;
      });
    }
    return inflightRef.current[key];
  }, [user, state.dailyLogs]);

  const getAllLogsCached = useCallback(async (): Promise<Record<string, any>> => {
    if (!user) return {};
    if (state.allLogs) return state.allLogs;

    const key = "allLogs";
    if (!inflightRef.current[key]) {
      inflightRef.current[key] = getAllLogs(user.id).then((data) => {
        setState((prev) => ({ ...prev, allLogs: data }));
        delete inflightRef.current[key];
        return data;
      });
    }
    return inflightRef.current[key];
  }, [user, state.allLogs]);

  const getStreakCached = useCallback(async (): Promise<number> => {
    if (!user) return 0;
    if (state.streakDays !== null) return state.streakDays;

    const key = "streak";
    if (!inflightRef.current[key]) {
      inflightRef.current[key] = getStreakDays(user.id).then((data) => {
        setState((prev) => ({ ...prev, streakDays: data }));
        delete inflightRef.current[key];
        return data;
      });
    }
    return inflightRef.current[key];
  }, [user, state.streakDays]);

  const getAllTimePtsCached = useCallback(async (): Promise<number> => {
    if (!user) return 0;
    if (state.allTimePoints !== null) return state.allTimePoints;

    const key = "allTimePts";
    if (!inflightRef.current[key]) {
      inflightRef.current[key] = getAllTimePoints(user.id).then((data) => {
        setState((prev) => ({ ...prev, allTimePoints: data }));
        delete inflightRef.current[key];
        return data;
      });
    }
    return inflightRef.current[key];
  }, [user, state.allTimePoints]);

  const loadHomeData = useCallback(async () => {
    if (!user) return { log: { date: "", entries: {}, totalPoints: 0 } as DailyLog, streak: 0, allTimePoints: 0, allLogs: {} };

    const dateStr = format(new Date(), "yyyy-MM-dd");
    const [log, streak, atp, logs] = await Promise.all([
      getDailyLogCached(),
      getStreakCached(),
      getAllTimePtsCached(),
      getAllLogsCached(),
    ]);

    return { log, streak, allTimePoints: atp, allLogs: logs };
  }, [user, getDailyLogCached, getStreakCached, getAllTimePtsCached, getAllLogsCached]);

  const updateDailyLogOptimistic = useCallback((dateStr: string, updater: (prev: DailyLog) => DailyLog) => {
    setState((prev) => {
      const current = prev.dailyLogs[dateStr] || { date: dateStr, entries: {}, totalPoints: 0 };
      const updated = updater(current);
      return {
        ...prev,
        dailyLogs: { ...prev.dailyLogs, [dateStr]: updated },
        // Also update allLogs if it exists
        allLogs: prev.allLogs ? { ...prev.allLogs, [dateStr]: updated } : prev.allLogs,
        // Invalidate computed values so they re-fetch
        streakDays: null,
        allTimePoints: null,
      };
    });
  }, []);

  const invalidateAll = useCallback(() => {
    setState({ dailyLogs: {}, allLogs: null, streakDays: null, allTimePoints: null, loading: false });
    inflightRef.current = {};
  }, []);

  const invalidateDate = useCallback((dateStr: string) => {
    setState((prev) => {
      const newDailyLogs = { ...prev.dailyLogs };
      delete newDailyLogs[dateStr];
      return { ...prev, dailyLogs: newDailyLogs, allLogs: null, streakDays: null, allTimePoints: null };
    });
  }, []);

  return (
    <DataCacheContext.Provider
      value={{
        ...state,
        getDailyLogCached,
        getAllLogsCached,
        getStreakCached,
        getAllTimePtsCached,
        loadHomeData,
        updateDailyLogOptimistic,
        invalidateAll,
        invalidateDate,
      }}
    >
      {children}
    </DataCacheContext.Provider>
  );
}

export function useDataCache() {
  const ctx = useContext(DataCacheContext);
  if (!ctx) throw new Error("useDataCache must be used within DataCacheProvider");
  return ctx;
}
