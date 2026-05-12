import { useState, useCallback, useEffect} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpenText,
  Flask,
  Calculator,
  FileText,
  Plus,
  CaretDown,
  WarningCircle,
  PencilSimple,
  Trash,
  House,
  Notebook,
  UserFocus,
  Presentation,
  ArrowLeft,
} from "@phosphor-icons/react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { uk } from "date-fns/locale/uk";

registerLocale("uk", uk);

// --- КОНСТАНТА API ---
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface DashboardProps {
  semesterId: string | null;
  setCurrentScreen: (screen: string) => void;
}

type TaskStatus = "Здано" | "В процесі" | "Має дедлайн";
type TaskType =
  | "Лабораторні"
  | "Розрахункові роботи"
  | "Курсова робота"
  | "КР"
  | "ДЗ"
  | "Індивідуальна робота"
  | "Проект";

interface Task {
  id: string;
  name: string;
  type: TaskType;
  status: TaskStatus;
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
  subjects: Subject[];
}

const determineStatus = (
  deadline?: string,
  score?: number | null,
): TaskStatus => {
  if (score !== null && score !== undefined) return "Здано";
  if (!deadline) return "В процесі";
  return "Має дедлайн";
};

const getStatusClass = (status: TaskStatus) => {
  switch (status) {
    case "Здано":
      return "completed";
    case "В процесі":
      return "in-progress";
    case "Має дедлайн":
      return "has-deadline";
    default:
      return "";
  }
};

const getGroupIcon = (type: TaskType) => {
  const props = { size: 20, weight: "duotone" as const };
  switch (type) {
    case "Лабораторні":
      return <Flask {...props} />;
    case "Розрахункові роботи":
      return <Calculator {...props} />;
    case "Курсова робота":
      return <FileText {...props} />;
    case "КР":
      return <Notebook {...props} />;
    case "ДЗ":
      return <House {...props} />;
    case "Індивідуальна робота":
      return <UserFocus {...props} />;
    case "Проект":
      return <Presentation {...props} />;
    default:
      return <BookOpenText {...props} />;
  }
};

export const SemesterDashboard = ({
  semesterId,
  setCurrentScreen,
}: DashboardProps) => {
  const isGuest = localStorage.getItem("isGuest") === "true";
  const userDataString = localStorage.getItem("userData");
  const userData = userDataString ? JSON.parse(userDataString) : {};
  const storageKey = isGuest
    ? "unimind-semesters-guest"
    : `unimind-semesters-${userData.name || "user"}`;

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const allSemesters: Semester[] = JSON.parse(
      localStorage.getItem(storageKey) || "[]",
    );
    const currentSem = allSemesters.find((s) => s.id === semesterId);
    return currentSem?.subjects || [];
  });

  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(
    subjects.length > 0 ? subjects[0].id : null,
  );
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");
  const [newSubCredits, setNewSubCredits] = useState<number | "">("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskType, setNewTaskType] = useState<TaskType>("Лабораторні");
  const [newTaskMaxScore, setNewTaskMaxScore] = useState<number | "">("");
  const [newTaskCredits, setNewTaskCredits] = useState<number | "">("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");

useEffect(() => {
  // 1. Оновлюємо локальну копію (localStorage)
  const allSemesters: Semester[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
  const updatedSemesters = allSemesters.map((s) =>
    s.id === semesterId ? { ...s, subjects: subjects } : s
  );
  localStorage.setItem(storageKey, JSON.stringify(updatedSemesters));

  // 2. ФУНКЦІЯ СИНХРОНІЗАЦІЇ З БЕКЕНДОМ
  const syncWithServer = async () => {
    if (!isGuest && userData.id) {
      try {
        const userName = userData.name || "user";
        const plansKey = `unimind-plans-${userName}`;
        const currentPlans = JSON.parse(localStorage.getItem(plansKey) || "[]");
        
        // Додаємо графік роботи, щоб уникнути помилки 400
        const workTimes = JSON.parse(localStorage.getItem(`unimind-work-times-${userName}`) || "{}");
        const activeDays = JSON.parse(localStorage.getItem(`unimind-active-days-${userName}`) || "{}");

        // ВИПРАВЛЕНО: Використовуємо API_URL
        await fetch(`${API_URL}/sync/all`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userData.id,
            semesters: updatedSemesters, 
            plans: currentPlans,
            workSchedule: {
              times: workTimes,
              days: activeDays
            }
          }),
        });
      } catch (error) {
        console.error("Помилка синхронізації дашборду:", error);
      }
    }
  };
  // Дебаунс (затримка), щоб не спамити сервер при кожному натисканні клавіші
  const timeoutId = setTimeout(syncWithServer, 1000);
  return () => clearTimeout(timeoutId);
}, [subjects, semesterId, storageKey, isGuest, userData.id, userData.name]);
  const syncWithGlobalStorage = useCallback(
    (updatedSubjects: Subject[]) => {
      const allSemesters: Semester[] = JSON.parse(
        localStorage.getItem(storageKey) || "[]",
      );
      const updatedSemesters = allSemesters.map((s) =>
        s.id === semesterId ? { ...s, subjects: updatedSubjects } : s,
      );
      localStorage.setItem(storageKey, JSON.stringify(updatedSemesters));
    },
    [semesterId, storageKey],
  );

  const handleNumberChange = (
    value: string,
    setter: (val: number | "") => void,
  ) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    setter(cleaned === "" ? "" : Number(cleaned));
  };

  const calculateTotalCredits = () => {
    let total = 0;
    subjects.forEach((s) => {
      total += s.credits;
      s.tasks.forEach((t) => {
        if (t.type === "Курсова робота" && t.credits) total += t.credits;
      });
    });
    return total;
  };

  const totalCredits = calculateTotalCredits();
  const activeSubject = subjects.find((s) => s.id === activeSubjectId);

  const handleSaveSubject = () => {
    setErrorMsg("");
    if (!newSubName.trim() || !newSubCredits)
      return setErrorMsg("Заповніть всі поля!");

    const creditsNum = Number(newSubCredits);
    const currentSubCredits = editingSubjectId
      ? subjects.find((s) => s.id === editingSubjectId)?.credits || 0
      : 0;

    if (totalCredits - currentSubCredits + creditsNum > 30)
      return setErrorMsg(`Ліміт 30 кр.! Зараз: ${totalCredits - currentSubCredits + creditsNum}`);

    if (editingSubjectId) {
      const updated = subjects.map((s) =>
        s.id === editingSubjectId ? { ...s, name: newSubName, credits: creditsNum } : s,
      );
      setSubjects(updated);
      syncWithGlobalStorage(updated);
    } else {
      const newList = [
        ...subjects,
        { id: crypto.randomUUID(), name: newSubName, credits: creditsNum, tasks: [] },
      ];
      setSubjects(newList);
      syncWithGlobalStorage(newList);
      if (!activeSubjectId) setActiveSubjectId(newList[newList.length - 1].id);
    }

    setNewSubName("");
    setNewSubCredits("");
    setIsSubjectModalOpen(false);
    setEditingSubjectId(null);
  };

  const handleSaveTask = () => {
    setErrorMsg("");
    if (!activeSubject) return;

    // 1. ЛІМІТ КУРСОВИХ (1 на предмет)
    if (newTaskType === "Курсова робота") {
      const existingCW = activeSubject.tasks.find(t => t.type === "Курсова робота");
      if (existingCW && editingTaskId !== existingCW.id) {
        return setErrorMsg("Один предмет може мати лише одну курсову роботу!");
      }
    }

    // 2. ЛІМІТ КРЕДИТІВ (Курсова входить у ліміт 30)
    if (newTaskType === "Курсова робота") {
      const creditsNum = Number(newTaskCredits);
      const oldTaskCredits = editingTaskId 
        ? activeSubject.tasks.find(t => t.id === editingTaskId)?.credits || 0 
        : 0;

      if (totalCredits - oldTaskCredits + creditsNum > 30) {
        return setErrorMsg(`Ліміт 30 кр. перевищено! Поточна сума: ${totalCredits - oldTaskCredits + creditsNum}`);
      }
    }

    // 3. ЛІМІТ 100 БАЛІВ (Курсова окремо, решта — разом макс 100)
    let finalMaxScore = Number(newTaskMaxScore);
    if (newTaskType === "Курсова робота") {
      finalMaxScore = 100; // Курсова завжди 100 балів
    } else {
      // Рахуємо суму балів усіх завдань крім курсових та поточного редагованого завдання
      const currentPointsTotal = activeSubject.tasks
        .filter((t) => t.type !== "Курсова робота" && t.id !== editingTaskId)
        .reduce((sum, t) => sum + t.maxScore, 0);

      if (currentPointsTotal + finalMaxScore > 100) {
        return setErrorMsg(`Сума балів (без курсової) не може бути > 100! (Зараз: ${currentPointsTotal + finalMaxScore})`);
      }
    }

    const oldTask = editingTaskId ? activeSubject.tasks.find((t) => t.id === editingTaskId) : null;

    const savedTask: Task = {
      id: editingTaskId || crypto.randomUUID(),
      name: newTaskType === "Курсова робота" ? activeSubject.name : newTaskName,
      type: newTaskType,
      score: oldTask ? oldTask.score : null,
      maxScore: finalMaxScore,
      deadline: newTaskDeadline,
      status: determineStatus(newTaskDeadline, oldTask ? oldTask.score : null),
      credits: newTaskType === "Курсова робота" ? Number(newTaskCredits) : undefined,
    };

    const updated = subjects.map((s) =>
      s.id === activeSubjectId
        ? {
            ...s,
            tasks: editingTaskId
              ? s.tasks.map((t) => (t.id === editingTaskId ? savedTask : t))
              : [...s.tasks, savedTask],
          }
        : s,
    );
    setSubjects(updated);
    syncWithGlobalStorage(updated);
    setExpandedGroups((prev) => ({ ...prev, [newTaskType]: true }));
    setIsTaskModalOpen(false);
  };

  return (
    <motion.div className="dashboard-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <button className="dashboard-back-btn desktop-only-btn" onClick={() => setCurrentScreen("main")}>
        <ArrowLeft size={20} weight="bold" /> <span>Назад до семестрів</span>
      </button>

      <div className="dashboard-grid desktop-view">
        <div className="dash-left-panel">
          <div className="dash-panel-header">
            <h2>Мій Семестр</h2>
            <button className="dash-add-subject-btn" onClick={() => { setEditingSubjectId(null); setNewSubName(""); setNewSubCredits(""); setIsSubjectModalOpen(true); }}>
              <Plus size={22} weight="bold" />
            </button>
          </div>
          <div className="subject-list scrollable-area">
            {subjects.map((s) => (
              <div key={s.id} className={`subject-item ${activeSubjectId === s.id ? "active" : ""}`} onClick={() => setActiveSubjectId(s.id)}>
                <div className="subject-item-content">
                  <div className="subject-item-icon"><BookOpenText size={20} weight="duotone" /></div>
                  <span className="subject-item-name">{s.name}</span>
                </div>
                <div className="subject-item-actions">
                  <span className="subject-item-credits">{s.credits} кр.</span>
                  <PencilSimple size={18} weight="duotone" className="dash-action-icon" onClick={(e) => { e.stopPropagation(); setEditingSubjectId(s.id); setNewSubName(s.name); setNewSubCredits(s.credits); setIsSubjectModalOpen(true); }} />
                  <Trash size={18} weight="duotone" className="dash-action-icon" onClick={(e) => { e.stopPropagation(); const u = subjects.filter((x) => x.id !== s.id); setSubjects(u); syncWithGlobalStorage(u); if (activeSubjectId === s.id) setActiveSubjectId(u[0]?.id || null); }} />
                </div>
              </div>
            ))}
          </div>
          <div className="dash-left-summary">
            <div className="summary-row">
              <span>Кредити</span>
              <strong style={{ color: totalCredits > 30 ? "#e63946" : "inherit" }}>{totalCredits} / 30</strong>
            </div>
          </div>
        </div>

        <div className="dash-right-panel">
          {activeSubject ? (
            <>
              <div className="subject-detail-header">
                <div className="subject-detail-title">
                  <div className="subject-detail-icon"><BookOpenText size={24} weight="duotone" /></div>
                  <div className="subject-detail-text"><h2>{activeSubject.name}</h2></div>
                </div>
                <button className="dash-primary-btn-transparent" onClick={() => { setIsTaskModalOpen(true); setEditingTaskId(null); setNewTaskName(""); setNewTaskMaxScore(""); setNewTaskCredits(""); setNewTaskDeadline(""); }}>
                  <Plus size={18} weight="bold" /> Додати завдання
                </button>
              </div>
              <div className="tasks-container scrollable-area">
                <div className="task-list-table-header">
                  <div className="col-name">Назва</div>
                  <div className="col-status">Статус</div>
                  <div className="col-score">Бал</div>
                  <div className="col-actions"></div>
                </div>
                <div className="tasks-groups-list">
                  {Object.entries(activeSubject.tasks.reduce((acc, t) => { if (!acc[t.type]) acc[t.type] = []; acc[t.type].push(t); return acc; }, {} as Record<string, Task[]>)).map(([name, tasks]) => {
                    const isOpen = !!expandedGroups[name];
                    return (
                      <div key={name} className={`task-group ${isOpen ? "is-open" : ""}`}>
                        <div className="task-group-header" onClick={() => setExpandedGroups((p) => ({ ...p, [name]: !isOpen }))}>
                          <div className="group-title-left">
                            <div className="group-icon-container">{getGroupIcon(name as TaskType)}</div>
                            <h4>{name}</h4>
                            <span className="category-score-label">
                              {tasks.reduce((s, t) => s + (t.score || 0), 0)} / {tasks.reduce((s, t) => s + t.maxScore, 0)}
                            </span>
                          </div>
                          <div className={`group-toggle-arrow ${isOpen ? "open" : ""}`}><CaretDown size={20} weight="bold" /></div>
                        </div>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="task-rows-container">
                              {tasks.map((t) => (
                                <div key={t.id} className="task-row">
                                  <div className="col-name">{t.name}</div>
                                  <div className="col-status"><span className={`status-badge ${getStatusClass(t.status)}`}>{t.status}</span></div>
                                  <div className="col-score">
                                    <input type="text" className="score-edit-input" style={{ width: t.score === null ? "1.2ch" : `${t.score.toString().length + 0.2}ch` }} value={t.score === null ? "-" : t.score} onChange={(e) => {
                                      const val = e.target.value.replace(/[^0-9]/g, "");
                                      if (val === "") {
                                        const u = subjects.map(s => s.id === activeSubjectId ? {...s, tasks: s.tasks.map(x => x.id === t.id ? {...x, score: null} : x)} : s);
                                        setSubjects(u); return;
                                      }
                                      const num = Math.min(Number(val), t.maxScore);
                                      const u = subjects.map(s => s.id === activeSubjectId ? {...s, tasks: s.tasks.map(x => x.id === t.id ? {...x, score: num, status: determineStatus(x.deadline, num)} : x)} : s);
                                      setSubjects(u); syncWithGlobalStorage(u);
                                    }} />
                                    <span className="max-score">/ {t.maxScore}</span>
                                  </div>
                                  <div className="col-actions">
                                    <PencilSimple size={18} weight="duotone" className="dash-action-icon" onClick={() => {
                                      setEditingTaskId(t.id); setNewTaskType(t.type); setNewTaskName(t.type === "Курсова робота" ? "" : t.name);
                                      setNewTaskMaxScore(t.maxScore); setNewTaskCredits(t.credits || ""); setNewTaskDeadline(t.deadline || ""); setIsTaskModalOpen(true);
                                    }} />
                                    <Trash size={18} weight="duotone" className="dash-action-icon" onClick={() => {
                                      const u = subjects.map(s => s.id === activeSubjectId ? {...s, tasks: s.tasks.filter(x => x.id !== t.id)} : s);
                                      setSubjects(u); syncWithGlobalStorage(u);
                                    }} />
                                  </div>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-dash-state">Оберіть предмет</div>
          )}
        </div>
      </div>

      <div className="mobile-view">
        <div className="mobile-subjects-list">
          <header className="mobile-only-header">
            <button className="dashboard-back-btn" onClick={() => setCurrentScreen("main")}><ArrowLeft size={24} weight="bold" /></button>
            <h2>Мій Семестр</h2>
            <button className="mobile-header-add" onClick={() => { setEditingSubjectId(null); setNewSubName(""); setNewSubCredits(""); setIsSubjectModalOpen(true); }}><Plus size={24} weight="bold" /></button>
          </header>
          <div className="mobile-scrollable-content">
            {subjects.length === 0 ? (
              <div className="empty-dash-state" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", minHeight: "200px" }}>
                <BookOpenText size={48} weight="duotone" style={{ opacity: 0.5 }} />
                <span>Додайте предмети</span>
              </div>
            ) : (
              subjects.map((s) => (
                <div key={s.id} className={`mobile-subject-card ${activeSubjectId === s.id ? "expanded" : ""}`} onClick={() => setActiveSubjectId(activeSubjectId === s.id ? null : s.id)}>
                  <div className="mobile-card-header">
                    <div className="mobile-card-icon"><BookOpenText size={24} weight="duotone" /></div>
                    <div className="mobile-card-info"><h3 className="mobile-card-title">{s.name}</h3></div>
                    <div className="mobile-card-actions">
                      <span className="mobile-card-credits-right">{s.credits} кр.</span>
                      <PencilSimple size={18} weight="duotone" className="dash-action-icon" onClick={(e) => { e.stopPropagation(); setEditingSubjectId(s.id); setNewSubName(s.name); setNewSubCredits(s.credits); setIsSubjectModalOpen(true); }} />
                      <Trash size={18} weight="duotone" className="dash-action-icon" onClick={(e) => { e.stopPropagation(); const u = subjects.filter(x => x.id !== s.id); setSubjects(u); syncWithGlobalStorage(u); }} />
                    </div>
                  </div>
                  <AnimatePresence>
                    {activeSubjectId === s.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mobile-card-body" onClick={(e) => e.stopPropagation()}>
                        <div className="mobile-task-headers"><div className="col-name">Назва</div><div className="col-status" style={{ textAlign: "center" }}>Статус</div><div className="col-score" style={{ textAlign: "right" }}>Бали</div></div>
                        {Object.entries(s.tasks.reduce((acc, t) => { if (!acc[t.type]) acc[t.type] = []; acc[t.type].push(t); return acc; }, {} as Record<string, Task[]>)).map(([typeName, tasks]) => {
                          const isGroupOpen = expandedGroups[`mobile-${s.id}-${typeName}`] !== false;
                          return (
                            <div key={typeName} className="mobile-task-group">
                              <div className="mobile-group-label" onClick={() => setExpandedGroups(p => ({ ...p, [`mobile-${s.id}-${typeName}`]: !isGroupOpen }))}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>{getGroupIcon(typeName as TaskType)} {typeName}</div>
                                <CaretDown size={16} weight="bold" className={`mobile-card-arrow ${isGroupOpen ? "open" : ""}`} />
                              </div>
                              <AnimatePresence>
                                {isGroupOpen && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                                    {tasks.map((t) => (
                                      <div key={t.id} className="task-row mobile-task-row">
                                        <div className="col-name">{t.name}</div>
                                        <div className="col-status"><span className={`status-badge ${getStatusClass(t.status)}`} style={{ fontSize: "10px" }}>{t.status}</span></div>
                                        <div className="col-score" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "5px" }}>
                                          <input type="text" className="score-edit-input" value={t.score === null ? "-" : t.score} onChange={(e) => {
                                            const num = e.target.value === "" ? null : Math.max(0, Math.min(Number(e.target.value.replace(/\D/g, "")), t.maxScore));
                                            const u = subjects.map(subj => subj.id === s.id ? { ...subj, tasks: subj.tasks.map(x => x.id === t.id ? { ...x, score: num, status: determineStatus(x.deadline, num) } : x) } : subj);
                                            setSubjects(u); syncWithGlobalStorage(u);
                                          }} />
                                          <span style={{ opacity: 0.5 }}>/ {t.maxScore}</span>
                                          <div className="col-actions" style={{ marginLeft: "18px" }}>
                                            <PencilSimple size={16} weight="duotone" className="dash-action-icon" onClick={() => { setActiveSubjectId(s.id); setEditingTaskId(t.id); setNewTaskType(t.type); setNewTaskName(t.name); setNewTaskMaxScore(t.maxScore); setIsTaskModalOpen(true); }} />
                                            <Trash size={16} weight="duotone" className="dash-action-icon" onClick={() => { const u = subjects.map(subj => subj.id === s.id ? { ...subj, tasks: subj.tasks.filter(x => x.id !== t.id) } : subj); setSubjects(u); syncWithGlobalStorage(u); }} />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                        <button className="mobile-inner-add-btn" onClick={() => { setActiveSubjectId(s.id); setEditingTaskId(null); setIsTaskModalOpen(true); setNewTaskName(""); }}>
                          <Plus size={16} /> Додати завдання
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
          <div className="mobile-credits-footer">Кредити: <strong>{totalCredits} / 30</strong></div>
        </div>
      </div>

      <AnimatePresence>
        {(isSubjectModalOpen || isTaskModalOpen) && (
          <div className="sem-modal-overlay" onClick={() => { setIsSubjectModalOpen(false); setIsTaskModalOpen(false); setIsTypeDropdownOpen(false); setEditingSubjectId(null); }}>
            <motion.div className="sem-modal-card" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <h2 className="sem-modal-title">{isSubjectModalOpen ? (editingSubjectId ? "Редагувати предмет" : "Новий предмет") : "Деталі завдання"}</h2>
              {errorMsg && <div className="modal-error-msg"><WarningCircle size={18} /> {errorMsg}</div>}
              <div className="sem-modal-form">
                {isSubjectModalOpen ? (
                  <>
                    <div className="sem-input-group"><label>Назва предмета</label><input type="text" value={newSubName} placeholder="Напр: Мат аналіз" onChange={(e) => setNewSubName(e.target.value)} /></div>
                    <div className="sem-input-group"><label>Кредити</label><input type="text" value={newSubCredits} placeholder="Введіть число" onChange={(e) => handleNumberChange(e.target.value, setNewSubCredits)} /></div>
                  </>
                ) : (
                  <>
                    <div className="sem-input-group"><label>Тип завдання</label>
                      <div className="custom-select-container">
                        <button type="button" className="custom-select-trigger" onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}><span>{newTaskType}</span><CaretDown size={16} className={isTypeDropdownOpen ? "rotate" : ""} /></button>
                        <AnimatePresence>{isTypeDropdownOpen && (<motion.div className="custom-select-options" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>{["Лабораторні", "Розрахункові роботи", "Курсова робота", "КР", "ДЗ", "Індивідуальна робота", "Проект"].map((t) => (<div key={t} className="custom-option" onClick={() => { setNewTaskType(t as TaskType); setIsTypeDropdownOpen(false); }}>{t}</div>))}</motion.div>)}</AnimatePresence>
                      </div>
                    </div>
                    {newTaskType === "Курсова робота" ? (
                      <div className="sem-input-group"><label>Кредити за курсову</label><input type="text" value={newTaskCredits} placeholder="Введіть число" onChange={(e) => handleNumberChange(e.target.value, setNewTaskCredits)} /></div>
                    ) : (
                      <>
                        <div className="sem-input-group"><label>Назва завдання</label><input type="text" value={newTaskName} placeholder="Напр: Лаба 1" onChange={(e) => setNewTaskName(e.target.value)} /></div>
                        <div className="sem-input-group"><label>Дедлайн</label><DatePicker selected={newTaskDeadline ? new Date(newTaskDeadline) : null} placeholderText="дд.мм.рррр" onChange={(d: Date | null) => setNewTaskDeadline(d ? d.toISOString().split("T")[0] : "")} dateFormat="dd.MM.yyyy" locale="uk" /></div>
                        <div className="sem-input-group"><label>Максимальний бал</label><input type="text" value={newTaskMaxScore} placeholder="Введіть число" onChange={(e) => handleNumberChange(e.target.value, setNewTaskMaxScore)} /></div>
                      </>
                    )}
                  </>
                )}
              </div>
              <div className="sem-modal-actions">
                <button className="sem-btn-confirm" onClick={isSubjectModalOpen ? handleSaveSubject : handleSaveTask}>Зберегти</button>
                <button className="sem-btn-cancel" onClick={() => { setIsSubjectModalOpen(false); setIsTaskModalOpen(false); setIsTypeDropdownOpen(false); setEditingSubjectId(null); }}>Скасувати</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};