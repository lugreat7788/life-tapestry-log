export interface LogEntry {
  itemId: string;
  moduleKey: string;
  completed: boolean;
  notes: string;
  timestamp: string;
}

export interface DailyLog {
  id?: string | null;
  date: string;
  entries: Record<string, LogEntry>;
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

export interface GoalItem {
  id: string;
  title: string;
  description: string;
  targetDate?: string;
  type: "short_term" | "long_term";
  status: "not_started" | "in_progress" | "completed";
  points: number;
  createdAt: string;
}

export interface ModuleConfig {
  modules: Record<string, {
    name?: string;
    items: Array<{ id: string; name: string; points: number }>;
  }>;
}
