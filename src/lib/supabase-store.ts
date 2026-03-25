import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { GoalItem, TodoItem, ModuleConfig, TodoCollection, EmotionRecord, RelationshipRecord } from "./store-types";

export type { LogEntry, DailyLog, TodoItem, GoalItem, ModuleConfig, TodoCollection, EmotionRecord, RelationshipRecord } from "./store-types";

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
  (entries || []).forEach((e: any) => {
    entriesMap[e.item_id] = {
      itemId: e.item_id,
      moduleKey: e.module_key,
      completed: e.completed,
      notes: e.notes || "",
      timestamp: e.created_at,
      sleepBedtime: e.sleep_bedtime || "",
      sleepWaketime: e.sleep_waketime || "",
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
        sleepBedtime: e.sleep_bedtime || "",
        sleepWaketime: e.sleep_waketime || "",
      };
    });
    result[log.date] = { date: log.date, entries: entriesMap, totalPoints: log.total_points };
  });

  return result;
}

// ─── All-Time Points ───

export async function getAllTimePoints(userId: string): Promise<number> {
  const { data } = await supabase
    .from("daily_logs")
    .select("total_points")
    .eq("user_id", userId);
  return (data || []).reduce((sum, log) => sum + (log.total_points || 0), 0);
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
    collectionId: (t as any).collection_id || undefined,
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
    collection_id: todo.collectionId || null,
    completed: todo.completed,
    points: todo.points,
  } as any);
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
    await supabase.from("module_configs").update({ config: config as unknown as Record<string, any> }).eq("id", existing.id);
  } else {
    await supabase.from("module_configs").insert({ user_id: userId, config: config as unknown as Record<string, any> });
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

// ─── Todo Collections ───

export async function getTodoCollections(userId: string): Promise<TodoCollection[]> {
  const { data } = await supabase
    .from("todo_collections")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  return (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sort_order,
    createdAt: c.created_at,
  }));
}

export async function addTodoCollection(userId: string, name: string) {
  const { data: existing } = await supabase
    .from("todo_collections")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? (existing[0] as any).sort_order + 1 : 0;

  await supabase.from("todo_collections").insert({
    user_id: userId,
    name,
    sort_order: nextOrder,
  } as any);
}

export async function renameTodoCollection(id: string, name: string) {
  await supabase.from("todo_collections").update({ name } as any).eq("id", id);
}

export async function deleteTodoCollection(id: string) {
  await supabase.from("todo_collections").delete().eq("id", id);
}

// ─── Emotion Records ───

export async function getEmotionRecords(userId: string): Promise<EmotionRecord[]> {
  const { data } = await supabase
    .from("emotion_records")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  return (data || []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    date: r.date,
    emotionType: r.emotion_type,
    intensity: r.intensity,
    trigger: r.trigger || "",
    thoughts: r.thoughts || "",
    copingStrategy: r.coping_strategy || "",
    createdAt: r.created_at,
  }));
}

export async function addEmotionRecord(userId: string, record: Omit<EmotionRecord, "id" | "userId" | "createdAt">) {
  await supabase.from("emotion_records").insert({
    user_id: userId,
    date: record.date,
    emotion_type: record.emotionType,
    intensity: record.intensity,
    trigger: record.trigger || null,
    thoughts: record.thoughts || null,
    coping_strategy: record.copingStrategy || null,
  } as any);
}

export async function updateEmotionRecord(id: string, updates: Partial<EmotionRecord>) {
  const mapped: any = {};
  if (updates.emotionType !== undefined) mapped.emotion_type = updates.emotionType;
  if (updates.intensity !== undefined) mapped.intensity = updates.intensity;
  if (updates.trigger !== undefined) mapped.trigger = updates.trigger;
  if (updates.thoughts !== undefined) mapped.thoughts = updates.thoughts;
  if (updates.copingStrategy !== undefined) mapped.coping_strategy = updates.copingStrategy;
  await supabase.from("emotion_records").update(mapped).eq("id", id);
}

export async function deleteEmotionRecord(id: string) {
  await supabase.from("emotion_records").delete().eq("id", id);
}

// ─── Relationship Records ───

export async function getRelationshipRecords(userId: string): Promise<RelationshipRecord[]> {
  const { data } = await supabase
    .from("relationship_records")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  return (data || []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    date: r.date,
    person: r.person,
    problem: r.problem,
    solution: r.solution || "",
    reflection: r.reflection || "",
    status: r.status as any,
    createdAt: r.created_at,
  }));
}

export async function addRelationshipRecord(userId: string, record: Omit<RelationshipRecord, "id" | "userId" | "createdAt">) {
  await supabase.from("relationship_records").insert({
    user_id: userId,
    date: record.date,
    person: record.person,
    problem: record.problem,
    solution: record.solution || null,
    reflection: record.reflection || null,
    status: record.status,
  } as any);
}

export async function updateRelationshipRecord(id: string, updates: Partial<RelationshipRecord>) {
  const mapped: any = {};
  if (updates.person !== undefined) mapped.person = updates.person;
  if (updates.problem !== undefined) mapped.problem = updates.problem;
  if (updates.solution !== undefined) mapped.solution = updates.solution;
  if (updates.reflection !== undefined) mapped.reflection = updates.reflection;
  if (updates.status !== undefined) mapped.status = updates.status;
  await supabase.from("relationship_records").update(mapped).eq("id", id);
}

export async function deleteRelationshipRecord(id: string) {
  await supabase.from("relationship_records").delete().eq("id", id);
}
