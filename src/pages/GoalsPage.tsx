import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Target, Calendar, Heart, Brain, Gift, ShoppingBag, FolderPlus, ChevronDown, ChevronRight, Edit2, Check } from "lucide-react";
import {
  getEmotionRecords, addEmotionRecord, deleteEmotionRecord, updateEmotionRecord,
  getRelationshipRecords, addRelationshipRecord, deleteRelationshipRecord, updateRelationshipRecord,
  getGoals, addGoal as addGoalDb, updateGoalStatus, deleteGoal as deleteGoalDb,
  getGoalCollections, addGoalCollection, renameGoalCollection, deleteGoalCollection,
  getRewards, addReward, deleteReward,
  getRedemptions, addRedemption, getAllTimePoints, getTotalSpentPoints,
} from "@/lib/supabase-store";
import type { EmotionRecord, RelationshipRecord, GoalItem, GoalCollection, RewardItem, RedemptionRecord } from "@/lib/store-types";
import { useModuleConfig } from "@/hooks/useModuleConfig";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

const DEFAULT_EMOTIONS = ["😊 开心", "😢 难过", "😠 愤怒", "😰 焦虑", "😌 平静", "🤔 困惑", "😤 烦躁", "🥰 幸福", "😔 失落", "💪 自信"];
const DEFAULT_PERSONS = ["伴侣", "家人", "朋友", "同事"];

const RELATION_STATUS_LABELS = { unresolved: "未解决", in_progress: "处理中", resolved: "已解决" };
const RELATION_STATUS_COLORS = {
  unresolved: "bg-destructive/10 text-destructive",
  in_progress: "bg-amber-500/10 text-amber-600",
  resolved: "bg-primary/10 text-primary",
};

const STATUS_LABELS = { not_started: "未开始", in_progress: "进行中", completed: "已完成" };
const STATUS_COLORS = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-module-health text-module-health-fg",
};

export default function GoalsPage() {
  const { user } = useAuth();
  const { config } = useModuleConfig();
  const emotionTypes = config?.emotionTypes || DEFAULT_EMOTIONS;
  const personList = config?.relationshipPersons || DEFAULT_PERSONS;
  const [emotions, setEmotions] = useState<EmotionRecord[]>([]);
  const [relationships, setRelationships] = useState<RelationshipRecord[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [goalCollections, setGoalCollections] = useState<GoalCollection[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRecord[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [spentPoints, setSpentPoints] = useState(0);

  // Emotion form
  const [showAddEmotion, setShowAddEmotion] = useState(false);
  const [newEmotionType, setNewEmotionType] = useState(emotionTypes[0]);
  const [newIntensity, setNewIntensity] = useState(5);
  const [newTrigger, setNewTrigger] = useState("");
  const [newThoughts, setNewThoughts] = useState("");
  const [newCoping, setNewCoping] = useState("");

  // Relationship form
  const [showAddRelation, setShowAddRelation] = useState(false);
  const [newPerson, setNewPerson] = useState("");
  const [newProblem, setNewProblem] = useState("");
  const [newSolution, setNewSolution] = useState("");
  const [newReflection, setNewReflection] = useState("");

  // Goal form
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDesc, setNewGoalDesc] = useState("");
  const [newGoalType, setNewGoalType] = useState<"short_term" | "long_term">("short_term");
  const [newGoalDate, setNewGoalDate] = useState("");
  const [newGoalCollection, setNewGoalCollection] = useState("");

  // Goal collection form
  const [showAddCollection, setShowAddCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editingCollectionName, setEditingCollectionName] = useState("");

  // Reward form
  const [showAddReward, setShowAddReward] = useState(false);
  const [newRewardName, setNewRewardName] = useState("");
  const [newRewardCost, setNewRewardCost] = useState("10");

  const availablePoints = totalPoints - spentPoints;

  const loadData = async () => {
    if (!user) return;
    const [e, r, g, gc, rw, rd, tp, sp] = await Promise.all([
      getEmotionRecords(user.id),
      getRelationshipRecords(user.id),
      getGoals(user.id),
      getGoalCollections(user.id),
      getRewards(user.id),
      getRedemptions(user.id),
      getAllTimePoints(user.id),
      getTotalSpentPoints(user.id),
    ]);
    setEmotions(e);
    setRelationships(r);
    setGoals(g);
    setGoalCollections(gc);
    setRewards(rw);
    setRedemptions(rd);
    setTotalPoints(tp);
    setSpentPoints(sp);
    setExpandedCollections(new Set(gc.map((c: GoalCollection) => c.id)));
  };

  useEffect(() => { loadData(); }, [user]);

  // Emotion handlers
  const handleAddEmotion = async () => {
    if (!user) return;
    await addEmotionRecord(user.id, {
      date: format(new Date(), "yyyy-MM-dd"),
      emotionType: newEmotionType,
      intensity: newIntensity,
      trigger: newTrigger,
      thoughts: newThoughts,
      copingStrategy: newCoping,
    });
    setNewTrigger(""); setNewThoughts(""); setNewCoping(""); setNewIntensity(5); setShowAddEmotion(false);
    await loadData();
  };

  // Relationship handlers
  const handleAddRelation = async () => {
    if (!newProblem.trim() || !user) return;
    await addRelationshipRecord(user.id, {
      date: format(new Date(), "yyyy-MM-dd"),
      person: newPerson,
      problem: newProblem,
      solution: newSolution,
      reflection: newReflection,
      status: "unresolved",
    });
    setNewPerson(""); setNewProblem(""); setNewSolution(""); setNewReflection(""); setShowAddRelation(false);
    await loadData();
  };

  const handleRelationStatus = async (id: string, status: string) => {
    await updateRelationshipRecord(id, { status: status as any });
    await loadData();
  };

  // Goal handlers
  const handleAddGoal = async () => {
    if (!newGoalTitle.trim() || !user) return;
    await addGoalDb(user.id, {
      title: newGoalTitle.trim(),
      description: newGoalDesc.trim(),
      targetDate: newGoalDate || undefined,
      type: newGoalType,
      status: "not_started",
      points: newGoalType === "long_term" ? 20 : 10,
      collectionId: newGoalCollection || undefined,
    });
    setNewGoalTitle(""); setNewGoalDesc(""); setNewGoalDate(""); setNewGoalCollection(""); setShowAddGoal(false);
    await loadData();
  };

  const handleAddCollection = async () => {
    if (!newCollectionName.trim() || !user) return;
    await addGoalCollection(user.id, newCollectionName.trim());
    setNewCollectionName(""); setShowAddCollection(false);
    await loadData();
  };

  const handleRenameCollection = async (id: string) => {
    if (!editingCollectionName.trim()) return;
    await renameGoalCollection(id, editingCollectionName.trim());
    setEditingCollectionId(null);
    await loadData();
  };

  const toggleCollection = (id: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Reward handlers
  const handleAddReward = async () => {
    if (!newRewardName.trim() || !user) return;
    const cost = parseInt(newRewardCost) || 10;
    await addReward(user.id, newRewardName.trim(), cost);
    setNewRewardName(""); setNewRewardCost("10"); setShowAddReward(false);
    await loadData();
  };

  const handleRedeem = async (reward: RewardItem) => {
    if (!user) return;
    if (availablePoints < reward.pointsCost) {
      toast.error("积分不足，无法兑换");
      return;
    }
    await addRedemption(user.id, reward.name, reward.pointsCost);
    toast.success(`成功兑换: ${reward.name}`);
    await loadData();
  };

  // Goal grouping
  const uncategorizedGoals = goals.filter((g) => !g.collectionId);
  const shortTermGoals = uncategorizedGoals.filter((g) => g.type === "short_term");
  const longTermGoals = uncategorizedGoals.filter((g) => g.type === "long_term");

  const renderGoalItem = (goal: GoalItem, iconColor = "text-primary") => (
    <motion.div key={goal.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-card p-4">
      <div className="flex items-start gap-3">
        <Target className={cn("w-4 h-4 mt-0.5 shrink-0", iconColor)} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium">{goal.title}</h4>
          {goal.description && <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>}
          <div className="flex items-center gap-2 mt-2">
            <Select value={goal.status} onValueChange={(v) => updateGoalStatus(goal.id, v).then(loadData)}>
              <SelectTrigger className="h-6 text-[10px] w-auto px-2">
                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", STATUS_COLORS[goal.status as keyof typeof STATUS_COLORS])}>
                  {STATUS_LABELS[goal.status as keyof typeof STATUS_LABELS]}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">未开始</SelectItem>
                <SelectItem value="in_progress">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
              </SelectContent>
            </Select>
            {goal.targetDate && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Calendar className="w-3 h-3" />{goal.targetDate}</span>}
            <span className="text-[10px] text-primary">+{goal.points}分</span>
          </div>
        </div>
        <button onClick={() => deleteGoalDb(goal.id).then(loadData)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </motion.div>
  );

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold text-foreground mb-5">心灵记录</h1>

      <Tabs defaultValue="emotion" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="emotion" className="flex-1 gap-1"><Brain className="w-3.5 h-3.5" />情绪</TabsTrigger>
          <TabsTrigger value="relationship" className="flex-1 gap-1"><Heart className="w-3.5 h-3.5" />关系</TabsTrigger>
          <TabsTrigger value="goals" className="flex-1 gap-1"><Target className="w-3.5 h-3.5" />目标</TabsTrigger>
          <TabsTrigger value="redeem" className="flex-1 gap-1"><Gift className="w-3.5 h-3.5" />兑换</TabsTrigger>
        </TabsList>

        {/* ─── 情绪记录 ─── */}
        <TabsContent value="emotion">
          <div className="mt-4">
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={() => setShowAddEmotion(!showAddEmotion)} className="rounded-full">
                <Plus className="w-4 h-4 mr-1" />记录情绪
              </Button>
            </div>

            <AnimatePresence>
              {showAddEmotion && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
                  <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">情绪类型</label>
                      <div className="flex flex-wrap gap-1.5">
                        {emotionTypes.map((e) => (
                          <button key={e} onClick={() => setNewEmotionType(e)} className={cn("px-2.5 py-1 rounded-full text-xs transition-colors", newEmotionType === e ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}>{e}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">强度: {newIntensity}/10</label>
                      <Slider value={[newIntensity]} onValueChange={(v) => setNewIntensity(v[0])} min={1} max={10} step={1} className="w-full" />
                    </div>
                    <Textarea placeholder="触发事件（什么引起了这个情绪？）" value={newTrigger} onChange={(e) => setNewTrigger(e.target.value)} className="min-h-[60px] resize-none" />
                    <Textarea placeholder="内心想法（当时你在想什么？）" value={newThoughts} onChange={(e) => setNewThoughts(e.target.value)} className="min-h-[60px] resize-none" />
                    <Textarea placeholder="应对方式（你是怎么处理的？）" value={newCoping} onChange={(e) => setNewCoping(e.target.value)} className="min-h-[60px] resize-none" />
                    <div className="flex gap-2">
                      <Button onClick={handleAddEmotion} size="sm">保存</Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddEmotion(false)}>取消</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {emotions.length === 0 && !showAddEmotion && (
              <div className="text-center py-12"><p className="text-muted-foreground text-sm">暂无情绪记录，点击上方按钮开始记录</p></div>
            )}

            <div className="space-y-2">
              {emotions.map((record) => (
                <motion.div key={record.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-base font-medium">{record.emotionType}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{record.date}</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className={cn("w-1.5 h-1.5 rounded-full", i < record.intensity ? "bg-primary" : "bg-muted")} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => deleteEmotionRecord(record.id).then(loadData)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  {record.trigger && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium text-foreground/70">触发: </span>{record.trigger}</p>}
                  {record.thoughts && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium text-foreground/70">想法: </span>{record.thoughts}</p>}
                  {record.copingStrategy && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium text-foreground/70">应对: </span>{record.copingStrategy}</p>}
                </motion.div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ─── 亲密关系记录 ─── */}
        <TabsContent value="relationship">
          <div className="mt-4">
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={() => setShowAddRelation(!showAddRelation)} className="rounded-full">
                <Plus className="w-4 h-4 mr-1" />记录问题
              </Button>
            </div>

            <AnimatePresence>
              {showAddRelation && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
                  <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
                    <Select value={newPerson} onValueChange={setNewPerson}>
                      <SelectTrigger><SelectValue placeholder="选择对象" /></SelectTrigger>
                      <SelectContent>
                        {personList.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Textarea placeholder="遇到的问题..." value={newProblem} onChange={(e) => setNewProblem(e.target.value)} className="min-h-[80px] resize-none" />
                    <Textarea placeholder="解决方式（可稍后补充）" value={newSolution} onChange={(e) => setNewSolution(e.target.value)} className="min-h-[60px] resize-none" />
                    <Textarea placeholder="反思与收获（可稍后补充）" value={newReflection} onChange={(e) => setNewReflection(e.target.value)} className="min-h-[60px] resize-none" />
                    <div className="flex gap-2">
                      <Button onClick={handleAddRelation} size="sm">保存</Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddRelation(false)}>取消</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {relationships.length === 0 && !showAddRelation && (
              <div className="text-center py-12"><p className="text-muted-foreground text-sm">暂无关系记录，点击上方按钮开始记录</p></div>
            )}

            <div className="space-y-2">
              {relationships.map((record) => (
                <motion.div key={record.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        {record.person && <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{record.person}</span>}
                        <button onClick={() => { const s = ["unresolved", "in_progress", "resolved"] as const; handleRelationStatus(record.id, s[(s.indexOf(record.status) + 1) % 3]); }} className={cn("text-[10px] px-2 py-0.5 rounded-full", RELATION_STATUS_COLORS[record.status])}>{RELATION_STATUS_LABELS[record.status]}</button>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{record.date}</span>
                    </div>
                    <button onClick={() => deleteRelationshipRecord(record.id).then(loadData)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <p className="text-sm mt-1"><span className="font-medium text-foreground/70">问题: </span>{record.problem}</p>
                  {record.solution && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium text-foreground/70">解决: </span>{record.solution}</p>}
                  {record.reflection && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium text-foreground/70">反思: </span>{record.reflection}</p>}
                </motion.div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ─── 目标追踪 ─── */}
        <TabsContent value="goals">
          <div className="mt-4">
            <div className="flex justify-end gap-2 mb-3">
              <Button size="sm" variant="outline" onClick={() => setShowAddCollection(!showAddCollection)} className="rounded-full">
                <FolderPlus className="w-4 h-4 mr-1" />新建目标集
              </Button>
              <Button size="sm" onClick={() => setShowAddGoal(!showAddGoal)} className="rounded-full">
                <Plus className="w-4 h-4 mr-1" />添加目标
              </Button>
            </div>

            {/* Add collection form */}
            <AnimatePresence>
              {showAddCollection && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
                  <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
                    <Input placeholder="目标集名称..." value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} autoFocus />
                    <div className="flex gap-2">
                      <Button onClick={handleAddCollection} size="sm">创建</Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddCollection(false)}>取消</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Add goal form */}
            <AnimatePresence>
              {showAddGoal && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
                  <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
                    <Input placeholder="目标名称..." value={newGoalTitle} onChange={(e) => setNewGoalTitle(e.target.value)} autoFocus />
                    <Textarea placeholder="目标描述（可选）" value={newGoalDesc} onChange={(e) => setNewGoalDesc(e.target.value)} className="min-h-[80px] resize-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={newGoalType} onValueChange={(v) => setNewGoalType(v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short_term">近期目标 (+10分)</SelectItem>
                          <SelectItem value="long_term">远期目标 (+20分)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="date" value={newGoalDate} onChange={(e) => setNewGoalDate(e.target.value)} />
                    </div>
                    {goalCollections.length > 0 && (
                      <Select value={newGoalCollection} onValueChange={setNewGoalCollection}>
                        <SelectTrigger><SelectValue placeholder="选择目标集（可选）" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">不归入目标集</SelectItem>
                          {goalCollections.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={handleAddGoal} size="sm">确认</Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddGoal(false)}>取消</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {goals.length === 0 && goalCollections.length === 0 && !showAddGoal && !showAddCollection && (
              <div className="text-center py-12"><p className="text-muted-foreground text-sm">暂无目标</p></div>
            )}

            {/* Goal Collections */}
            {goalCollections.map((collection) => {
              const collectionGoals = goals.filter((g) => g.collectionId === collection.id);
              const isExpanded = expandedCollections.has(collection.id);
              return (
                <div key={collection.id} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => toggleCollection(collection.id)} className="text-muted-foreground hover:text-foreground">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    {editingCollectionId === collection.id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <Input value={editingCollectionName} onChange={(e) => setEditingCollectionName(e.target.value)} className="h-7 text-xs" autoFocus onKeyDown={(e) => e.key === "Enter" && handleRenameCollection(collection.id)} />
                        <button onClick={() => handleRenameCollection(collection.id)} className="text-primary p-1"><Check className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex-1">{collection.name} ({collectionGoals.length})</h3>
                    )}
                    <button onClick={() => { setEditingCollectionId(collection.id); setEditingCollectionName(collection.name); }} className="text-muted-foreground hover:text-foreground p-1"><Edit2 className="w-3 h-3" /></button>
                    <button onClick={() => deleteGoalCollection(collection.id).then(loadData)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3 h-3" /></button>
                  </div>
                  {isExpanded && (
                    <div className="space-y-2 ml-6">
                      {collectionGoals.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">暂无目标</p>
                      ) : (
                        collectionGoals.map((goal) => renderGoalItem(goal, goal.type === "long_term" ? "text-amber-500" : "text-primary"))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Uncategorized goals */}
            {shortTermGoals.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">近期目标</h3>
                <div className="space-y-2">{shortTermGoals.map((goal) => renderGoalItem(goal))}</div>
              </div>
            )}

            {longTermGoals.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">远期目标</h3>
                <div className="space-y-2">{longTermGoals.map((goal) => renderGoalItem(goal, "text-amber-500"))}</div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── 兑换台 ─── */}
        <TabsContent value="redeem">
          <div className="mt-4">
            {/* Points summary */}
            <div className="bg-card rounded-xl shadow-card p-4 mb-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-display font-bold text-foreground">{totalPoints}</p>
                  <p className="text-[10px] text-muted-foreground">总积分</p>
                </div>
                <div>
                  <p className="text-lg font-display font-bold text-destructive">{spentPoints}</p>
                  <p className="text-[10px] text-muted-foreground">已兑换</p>
                </div>
                <div>
                  <p className="text-lg font-display font-bold text-primary">{availablePoints}</p>
                  <p className="text-[10px] text-muted-foreground">可用积分</p>
                </div>
              </div>
            </div>

            {/* Add reward */}
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={() => setShowAddReward(!showAddReward)} className="rounded-full">
                <Plus className="w-4 h-4 mr-1" />添加奖励
              </Button>
            </div>

            <AnimatePresence>
              {showAddReward && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
                  <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
                    <Input placeholder="奖励名称（如：看一部电影）" value={newRewardName} onChange={(e) => setNewRewardName(e.target.value)} autoFocus />
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground shrink-0">所需积分</label>
                      <Input type="number" min="1" value={newRewardCost} onChange={(e) => setNewRewardCost(e.target.value)} className="w-24" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddReward} size="sm">添加</Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddReward(false)}>取消</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rewards list */}
            {rewards.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">可兑换奖励</h3>
                <div className="space-y-2">
                  {rewards.map((reward) => (
                    <motion.div key={reward.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-card p-4">
                      <div className="flex items-center gap-3">
                        <Gift className="w-4 h-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium">{reward.name}</h4>
                          <p className="text-xs text-primary">{reward.pointsCost} 积分</p>
                        </div>
                        <Button
                          size="sm"
                          variant={availablePoints >= reward.pointsCost ? "default" : "outline"}
                          disabled={availablePoints < reward.pointsCost}
                          onClick={() => handleRedeem(reward)}
                          className="rounded-full text-xs h-7 px-3"
                        >
                          <ShoppingBag className="w-3 h-3 mr-1" />兑换
                        </Button>
                        <button onClick={() => deleteReward(reward.id).then(loadData)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {rewards.length === 0 && !showAddReward && (
              <div className="text-center py-8 mb-4"><p className="text-muted-foreground text-sm">还没有设置奖励，点击上方按钮添加</p></div>
            )}

            {/* Redemption history */}
            {redemptions.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">兑换记录</h3>
                <div className="space-y-1.5">
                  {redemptions.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-xs bg-card rounded-lg shadow-card px-4 py-3">
                      <span className="font-medium text-foreground">{r.rewardName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-destructive">-{r.pointsSpent}分</span>
                        <span className="text-muted-foreground">{format(new Date(r.redeemedAt), "M/d HH:mm")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
