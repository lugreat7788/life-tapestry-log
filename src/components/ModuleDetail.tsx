import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, MessageSquare, Camera, X, Image as ImageIcon, Moon, Sun, Paperclip, FileText } from "lucide-react";
import { getModuleMaxPoints } from "@/lib/modules";
import type { ModuleKey } from "@/lib/modules";
import { getDailyLog, toggleEntry, updateEntryNotes, updateSleepTime } from "@/lib/supabase-store";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useModuleConfig } from "@/hooks/useModuleConfig";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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
  const { getModule } = useModuleConfig();
  const module = getModule(moduleKey)!;
  const [log, setLog] = useState<DailyLog>({ date: "", entries: {}, totalPoints: 0 });
  const [photoUrls, setPhotoUrls] = useState<Record<string, string[]>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const loadLog = useCallback(async () => {
    if (!user) return;
    const data = await getDailyLog(user.id, date);
    setLog(data);

    if (data.id) {
      const { data: entries } = await supabase
        .from("log_entries")
        .select("item_id, photo_urls")
        .eq("daily_log_id", data.id);
      const urls: Record<string, string[]> = {};
      (entries || []).forEach((e: any) => {
        if (e.photo_urls?.length) urls[e.item_id] = e.photo_urls;
      });
      setPhotoUrls(urls);
    }
  }, [user, date]);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  if (!module) return null;

  const earnedPoints = module.items.reduce(
    (sum, item) => sum + (log.entries[item.id]?.completed ? item.points : 0),
    0
  );

  const handleToggle = async (itemId: string, points: number) => {
    if (!user) return;
    await toggleEntry(user.id, moduleKey, itemId, points, date);
    await loadLog();
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

  const isDietItem = (itemId: string) => DIET_ITEM_IDS.includes(itemId);
  const showPhotoButton = moduleKey === "health";

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

      <div className="space-y-3">
        {module.items.map((item) => {
          const entry = log.entries[item.id];
          const isCompleted = entry?.completed;
          const photos = photoUrls[item.id] || [];

          return (
            <Drawer key={item.id}>
              <div
                className={cn(
                  "bg-card rounded-xl shadow-card overflow-hidden transition-all duration-200",
                  isCompleted && "ring-1 ring-primary/20"
                )}
              >
                <div className="flex items-center p-4 gap-3">
                  <button
                    onClick={() => handleToggle(item.id, item.points)}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0",
                      isCompleted
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30 hover:border-primary/50"
                    )}
                  >
                    <AnimatePresence>
                      {isCompleted && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium text-sm transition-all duration-200", isCompleted && "line-through text-muted-foreground")}>
                      {item.name}
                    </p>
                    {entry?.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.notes}</p>
                    )}
                  </div>

                  <span className={cn("text-xs font-medium px-2 py-1 rounded-full", module.bgClass, module.fgClass)}>
                    +{item.points}分
                  </span>

                  {showPhotoButton && (
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
                  )}

                  <DrawerTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground p-1">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </DrawerTrigger>
                </div>

                {photos.length > 0 && (
                  <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
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
                </div>
              </DrawerContent>
            </Drawer>
          );
        })}
      </div>
    </div>
  );
}
