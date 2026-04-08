import { useState, useEffect, useMemo } from "react";
import { CORE_MODULES, BONUS_MODULES, GOALS_MODULE, MODULES } from "@/lib/modules";
import type { Module } from "@/lib/modules";
import { getModuleConfig } from "@/lib/supabase-store";
import type { ModuleConfig } from "@/lib/store-types";
import { useAuth } from "@/hooks/useAuth";

function applyConfig(modules: Module[], config: ModuleConfig | null): Module[] {
  if (!config) return modules;
  return modules.map((mod) => {
    const cfg = config.modules[mod.key];
    if (!cfg) return mod;
    // Merge: use config items, but append any default items not present in config
    const configItems = cfg.items.map((item) => ({ ...item }));
    const configItemIds = new Set(configItems.map((i) => i.id));
    const missingDefaults = mod.items.filter((i) => !configItemIds.has(i.id));
    return { ...mod, name: cfg.name || mod.name, items: [...configItems, ...missingDefaults] };
  });
}

function applySingleConfig(mod: Module, config: ModuleConfig | null): Module {
  if (!config) return mod;
  const cfg = config.modules[mod.key];
  if (!cfg) return mod;
  return { ...mod, name: cfg.name || mod.name, items: cfg.items.map((item) => ({ ...item })) };
}

export function useModuleConfig() {
  const { user } = useAuth();
  const [config, setConfig] = useState<ModuleConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getModuleConfig(user.id).then((cfg) => {
      setConfig(cfg);
      setLoading(false);
    });
  }, [user]);

  const coreModules = useMemo(() => applyConfig(CORE_MODULES, config), [config]);
  const bonusModules = useMemo(() => applyConfig(BONUS_MODULES, config), [config]);
  const goalsModule = useMemo(() => applySingleConfig(GOALS_MODULE, config), [config]);
  const allModules = useMemo(() => [...coreModules, ...bonusModules, goalsModule], [coreModules, bonusModules, goalsModule]);

  const getModule = (key: string) => allModules.find((m) => m.key === key);

  return { coreModules, bonusModules, goalsModule, allModules, getModule, config, loading };
}
