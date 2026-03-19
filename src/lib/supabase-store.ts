import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { GoalItem, TodoItem, ModuleConfig } from "./store-types";

export type { LogEntry, DailyLog, TodoItem, GoalItem, ModuleConfig } from "./store-types";

// ─── Daily Logs ───

export async function getDailyLog(userId: string, date?: Date) {
  const dateStr = format(date || new Date(), "yyyy-MM-dd");

  const { data: log } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("date", dateStr)
    .maybeSingle();

  if (!log) {
    return { id: null, date: dateStr, entries: {} as Record<string, any>, totalPoints: 0 };
  }

  const { data: entries } = await supabase
    .from("log_entries")
    .select("*")
    .eq("daily_log_id", log.id);

  const entriesMap: Record<string, any> = {};
  (entries || []).forEach((e) => {
    entriesMap[e.item_id] = {
      itemId: e.item_id,
      moduleKey: e.module_key,
      completed: e.completed,
      notes: e.notes || "",
      timestamp: e.created_at,
    };
  });

  return { id: log.id, date: dateStr, entries: entriesMap, totalPoints: log.total_points };
}

export async function toggleEntry(
  userId: string,
  moduleKey: string,
  itemId: string,
  points: number,
  date?: Date
) {
  const dateStr = format(date || new Date(), "yyyy-MM-dd");

  // Ensure daily_log exists
  let { data: log } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("date", dateStr)
    .maybeSingle();

  if (!log) {
    const { data: newLog } = await supabase
      .from("daily_logs")
      .insert({ user_id: userId, date: dateStr, total_points: 0 })
      .select()
      .single();
    log = newLog;
  }

  if (!log) return;

  // Check existing entry
  const { data: existing } = await supabase
    .from("log_entries")
    .select("*")
    .eq("daily_log_id", log.id)
    .eq("item_id", itemId)
    .maybeSingle();

  if (existing?.completed) {
    // Uncomplete
    await supabase
      .from("log_entries")
      .update({ completed: false })
      .eq("id", existing.id);
    await supabase
      .from("daily_logs")
      .update({ total_points: Math.max(0, log.total_points - points) })
      .eq("id", log.id);
  } else if (existing) {
    // Complete existing
    await supabase
      .from("log_entries")
      .update({ completed: true })
      .eq("id", existing.id);
    await supabase
      .from("daily_logs")
      .update({ total_points: log.total_points + points })
      .eq("id", log.id);
  } else {
    // Create new entry
    await supabase
      .from("log_entries")
      .insert({
        user_id: userId,
        daily_log_id: log.id,
        item_id: itemId,
        module_key: moduleKey,
        completed: true,
        notes: "",
      });
    await supabase
      .from("daily_logs")
      .update({ total_points: log.total_points + points })
      .eq("id", log.id);
  }
}

export async function updateEntryNotes(
  userId: string,
  itemId: string,
  moduleKey: string,
  notes: string,
  date?: Date
) {
  const dateStr = format(date || new Date(), "yyyy-MM-dd");

  let { data: log } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("date", dateStr)
    .maybeSingle();

  if (!log) {
    const { data: newLog } = await supabase
      .from("daily_logs")
      .insert({ user_id: userId, date: dateStr, total_points: 0 })
      .select()
      .single();
    log = newLog;
  }

  if (!log) return;

  const { data: existing } = await supabase
    .from("log_entries")
    .select("*")
    .eq("daily_log_id", log.id)
    .eq("item_id", itemId)
    .maybeSingle();

  if (existing) {
    await supabase.from("log_entries").update({ notes }).eq("id", existing.id);
  } else {
    await supabase.from("log_entries").insert({
      user_id: userId,
      daily_log_id: log.id,
      item_id: itemId,
      module_key: moduleKey,
      completed: false,
      notes,
    });
  }
}

// ─── All Logs ───

export async function getAllLogs(userId: string) {
  const { data: logs } = await supabase
    .from("daily_logs")
    .select("*, log_entries(*)")
    .eq("user_id", userId);

  const result: Record<string, any> = {};
  (logs || []).forEach((log: any) => {
    const entriesMap: Record<string, any> = {};
    (log.log_entries || []).forEach((e: any) => {
      entriesMap[e.item_id] = {
        itemId: e.item_id,
        moduleKey: e.module_key,
        completed: e.completed,
        notes: e.notes || "",
        timestamp: e.created_at,
      };
    });
    result[log.date] = { date: log.date, entries: entriesMap, totalPoints: log.total_points };
  });

  return result;
}

// ─── Streak & Week Points ───

export async function getStreakDays(userId: string): Promise<number> {
  const allLogs = await getAllLogs(userId);
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = format(d, "yyyy-MM-dd");
    if (allLogs[key] && allLogs[key].totalPoints > 0) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export async function getWeekPoints(userId: string): Promise<number[]> {
  const points: number[] = [];
  const today = new Date();
  const allLogs = await getAllLogs(userId);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = format(d, "yyyy-MM-dd");
    points.push(allLogs[key]?.totalPoints || 0);
  }
  return points;
}

// ─── Todos ───

export async function getTodos(userId: string): Promise<TodoItem[]> {
  const { data } = await supabase
    .from("todos")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data || []).map((t) => ({
    id: t.id,
    text: t.text,
    dueDate: t.due_date || undefined,
    priority: t.priority as "low" | "medium" | "high",
    moduleTag: t.module_tag || undefined,
    completed: t.completed,
    points: t.points,
    createdAt: t.created_at,
  }));
}

export async function addTodo(userId: string, todo: Omit<TodoItem, "id" | "createdAt">) {
  await supabase.from("todos").insert({
    user_id: userId,
    text: todo.text,
    due_date: todo.dueDate || null,
    priority: todo.priority,
    module_tag: todo.moduleTag || null,
    completed: todo.completed,
    points: todo.points,
  });
}

export async function updateTodo(id: string, updates: Partial<{ completed: boolean; text: string }>) {
  await supabase.from("todos").update(updates).eq("id", id);
}

export async function deleteTodo(id: string) {
  await supabase.from("todos").delete().eq("id", id);
}

// ─── Goals ───

export async function getGoals(userId: string): Promise<GoalItem[]> {
  const { data } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data || []).map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description || "",
    targetDate: g.target_date || undefined,
    type: g.type as "short_term" | "long_term",
    status: g.status as "not_started" | "in_progress" | "completed",
    points: g.points,
    createdAt: g.created_at,
  }));
}

export async function addGoal(userId: string, goal: Omit<GoalItem, "id" | "createdAt">) {
  await supabase.from("goals").insert({
    user_id: userId,
    title: goal.title,
    description: goal.description,
    target_date: goal.targetDate || null,
    type: goal.type,
    status: goal.status,
    points: goal.points,
  });
}

export async function updateGoalStatus(id: string, status: string) {
  await supabase.from("goals").update({ status }).eq("id", id);
}

export async function deleteGoal(id: string) {
  await supabase.from("goals").delete().eq("id", id);
}

// ─── Module Config ───

export async function getModuleConfig(userId: string): Promise<ModuleConfig | null> {
  const { data } = await supabase
    .from("module_configs")
    .select("config")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.config as unknown as ModuleConfig | null;
}

export async function saveModuleConfig(userId: string, config: ModuleConfig) {
  const { data: existing } = await supabase
    .from("module_configs")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase.from("module_configs").update({ config }).eq("id", existing.id);
  } else {
    await supabase.from("module_configs").insert({ user_id: userId, config });
  }
}

export async function clearModuleConfig(userId: string) {
  await supabase.from("module_configs").delete().eq("user_id", userId);
}

// ─── Profile ───

export async function getProfile(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function updateProfile(userId: string, updates: { display_name?: string; avatar_url?: string }) {
  await supabase.from("profiles").update(updates).eq("user_id", userId);
}
