import { useEffect, useState } from "react";
import { ShieldCheck, AlertTriangle, Skull, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getLastRecordDate } from "@/lib/supabase-store";
import { checkLaw, type LawSignal, type LawSignalLevel } from "@/lib/lawCheck";
import { cn } from "@/lib/utils";

// 死亡条款自检 —— 对照 docs/法典.md 的失败信号。
// 感知死 / 判断死 自动判定；谄媚死需自查。

const LEVEL_STYLE: Record<LawSignalLevel, { row: string; icon: typeof ShieldCheck; iconColor: string }> = {
  ok: { row: "text-muted-foreground", icon: ShieldCheck, iconColor: "text-emerald-500" },
  warn: { row: "text-amber-600", icon: AlertTriangle, iconColor: "text-amber-500" },
  dead: { row: "text-destructive", icon: Skull, iconColor: "text-destructive" },
};

function SignalRow({ signal }: { signal: LawSignal }) {
  const s = LEVEL_STYLE[signal.level];
  const Icon = s.icon;
  return (
    <div className="flex items-start gap-2">
      <Icon className={cn("w-3.5 h-3.5 shrink-0 mt-px", s.iconColor)} />
      <p className={cn("text-[11px] leading-relaxed", s.row)}>
        <span className="font-medium">{signal.clause}</span>
        <span className="text-muted-foreground/70"> · {signal.message}</span>
      </p>
    </div>
  );
}

export default function LawHealthCheck() {
  const { user } = useAuth();
  const [signals, setSignals] = useState<LawSignal[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getLastRecordDate(user.id)
      .then((last) => {
        if (active) setSignals(checkLaw(last));
      })
      .catch(() => {
        if (active) setSignals(checkLaw(null));
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (!signals) return null;

  const worst: LawSignalLevel = signals.some((s) => s.level === "dead")
    ? "dead"
    : signals.some((s) => s.level === "warn")
    ? "warn"
    : "ok";

  return (
    <div
      className={cn(
        "mt-6 rounded-2xl border p-4",
        worst === "dead"
          ? "border-destructive/30 bg-destructive/5"
          : worst === "warn"
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-border/60 bg-muted/30"
      )}
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          法体检 · 死亡条款自检
        </h3>
      </div>

      <div className="space-y-2">
        {signals.map((s) => (
          <SignalRow key={s.clause} signal={s} />
        ))}
        {/* 谄媚死：无法自动判定，列为自查提醒 */}
        <div className="flex items-start gap-2">
          <Eye className="w-3.5 h-3.5 shrink-0 mt-px text-muted-foreground/60" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-medium">谄媚死</span>
            <span className="text-muted-foreground/70"> · 需自查：洞察是否开始只说让你舒服的话、回避难堪？</span>
          </p>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/50 mt-3 leading-relaxed">
        依据 docs/法典.md 死亡条款。感知死 / 判断死 自动对表；谄媚死需本人审计。
      </p>
    </div>
  );
}
