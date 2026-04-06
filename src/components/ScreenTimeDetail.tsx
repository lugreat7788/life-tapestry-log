import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Camera, Clock, Smartphone, BarChart3, Upload, Loader2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedWrite } from "@/hooks/useDebouncedWrite";
import { getScreenTimeRecord, upsertScreenTimeRecord, getScreenTimeHistory } from "@/lib/supabase-store";
import type { ScreenTimeRecord } from "@/lib/supabase-store";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const DEFAULT_CATEGORIES = ["社交", "娱乐", "工具", "学习", "工作", "其他"];

const CATEGORY_ICONS: Record<string, string> = {
  "社交": "💬",
  "娱乐": "🎮",
  "工具": "🔧",
  "学习": "📖",
  "工作": "💼",
  "其他": "📂",
};

interface ScreenTimeDetailProps {
  date?: Date;
}

export default function ScreenTimeDetail({ date }: ScreenTimeDetailProps) {
  const { user } = useAuth();
  const dateStr = format(date || new Date(), "yyyy-MM-dd");

  const [totalMinutes, setTotalMinutes] = useState(0);
  const [pickups, setPickups] = useState(0);
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [history, setHistory] = useState<ScreenTimeRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounced write
  const writeFn = useCallback(async (...args: any[]) => {
    if (!user) return;
    const [updates] = args;
    await upsertScreenTimeRecord(user.id, dateStr, updates);
  }, [user, dateStr]);
  const { debouncedWrite, saving } = useDebouncedWrite(writeFn);

  // Load data
  useEffect(() => {
    if (!user) return;
    Promise.all([
      getScreenTimeRecord(user.id, date),
      getScreenTimeHistory(user.id, 7),
    ]).then(([record, hist]) => {
      if (record) {
        setTotalMinutes(record.totalMinutes);
        setPickups(record.pickups);
        setCategories(record.categoryBreakdown);
        setNotes(record.notes || "");
        setScreenshotUrl(record.screenshotUrl);
      }
      setHistory(hist);
      setLoaded(true);
    });
  }, [user, date]);

  const updateField = (field: string, value: any) => {
    const updates: any = {};
    if (field === "totalMinutes") { setTotalMinutes(value); updates.totalMinutes = value; }
    if (field === "pickups") { setPickups(value); updates.pickups = value; }
    if (field === "notes") { setNotes(value); updates.notes = value; }
    if (field === "categoryBreakdown") { setCategories(value); updates.categoryBreakdown = value; }
    debouncedWrite(updates);
  };

  const updateCategory = (cat: string, minutes: number) => {
    const updated = { ...categories, [cat]: minutes };
    setCategories(updated);
    debouncedWrite({ categoryBreakdown: updated });
  };

  // Screenshot upload + OCR
  const handleScreenshot = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/screen_time_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("entry-photos").upload(path, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("entry-photos").getPublicUrl(path);
      const url = urlData.publicUrl;
      setScreenshotUrl(url);
      await upsertScreenTimeRecord(user.id, dateStr, { screenshotUrl: url });
      setUploading(false);

      // OCR parse
      setParsing(true);
      const { data: parseResult, error: parseError } = await supabase.functions.invoke("parse-screen-time", {
        body: { imageUrl: url },
      });

      if (parseError) throw parseError;
      if (parseResult?.error) {
        toast.error(parseResult.error);
        setParsing(false);
        return;
      }

      // Apply parsed data
      if (parseResult.totalMinutes !== undefined) setTotalMinutes(parseResult.totalMinutes);
      if (parseResult.pickups !== undefined) setPickups(parseResult.pickups);
      if (parseResult.categoryBreakdown) setCategories(parseResult.categoryBreakdown);

      await upsertScreenTimeRecord(user.id, dateStr, {
        totalMinutes: parseResult.totalMinutes || 0,
        pickups: parseResult.pickups || 0,
        categoryBreakdown: parseResult.categoryBreakdown || {},
      });

      toast.success("截图识别成功！数据已自动填入");
    } catch (err) {
      console.error(err);
      toast.error("处理失败，请重试");
    } finally {
      setUploading(false);
      setParsing(false);
    }
  };

  const formatMinutes = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}小时${min > 0 ? `${min}分` : ""}` : `${min}分钟`;
  };

  // Calculate trend vs yesterday
  const yesterday = history.find((h) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return h.date === format(d, "yyyy-MM-dd");
  });
  const diff = yesterday ? totalMinutes - yesterday.totalMinutes : 0;

  if (!loaded) {
    return (
      <div className="px-4 pt-4 pb-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6">
      {/* Header */}
      <div className="rounded-xl p-5 mb-6 bg-module-screen-time">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📱</span>
          <div>
            <h1 className="text-xl font-display font-bold text-module-screen-time-fg">手机使用</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              记录和管理你的屏幕时间
              {saving && <span className="ml-2 text-xs text-muted-foreground/60 animate-pulse">保存中…</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Screenshot Upload */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Camera className="w-4 h-4" />
            截图识别
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleScreenshot(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || parsing}
            className={cn(
              "w-full rounded-xl border-2 border-dashed p-6 flex flex-col items-center gap-2 transition-colors",
              "hover:border-primary/40 hover:bg-primary/5",
              (uploading || parsing) && "opacity-50 cursor-not-allowed"
            )}
          >
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                <span className="text-sm text-muted-foreground">上传中...</span>
              </>
            ) : parsing ? (
              <>
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="text-sm text-primary">AI 识别中...</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">上传屏幕时间截图，AI自动识别</span>
                <span className="text-xs text-muted-foreground/60">支持 iOS/Android 屏幕使用时间截图</span>
              </>
            )}
          </button>
          {screenshotUrl && (
            <div className="mt-3">
              <img src={screenshotUrl} alt="屏幕时间截图" className="rounded-lg max-h-40 mx-auto" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">总屏幕时间</span>
              </div>
              <div className="flex items-end gap-2">
                <Input
                  type="number"
                  min={0}
                  value={totalMinutes || ""}
                  onChange={(e) => updateField("totalMinutes", parseInt(e.target.value) || 0)}
                  className="text-lg font-semibold h-8 w-20"
                  placeholder="0"
                />
                <span className="text-xs text-muted-foreground mb-1">分钟</span>
              </div>
              {totalMinutes > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{formatMinutes(totalMinutes)}</p>
              )}
              {yesterday && (
                <div className={cn("flex items-center gap-1 mt-1 text-xs", diff > 0 ? "text-destructive" : diff < 0 ? "text-primary" : "text-muted-foreground")}>
                  {diff > 0 ? <TrendingUp className="w-3 h-3" /> : diff < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {diff !== 0 ? `较昨天${diff > 0 ? "+" : ""}${diff}分` : "与昨天持平"}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">拿起手机</span>
              </div>
              <div className="flex items-end gap-2">
                <Input
                  type="number"
                  min={0}
                  value={pickups || ""}
                  onChange={(e) => updateField("pickups", parseInt(e.target.value) || 0)}
                  className="text-lg font-semibold h-8 w-20"
                  placeholder="0"
                />
                <span className="text-xs text-muted-foreground mb-1">次</span>
              </div>
              {yesterday && (
                <div className={cn("flex items-center gap-1 mt-1 text-xs",
                  pickups > yesterday.pickups ? "text-destructive" : pickups < yesterday.pickups ? "text-primary" : "text-muted-foreground"
                )}>
                  {pickups > yesterday.pickups ? <TrendingUp className="w-3 h-3" /> : pickups < yesterday.pickups ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {pickups !== yesterday.pickups ? `较昨天${pickups > yesterday.pickups ? "+" : ""}${pickups - yesterday.pickups}次` : "与昨天持平"}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Category Breakdown */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            分类使用时长
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DEFAULT_CATEGORIES.map((cat) => {
              const mins = categories[cat] || 0;
              const pct = totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{CATEGORY_ICONS[cat]}</span>
                      <span className="text-sm">{cat}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={mins || ""}
                        onChange={(e) => updateCategory(cat, parseInt(e.target.value) || 0)}
                        className="h-7 w-16 text-xs text-right"
                        placeholder="0"
                      />
                      <span className="text-xs text-muted-foreground w-8">分钟</span>
                    </div>
                  </div>
                  {totalMinutes > 0 && mins > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary/60 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-8">{pct}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notes / Reflection */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">使用反思</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder="今天手机使用有什么感受？哪些时间可以优化？"
            className="min-h-[80px] text-sm"
          />
        </CardContent>
      </Card>

      {/* 7-day History Mini Chart */}
      {history.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">近7天趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-20">
              {history.slice(0, 7).reverse().map((h, i) => {
                const maxM = Math.max(...history.slice(0, 7).map((r) => r.totalMinutes), 1);
                const pct = (h.totalMinutes / maxM) * 100;
                const isToday = h.date === dateStr;
                return (
                  <div key={h.date} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      className={cn("w-full rounded-t", isToday ? "bg-primary" : "bg-primary/30")}
                      style={{ minHeight: 4 }}
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(pct, 5)}%` }}
                      transition={{ delay: i * 0.05 }}
                    />
                    <span className="text-[9px] text-muted-foreground">
                      {format(new Date(h.date), "dd")}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-muted-foreground">
                平均 {formatMinutes(Math.round(history.slice(0, 7).reduce((s, h) => s + h.totalMinutes, 0) / Math.min(history.length, 7)))}
              </span>
              <span className="text-[10px] text-muted-foreground">
                平均拿起 {Math.round(history.slice(0, 7).reduce((s, h) => s + h.pickups, 0) / Math.min(history.length, 7))} 次
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
