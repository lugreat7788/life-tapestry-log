export interface LogEntry {
  itemId: string;
  moduleKey: string;
  completed: boolean;
  notes: string;
  timestamp: string;
  sleepBedtime?: string;
  sleepWaketime?: string;
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
  collectionId?: string;
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
  collectionId?: string;
  createdAt: string;
}

export interface GoalCollection {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface RewardItem {
  id: string;
  name: string;
  pointsCost: number;
  createdAt: string;
}

export interface RedemptionRecord {
  id: string;
  rewardName: string;
  pointsSpent: number;
  redeemedAt: string;
}

export interface TodoCollection {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface EmotionRecord {
  id: string;
  userId: string;
  date: string;
  emotionType: string;
  intensity: number;
  trigger: string;
  thoughts: string;
  copingStrategy: string;
  createdAt: string;
}

export interface RelationshipRecord {
  id: string;
  userId: string;
  date: string;
  person: string;
  problem: string;
  solution: string;
  reflection: string;
  status: "unresolved" | "in_progress" | "resolved";
  createdAt: string;
}

export interface ModuleConfig {
  modules: Record<string, {
    name?: string;
    items: Array<{ id: string; name: string; points: number }>;
  }>;
  emotionTypes?: string[];
  relationshipPersons?: string[];
}
