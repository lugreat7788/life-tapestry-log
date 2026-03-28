import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, MessageSquare, Camera, X, Image as ImageIcon, Moon, Sun, Paperclip, FileText, Sprout } from "lucide-react";
import { getModuleMaxPoints } from "@/lib/modules";
import type { ModuleKey } from "@/lib/modules";
import { getDailyLog, toggleEntry, toggleEntryMinimum, updateEntryNotes, updateSleepTime } from "@/lib/supabase-store";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useModuleConfig } from "@/hooks/useModuleConfig";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FloatingPoints, FullCelebration } from "@/components/CelebrationAnimation";
import { CORE_MODULES } from "@/lib/modules";
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
  
  // Celebration state
  const [floatingPoints, setFloatingPoints] = useState<Array<{ id: number; points: number; isMinimum: boolean; x: number; y: number }>>([]);
  const [showFullCelebration, setShowFullCelebration] = useState(false);
  const floatingIdRef = useRef(0);

  const loadLog = useCallback(async () => {
    if (!user) return;
    const data = await getDailyLog(user.id, date);
    setLog(data);

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
  }, [user, date]);

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

  const checkFullCelebration = async () => {
    // Check if all core items are now complete
    if (!date || date.toDateString() === new Date().toDateString()) {
      const updatedLog = await getDailyLog(user!.id, date);
      const coreComplete = CORE_MODULES.every((mod) =>
        mod.items.every((item) => updatedLog.entries[item.id]?.completed)
      );
      if (coreComplete) {
        setShowFullCelebration(true);
      }
    }
  };

  const handleToggle = async (itemId: string, points: number, event: React.MouseEvent) => {
    if (!user) return;
    const wasCompleted = log.entries[itemId]?.completed;
    await toggleEntry(user.id, moduleKey, itemId, points, date);
    await loadLog();
    if (!wasCompleted) {
      triggerFloating(points, false, event);
      await checkFullCelebration();
    }
  };

  const handleMinimumComplete = async (itemId: string, points: number, event: React.MouseEvent) => {
    if (!user) return;
    const minPts = getItemMinPoints(itemId) ?? Math.floor(points * 0.5);
    const wasCompleted = log.entries[itemId]?.completed;
    await toggleEntryMinimum(user.id, moduleKey, itemId, minPts, date);
    await loadLog();
    if (!wasCompleted) {
      triggerFloating(minPts, true, event);
      await checkFullCelebration();
    }
  };

  const handleNotes = async (itemId: string, notes: string) => {
    if (!user) return;
    await updateEntryNotes(user.id, itemId, moduleKey, notes, date);
    await loadLog();
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

      toast.success("照片上传成功");
      await loadLog();
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
    await loadLog();
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

      toast.success("文件上传成功");
      await loadLog();
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
    await loadLog();
  };

  const isDietItem = (itemId: string) => DIET_ITEM_IDS.includes(itemId);
  const showPhotoButton = moduleKey === "health";
  const showUploadButtons = (itemId: string) => itemId === "daily_summary" || showPhotoButton;

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

      {/* Floating points animations */}
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

      {/* Full celebration overlay */}
      <FullCelebration
        show={showFullCelebration}
        totalScore={log.totalPoints}
        onClose={() => setShowFullCelebration(false)}
      />

      <div className="space-y-3">
        {module.items.map((item) => {
          const entry = log.entries[item.id];
          const isCompleted = entry?.completed;
          const isMinimum = entry?.completionType === "minimum";
          const photos = photoUrls[item.id] || [];
          const files = fileUrls[item.id] || [];
          const minPoints = getItemMinPoints(item.id);
          const hasMinOption = minPoints !== null && minPoints > 0;

          return (
            <Drawer key={item.id}>
              <div
                className={cn(
                  "bg-card rounded-xl shadow-card overflow-hidden transition-all duration-200",
                  isCompleted && !isMinimum && "ring-1 ring-primary/20",
                  isCompleted && isMinimum && "ring-1 ring-amber-500/20"
                )}
              >
                <div className="flex items-center p-4 gap-3">
                  {/* Full completion button */}
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
                          <Sprout className="w-3.5 h-3.5 text-white" />
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
                    {/* Minimum completion button */}
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
                              <X className="w-3 h-3 text-white" />
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
                          onBlur={async (e) => {
                            if (!user) return;
                            await updateSleepTime(user.id, e.target.value, entry?.sleepWaketime || "", date);
                            await loadLog();
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
                          onBlur={async (e) => {
                            if (!user) return;
                            await updateSleepTime(user.id, entry?.sleepBedtime || "", e.target.value, date);
                            await loadLog();
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
                  <Textarea
                    placeholder={isDietItem(item.id) ? "记录饮食内容、热量等..." : item.id === "body_status" ? "记录今日身体状况、体重、症状等..." : item.id === "sleep_log" ? "记录睡眠质量、梦境等..." : "记录你的心得、感想..."}
                    defaultValue={entry?.notes || ""}
                    onBlur={(e) => handleNotes(item.id, e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                  {/* Upload buttons in drawer for daily_summary */}
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
                              <X className="w-3 h-3 text-white" />
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
