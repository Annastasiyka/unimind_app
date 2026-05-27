import { useState, useEffect, useRef } from "react";
import localforage from "localforage";
import { motion } from "framer-motion";

interface Plan {
  id: number | string;
  text: string;
  completed: boolean;
  date: string;
  type: string;
  time?: string;
  origin?: string;
  taskId?: string;      
  subjectId?: string;   
  maxScore?: number;    
  updatedAt?: number; 
  isDeleted?: boolean; 
}

interface UserData {
  id: number;
  name: string;
  email: string;
}

interface Task {
  id: string;
  name: string;
  type: string;
  status: string;
  score: number | null;
  maxScore: number;
  deadline?: string;
  credits?: number;
}

interface Subject {
  id: string;
  name: string;
  credits: number;
  tasks: Task[];
}

interface Semester {
  id: string;
  name?: string;
  subjects: Subject[];
  isArchived?: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const CalendarPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayPlans, setSelectedDayPlans] = useState<number | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState<"year" | "month">("year");
  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [newPlanText, setNewPlanText] = useState("");
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [planType, setPlanType] = useState("Особисте");
  const [planTime, setPlanTime] = useState("");

  const [editingPlanId, setEditingPlanId] = useState<number | string | null>(null);
  const [editText, setEditText] = useState("");
  const [editType, setEditType] = useState("Особисте");
  const [editTime, setEditTime] = useState("");

  const pickerRef = useRef<HTMLDivElement>(null);
  const categories = ["Особисте", "Навчання", "Лабораторна", "Робота"];
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

 const viewYear = currentDate.getFullYear();
const viewMonth = currentDate.getMonth();
const dateKey = selectedDayPlans !== null ? `${selectedDayPlans}-${viewMonth + 1}-${viewYear}` : "";

const mergePlans = (local: Plan[], server: Plan[]): Plan[] => {
  const mergedMap = new Map<string | number, Plan>();

  local.forEach(plan => mergedMap.set(plan.id, plan));

  server.forEach(serverPlan => {
    const localPlan = mergedMap.get(serverPlan.id);
    if (!localPlan) {
      mergedMap.set(serverPlan.id, serverPlan);
    } else {
      const localTime = localPlan.updatedAt || 0;
      const serverTime = serverPlan.updatedAt || 0;
      if (serverTime > localTime) {
        mergedMap.set(serverPlan.id, serverPlan);
      }
    }
  });

  return Array.from(mergedMap.values());
};

useEffect(() => {
    const initCalendar = async () => {
      const guestStatus = (await localforage.getItem("isGuest")) === "true";
      const storedUser = await localforage.getItem<UserData>("userData");

      setIsGuest(guestStatus);
      setUserData(storedUser);

      const storageKey = guestStatus
        ? "unimind-plans-guest"
        : `unimind-plans-${storedUser?.name || "user"}`;

      let savedPlans = (await localforage.getItem<Plan[]>(storageKey)) || [];

      if (!guestStatus && storedUser?.id && navigator.onLine) {
        try {
          const response = await fetch(`${API_URL}/profile/${storedUser.id}`);
          if (response.ok) {
            const dbData = await response.json();
            if (dbData.plans) {
              savedPlans = mergePlans(savedPlans, dbData.plans);
              await localforage.setItem(storageKey, savedPlans);
            }
          }
        } catch (error) {
          console.error("Помилка завантаження планів з сервера:", error);
        }
      }

      setPlans(savedPlans);
      setTimeout(() => setIsLoading(false), 100);
    };

    initCalendar();

    const handleExternalUpdate = async () => {
      const guestStatus = (await localforage.getItem("isGuest")) === "true";
      const storedUser = await localforage.getItem<UserData>("userData");
      const storageKey = guestStatus
        ? "unimind-plans-guest"
        : `unimind-plans-${storedUser?.name || "user"}`;
        
      const savedPlans = await localforage.getItem<Plan[]>(storageKey);
      if (savedPlans) {
        // Запобігаємо нескінченному циклу: оновлюємо тільки якщо плани РЕАЛЬНО змінилися
        setPlans((currentPlans) => {
          if (JSON.stringify(currentPlans) !== JSON.stringify(savedPlans)) {
            return savedPlans;
          }
          return currentPlans;
        });
      }
    };

    window.addEventListener("plansUpdated", handleExternalUpdate);
    
    // Очищення слухача при закритті сторінки
    return () => {
      window.removeEventListener("plansUpdated", handleExternalUpdate);
    };
  }, []);

 useEffect(() => {
    if (isLoading) return;

    const syncWithStorage = async () => {
      const storageKey = isGuest
        ? "unimind-plans-guest"
        : `unimind-plans-${userData?.name || "user"}`;

      await localforage.setItem(storageKey, plans);

      window.dispatchEvent(new Event("plansUpdated"));

      if (!isGuest && userData?.id) {
        try {
          const semestersKey = `unimind-semesters-${userData.name}`;
          const currentSemesters = (await localforage.getItem(semestersKey)) || [];

          await fetch(`${API_URL}/sync/all`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: userData.id,
              plans: plans,
              semesters: currentSemesters,
            }),
          });
        } catch (error) {
          console.error("Фонова синхронізація не вдалася:", error);
        }
      }
    };

    const timeoutId = setTimeout(syncWithStorage, 1000);
    return () => clearTimeout(timeoutId);
  }, [plans, isGuest, userData, isLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
        setPickerStep("year");
      }
    };
    if (isPickerOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPickerOpen]);

  const getCategoryClass = (type: string) => {
    switch (type) {
      case "Навчання": return "cat-study";
      case "Лабораторна": return "cat-lab";
      case "Робота": return "cat-work";
      default: return "cat-personal";
    }
  };

const dayPlans = plans
    .filter((p) => p.date === dateKey && !p.isDeleted) 
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.time && b.time) return a.time.localeCompare(b.time);
      return 0;
    });

const addPlan = () => {
    if (!newPlanText.trim()) return;
    const plan: Plan = {
      id: Date.now(),
      text: newPlanText,
      completed: false,
      date: dateKey,
      type: planType,
      time: planTime || undefined,
      updatedAt: Date.now(),
    };
    setPlans([...plans, plan]);
    setNewPlanText("");
    setPlanTime("");
    setIsAddingPlan(false);

    window.dispatchEvent(new CustomEvent("unimind-data-changed", { detail: { id: plan.id.toString() } }));
  };

  const startEditing = (plan: Plan) => {
    setEditingPlanId(plan.id);
    setEditText(plan.text);
    setEditType(plan.type);
    setEditTime(plan.time || "");
  };

  const saveEdit = (id: number | string) => {
    setPlans(
      plans.map((p) =>
        p.id === id ? { ...p, text: editText, type: editType, time: editTime, updatedAt: Date.now() } : p, 
      ),
    );
    setEditingPlanId(null);
  };

 const togglePlan = async (id: number | string) => {
    const planToToggle = plans.find((p) => p.id === id);
    if (!planToToggle) return;

    const newCompleted = !planToToggle.completed;
    
    // 1. Оновлюємо стан для Календаря
    const updatedPlans = plans.map((p) => (p.id === id ? { ...p, completed: newCompleted, updatedAt: Date.now() } : p));
    setPlans(updatedPlans);

    // 2. МИТТЄВЕ ЗБЕРЕЖЕННЯ В БАЗУ (щоб Планер відразу це побачив)
    try {
      const guestStatus = (await localforage.getItem("isGuest")) === "true";
      const storedUser = await localforage.getItem<UserData>("userData");
      const storageKey = guestStatus ? "unimind-plans-guest" : `unimind-plans-${storedUser?.name || "user"}`;
      
      await localforage.setItem(storageKey, updatedPlans);
      window.dispatchEvent(new Event("plansUpdated"));
    } catch (err) {
      console.error("Помилка миттєвого збереження планів:", err);
    }

    // 3. Синхронізація з Семестром
    if (planToToggle.origin === "semester" && planToToggle.taskId && planToToggle.subjectId) {
      try {
        const guestStatus = (await localforage.getItem("isGuest")) === "true";
        const storedUser = await localforage.getItem<UserData>("userData");
        const semestersKey = guestStatus ? "unimind-semesters-guest" : `unimind-semesters-${storedUser?.name || "user"}`;
        
        const semesters: Semester[] = (await localforage.getItem(semestersKey)) || [];
        let isChanged = false;

        const updatedSemesters = semesters.map(sem => ({
          ...sem,
          subjects: sem.subjects.map(subj => {
            if (subj.id === planToToggle.subjectId) {
              return {
                ...subj,
                tasks: subj.tasks.map(task => {
                  if (task.id === planToToggle.taskId) {
                    isChanged = true;
                    
                    let calculatedScore = planToToggle.maxScore || task.maxScore || 0;
                    
                    if (task.deadline) {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const taskDeadline = new Date(task.deadline);
                      taskDeadline.setHours(0, 0, 0, 0);
                      
                      if (today > taskDeadline) {
                        calculatedScore = calculatedScore / 2;
                      }
                    }

                    const isScoreEmpty = task.score === null || (task.score as unknown) === "";
                    
                    const newScore = newCompleted 
                      ? (!isScoreEmpty ? task.score : calculatedScore)
                      : null;
                      
                    return {
                      ...task,
                      score: newScore,
                      status: newCompleted ? "Здано" : (task.deadline ? "Має дедлайн" : "В процесі")
                    };
                  }
                  return task;
                })
              };
            }
            return subj;
          })
        }));

        if (isChanged) {
          await localforage.setItem(semestersKey, updatedSemesters);
          window.dispatchEvent(new Event("semestersUpdated")); // Кричимо семестру оновитися
        }
      } catch (err) {
        console.error("Помилка синхронізації оцінки з семестром:", err);
      }
    }
  };

  const deletePlan = async (id: number | string) => {
    const planToDelete = plans.find((p) => p.id === id);
    if (!planToDelete) return;

    // М'яке видалення
    const updatedPlans = plans.map(p => p.id === id ? { ...p, isDeleted: true, updatedAt: Date.now() } : p);
    setPlans(updatedPlans);

    // МИТТЄВЕ ЗБЕРЕЖЕННЯ В БАЗУ
    try {
      const guestStatus = (await localforage.getItem("isGuest")) === "true";
      const storedUser = await localforage.getItem<UserData>("userData");
      const storageKey = guestStatus ? "unimind-plans-guest" : `unimind-plans-${storedUser?.name || "user"}`;
      await localforage.setItem(storageKey, updatedPlans);
      window.dispatchEvent(new Event("plansUpdated"));
    } catch (err) {
      console.error("Помилка збереження при видаленні:", err);
    }

    if (planToDelete.origin === "semester" && planToDelete.taskId && planToDelete.subjectId) {
      try {
        const guestStatus = (await localforage.getItem("isGuest")) === "true";
        const storedUser = await localforage.getItem<UserData>("userData");
        const semestersKey = guestStatus ? "unimind-semesters-guest" : `unimind-semesters-${storedUser?.name || "user"}`;

        const semesters: Semester[] = (await localforage.getItem(semestersKey)) || [];
        let isChanged = false;

        const updatedSemesters = semesters.map((sem) => ({
          ...sem,
          subjects: sem.subjects.map((subj) => {
            if (subj.id === planToDelete.subjectId) {
              return {
                ...subj,
                tasks: subj.tasks.map((task) => {
                  if (task.id === planToDelete.taskId) {
                    isChanged = true;
                    return {
                      ...task,
                      score: null, 
                      status: task.deadline ? "Має дедлайн" : "В процесі" 
                    };
                  }
                  return task;
                })
              };
            }
            return subj;
          })
        }));

        if (isChanged) {
          await localforage.setItem(semestersKey, updatedSemesters);
          window.dispatchEvent(new Event("semestersUpdated"));
        }
      } catch (err) {
        console.error("Помилка при скиданні зв'язаного завдання з семестру:", err);
      }
    }
  };

  const monthLabel = new Intl.DateTimeFormat("uk-UA", { month: "long" }).format(currentDate);
  const allMonths = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat("uk-UA", { month: "long" }).format(new Date(2026, i, 1))
  );

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  let firstDayIndex = new Date(viewYear, viewMonth, 1).getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6;
  const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

  const changeMonth = (offset: number) => setCurrentDate(new Date(viewYear, viewMonth + offset, 1));

  const handleYearClick = (year: number) => {
    setTempYear(year);
    setPickerStep("month");
  };

  const handleMonthClick = (monthIdx: number) => {
    setCurrentDate(new Date(tempYear, monthIdx, 1));
    setIsPickerOpen(false);
    setPickerStep("year");
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      viewMonth === today.getMonth() &&
      viewYear === today.getFullYear()
    );
  };
  
  if (isLoading)
    return <div className="calendar-page" style={{ opacity: 0 }} />;

  return (
    <motion.div
      className="calendar-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="Calendar-message">
        <p>Твій простір подій</p>
      </div>

      <div className="calendar-layout">
        <aside className="calendar-sidebar">
          {isGuest && (
            <div className="card-glass">
              <div className="status-info">
                <p>
                  Ви переглядаєте календар як гість. Увійдіть у профіль, щоб
                  ваші плани були закріплені за акаунтом.
                </p>
              </div>
            </div>
          )}
        </aside>

        <main
          className="calendar-body card-glass"
          style={{ padding: "20px", position: "relative" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <button className="calendar-date" onClick={() => changeMonth(-1)}>
              ‹
            </button>
            <h2
              className="month"
              onClick={() => setIsPickerOpen(!isPickerOpen)}
            >
              {monthLabel} {viewYear}
            </h2>
            <button className="calendar-date" onClick={() => changeMonth(1)}>
              ›
            </button>
          </div>

          {isPickerOpen && (
            <div ref={pickerRef} className="card-glass calendar-picker-modal">
              <p className="picker-step-title">
                {pickerStep === "year"
                  ? "Оберіть рік"
                  : `Оберіть місяць ${tempYear}`}
              </p>
              {pickerStep === "year" ? (
                <div className="picker-step-content year-selection">
                  <div className="year-search-container">
                    <input
                      type="number"
                      className="year-input-manual"
                      placeholder="Введіть рік..."
                      value={tempYear || ""}
                      onChange={(e) => setTempYear(Number(e.target.value))}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleYearClick(tempYear)
                      }
                    />
                    <span
                      className="search-icon"
                      onClick={() => handleYearClick(tempYear)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </span>
                  </div>
                  <div className="year-grid">
                    {Array.from(
                      { length: 6 },
                      (_, i) => new Date().getFullYear() + i,
                    ).map((y) => (
                      <div
                        key={`yr-${y}`}
                        className={`year-item ${tempYear === y ? "active" : ""}`}
                        onClick={() => handleYearClick(y)}
                      >
                        {y}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="month-selection-container">
                  <div className="month-grid">
                    {allMonths.map((m, idx) => (
                      <div
                        key={`m-${idx}`}
                        className={`month-item ${idx === viewMonth && tempYear === viewYear ? "current" : ""}`}
                        onClick={() => handleMonthClick(idx)}
                      >
                        {m}
                      </div>
                    ))}
                  </div>
                  <button
                    className="return-to-choose-year-btn"
                    onClick={() => setPickerStep("year")}
                  >
                    ← Повернутися
                  </button>
                </div>
              )}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "10px",
            }}
          >
            {weekDays.map((day) => (
              <div className="week" key={`wday-${day}`}>
                {day}
              </div>
            ))}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} style={{ height: "100px" }}></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
             const dayNumber = i + 1;
const dateStr = `${dayNumber}-${viewMonth + 1}-${viewYear}`;
              const plansForThisDay = plans
                .filter((p) => p.date === dateStr && !p.completed && !p.isDeleted) 
                .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

              return (
                <div
                  key={`day-${dayNumber}`}
                  className={`calendar-day ${isToday(dayNumber) ? "selected" : ""}`}
                  onClick={() => setSelectedDayPlans(dayNumber)}
                >
                  <span className="day-number">{dayNumber}</span>
                  {plansForThisDay.length > 0 && (
                    <div className="mini-plans-grid">
                      {plansForThisDay.slice(0, 3).map((plan, idx) => (
                        <div
                          key={`mini-${plan.id || idx}`}
                          className={`mini-plan-item ${getCategoryClass(plan.type)}`}
                        >
                          <span className="mini-plan-text">{plan.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {plansForThisDay.length > 3 && (
                    <div className="more-plans-count">
                      + {plansForThisDay.length - 3}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {selectedDayPlans !== null && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedDayPlans(null)}
        >
          <div
            className="card-glass plans-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="plans-header">
              <h3>
                Плани на {selectedDayPlans} {monthLabel}
              </h3>
              <button
                className={`add-action-btn ${isAddingPlan ? "active" : ""}`}
                onClick={() => setIsAddingPlan(!isAddingPlan)}
              >
                {isAddingPlan ? "×" : "+"}
              </button>
            </header>

            <div className="plans-list-container">
              {dayPlans.length > 0
                ? dayPlans.map((plan, idx) =>
                    editingPlanId === plan.id ? (
                      <div
                        key={`edit-${plan.id || idx}`}
                        className="edit-plan-inline-block"
                      >
                        <textarea
                          className="plans-textarea"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          autoFocus
                        ></textarea>
                        <div
                          className="plan-controls-grid"
                          style={{
                            marginTop: "12px",
                            display: "flex",
                            gap: "10px",
                          }}
                        >
                          <div
                            className="control-group-interactive"
                            onClick={() =>
                              setActiveDropdown(
                                activeDropdown === "edit-time"
                                  ? null
                                  : "edit-time",
                              )
                            }
                          >
                            <label>Час :</label>
                            <div className="custom-select-trigger">
                              <span>{editTime || "-- : --"}</span>
                              <span
                                className={`arrow ${activeDropdown === "edit-time" ? "up" : ""}`}
                              >
                                ▾
                              </span>
                            </div>
                            {activeDropdown === "edit-time" && (
                              <div
                                className="time-picker-popup downwards"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="time-columns-container">
                                  <div className="time-column">
                                    <p className="column-label">Години</p>
                                    {hours.map((h) => (
                                      <div
                                        key={`h-${h}`}
                                        className={`time-opt ${editTime.split(":")[0] === h ? "active" : ""}`}
                                        onClick={() =>
                                          setEditTime(
                                            `${h}:${editTime.split(":")[1] || "00"}`,
                                          )
                                        }
                                      >
                                        {h}
                                      </div>
                                    ))}
                                  </div>
                                  <div className="time-column">
                                    <p className="column-label">Хвилини</p>
                                    {minutes.map((m) => (
                                      <div
                                        key={`m-${m}`}
                                        className={`time-opt ${editTime.split(":")[1] === m ? "active" : ""}`}
                                        onClick={() =>
                                          setEditTime(
                                            `${editTime.split(":")[0] || "12"}:${m}`,
                                          )
                                        }
                                      >
                                        {m}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="time-done-btn"
                                  onClick={() => setActiveDropdown(null)}
                                >
                                  Готово
                                </button>
                              </div>
                            )}
                          </div>
                          <div
                            className="control-group-interactive"
                            onClick={() =>
                              setActiveDropdown(
                                activeDropdown === "edit-category"
                                  ? null
                                  : "edit-category",
                              )
                            }
                          >
                            <label>Тип :</label>
                            <div className="custom-select-trigger">
                              <span>{editType}</span>
                              <span
                                className={`arrow ${activeDropdown === "edit-category" ? "up" : ""}`}
                              >
                                ▾
                              </span>
                            </div>
                            {activeDropdown === "edit-category" && (
                              <ul
                                className="custom-dropdown-list downwards"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {categories.map((cat, i) => (
                                  <li
                                    key={`cat-${cat}-${i}`}
                                    onClick={() => {
                                      setEditType(cat);
                                      setActiveDropdown(null);
                                    }}
                                    className={editType === cat ? "active" : ""}
                                  >
                                    {cat}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="edit-actions">
                            <button
                              className="delete-btn-inline"
                              onClick={() => deletePlan(plan.id)}
                            >
                              Видалити
                            </button>
                            <button
                              className="save-plans-btn-refined"
                              onClick={() => saveEdit(plan.id)}
                            >
                              OK
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={`plan-${plan.id || idx}`}
                        className={`plan-item-row ${getCategoryClass(plan.type)} ${plan.completed ? "is-done" : ""}`}
                      >
                        <div
                          className="custom-checkbox"
                          onClick={() => togglePlan(plan.id)}
                        >
                          {plan.completed && "✓"}
                        </div>
                        <div className="plan-display-text">
                          {plan.time && (
                            <span className="plan-time-display">
                              {plan.time}
                            </span>
                          )}
                          <p className="plan-text-content">{plan.text}</p>
                        </div>
                        <div className="plan-actions">
                          <button
                            className="edit-dots-btn"
                            onClick={() => startEditing(plan)}
                          >
                            ⋮
                          </button>
                        </div>
                      </div>
                    ),
                  )
                : !isAddingPlan && (
                    <div className="empty-state-wrapper">
                      <p className="empty-plans-hint">
                        Планів ще немає. Додайте перший!
                      </p>
                    </div>
                  )}
            </div>

            {isAddingPlan && (
              <div className="add-plan-block">
                <textarea
                  className="plans-textarea"
                  placeholder="Що саме плануєте зробити?"
                  value={newPlanText}
                  onChange={(e) => setNewPlanText(e.target.value)}
                  autoFocus
                ></textarea>
                <div
                  className="plan-controls-grid"
                  style={{ display: "flex", gap: "12px" }}
                >
                  <div
                    className="control-group-interactive"
                    onClick={() =>
                      setActiveDropdown(
                        activeDropdown === "add-time" ? null : "add-time",
                      )
                    }
                  >
                    <label>Час :</label>
                    <div className="custom-select-trigger">
                      <span>{planTime || "-- : --"}</span>
                      <span
                        className={`arrow ${activeDropdown === "add-time" ? "up" : ""}`}
                      >
                        ▾
                      </span>
                    </div>
                    {activeDropdown === "add-time" && (
                      <div
                        className="time-picker-popup"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="time-columns-container">
                          <div className="time-column">
                            <p className="column-label">Години</p>
                            {hours.map((h) => (
                              <div
                                key={`add-h-${h}`}
                                className={`time-opt ${planTime.split(":")[0] === h ? "active" : ""}`}
                                onClick={() =>
                                  setPlanTime(
                                    `${h}:${planTime.split(":")[1] || "00"}`,
                                  )
                                }
                              >
                                {h}
                              </div>
                            ))}
                          </div>
                          <div className="time-column">
                            <p className="column-label">Хвилини</p>
                            {minutes.map((m) => (
                              <div
                                key={`add-m-${m}`}
                                className={`time-opt ${planTime.split(":")[1] === m ? "active" : ""}`}
                                onClick={() =>
                                  setPlanTime(
                                    `${planTime.split(":")[0] || "12"}:${m}`,
                                  )
                                }
                              >
                                {m}
                              </div>
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="time-done-btn"
                          onClick={() => setActiveDropdown(null)}
                        >
                          Готово
                        </button>
                      </div>
                    )}
                  </div>
                  <div
                    className="control-group-interactive"
                    onClick={() =>
                      setActiveDropdown(
                        activeDropdown === "add-category"
                          ? null
                          : "add-category",
                      )
                    }
                  >
                    <label>Категорія :</label>
                    <div className="custom-select-trigger">
                      <span>{planType}</span>
                      <span
                        className={`arrow ${activeDropdown === "add-category" ? "up" : ""}`}
                      >
                        ▾
                      </span>
                    </div>
                    {activeDropdown === "add-category" && (
                      <ul
                        className="custom-dropdown-list upwards"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {categories.map((cat, i) => (
                          <li
                            key={`add-cat-${cat}-${i}`}
                            onClick={() => {
                              setPlanType(cat);
                              setActiveDropdown(null);
                            }}
                            className={planType === cat ? "active" : ""}
                          >
                            {cat}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    type="button"
                    className="save-plans-btn-refined"
                    onClick={addPlan}
                  >
                    Зберегти
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
