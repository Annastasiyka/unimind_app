import { useState, useEffect, useRef, useMemo } from "react";
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
  User
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
}

interface UserData { id: number; name: string; email: string; }
interface ChatMessage { id: string; role: "user" | "ai"; text: string; }

interface PlannerTask {
  id: string;
  title: string;
  timeStart: string;
  timeEnd: string;
  category: "study" | "lab" | "work" | "personal";
  dateKey: string; 
}

interface WorkSchedule {
  times: Record<string, string>;
  days: Record<string, boolean>;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const AIPlanerPage = () => {
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [baseDate, setBaseDate] = useState(new Date());
  const [currentHour, setCurrentHour] = useState("");
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "1", role: "ai", text: "Привіт! Я твій AI-асистент UniMind. Твої плани синхронізовані. Чим можу допомогти? ✨" }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initPlanner = async () => {
      const storedUser = await localforage.getItem<UserData>("userData");
      setUserData(storedUser);
      const isGuest = (await localforage.getItem("isGuest")) === "true";
      const nameKey = isGuest ? "Гість" : (storedUser?.name || "user");

      let fetchedWorkSchedule: WorkSchedule | null = null;
      let fetchedPlans: Plan[] = [];

      if (!isGuest && storedUser?.id) {
        try {
          const response = await fetch(`${API_URL}/profile/${storedUser.id}`);
          const dbData = await response.json();
          if (response.ok && dbData) {
            if (dbData.workSchedule) {
              fetchedWorkSchedule = dbData.workSchedule;
              setWorkSchedule(dbData.workSchedule);
            }
            if (dbData.plans) {
              fetchedPlans = dbData.plans;
              setAllPlans(dbData.plans);
            }
          }
        } catch { console.log("Офлайн режим"); }
      }

      if (!fetchedWorkSchedule) {
        const localTimes = await localforage.getItem<Record<string, string>>(`unimind-work-times-${nameKey}`);
        const localDays = await localforage.getItem<Record<string, boolean>>(`unimind-active-days-${nameKey}`);
        if (localTimes && localDays) setWorkSchedule({ times: localTimes, days: localDays });
      }
      
      if (fetchedPlans.length === 0) {
        const plansKey = isGuest ? "unimind-plans-guest" : `unimind-plans-${nameKey}`;
        const localPlans = await localforage.getItem<Plan[]>(plansKey) || [];
        setAllPlans(localPlans);
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
    const startOfWeek = new Date(baseDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(startOfWeek);
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
    const mapCat = (t: string): "study" | "lab" | "work" | "personal" => {
      if (t === "Навчання") return "study";
      if (t === "Лабораторна") return "lab";
      if (t === "Робота") return "work";
      return "personal";
    };
    return allPlans.filter(p => p.time).map(p => {
      const [h, m] = (p.time as string).split(':').map(Number);
      const dur = p.type === "Навчання" ? 90 : 60;
      const total = h * 60 + m + dur;
      return {
        id: String(p.id),
        title: p.text,
        timeStart: p.time as string,
        timeEnd: `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`,
        category: mapCat(p.type),
        dateKey: p.date 
      };
    });
  }, [allPlans]);

  const getTaskStyle = (timeStart: string, timeEnd: string, isDay: boolean) => {
    const [startH, startM] = timeStart.split(':').map(Number);
    const [endH, endM] = timeEnd.split(':').map(Number);
    const gridStartH = parseInt(hoursGrid[0].split(":")[0]);
    const topPx = (startH - gridStartH) * 60 + startM;
    const heightPx = (endH * 60 + endM) - (startH * 60 + startM);
    
    return {
      top: `${topPx}px`, 
      height: `${heightPx}px`, 
      position: "absolute" as const,
      left: isDay ? "15px" : "6px", 
      right: isDay ? "35px" : "6px",
      zIndex: 10,
      pointerEvents: "auto" as const
    };
  };

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case "study": return { icon: <BookOpenText weight="fill" />, colorClass: "cat-study" };
      case "lab": return { icon: <Flask weight="fill" />, colorClass: "cat-lab" };
      case "work": return { icon: <Briefcase weight="fill" />, colorClass: "cat-work" };
      default: return { icon: <User weight="fill" />, colorClass: "cat-personal" };
    }
  };

  const shiftDate = (direction: -1 | 1) => {
    const days = viewMode === "week" ? 7 : 1;
    const next = new Date(baseDate);
    next.setDate(next.getDate() + (direction * days));
    setBaseDate(next);
  };

const handleSendMessage = async () => {
  if (!inputValue.trim() || isAiLoading) return;
  
  // Використовуємо більш надійний генератор ID для повідомлень
  const userMsgId = `user-${Date.now()}`;
  const userMsg: ChatMessage = { id: userMsgId, role: "user", text: inputValue };
  
  setMessages(prev => [...prev, userMsg]);
  setInputValue("");
  setIsAiLoading(true);

  try {
    const res = await fetch(`${API_URL}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: userMsg.text, 
        userId: userData?.id, 
        workSchedule 
      })
    });

    if (!res.ok) throw new Error("Server error");

    const data = await res.json();
    
    // Додаємо відповідь AI з унікальним ID
    setMessages(prev => [...prev, { 
      id: `ai-${Date.now()}`, 
      role: "ai", 
      text: data.reply 
    }]);

    if (data.newPlan) {
      // Оновлюємо стейт планів, щоб вони з'явилися на сітці
      setAllPlans(prev => [...prev, data.newPlan]);
    }

  } catch {
    setMessages(prev => [...prev, { 
      id: `err-${Date.now()}`, 
      role: "ai", 
      text: "Помилка зв'язку з сервером. Перевір, чи задеплоєно бекенд! " 
    }]);
  } finally {
    setIsAiLoading(false);
  }
};

  const navText = useMemo(() => {
    if (viewMode === "day") {
      return { main: `${baseDate.getDate()} ${monthNames[baseDate.getMonth()]} ${baseDate.getFullYear()}`, sub: dayNamesFull[baseDate.getDay()] };
    } else {
      const start = currentWeekDays[0], end = currentWeekDays[6];
      if (start.getMonth() === end.getMonth()) {
        return { main: `${start.getDate()} ${monthNames[start.getMonth()]} – ${end.getDate()} ${monthNames[end.getMonth()]}`, sub: "7 днів" };
      }
      return { main: `${start.getDate()} ${monthNames[start.getMonth()].slice(0,3)} – ${end.getDate()} ${monthNames[end.getMonth()].slice(0,3)}`, sub: "7 днів" };
    }
  }, [baseDate, viewMode, currentWeekDays]);

  return (
    <div className="planner-container">
      <style>{`
        /* СИМЕТРИЧНІ КАТЕГОРІЇ ЧЕРЕЗ ТІНЬ */
        .cat-study { background: rgba(142, 194, 255, 0.85) !important; box-shadow: inset 4px 0 0 0 #5a9cf8; }
        .cat-lab { background: rgba(162, 161, 255, 0.85) !important; box-shadow: inset 4px 0 0 0 #7d67ff; }
        .cat-work { background: rgba(220, 161, 255, 0.85) !important; box-shadow: inset 4px 0 0 0 #b867ff; }
        .cat-personal { background: rgba(161, 255, 213, 0.85) !important; box-shadow: inset 4px 0 0 0 #2cb464; }

        .out-of-work { background: rgba(0,0,0,0.02); opacity: 0.5; }

        /* ТИЖНЕВА КАРТКА - РУЧНЕ СИМЕТРИЧНЕ РОЗШИРЕННЯ */
        .planner-task-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          cursor: pointer;
          width: auto;
        }

        .planner-task-card:hover {
          /* Вручну розширюємо межі в обидва боки */
          left: -15px !important; 
          right: -15px !important;
          height: auto !important;
          min-height: fit-content;
          z-index: 1000 !important;
          padding: 10px !important;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          transform: none !important; /* Прибираємо scale, щоб текст був чітким */
        }

        /* ДЕННА КАРТКА - РУХ БЕЗ ЗМІНИ КОЛЬОРУ */
        .day-task-card {
          transition: transform 0.4s ease;
        }
        .day-task-card:hover {
          transform: translateX(15px); /* Плавний рух */
          z-index: 50 !important;
        }

        .task-title-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1;
          width: 100%;
        }

        .task-detailed-time {
          max-height: 0;
          opacity: 0;
          font-size: 11px;
          transition: all 0.3s ease;
          font-weight: 700;
          color: #4a3e75;
        }

        .planner-task-card:hover .task-detailed-time {
          max-height: 20px;
          opacity: 1;
          margin-top: 4px;
        }
      `}</style>

      <motion.div className="planner-main" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <div className="planner-header">
          <div className="planner-title-group">
            <h2 className="planner-title">Розумний Планувальник</h2>
            <div className="ai-sync-badge"><Sparkle size={16} weight="fill" /><span>Синхронізовано</span></div>
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
                <span className="date-sub"><CalendarBlank size={14} /> {navText.sub}</span>
              </div>
              <button className="nav-arrow-new" onClick={() => shiftDate(1)}><CaretRight size={20} weight="bold" /></button>
            </div>
          </div>
        </div>

        <div className="planner-grid-area">
          <AnimatePresence mode="wait">
            {viewMode === "week" ? (
              <motion.div key="week" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <div className="scrollable-area" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                  <div style={{ position: 'sticky', top: 0, zIndex: 40, display: 'flex', paddingLeft: '55px', paddingBottom: '3px', paddingTop: '5px', background: 'transparent' }}>
                    {currentWeekDays.map((d, i) => {
                      const isToday = d.toDateString() === new Date().toDateString();
                      return (
                        <div key={i} style={{ 
                          flex: 1, textAlign: 'center', padding: '10px 0', margin: '0 4px',
                          background: isToday ? '#885fe7ba' : 'rgba(150, 117, 227, 0.2)', 
                          borderRadius: '12px', border: isToday ? '1px solid transparent' : '1px solid rgba(74, 62, 117, 0.2)',
                          boxShadow: isToday ? '0 4px 12px rgba(123, 90, 184, 0.3)' : 'none',
                          transition: 'all 0.3s ease'
                        }}>
                          <span style={{ display: 'block', fontSize: '15px', fontWeight: 800, color: isToday ? '#fff' : '#4a3e75' }}>{dayNamesShort[d.getDay()]}</span>
                          <span style={{ fontSize: '12px', fontWeight: 500, color: isToday ? 'rgba(255,255,255,0.8)' : 'rgba(74, 62, 117, 0.6)' }}>{d.getDate()} {monthNames[d.getMonth()].slice(0, 3)}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ position: 'relative', paddingTop: '10px' }}>
                    {hoursGrid.map((hour) => (
                      <div key={hour} style={{ height: '60px', boxSizing: 'border-box', display: 'flex' }}>
                        <div style={{ width: '55px', textAlign: 'right', paddingRight: '12px', transform: 'translateY(-9px)', fontSize: '13px', color: '#4a3e75', opacity: 0.6, fontWeight: 500 }}>{hour}</div>
                        <div style={{ flex: 1, display: 'flex', borderTop: '1px solid rgba(255,255,255,0.3)' }}>
                          {currentWeekDays.map((_, i) => (<div key={i} style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.3)' }}></div>))}
                        </div>
                      </div>
                    ))}

                    <div style={{ position: 'absolute', top: '10px', left: '55px', right: 0, bottom: 0, display: 'flex', pointerEvents: 'none' }}>
                      {currentWeekDays.map((dayObj, i) => {
                        const dateStr = `${dayObj.getDate()}-${dayObj.getMonth()}-${dayObj.getFullYear()}`;
                        const tasksForDay = plannerTasks.filter(t => t.dateKey === dateStr);
                        return (
                          <div key={i} style={{ flex: 1, position: 'relative', height: '100%' }}>
                            {tasksForDay.map(task => (
                              <div key={task.id} className={`${getCategoryInfo(task.category).colorClass} planner-task-card`} style={getTaskStyle(task.timeStart, task.timeEnd, false)}>
                                <div style={{ opacity: 0.8, color: '#4a3e75' }}>{getCategoryInfo(task.category).icon}</div>
                                <div className="task-title-container">
                                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#4a3e75', wordBreak: 'break-word' }}>{task.title}</span>
                                </div>
                                <div className="task-detailed-time">{task.timeStart} — {task.timeEnd}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="day" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="scrollable-area" style={{ flex: 1, overflowY: 'auto', position: 'relative', paddingTop: '15px' }}>
                  {hoursGrid.map((hour) => {
                    const isNow = hour === currentHour && baseDate.toDateString() === new Date().toDateString(); 
                    const dayName = ukDaysMap[baseDate.getDay()];
                    const isNonWork = workSchedule && (!workSchedule.days[dayName] || hour < (workSchedule.times[`${dayName}-from`] || "00:00") || hour > (workSchedule.times[`${dayName}-to`] || "23:59"));
                    return (
                      <div key={hour} className={isNonWork ? 'out-of-work' : ''} style={{ height: '60px', display: 'flex' }}>
                        <div style={{ width: '55px', textAlign: 'right', paddingRight: '12px', transform: 'translateY(-9px)', fontSize: '13px', color: '#4a3e75', opacity: 0.6, fontWeight: 500 }}>
                          {isNow ? <span style={{ background: '#9675e3', color: 'white', padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold' }}>{hour}</span> : hour}
                        </div>
                        <div style={{ flex: 1, borderTop: '1px solid rgba(255,255,255,0.3)' }}></div>
                      </div>
                    );
                  })}
                  <div style={{ position: 'absolute', top: '15px', left: '55px', right: 0, bottom: 0, pointerEvents: 'none' }}>
                    {plannerTasks.filter(t => t.dateKey === `${baseDate.getDate()}-${baseDate.getMonth()}-${baseDate.getFullYear()}`).map(task => (
                      <div key={task.id} className={`${getCategoryInfo(task.category).colorClass} day-task-card`} 
                           style={{ ...getTaskStyle(task.timeStart, task.timeEnd, true), display: 'flex', alignItems: 'center', padding: '0 30px', borderRadius: '12px', pointerEvents: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%' }}>
                          <div style={{ opacity: 0.8, color: '#4a3e75', fontSize: '22px' }}>{getCategoryInfo(task.category).icon}</div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 800, fontSize: '16px', color: '#4a3e75' }}>{task.title}</span>
                            <span style={{ fontSize: '13px', opacity: 0.7, color: '#4a3e75', fontWeight: 600 }}>{task.timeStart} - {task.timeEnd}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="ai-optimization-bar">
          <div className="ai-opt-left">
            <Sparkle size={28} weight="fill" color="#c1f9ff" />
            <div><h4>AI-Оптимізація</h4><p>План збалансований. Твій розклад виглядає продуктивним.</p></div>
          </div>
          <button className="details-btn">Детальніше &gt;</button>
        </div>
      </motion.div>

      <motion.div className="planner-sidebar" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <div className="sidebar-header"><h3>AI Асистент</h3><Sparkle size={24} weight="fill" color="#9675e3" className="spin-slow" /></div>
        <div className="sidebar-chat scrollable-area">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={msg.role === "ai" ? "ai-message-card" : "user-message-card"}>
                {msg.role === "ai" ? (<><div className="ai-message-badge"><Sparkle size={14} weight="fill" /><span>UniMind AI</span></div><p className="ai-main-text" style={{ whiteSpace: "pre-wrap", margin: 0 }}>{msg.text}</p></>) : (<p className="user-text" style={{ margin: 0 }}>{msg.text}</p>)}
              </motion.div>
            ))}
            {isAiLoading && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ai-typing"><CircleNotch size={24} color="#9675e3" className="spin-fast" /><span>Аналізую запит...</span></motion.div>)}
            <div ref={chatEndRef} />
          </AnimatePresence>
        </div>
        <div className="sidebar-input-area">
          <div className="input-box">
            <input type="text" placeholder="Скажи, що змінити..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSendMessage()} disabled={isAiLoading} />
            <button className="send-btn" onClick={handleSendMessage} disabled={isAiLoading || !inputValue.trim()}><PaperPlaneRight size={22} weight="fill" /></button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};