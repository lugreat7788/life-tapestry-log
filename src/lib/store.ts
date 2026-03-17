import { format } from "date-fns";

export interface LogEntry {
  itemId: string;
  moduleKey: string;
  completed: boolean;
  notes: string;
  timestamp: string;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  entries: Record<string, LogEntry>; // keyed by itemId
  totalPoints: number;
}

export interface TodoItem {
  id: string;
  text: string;
  dueDate?: string;
  priority: "low" | "medium" | "high";
  moduleTag?: string;
  completed: boolean;
  points: number;
  createdAt: string;
}

const STORAGE_KEY = "lifelog_data";
const TODO_KEY = "lifelog_todos";

function getDateKey(date?: Date): string {
  return format(date || new Date(), "yyyy-MM-dd");
}

export function getDailyLog(date?: Date): DailyLog {
  const key = getDateKey(date);
  const data = localStorage.getItem(STORAGE_KEY);
  const allLogs: Record<string, DailyLog> = data ? JSON.parse(data) : {};
  return allLogs[key] || { date: key, entries: {}, totalPoints: 0 };
}

export function saveDailyLog(log: DailyLog): void {
  const data = localStorage.getItem(STORAGE_KEY);
  const allLogs: Record<string, DailyLog> = data ? JSON.parse(data) : {};
  allLogs[log.date] = log;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allLogs));
}

export function getAllLogs(): Record<string, DailyLog> {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
}

export function toggleEntry(
  moduleKey: string,
  itemId: string,
  points: number,
  date?: Date
): DailyLog {
  const log = getDailyLog(date);
  const entry = log.entries[itemId];

  if (entry?.completed) {
    entry.completed = false;
    log.totalPoints -= points;
  } else {
    log.entries[itemId] = {
      itemId,
      moduleKey,
      completed: true,
      notes: entry?.notes || "",
      timestamp: new Date().toISOString(),
    };
    log.totalPoints += points;
  }

  saveDailyLog(log);
  return log;
}

export function updateEntryNotes(
  itemId: string,
  moduleKey: string,
  notes: string,
  date?: Date
): DailyLog {
  const log = getDailyLog(date);
  if (log.entries[itemId]) {
    log.entries[itemId].notes = notes;
  } else {
    log.entries[itemId] = {
      itemId,
      moduleKey,
      completed: false,
      notes,
      timestamp: new Date().toISOString(),
    };
  }
  saveDailyLog(log);
  return log;
}

export function getTodos(): TodoItem[] {
  const data = localStorage.getItem(TODO_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveTodos(todos: TodoItem[]): void {
  localStorage.setItem(TODO_KEY, JSON.stringify(todos));
}

export function getStreakDays(): number {
  const allLogs = getAllLogs();
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = getDateKey(d);
    if (allLogs[key] && allLogs[key].totalPoints > 0) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export function getWeekPoints(): number[] {
  const points: number[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const log = getDailyLog(d);
    points.push(log.totalPoints);
  }
  return points;
}
