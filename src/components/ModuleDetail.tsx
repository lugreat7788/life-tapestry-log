import { useState, useEffect, useCallback, useRef } from "react";
import { format, subDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Check, MessageSquare, Camera, X, Image as ImageIcon, Moon, Sun, Paperclip, FileText, Sprout, Zap, AlertTriangle } from "lucide-react";
import { getModuleMaxPoints } from "@/lib/modules";
import type { ModuleKey } from "@/lib/modules";
import { getDailyLog, toggleEntry, toggleEntryMinimum, updateEntryNotes, updateSleepTime, addSkipReason, getAllLogs } from "@/lib/supabase-store";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDataCache } from "@/hooks/useDataCache";
import { useModuleConfig } from "@/hooks/useModuleConfig";
import { useDebouncedWrite } from "@/hooks/useDebouncedWrite";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FloatingPoints, FullCelebration } from "@/components/CelebrationAnimation";
import { CORE_MODULES } from "@/lib/modules";
import { getDailyPrompt, QUICK_ENTRY_PROMPTS, SKIP_REASONS } from "@/lib/prompts";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { DailyLog } from "@/lib/store-types";

interface ModuleDetailProps {
  moduleKey: ModuleKey;
  date?: Date;
}

const DIET_ITEM_IDS = ["diet_breakfast", "diet_lunch", "diet_dinner"];

export default function ModuleDetail({ moduleKey, date }: ModuleDetailProps) {
  const { user } = useAuth();
  const cache = useDataCache();
  const { getModule, config } = useModuleConfig();
  const module = getModule(moduleKey)!;
  const [log, setLog] = useState<DailyLog>({ date: "", entries: {}, totalPoints: 0 });
  const [photoUrls, setPhotoUrls] = useState<Record<string, string[]>>({});
  const [fileUrls, setFileUrls] = useState<Record<string, string[]>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<"photo" | "file">("photo");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generalFileInputRef = useRef<HTMLInputElement>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  
  const [quickEntryItem, setQuickEntryItem] = useState<string | null>(null);
  const [quickEntryText, setQuickEntryText] = useState("");
  const [skipReasonItem, setSkipReasonItem] = useState<string | null>(null);
  const [skipStreaks, setSkipStreaks] = useState<Record<string, number>>({});
  
  const [floatingPoints, setFloatingPoints] = useState<Array<{ id: number; points: number; isMinimum: boolean; x: number; y: number }>>([]);
  const [showFullCelebration, setShowFullCelebration] = useState(false);
  const floatingIdRef = useRef(0);

  const dateStr = format(date || new Date(), "yyyy-MM-dd");

  // Debounced notes writer
  const notesWriteFn = useCallback(async (itemId: string, moduleK: string, notes: string, d?: Date) => {
    if (!user) return;
    await updateEntryNotes(user.id, itemId, moduleK, notes, d);
  }, [user]);
  const { debouncedWrite: debouncedNotesWrite, saving: notesSaving } = useDebouncedWrite(notesWriteFn);

  // Debounced sleep writer
  const sleepWriteFn = useCallback(async (bedtime: string, waketime: string, d?: Date) => {
    if (!user) return;
    await updateSleepTime(user.id, bedtime, waketime, d);
  }, [user]);
  const { debouncedWrite: debouncedSleepWrite } = useDebouncedWrite(sleepWriteFn);

  const loadLog = useCallback(async () => {
    if (!user) return;
    const data = await getDailyLog(user.id, date);
    setLog(data);
    // Update cache
    cache.updateDailyLogOptimistic(dateStr, () => data);

    if (data.id) {
      const { data: entries } = await supabase
        .from("log_entries")
        .select("item_id, photo_urls, file_urls" as any)
        .eq("daily_log_id", data.id);
      const urls: Record<string, string[]> = {};
      const fUrls: Record<string, string[]> = {};
      (entries || []).forEach((e: any) => {
        if (e.photo_urls?.length) urls[e.item_id] = e.photo_urls;
        if (e.file_urls?.length) fUrls[e.item_id] = e.file_urls;
      });
      setPhotoUrls(urls);
      setFileUrls(fUrls);
    }
  }, [user, date, dateStr, cache]);

  // Load consecutive skip streaks
  useEffect(() => {
    if (!user) return;
    getAllLogs(user.id).then((allLogs) => {
      const streaks: Record<string, number> = {};
      for (const item of module.items) {
        const today = new Date();
        let streak = 0;
        for (let i = 0; i < 30; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = format(d, "yyyy-MM-dd");
          const dayLog = allLogs[key];
          if (!dayLog) {
            if (i === 0) continue;
            streak++;
          } else if (!dayLog.entries[item.id]?.completed) {
            streak++;
          } else {
            break;
          }
        }
        if (streak >= 2) streaks[item.id] = streak;
      }
      setSkipStreaks(streaks);
    });
  }, [user, module.items]);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  if (!module) return null;

  const getItemMinPoints = (itemId: string): number | null => {
    const modCfg = config?.modules?.[moduleKey];
    const itemCfg = modCfg?.items?.find((i) => i.id === itemId);
    return (itemCfg as any)?.minPoints ?? null;
  };

  const earnedPoints = module.items.reduce((sum, item) => {
    const entry = log.entries[item.id];
    if (!entry?.completed) return sum;
    if (entry.completionType === "minimum") {
      const minPts = getItemMinPoints(item.id);
      return sum + (minPts ?? Math.floor(item.points * 0.5));
    }
    return sum + item.points;
  }, 0);

  const triggerFloating = (points: number, isMinimum: boolean, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const id = ++floatingIdRef.current;
    setFloatingPoints((prev) => [...prev, { id, points, isMinimum, x: rect.left + rect.width / 2, y: rect.top }]);
  };

  const checkFullCelebration = () => {
    if (!date || date.toDateString() === new Date().toDateString()) {
      // Use local log state for instant check
      const coreComplete = CORE_MODULES.every((mod) =>
        mod.items.every((item) => log.entries[item.id]?.completed)
      );
      if (coreComplete) {
        setShowFullCelebration(true);
      }
    }
  };

  // ── OPTIMISTIC TOGGLE ──
  const handleToggle = (itemId: string, points: number, event: React.MouseEvent) => {
    if (!user) return;
    const wasCompleted = log.entries[itemId]?.completed;

    // 1. Optimistic UI update IMMEDIATELY
    setLog((prev) => {
      const newEntries = { ...prev.entries };
      if (wasCompleted) {
        newEntries[itemId] = { ...newEntries[itemId], completed: false, completionType: "full" as const };
      } else {
        newEntries[itemId] = {
          itemId,
          moduleKey,
          completed: true,
          completionType: "full" as const,
          notes: newEntries[itemId]?.notes || "",
          timestamp: new Date().toISOString(),
        };
      }
      const newTotal = wasCompleted
        ? Math.max(0, prev.totalPoints - points)
        : prev.totalPoints + points;
      const updated = { ...prev, entries: newEntries, totalPoints: newTotal };
      // Also update the shared cache
      cache.updateDailyLogOptimistic(dateStr, () => updated);
      return updated;
    });

    if (!wasCompleted) {
      triggerFloating(points, false, event);
      setSkipStreaks((prev) => { const n = { ...prev }; delete n[itemId]; return n; });
    }

    // 2. Fire background write (no await)
    toggleEntry(user.id, moduleKey, itemId, points, date).then(() => {
      // After write succeeds, check celebration with fresh data
      if (!wasCompleted) {
        getDailyLog(user.id, date).then((freshLog) => {
          cache.updateDailyLogOptimistic(dateStr, () => freshLog);
          const coreComplete = CORE_MODULES.every((mod) =>
            mod.items.every((item) => freshLog.entries[item.id]?.completed)
          );
          if (coreComplete) setShowFullCelebration(true);
        });
      }
    }).catch(() => {
      // Revert on failure
      toast.error("保存失败，请重试");
      cache.invalidateDate(dateStr);
      loadLog();
    });
  };

  // ── OPTIMISTIC MINIMUM COMPLETE ──
  const handleMinimumComplete = (itemId: string, points: number, event: React.MouseEvent) => {
    if (!user) return;
    const minPts = getItemMinPoints(itemId) ?? Math.floor(points * 0.5);
    const wasCompleted = log.entries[itemId]?.completed;

    // Optimistic
    setLog((prev) => {
      const newEntries = { ...prev.entries };
      if (wasCompleted) {
        newEntries[itemId] = { ...newEntries[itemId], completed: false, completionType: "full" as const };
      } else {
        newEntries[itemId] = {
          itemId,
          moduleKey,
          completed: true,
          completionType: "minimum" as const,
          notes: newEntries[itemId]?.notes || "",
          timestamp: new Date().toISOString(),
        };
      }
      const newTotal = wasCompleted
        ? Math.max(0, prev.totalPoints - minPts)
        : prev.totalPoints + minPts;
      const updated = { ...prev, entries: newEntries, totalPoints: newTotal };
      cache.updateDailyLogOptimistic(dateStr, () => updated);
      return updated;
    });

    if (!wasCompleted) {
      triggerFloating(minPts, true, event);
      setSkipStreaks((prev) => { const n = { ...prev }; delete n[itemId]; return n; });
    }

    toggleEntryMinimum(user.id, moduleKey, itemId, minPts, date).catch(() => {
      toast.error("保存失败，请重试");
      cache.invalidateDate(dateStr);
      loadLog();
    });
  };

  // Quick entry: submit quick note + minimum complete
  const handleQuickEntrySubmit = (itemId: string, points: number, event: React.MouseEvent) => {
    if (!user || !quickEntryText.trim()) return;
    const minPts = getItemMinPoints(itemId) ?? Math.floor(points * 0.5);

    // Optimistic
    setLog((prev) => {
      const newEntries = { ...prev.entries };
      newEntries[itemId] = {
        itemId,
        moduleKey,
        completed: true,
        completionType: "minimum" as const,
        notes: quickEntryText.trim(),
        timestamp: new Date().toISOString(),
      };
      const updated = { ...prev, entries: newEntries, totalPoints: prev.totalPoints + minPts };
      cache.updateDailyLogOptimistic(dateStr, () => updated);
      return updated;
    });

    triggerFloating(minPts, true, event);
    setSkipStreaks((prev) => { const n = { ...prev }; delete n[itemId]; return n; });
    setQuickEntryItem(null);
    setQuickEntryText("");
    toast.success("快速完成！");

    // Background writes
    Promise.all([
      updateEntryNotes(user.id, itemId, moduleKey, quickEntryText.trim(), date),
      toggleEntryMinimum(user.id, moduleKey, itemId, minPts, date),
    ]).catch(() => {
      toast.error("保存失败，请重试");
      cache.invalidateDate(dateStr);
      loadLog();
    });
  };

  const handleSkipReason = async (itemId: string, reason: string) => {
    if (!user) return;
    setSkipReasonItem(null);
    toast.success("已记录跳过原因");
    addSkipReason(user.id, itemId, moduleKey, reason, log.date || undefined).catch(() => {
      toast.error("记录失败");
    });
  };

  // ── DEBOUNCED NOTES ──
  const handleNotes = (itemId: string, notes: string) => {
    if (!user) return;
    // Optimistic local update
    setLog((prev) => {
      const newEntries = { ...prev.entries };
      newEntries[itemId] = {
        ...(newEntries[itemId] || { itemId, moduleKey, completed: false, timestamp: new Date().toISOString() }),
        notes,
      };
      const updated = { ...prev, entries: newEntries };
      cache.updateDailyLogOptimistic(dateStr, () => updated);
      return updated;
    });
    // Debounced write
    debouncedNotesWrite(itemId, moduleKey, notes, date);
  };

  const handlePhotoUpload = async (itemId: string, file: File) => {
    if (!user) return;
    setUploading(itemId);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("entry-photos").upload(path, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("entry-photos").getPublicUrl(path);
      const newUrl = urlData.publicUrl;

      await updateEntryNotes(user.id, itemId, moduleKey, log.entries[itemId]?.notes || "");
      
      const currentUrls = photoUrls[itemId] || [];
      const updatedUrls = [...currentUrls, newUrl];
      
      const { data: logData } = await supabase
        .from("daily_logs")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", log.date)
        .maybeSingle();

      if (logData) {
        await supabase
          .from("log_entries")
          .update({ photo_urls: updatedUrls })
          .eq("daily_log_id", logData.id)
          .eq("item_id", itemId);
      }

      // Optimistic photo update
      setPhotoUrls((prev) => ({ ...prev, [itemId]: updatedUrls }));
      toast.success("照片上传成功");
    } catch {
      toast.error("照片上传失败");
    } finally {
      setUploading(null);
    }
  };

  const handleRemovePhoto = async (itemId: string, urlToRemove: string) => {
    if (!user) return;
    const currentUrls = photoUrls[itemId] || [];
    const updatedUrls = currentUrls.filter((u) => u !== urlToRemove);

    // Optimistic
    setPhotoUrls((prev) => ({ ...prev, [itemId]: updatedUrls }));

    const { data: logData } = await supabase
      .from("daily_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", log.date)
      .maybeSingle();

    if (logData) {
      await supabase
        .from("log_entries")
        .update({ photo_urls: updatedUrls })
        .eq("daily_log_id", logData.id)
        .eq("item_id", itemId);
    }
  };

  const handleFileUpload = async (itemId: string, file: File) => {
    if (!user) return;
    setUploading(itemId);
    try {
      const ext = file.name.split(".").pop();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage.from("entry-photos").upload(path, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("entry-photos").getPublicUrl(path);
      const newUrl = urlData.publicUrl;

      await updateEntryNotes(user.id, itemId, moduleKey, log.entries[itemId]?.notes || "", date);

      const currentUrls = fileUrls[itemId] || [];
      const updatedUrls = [...currentUrls, newUrl];

      const { data: logData } = await supabase
        .from("daily_logs")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", log.date)
        .maybeSingle();

      if (logData) {
        await supabase
          .from("log_entries")
          .update({ file_urls: updatedUrls } as any)
          .eq("daily_log_id", logData.id)
          .eq("item_id", itemId);
      }

      setFileUrls((prev) => ({ ...prev, [itemId]: updatedUrls }));
      toast.success("文件上传成功");
    } catch {
      toast.error("文件上传失败");
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveFile = async (itemId: string, urlToRemove: string) => {
    if (!user) return;
    const currentUrls = fileUrls[itemId] || [];
    const updatedUrls = currentUrls.filter((u) => u !== urlToRemove);

    // Optimistic
    setFileUrls((prev) => ({ ...prev, [itemId]: updatedUrls }));

    const { data: logData } = await supabase
      .from("daily_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", log.date)
      .maybeSingle();

    if (logData) {
      await supabase
        .from("log_entries")
        .update({ file_urls: updatedUrls } as any)
        .eq("daily_log_id", logData.id)
        .eq("item_id", itemId);
    }
  };

  const isDietItem = (itemId: string) => DIET_ITEM_IDS.includes(itemId);
  const showPhotoButton = moduleKey === "health";
  const showUploadButtons = (itemId: string) => itemId === "daily_summary" || showPhotoButton;
  const hasQuickEntry = (itemId: string) => !!QUICK_ENTRY_PROMPTS[itemId];

  return (
    <div className="px-4 pt-4 pb-6">
      <div className={cn("rounded-xl p-5 mb-6", module.bgClass)}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{module.icon}</span>
          <div>
            <h1 className={cn("text-xl font-display font-bold", module.fgClass)}>
              {module.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {earnedPoints} / {getModuleMaxPoints(module)} 分已获得
              {notesSaving && <span className="ml-2 text-xs text-muted-foreground/60 animate-pulse">保存中…</span>}
            </p>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && activeItemId) handlePhotoUpload(activeItemId, file);
          e.target.value = "";
        }}
      />
      <input
        ref={generalFileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt,.md,.xls,.xlsx,.ppt,.pptx,.zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && activeItemId) {
            if (file.type.startsWith("image/")) {
              handlePhotoUpload(activeItemId, file);
            } else {
              handleFileUpload(activeItemId, file);
            }
          }
          e.target.value = "";
        }}
      />

      {floatingPoints.map((fp) => (
        <FloatingPoints
          key={fp.id}
          points={fp.points}
          isMinimum={fp.isMinimum}
          x={fp.x}
          y={fp.y}
          onComplete={() => setFloatingPoints((prev) => prev.filter((p) => p.id !== fp.id))}
        />
      ))}

      <FullCelebration
        show={showFullCelebration}
        totalScore={log.totalPoints}
        onClose={() => setShowFullCelebration(false)}
      />

      {/* Skip Reason Modal */}
      <AnimatePresence>
        {skipReasonItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            onClick={() => setSkipReasonItem(null)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-t-2xl w-full max-w-lg p-5 pb-8"
            >
              <p className="text-sm font-semibold text-foreground mb-1">
                今天「{module.items.find((i) => i.id === skipReasonItem)?.name}」没有完成，是因为？
              </p>
              <p className="text-[10px] text-muted-foreground mb-4">记录原因帮助你发现真正的阻碍</p>
              <div className="space-y-2">
                {SKIP_REASONS.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => handleSkipReason(skipReasonItem, r.key)}
                    className="w-full text-left text-sm px-4 py-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Entry Modal */}
      <AnimatePresence>
        {quickEntryItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            onClick={() => { setQuickEntryItem(null); setQuickEntryText(""); }}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-t-2xl w-full max-w-lg p-5 pb-8"
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  快速完成 · {module.items.find((i) => i.id === quickEntryItem)?.name}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {QUICK_ENTRY_PROMPTS[quickEntryItem] || "写一句话即可"}
              </p>
              <Textarea
                autoFocus
                placeholder="哪怕一句话也行..."
                value={quickEntryText}
                onChange={(e) => setQuickEntryText(e.target.value)}
                className="min-h-[80px] resize-none mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setQuickEntryItem(null); setQuickEntryText(""); }}
                  className="flex-1 text-sm py-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={(e) => {
                    const item = module.items.find((i) => i.id === quickEntryItem);
                    if (item) handleQuickEntrySubmit(quickEntryItem, item.points, e);
                  }}
                  disabled={!quickEntryText.trim()}
                  className="flex-1 text-sm py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  ⚡ 完成 (+{(() => {
                    const item = module.items.find((i) => i.id === quickEntryItem);
                    if (!item) return 0;
                    return getItemMinPoints(quickEntryItem) ?? Math.floor(item.points * 0.5);
                  })()}分)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {module.items.map((item) => {
          const entry = log.entries[item.id];
          const isCompleted = entry?.completed;
          const isMinimum = entry?.completionType === "minimum";
          const photos = photoUrls[item.id] || [];
          const files = fileUrls[item.id] || [];
          const minPoints = getItemMinPoints(item.id);
          const hasMinOption = minPoints !== null && minPoints > 0;
          const skipDays = skipStreaks[item.id] || 0;
          const dailyPrompt = !isCompleted ? getDailyPrompt(item.id) : null;

          return (
            <Drawer key={item.id}>
              <div
                className={cn(
                  "bg-card rounded-xl shadow-card overflow-hidden transition-all duration-200",
                  isCompleted && !isMinimum && "ring-1 ring-primary/20",
                  isCompleted && isMinimum && "ring-1 ring-amber-500/20"
                )}
              >
                {skipDays >= 2 && !isCompleted && (
                  <div className={cn(
                    "px-4 py-1.5 text-[10px] flex items-center gap-1.5",
                    skipDays >= 5 ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600"
                  )}>
                    {skipDays >= 5 ? (
                      <><AlertTriangle className="w-3 h-3" /> 🔴 连续{skipDays}天未完成</>
                    ) : (
                      <><AlertTriangle className="w-3 h-3" /> ⚠️ 已跳过{skipDays}天</>
                    )}
                    <button
                      onClick={() => setSkipReasonItem(item.id)}
                      className="ml-auto text-[9px] underline opacity-70 hover:opacity-100"
                    >
                      记录原因
                    </button>
                  </div>
                )}

                <div className="flex items-center p-4 gap-3">
                  <button
                    onClick={(e) => handleToggle(item.id, item.points, e)}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0",
                      isCompleted && !isMinimum
                        ? "bg-primary border-primary"
                        : isCompleted && isMinimum
                        ? "bg-amber-500 border-amber-500"
                        : "border-muted-foreground/30 hover:border-primary/50"
                    )}
                  >
                    <AnimatePresence>
                      {isCompleted && !isMinimum && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </motion.div>
                      )}
                      {isCompleted && isMinimum && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Sprout className="w-3.5 h-3.5 text-primary-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium text-sm transition-all duration-200", isCompleted && !isMinimum && "line-through text-muted-foreground")}>
                      {item.name}
                    </p>
                    {entry?.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {hasQuickEntry(item.id) && !isCompleted && (
                      <button
                        onClick={() => setQuickEntryItem(item.id)}
                        className="text-[10px] text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-full flex items-center gap-0.5 transition-colors"
                        title="快速完成"
                      >
                        <Zap className="w-3 h-3" />
                      </button>
                    )}

                    {hasMinOption && !isCompleted && (
                      <button
                        onClick={(e) => handleMinimumComplete(item.id, item.points, e)}
                        className="text-[10px] text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-full flex items-center gap-0.5 transition-colors"
                        title="最小完成"
                      >
                        🌱 +{minPoints}
                      </button>
                    )}

                    <span className={cn("text-xs font-medium px-2 py-1 rounded-full", 
                      isMinimum ? "bg-amber-500/10 text-amber-600" : cn(module.bgClass, module.fgClass)
                    )}>
                      {isMinimum ? `🌱+${minPoints || Math.floor(item.points * 0.5)}分` : `+${item.points}分`}
                    </span>
                  </div>

                  {showUploadButtons(item.id) && (
                    <>
                      <button
                        onClick={() => {
                          setActiveItemId(item.id);
                          fileInputRef.current?.click();
                        }}
                        disabled={uploading === item.id}
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        {uploading === item.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </button>
                      {item.id === "daily_summary" && (
                        <button
                          onClick={() => {
                            setActiveItemId(item.id);
                            generalFileInputRef.current?.click();
                          }}
                          disabled={uploading === item.id}
                          className="text-muted-foreground hover:text-foreground p-1"
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}

                  <DrawerTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground p-1">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </DrawerTrigger>
                </div>

                {dailyPrompt && !isCompleted && (
                  <div className="px-4 pb-3 -mt-1">
                    <p className="text-[10px] text-muted-foreground/70 italic pl-10">
                      💡 {dailyPrompt}
                    </p>
                  </div>
                )}

                {(photos.length > 0 || files.length > 0) && (
                  <div className="px-4 pb-3 space-y-2">
                    {photos.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto">
                        {photos.map((url, i) => (
                          <div key={i} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden group">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => handleRemovePhoto(item.id, url)}
                              className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3 text-primary-foreground" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {files.length > 0 && (
                      <div className="flex flex-col gap-1">
                        {files.map((url, i) => {
                          const fileName = decodeURIComponent(url.split("/").pop() || "文件");
                          return (
                            <div key={i} className="flex items-center gap-1.5 text-[10px] bg-muted/50 rounded-lg px-2 py-1.5 group">
                              <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                              <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-1">{fileName}</a>
                              <button onClick={() => handleRemoveFile(item.id, url)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle className="flex items-center gap-2">
                    <span>{module.icon}</span>
                    {item.name}
                  </DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-8">
                  {item.id === "sleep_log" && (
                    <div className="mb-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Moon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <label className="text-sm text-muted-foreground w-16 shrink-0">入睡</label>
                        <Input
                          type="time"
                          defaultValue={entry?.sleepBedtime || ""}
                          onBlur={(e) => {
                            debouncedSleepWrite(e.target.value, entry?.sleepWaketime || "", date);
                          }}
                          className="flex-1"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Sun className="w-4 h-4 text-muted-foreground shrink-0" />
                        <label className="text-sm text-muted-foreground w-16 shrink-0">起床</label>
                        <Input
                          type="time"
                          defaultValue={entry?.sleepWaketime || ""}
                          onBlur={(e) => {
                            debouncedSleepWrite(entry?.sleepBedtime || "", e.target.value, date);
                          }}
                          className="flex-1"
                        />
                      </div>
                      {entry?.sleepBedtime && entry?.sleepWaketime && (
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                          睡眠时长约 {(() => {
                            const [bh, bm] = entry.sleepBedtime.split(":").map(Number);
                            const [wh, wm] = entry.sleepWaketime.split(":").map(Number);
                            let bed = bh * 60 + bm, wake = wh * 60 + wm;
                            if (wake <= bed) wake += 24 * 60;
                            const h = Math.floor((wake - bed) / 60);
                            const m = (wake - bed) % 60;
                            return `${h}小时${m > 0 ? m + "分钟" : ""}`;
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                  {item.id === "bowel_log" && (
                    <div className="mb-4 space-y-3">
                      <p className="text-xs text-muted-foreground">记录排便情况，帮助了解身体健康状态</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">排便时间</label>
                          <Input
                            type="time"
                            defaultValue={(() => {
                              try {
                                const parsed = JSON.parse(entry?.notes || "{}");
                                return parsed.time || "";
                              } catch { return ""; }
                            })()}
                            onBlur={(e) => {
                              const prev = (() => { try { return JSON.parse(entry?.notes || "{}"); } catch { return {}; } })();
                              handleNotes(item.id, JSON.stringify({ ...prev, time: e.target.value }));
                            }}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">颜色</label>
                          <select
                            defaultValue={(() => { try { return JSON.parse(entry?.notes || "{}").color || ""; } catch { return ""; } })()}
                            onChange={(e) => {
                              const prev = (() => { try { return JSON.parse(entry?.notes || "{}"); } catch { return {}; } })();
                              handleNotes(item.id, JSON.stringify({ ...prev, color: e.target.value }));
                            }}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="">选择颜色</option>
                            <option value="黄色">🟡 黄色（正常）</option>
                            <option value="深棕色">🟤 深棕色（正常）</option>
                            <option value="浅棕色">🟠 浅棕色</option>
                            <option value="绿色">🟢 绿色</option>
                            <option value="黑色">⚫ 黑色</option>
                            <option value="红色">🔴 红色</option>
                            <option value="白色/灰色">⚪ 白色/灰色</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">形态</label>
                        <select
                          defaultValue={(() => { try { return JSON.parse(entry?.notes || "{}").form || ""; } catch { return ""; } })()}
                          onChange={(e) => {
                            const prev = (() => { try { return JSON.parse(entry?.notes || "{}"); } catch { return {}; } })();
                            handleNotes(item.id, JSON.stringify({ ...prev, form: e.target.value }));
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="">选择形态</option>
                          <option value="硬块">硬块（便秘）</option>
                          <option value="香肠状有裂纹">香肠状有裂纹</option>
                          <option value="香肠状光滑">香肠状光滑（理想）</option>
                          <option value="软块">软块</option>
                          <option value="糊状">糊状</option>
                          <option value="水样">水样（腹泻）</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">感受</label>
                        <Textarea
                          placeholder="排便是否顺畅？有无不适？"
                          defaultValue={(() => { try { return JSON.parse(entry?.notes || "{}").feeling || ""; } catch { return ""; } })()}
                          onBlur={(e) => {
                            const prev = (() => { try { return JSON.parse(entry?.notes || "{}"); } catch { return {}; } })();
                            handleNotes(item.id, JSON.stringify({ ...prev, feeling: e.target.value }));
                          }}
                          className="min-h-[60px] resize-none"
                        />
                      </div>
                    </div>
                  )}
                  {item.id !== "bowel_log" && (
                  <Textarea
                    placeholder={isDietItem(item.id) ? "记录饮食内容、热量等..." : item.id === "body_status" ? "记录今日身体状况、体重、症状等..." : item.id === "sleep_log" ? "记录睡眠质量、梦境等..." : "记录你的心得、感想..."}
                    defaultValue={entry?.notes || ""}
                    onBlur={(e) => handleNotes(item.id, e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                  )}
                  {item.id === "daily_summary" && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => { setActiveItemId(item.id); fileInputRef.current?.click(); }}
                        disabled={uploading === item.id}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/50 rounded-lg px-3 py-2"
                      >
                        <Camera className="w-3.5 h-3.5" /> 上传图片
                      </button>
                      <button
                        onClick={() => { setActiveItemId(item.id); generalFileInputRef.current?.click(); }}
                        disabled={uploading === item.id}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/50 rounded-lg px-3 py-2"
                      >
                        <Paperclip className="w-3.5 h-3.5" /> 上传文件
                      </button>
                    </div>
                  )}
                  {photos.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> 已上传照片
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {photos.map((url, i) => (
                          <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => handleRemovePhoto(item.id, url)}
                              className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3 text-primary-foreground" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {files.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> 已上传文件
                      </p>
                      <div className="space-y-1.5">
                        {files.map((url, i) => {
                          const fileName = decodeURIComponent(url.split("/").pop() || "文件");
                          return (
                            <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 group">
                              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                              <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate flex-1">{fileName}</a>
                              <button onClick={() => handleRemoveFile(item.id, url)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </DrawerContent>
            </Drawer>
          );
        })}
      </div>
    </div>
  );
}
