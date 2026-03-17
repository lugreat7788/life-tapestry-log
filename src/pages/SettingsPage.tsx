import { useState } from "react";
import { MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { User, Download, ChevronRight } from "lucide-react";

export default function SettingsPage() {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold text-foreground mb-5">
        设置
      </h1>

      {/* Profile */}
      <div className="bg-card rounded-xl shadow-card p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-semibold">我的 LifeLog</h2>
            <p className="text-sm text-muted-foreground">个人成长记录</p>
          </div>
        </div>
      </div>

      {/* Module point settings */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          积分设置
        </h2>
        <div className="space-y-2">
          {MODULES.map((mod) => (
            <div key={mod.key} className="bg-card rounded-xl shadow-card overflow-hidden">
              <button
                onClick={() =>
                  setExpandedModule(expandedModule === mod.key ? null : mod.key)
                }
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{mod.icon}</span>
                  <span className="font-medium text-sm">{mod.name}</span>
                </div>
                <ChevronRight
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    expandedModule === mod.key && "rotate-90"
                  )}
                />
              </button>
              {expandedModule === mod.key && (
                <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
                  {mod.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{item.name}</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          mod.bgClass,
                          mod.fgClass
                        )}
                      >
                        {item.points} 分
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Data export */}
      <div className="bg-card rounded-xl shadow-card p-4">
        <button className="flex items-center gap-3 w-full text-sm">
          <Download className="w-5 h-5 text-muted-foreground" />
          <span>导出数据</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        LifeLog v1.0 · 我的成长记录本
      </p>
    </div>
  );
}
