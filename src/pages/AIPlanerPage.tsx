import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import localforage from "localforage";
import { 
  CaretLeft, 
  CaretRight, 
  Sparkle, 
  CalendarBlank,
  PaperPlaneRight,
  CircleNotch,
  BookOpenText,
  Flask,
  Briefcase,
  User,
  Coffee,
  Trash,
  ArrowCounterClockwise,
  WarningCircle 
} from "@phosphor-icons/react";

const monthNames = ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"];
const dayNamesShort = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const dayNamesFull = ["неділя", "понеділок", "вівторок", "середа", "четвер", "п'ятниця", "субота"];
const ukDaysMap = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];

interface Plan {
  id: number | string;
  text: string;
  completed: boolean;
  date: string;
  type: string;
  time?: string;
  origin?: string;
}

interface UserData { id: number; name: string; email: string; }
interface ChatMessage { id: string; role: "user" | "ai"; text: string; }
interface PlannerTask { id: string; title: string; timeStart: string; timeEnd: string; category: "study" | "lab" | "work" | "personal" | "wellness"; dateKey: string; }
interface WorkSchedule { times: Record<string, string>; days: Record<string, boolean>; }

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const normalizeDate = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split(/[-.]/);
  if (parts.length !== 3) return dateStr;
  let d, m, y;
  if (parts[0].length === 4) { [y, m, d] = parts; } else { [d, m, y] = parts; }
  return `${parseInt(String(d))}-${parseInt(String(m))}-${y}`;
};

export const AIPlanerPage = () => {
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [baseDate, setBaseDate] = useState(new Date());
  const [currentHour, setCurrentHour] = useState("");
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [workSchedule, setWorkSchedule] = useState<WorkSchedule | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastAutoProcessedRef = useRef<string>("");

  useEffect(() => {
    const initPlanner = async () => {
      const storedUser = await localforage.getItem<UserData>("userData");
      setUserData(storedUser);
      const isGuest = (await localforage.getItem("isGuest")) === "true";
      const nameKey = isGuest ? "Гість" : (storedUser?.name || "user");
      const plansKey = isGuest ? "unimind-plans-guest" : `unimind-plans-${nameKey}`;

      const localPlans = await localforage.getItem<Plan[]>(plansKey);
      if (localPlans) {
        setAllPlans(localPlans.map(p => ({ ...p, date: normalizeDate(p.date) })));
      }

      if (!isGuest && storedUser?.id) {
        try {
          const response = await fetch(`${API_URL}/profile/${storedUser.id}`);
          const dbData = await response.json();
          if (response.ok && dbData) {
            if (dbData.workSchedule) setWorkSchedule(dbData.workSchedule);
            if (dbData.plans) {
              const normalized = dbData.plans.map((p: Plan) => ({ ...p, date: normalizeDate(p.date) }));
              setAllPlans(normalized);
              await localforage.setItem(plansKey, normalized);
            }
            if (dbData.chatHistory && dbData.chatHistory.length > 0) {
              setMessages(dbData.chatHistory);
            } else {
              setMessages([{ id: `ai-init-${Date.now()}`, role: "ai", text: "Привіт! Твої плани завантажено. Я стежу за новими завданнями! ✨" }]);
            }
          }
        } catch { console.error("Бекенд недоступний"); }
      }
    };
    initPlanner();

    const updateTime = () => {
      const now = new Date();
      setCurrentHour(now.getHours().toString().padStart(2, '0') + ":00");
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const currentWeekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [baseDate]);

  const hoursGrid = useMemo(() => {
    let startH = 8, endH = 22;
    if (workSchedule) {
      if (viewMode === "day") {
        const dayName = ukDaysMap[baseDate.getDay()];
        const from = workSchedule.times[`${dayName}-from`];
        const to = workSchedule.times[`${dayName}-to`];
        if (from) startH = parseInt(from.split(":")[0]);
        if (to) endH = parseInt(to.split(":")[0]);
      } else {
        let min = 24, max = 0, found = false;
        ukDaysMap.forEach(d => {
          if (workSchedule.days[d]) {
            found = true;
            const f = parseInt((workSchedule.times[`${d}-from`] || "09:00").split(":")[0]);
            const t = parseInt((workSchedule.times[`${d}-to`] || "17:00").split(":")[0]);
            if (f < min) min = f; if (t > max) max = t;
          }
        });
        if (found) { startH = Math.max(0, min - 1); endH = Math.min(23, max + 1); }
      }
    }
    return Array.from({ length: Math.max(1, endH - startH + 1) }, (_, i) => (startH + i).toString().padStart(2, '0') + ":00");
  }, [workSchedule, viewMode, baseDate]);

  const plannerTasks: PlannerTask[] = useMemo(() => {
    const mapCat = (t: string): "study" | "lab" | "work" | "personal" | "wellness" => {
      const type = t?.toLowerCase();
      if (type === "навчання") return "study";
      if (type === "лабораторна") return "lab";
      if (type === "робота") return "work";
      if (type === "wellness" || type === "їжа" || type === "прийом їжі") return "wellness";
      return "personal";
    };

    return allPlans
      .filter(p => !p.completed && p.time && typeof p.time === 'string' && p.time.includes(':'))
      .map(p => {
        const [h, m] = p.time!.split(':').map(Number);
        const dur = (p.type === "Навчання" || p.type === "Лабораторна") ? 90 : 60;
        const total = h * 60 + m + dur;
        return {
          id: String(p.id || ""),
          title: p.text,
          timeStart: p.time!,
          timeEnd: `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`,
          category: mapCat(p.type),
          dateKey: normalizeDate(p.date)
        };
      });
  }, [allPlans]);

  const unscheduledTasks = useMemo(() => {
    const datesToCheck = viewMode === "day" 
      ? [normalizeDate(`${baseDate.getDate()}-${baseDate.getMonth()}-${baseDate.getFullYear()}`)]
      : currentWeekDays.map(d => normalizeDate(`${d.getDate()}-${d.getMonth()}-${d.getFullYear()}`));

    return allPlans.filter(p => {
      if (p.completed) return false;
      const hasNoTime = !p.time || typeof p.time !== 'string' || !p.time.includes(':');
      return hasNoTime && datesToCheck.includes(normalizeDate(p.date));
    });
  }, [allPlans, baseDate, viewMode, currentWeekDays]);

  const overdueTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allPlans.filter(p => {
      if (p.completed) return false; 
      if (!p.date) return false;
      const parts = p.date.split('-');
      if (parts.length === 3) {
        const planDate = new Date(Number(parts[2]), Number(parts[1]), Number(parts[0]));
        planDate.setHours(0, 0, 0, 0);
        return planDate < today; 
      }
      return false;
    });
  }, [allPlans]);

const triggerAutoScheduling = useCallback(async (tasksToSchedule: Plan[], targetDateStr: string) => {
  setIsAutoScheduling(true);
  
  const plansForTargetDay = allPlans.filter(p => !p.completed && normalizeDate(p.date) === targetDateStr);
  const now = new Date();
  const isToday = targetDateStr === normalizeDate(`${now.getDate()}-${now.getMonth()}-${now.getFullYear()}`);
  const timeToPass = isToday ? now.toLocaleTimeString("uk-UA", { hour: '2-digit', minute: '2-digit' }) : "09:00";

  try {
    const res = await fetch(`${API_URL}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: `Службовий запит: оптимізуй розклад на ${targetDateStr}`, 
        isAutoOptimize: true, 
        tasksToSchedule: tasksToSchedule,
        userId: userData?.id, 
        workSchedule, 
        realTime: timeToPass, 
        realDate: targetDateStr, 
        plansForToday: plansForTargetDay
      })
    });

    const data = await res.json();
    const incomingPlans = data.updatedPlansForToday || data.newPlans;
    
    if (incomingPlans && Array.isArray(incomingPlans)) {
      const normalizedIncoming = incomingPlans.map((p: Plan) => ({ ...p, date: normalizeDate(p.date) }));
      
      setAllPlans(prev => {
        const updated = [...prev];
        normalizedIncoming.forEach((newP: Plan) => {
          const index = updated.findIndex(oldP => String(oldP.id) === String(newP.id));
          if (index !== -1) updated[index] = { ...updated[index], ...newP };
          else updated.push(newP);
        });
        
        setHasUnsavedChanges(true); 
        return updated;
      });
    }
  } catch (err) {
    console.error("Помилка автоматичного планування:", err);
    lastAutoProcessedRef.current = ""; 
  } finally {
    setIsAutoScheduling(false);
  }
}, [allPlans, userData, workSchedule]); 
  const handleSilentOverdueScheduling = async () => {
    setIsAutoScheduling(true);
    const targetDateStr = normalizeDate(`${baseDate.getDate()}-${baseDate.getMonth()}-${baseDate.getFullYear()}`);
    const plansForTargetDay = allPlans.filter(p => !p.completed && normalizeDate(p.date) === targetDateStr);
    const now = new Date();
    const timeToPass = now.toLocaleTimeString("uk-UA", { hour: '2-digit', minute: '2-digit' });

    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: "Службовий запит", 
          isAutoOptimize: true, 
          userId: userData?.id, 
          workSchedule, 
          realTime: timeToPass, 
          realDate: targetDateStr,
          plansForToday: plansForTargetDay,
          pastOverdue: overdueTasks 
        })
      });

      const data = await res.json();
      const incomingPlans = data.updatedPlans || data.updatedPlansForToday || data.newPlans;
      
      if (incomingPlans && Array.isArray(incomingPlans)) {
        const normalizedIncoming = incomingPlans.map((p: Plan) => ({ ...p, date: normalizeDate(p.date) }));
        setAllPlans(prev => {
          const updated = [...prev];
          normalizedIncoming.forEach((newP: Plan) => {
            const index = updated.findIndex(oldP => String(oldP.id) === String(newP.id));
            if (index !== -1) updated[index] = { ...updated[index], ...newP };
            else updated.push(newP);
          });
          setHasUnsavedChanges(true); 
          return updated;
        });
      }
    } catch (err) {
      console.error("Помилка фонового перенесення боргів:", err);
    } finally {
      setIsAutoScheduling(false);
    }
  };

  useEffect(() => {
    if (unscheduledTasks.length > 0 && !isAutoScheduling) {
      const tasksByDate = unscheduledTasks.reduce((acc, task) => {
        const d = normalizeDate(task.date);
        if (!acc[d]) acc[d] = [];
        acc[d].push(task);
        return acc;
      }, {} as Record<string, Plan[]>);

      const firstDateToProcess = Object.keys(tasksByDate)[0];
      const tasksForThisDate = tasksByDate[firstDateToProcess];

      const fingerprint = `${firstDateToProcess}-${tasksForThisDate.map(p => p.id).join(',')}`;
      
      if (lastAutoProcessedRef.current !== fingerprint) {
        lastAutoProcessedRef.current = fingerprint;
        triggerAutoScheduling(tasksForThisDate, firstDateToProcess); 
      }
    }
  }, [unscheduledTasks, isAutoScheduling, triggerAutoScheduling]);

  const handleSendMessage = async (customText?: string) => {
    const messageText = customText || inputValue;
    if (!messageText.trim() || isAiLoading) return;

    const userMsgId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setMessages(prev => [...prev, { id: userMsgId, role: "user", text: messageText }]);
    setInputValue("");
    setIsAiLoading(true);

    const targetDateStr = normalizeDate(`${baseDate.getDate()}-${baseDate.getMonth()}-${baseDate.getFullYear()}`);
    const plansForTargetDay = allPlans.filter(p => !p.completed && normalizeDate(p.date) === targetDateStr);
    
    const now = new Date();
    const isToday = targetDateStr === normalizeDate(`${now.getDate()}-${now.getMonth()}-${now.getFullYear()}`);
    const timeToPass = isToday ? now.toLocaleTimeString("uk-UA", { hour: '2-digit', minute: '2-digit' }) : "09:00";

    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: messageText, 
          userId: userData?.id, 
          workSchedule, 
          realTime: timeToPass, 
          realDate: targetDateStr, 
          plansForToday: plansForTargetDay,
          allPlans: allPlans,
          pastOverdue: overdueTasks 
        })
      });

      const data = await res.json();
      setMessages(prev => [...prev, { id: `ai-${Date.now()}`, role: "ai", text: data.reply }]);

     const incomingPlans = data.updatedPlans || data.updatedPlansForToday || data.newPlans;
      if (incomingPlans && Array.isArray(incomingPlans)) {
        const normalizedIncoming = incomingPlans.map((p: Plan) => ({ ...p, date: normalizeDate(p.date) }));
        
        setAllPlans(prev => {
          const updated = [...prev];
          
          normalizedIncoming.forEach((newP: Plan) => {
            if (!newP.id || newP.id === "") {
                newP.id = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            }

            const index = updated.findIndex(oldP => String(oldP.id) === String(newP.id));
            if (index !== -1) {
              updated[index] = { ...updated[index], ...newP };
            } else {
              updated.push(newP);
            }
          });
          
          setHasUnsavedChanges(true); 
          return updated;
        });
      }


    } catch {
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: "ai", text: "Помилка зв'язку з асистентом." }]);
    } finally { setIsAiLoading(false); }
  };

  const handleSavePlansToServer = async () => {
    if (!userData?.id) return;
    setIsSaving(true);
    try {
      const nameKey = userData.name || "user";
      await localforage.setItem(`unimind-plans-${nameKey}`, allPlans);

      const res = await fetch(`${API_URL}/ai/save-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userData.id, plans: allPlans })
      });

      if (res.ok) {
        setHasUnsavedChanges(false);
        setMessages(prev => [...prev, { id: `sys-save-${Date.now()}`, role: "ai", text: "Графік успішно затверджено та перенесено в Календар!" }]);
      }
    } catch {
      alert("Не вдалося підключитися до сервера для синхронізації.");
    } finally { setIsSaving(false); }
  };

  const handleDiscardChanges = async () => {
    const isGuest = (await localforage.getItem("isGuest")) === "true";
    const nameKey = isGuest ? "guest" : (userData?.name || "user");
    
    const savedPlans = await localforage.getItem<Plan[]>(`unimind-plans-${nameKey}`);
    if (savedPlans) {
      setAllPlans(savedPlans.map(p => ({ ...p, date: normalizeDate(p.date) })));
    }
    
    lastAutoProcessedRef.current = ""; 
    setHasUnsavedChanges(false);
    setMessages(prev => [...prev, { id: `sys-discard-${Date.now()}`, role: "ai", text: "↩ Зміни скасовано. Графік повернуто до попереднього стану." }]);
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Очистити всю історію повідомлень з UniMind AI?")) return;
    setMessages([{ id: `ai-init-${Date.now()}`, role: "ai", text: "Історію чату очищено. Готовий до нових завдань! ✨" }]);
    if (!userData?.id) return;
    try {
      await fetch(`${API_URL}/ai/clear-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userData.id })
      });
    } catch { console.error("Не вдалося очистити історію"); }
  };

  const navText = useMemo(() => {
    if (viewMode === "day") return { main: `${baseDate.getDate()} ${monthNames[baseDate.getMonth()]}`, sub: dayNamesFull[baseDate.getDay()] };
    const start = currentWeekDays[0], end = currentWeekDays[6];
    return { main: `${start.getDate()} ${monthNames[start.getMonth()].slice(0,3)} – ${end.getDate()} ${monthNames[end.getMonth()].slice(0,3)}`, sub: "Тиждень" };
  }, [baseDate, viewMode, currentWeekDays]);

  const shiftDate = (direction: -1 | 1) => {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + (direction * (viewMode === "week" ? 7 : 1)));
    setBaseDate(next);
  };

  const getTaskStyle = (timeStart: string, timeEnd: string, isDay: boolean) => {
    const [startH, startM] = timeStart.split(':').map(Number);
    const gridStartH = parseInt(hoursGrid[0]?.split(":")[0] || "8");
    const topPx = (startH - gridStartH) * 60 + startM;
    const [endH, endM] = timeEnd.split(':').map(Number);
    const heightPx = (endH * 60 + endM) - (startH * 60 + startM);
    return { top: `${topPx}px`, height: `${heightPx}px`, position: "absolute" as const, left: isDay ? "15px" : "4px", right: isDay ? "35px" : "4px", zIndex: 10, pointerEvents: "auto" as const };
  };

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case "study": return { icon: <BookOpenText weight="fill" />, colorClass: "cat-study" };
      case "lab": return { icon: <Flask weight="fill" />, colorClass: "cat-lab" };
      case "work": return { icon: <Briefcase weight="fill" />, colorClass: "cat-work" };
      case "wellness": return { icon: <Coffee weight="fill" />, colorClass: "cat-wellness" };
      default: return { icon: <User weight="fill" />, colorClass: "cat-personal" };
    }
  };
 return (
    <div className="planner-container">
      <style>{`
        .cat-study { background: rgba(142, 194, 255, 0.85) !important; box-shadow: inset 4px 0 0 0 #5a9cf8; }
        .cat-lab { background: rgba(162, 161, 255, 0.85) !important; box-shadow: inset 4px 0 0 0 #7d67ff; }
        .cat-work { background: rgba(220, 161, 255, 0.85) !important; box-shadow: inset 4px 0 0 0 #b867ff; }
        .cat-personal { background: rgba(161, 255, 213, 0.85) !important; box-shadow: inset 4px 0 0 0 #2cb464; }
        .cat-wellness { background: rgba(255, 212, 161, 0.85) !important; box-shadow: inset 4px 0 0 0 #ff9900; }
        
        .planner-task-card { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border-radius: 12px; }
        .current-hour-highlight { background: #9675e3; color: white; padding: 4px 10px; border-radius: 12px; font-weight: bold; box-shadow: 0 4px 12px rgba(150, 117, 227, 0.3); }
      `}</style>

      <motion.div className="planner-main" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <div className="planner-header">
          <div className="planner-title-group">
            <h2 className="planner-title">Розумний Planer</h2>
            {hasUnsavedChanges ? (
               <div className="ai-sync-badge" style={{ background: '#fff0db', color: '#e68a00' }}><Sparkle size={16} weight="fill" /><span>Є незбережені зміни</span></div>
            ) : (
               <div className="ai-sync-badge"><Sparkle size={16} weight="fill" /><span>Синхронізовано</span></div>
            )}
          </div>
          <div className="planner-controls">
            <div className="view-toggle-new">
              <button className={`toggle-btn-new ${viewMode === "day" ? "active" : ""}`} onClick={() => setViewMode("day")}><CalendarBlank size={18} /> День</button>
              <button className={`toggle-btn-new ${viewMode === "week" ? "active" : ""}`} onClick={() => setViewMode("week")}><CalendarBlank size={18} /> Тиждень</button>
            </div>
            <div className="date-navigator-new">
              <button className="nav-arrow-new" onClick={() => shiftDate(-1)}><CaretLeft size={20} weight="bold" /></button>
              <div className="current-date-new">
                <span className="date-main">{navText.main}</span>
                <span className="date-sub">{navText.sub}</span>
              </div>
              <button className="nav-arrow-new" onClick={() => shiftDate(1)}><CaretRight size={20} weight="bold" /></button>
            </div>
          </div>
        </div>

       <div className="planner-grid-area">
          <AnimatePresence mode="wait">
            {viewMode === "week" ? (
              <motion.div key="week" className="scrollable-area" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%', overflowY: 'auto' }}>
                <div style={{ position: 'sticky', top: 0, zIndex: 40, display: 'flex', paddingLeft: '55px', paddingTop: '10px', paddingBottom: '5px' }}>
                  {currentWeekDays.map((d: Date, i: number) => (
                    <div key={`wk-hdr-${i}`} style={{ flex: 1, textAlign: 'center', padding: '10px 0', margin: '0 2px', background: d.toDateString() === new Date().toDateString() ? '#885fe7ba' : 'rgba(150, 117, 227, 0.1)', borderRadius: '10px' }}>
                      <span style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: d.toDateString() === new Date().toDateString() ? '#fff' : '#4a3e75' }}>{dayNamesShort[d.getDay()]}</span>
                      <span style={{ fontSize: '11px', color: d.toDateString() === new Date().toDateString() ? '#fff' : '#4a3e75' }}>
                        {d.getDate()} {monthNames[d.getMonth()]}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ position: 'relative' }}>
                  {hoursGrid.map((hour: string) => (
                    <div key={`wk-hr-${hour}`} style={{ height: '60px', display: 'flex', borderTop: '1px solid rgba(150, 117, 227, 0.1)' }}>
                      <div style={{ width: '55px', textAlign: 'right', paddingRight: '10px', fontSize: '12px', color: '#4a3e75', opacity: 0.6 }}>{hour}</div>
                      <div style={{ flex: 1, display: 'flex' }}>
                         {currentWeekDays.map((_, idx: number) => <div key={`wk-cell-${hour}-${idx}`} style={{ flex: 1, borderLeft: '1px solid rgba(150, 117, 227, 0.05)' }}></div>)}
                      </div>
                    </div>
                  ))}
                  <div style={{ position: 'absolute', top: 0, left: '55px', right: 0, bottom: 0, display: 'flex', pointerEvents: 'none' }}>
                    {currentWeekDays.map((dayObj: Date, i: number) => {
                      const dateStr = normalizeDate(`${dayObj.getDate()}-${dayObj.getMonth()}-${dayObj.getFullYear()}`);
                      return (
                        <div key={`wk-col-${i}`} style={{ flex: 1, position: 'relative' }}>
                          {plannerTasks.filter(t => t.dateKey === dateStr).map((task, idx) => (
                            <div 
                              key={`task-week-${task.id || 'temp'}-${idx}-${dateStr}`} 
                              className={`${getCategoryInfo(task.category).colorClass} planner-task-card`} 
                              style={getTaskStyle(task.timeStart, task.timeEnd, false)}
                            >
                              <span style={{ fontSize: '10px', fontWeight: 800, color: '#4a3e75' }}>{task.title}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="day" className="scrollable-area" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%', overflowY: 'auto', position: 'relative', paddingTop: '10px' }}>
                {hoursGrid.map((hour: string) => (
                  <div key={`day-hr-${hour}`} style={{ height: '60px', display: 'flex', borderTop: '1px solid rgba(150, 117, 227, 0.1)' }}>
                    <div style={{ width: '55px', textAlign: 'right', paddingRight: '15px', fontSize: '13px', color: '#4a3e75' }}>
                      {hour === currentHour && baseDate.toDateString() === new Date().toDateString() ? <span className="current-hour-highlight">{hour}</span> : hour}
                    </div>
                    <div style={{ flex: 1 }}></div>
                  </div>
                ))}
                <div style={{ position: 'absolute', top: '10px', left: '55px', right: 0, bottom: 0, pointerEvents: 'none' }}>
                  {plannerTasks.filter(t => t.dateKey === normalizeDate(`${baseDate.getDate()}-${baseDate.getMonth()}-${baseDate.getFullYear()}`)).map((task, idx) => {
                    const currentDayStr = normalizeDate(`${baseDate.getDate()}-${baseDate.getMonth()}-${baseDate.getFullYear()}`);
                    return (
                      <div 
                        key={`task-day-${task.id || 'temp'}-${idx}-${currentDayStr}`} 
                        className={`${getCategoryInfo(task.category).colorClass} day-task-card planner-task-card`} 
                        style={{ ...getTaskStyle(task.timeStart, task.timeEnd, true), display: 'flex', alignItems: 'center', padding: '0 20px', pointerEvents: 'auto' }}
                      >
                        <div style={{ fontSize: '20px', marginRight: '15px' }}>{getCategoryInfo(task.category).icon}</div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 800, fontSize: '15px', color: '#4a3e75' }}>{task.title}</div>
                          <div style={{ fontSize: '12px', opacity: 0.7 }}>{task.timeStart} - {task.timeEnd}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="ai-optimization-bar" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "15px 20px", minHeight: "70px" }}>
          <AnimatePresence>
            {hasUnsavedChanges && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} style={{ display: "flex", gap: "12px" }}>
                <button 
                  onClick={handleDiscardChanges} 
                  disabled={isSaving || isAiLoading || isAutoScheduling}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', color: '#e63946', border: '1px solid rgba(230, 57, 70, 0.3)', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  <ArrowCounterClockwise size={18} weight="bold" /> Скасувати зміни
                </button>
                <button 
                  onClick={handleSavePlansToServer} 
                  disabled={isSaving || isAiLoading || isAutoScheduling}
                  style={{ background: '#9675e3', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(150, 117, 227, 0.4)' }}
                >
                  {isSaving ? "Зберігаю..." : "Зберегти план ☁️"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <motion.div className="planner-sidebar" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
        <div className="sidebar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3>ШІ Асистент</h3>
            <Sparkle size={24} weight="fill" color="#9675e3" className="spin-slow" />
          </div>
          <button 
            onClick={handleClearHistory} 
            title="Очистити історію"
            style={{ background: "none", border: "none", color: "#e05252", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: 600 }}
          >
            <Trash size={16} /> Очистити
          </button>
        </div>
        <div className="sidebar-chat scrollable-area">
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div 
key={`msg-${msg?.id ? msg.id : `temp-${idx}`}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={msg.role === "ai" ? "ai-message-card" : "user-message-card"}>
                {msg.role === "ai" && <div className="ai-message-badge"><Sparkle size={14} weight="fill" /><span>UniMind AI</span></div>}
                <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{msg.text}</p>
              </motion.div>
            ))}
            {isAiLoading && (<div className="ai-typing"><CircleNotch size={24} className="spin-fast" color="#9675e3" /><span>Аналізую...</span></div>)}
            <div ref={chatEndRef} />
          </AnimatePresence>
        </div>
        
        <div className="sidebar-input-area" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {overdueTasks.length > 0 && (
            <div style={{ background: '#fff0db', padding: '12px', borderRadius: '12px', fontSize: '12px', color: '#e68a00', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(230, 138, 0, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <WarningCircle size={18} weight="bold" />
                <span>Протерміновано справ: <strong style={{ fontSize: '14px' }}>{overdueTasks.length}</strong></span>
              </div>
              <button 
                onClick={handleSilentOverdueScheduling}
                disabled={isAiLoading || isAutoScheduling}
                style={{ background: '#e68a00', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}
              >
                {isAutoScheduling ? "Переношу..." : "Перенести розумно"}
              </button>
            </div>
          )}
          <div className="input-box">
            <input 
              type="text" 
              placeholder="Запитай про обід або плани..." 
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)} 
              onKeyDown={e => e.key === "Enter" && handleSendMessage()} 
              disabled={isAiLoading || isAutoScheduling} 
            />
            <button 
              id="ai-send-trigger" 
              className="send-btn" 
              onClick={() => handleSendMessage()} 
              disabled={isAiLoading || isAutoScheduling}
            >
              <PaperPlaneRight size={22} weight="fill" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};