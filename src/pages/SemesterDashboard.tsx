import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import localforage from "localforage";
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
  Archive
} from "@phosphor-icons/react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { uk } from "date-fns/locale/uk";

registerLocale("uk", uk);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface UserData {
  id: number;
  name: string;
  email: string;
}

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
  name?: string;
  subjects: Subject[];
  isArchived?: boolean;
}

const determineStatus = (deadline?: string, score?: number | null): TaskStatus => {
  if (score !== null && score !== undefined) return "Здано";
  if (!deadline) return "В процесі";
  return "Має дедлайн";
};

const getStatusClass = (status: TaskStatus) => {
  switch (status) {
    case "Здано": return "completed";
    case "В процесі": return "in-progress";
    case "Має дедлайн": return "has-deadline";
    default: return "";
  }
};

const getGroupIcon = (type: TaskType) => {
  const props = { size: 20, weight: "duotone" as const };
  switch (type) {
    case "Лабораторні": return <Flask {...props} />;
    case "Розрахункові роботи": return <Calculator {...props} />;
    case "Курсова робота": return <FileText {...props} />;
    case "КР": return <Notebook {...props} />;
    case "ДЗ": return <House {...props} />;
    case "Індивідуальна робота": return <UserFocus {...props} />;
    case "Проект": return <Presentation {...props} />;
    default: return <BookOpenText {...props} />;
  }
};

export const SemesterDashboard = ({ semesterId, setCurrentScreen }: DashboardProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [isArchived, setIsArchived] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
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

  const getStorageKey = (guest: boolean, user: UserData | null) =>
    guest ? "unimind-semesters-guest" : `unimind-semesters-${user?.name || "user"}`;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const initDashboard = async () => {
      const guestStatus = (await localforage.getItem("isGuest")) === "true";
      const storedUser = await localforage.getItem<UserData>("userData");
      setIsGuest(guestStatus);
      setUserData(storedUser);

      const key = getStorageKey(guestStatus, storedUser);
      const allSemesters: Semester[] = (await localforage.getItem(key)) || [];
      const currentSem = allSemesters.find((s) => s.id === semesterId);

      if (currentSem) {
        setSubjects(currentSem.subjects || []);
        setIsArchived(!!currentSem.isArchived);
        if (currentSem.subjects?.length > 0 && window.innerWidth > 768) {
          setActiveSubjectId(currentSem.subjects[0].id);
        }
      }
      setIsLoading(false);
    };
    initDashboard();
  }, [semesterId]);

  const syncWithGlobalStorage = useCallback(async (updatedSubjects: Subject[]) => {
    const key = getStorageKey(isGuest, userData);
    const allSemesters: Semester[] = (await localforage.getItem(key)) || [];
    const updatedSemesters = allSemesters.map((s) =>
      s.id === semesterId ? { ...s, subjects: updatedSubjects, isArchived } : s
    );
    await localforage.setItem(key, updatedSemesters);
  }, [semesterId, isGuest, userData, isArchived]);

  useEffect(() => {
    if (isLoading) return;
    const syncWithServer = async () => {
      const key = getStorageKey(isGuest, userData);
      const allSemesters: Semester[] = (await localforage.getItem(key)) || [];
      const updatedSemesters = allSemesters.map((s) =>
        s.id === semesterId ? { ...s, subjects, isArchived } : s
      );
      await localforage.setItem(key, updatedSemesters);

      if (!isGuest && userData?.id) {
        try {
          const userName = userData.name || "user";
          const currentPlans = (await localforage.getItem(`unimind-plans-${userName}`)) || [];
          const workTimes = (await localforage.getItem(`unimind-work-times-${userName}`)) || {};
          const activeDays = (await localforage.getItem(`unimind-active-days-${userName}`)) || {};

          await fetch(`${API_URL}/sync/all`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: userData.id,
              semesters: updatedSemesters, 
              plans: currentPlans,
              workSchedule: { times: workTimes, days: activeDays }
            }),
          });
        } catch (error) { console.error("Помилка синхронізації:", error); }
      }
    };
    const timeoutId = setTimeout(syncWithServer, 1000);
    return () => clearTimeout(timeoutId);
  }, [subjects, isArchived, semesterId, isGuest, userData, isLoading]);

  const handleToggleArchive = () => setIsArchived(!isArchived);

  const calculateTotalCredits = () => {
    let total = 0;
    subjects.forEach((s) => {
      total += s.credits;
      s.tasks.forEach((t) => { if (t.type === "Курсова робота" && t.credits) total += t.credits; });
    });
    return total;
  };

  const totalCredits = calculateTotalCredits();
  const activeSubject = subjects.find((s) => s.id === activeSubjectId);

  const handleSaveSubject = () => {
    if (isArchived) return;
    setErrorMsg("");
    if (!newSubName.trim() || !newSubCredits) return setErrorMsg("Заповніть всі поля!");

    const creditsNum = Number(newSubCredits);
    const currentSubCredits = editingSubjectId ? subjects.find((s) => s.id === editingSubjectId)?.credits || 0 : 0;

    if (totalCredits - currentSubCredits + creditsNum > 30) {
      return setErrorMsg(`Ліміт 30 кр.! Зараз: ${totalCredits - currentSubCredits + creditsNum}`);
    }

    if (editingSubjectId) {
      const updated = subjects.map((s) => s.id === editingSubjectId ? { ...s, name: newSubName, credits: creditsNum } : s);
      setSubjects(updated);
      syncWithGlobalStorage(updated);
    } else {
      const newId = crypto.randomUUID();
      const newList = [...subjects, { id: newId, name: newSubName, credits: creditsNum, tasks: [] }];
      setSubjects(newList);
      syncWithGlobalStorage(newList);
      if (!isMobile) setActiveSubjectId(newId);
    }
    setNewSubName(""); setNewSubCredits("");
    setIsSubjectModalOpen(false); setEditingSubjectId(null);
  };

  const handleSaveTask = () => {
    if (isArchived || !activeSubject) return;
    setErrorMsg("");

    if (newTaskType === "Курсова робота") {
      const existingCW = activeSubject.tasks.find(t => t.type === "Курсова робота");
      if (existingCW && editingTaskId !== existingCW.id) {
        return setErrorMsg("Один предмет може мати лише одну курсову роботу!");
      }
    }

    if (newTaskType === "Курсова робота") {
      const creditsNum = Number(newTaskCredits);
      const oldTaskCredits = editingTaskId ? activeSubject.tasks.find(t => t.id === editingTaskId)?.credits || 0 : 0;
      if (totalCredits - oldTaskCredits + creditsNum > 30) {
        return setErrorMsg(`Ліміт 30 кр. перевищено!`);
      }
    }

    let finalMaxScore = Number(newTaskMaxScore);
    if (newTaskType === "Курсова робота") {
      finalMaxScore = 100;
    } else {
      const currentPointsTotal = activeSubject.tasks
        .filter((t) => t.type !== "Курсова робота" && t.id !== editingTaskId)
        .reduce((sum, t) => sum + t.maxScore, 0);
      if (currentPointsTotal + finalMaxScore > 100) {
        return setErrorMsg(`Сума балів (без курсової) не може бути > 100!`);
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

    const updated = subjects.map((s) => s.id === activeSubjectId ? { 
      ...s, 
      tasks: editingTaskId ? s.tasks.map((t) => (t.id === editingTaskId ? savedTask : t)) : [...s.tasks, savedTask] 
    } : s);
    
    setSubjects(updated);
    syncWithGlobalStorage(updated);
    setExpandedGroups((prev) => ({ ...prev, [newTaskType]: true }));
    setIsTaskModalOpen(false);
  };

  const handleNumberChange = (value: string, setter: (val: number | "") => void) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    setter(cleaned === "" ? "" : Number(cleaned));
  };

  if (isLoading) return <div className="loading-screen">Завантаження...</div>;

  return (
    <motion.div className="dashboard-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      
      {/* ДЕСКТОПНА НАВІГАЦІЯ */}
      {!isMobile && (
        <div className="dashboard-header-block desktop-only">
          <button className="dashboard-back-btn" onClick={() => setCurrentScreen("main")}>
            <ArrowLeft size={20} weight="bold" /> <span>Назад до семестрів</span>
          </button>
          <div className="header-actions">
            {(totalCredits >= 30 || isArchived) && (
              <button className={`archive-action-btn ${isArchived ? "active" : ""}`} onClick={handleToggleArchive}>
                <Archive size={20} weight={isArchived ? "fill" : "bold"} />
                <span>{isArchived ? "Розархівувати" : "Архівувати семестр"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* МОБІЛЬНА ВЕРСІЯ */}
      {isMobile ? (
        <div className={`mu-container ${isArchived ? "is-archived-view" : ""}`}>
          <div className="mu-header">
            <button className="mu-icon-btn" onClick={() => setCurrentScreen("main")}><ArrowLeft size={24} /></button>
            <h2 className="mu-title">Мій Семестр</h2>
            {totalCredits >= 30 || isArchived ? (
              <button className={`mu-icon-btn ${isArchived ? "active" : ""}`} onClick={handleToggleArchive}>
                <Archive size={24} weight={isArchived ? "fill" : "regular"} />
              </button>
            ) : (
              <button className="mu-icon-btn" onClick={() => { setEditingSubjectId(null); setNewSubName(""); setNewSubCredits(""); setIsSubjectModalOpen(true); }}>
                <Plus size={24} />
              </button>
            )}
          </div>

          <div className="mu-content scrollable-area">
            {subjects.length === 0 ? (
              <div className="mu-empty-state">
                <BookOpenText size={64} weight="duotone" />
                <p>Додайте предмети</p>
              </div>
            ) : (
              <div className="mu-subjects-list">
                {subjects.map((s) => (
                  <div key={s.id} className="mu-subject-block">
                    <div className="mu-subj-header" onClick={() => setActiveSubjectId(activeSubjectId === s.id ? null : s.id)}>
                      <div className="mu-subj-icon"><BookOpenText size={24} weight="duotone" /></div>
                      <div className="mu-subj-title">{s.name}</div>
                      <div className="mu-subj-actions">
                        <span className="mu-credits">{s.credits} кр.</span>
                        {!isArchived && (
                          <>
                            <PencilSimple size={18} weight="duotone" onClick={(e) => { e.stopPropagation(); setEditingSubjectId(s.id); setNewSubName(s.name); setNewSubCredits(s.credits); setIsSubjectModalOpen(true); }} />
                            <Trash size={18} weight="duotone" onClick={(e) => { e.stopPropagation(); const u = subjects.filter(x => x.id !== s.id); setSubjects(u); syncWithGlobalStorage(u); if (activeSubjectId === s.id) setActiveSubjectId(null); }} />
                          </>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {activeSubjectId === s.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mu-subj-body">
                          <div className="mu-task-labels mu-task-row-grid">
                            <span className="col-name">Назва</span>
                            <span className="col-status">Статус</span>
                            <span className="col-score">Бали</span>
                            <span className="col-actions"></span>
                          </div>

                          {Object.entries(s.tasks.reduce((acc, t) => { if (!acc[t.type]) acc[t.type] = []; acc[t.type].push(t); return acc; }, {} as Record<string, Task[]>)).map(([typeName, tasks]) => {
                            const isGroupOpen = expandedGroups[`m-${s.id}-${typeName}`] !== false;
                            return (
                              <div key={typeName} className="mu-task-group">
                                <div className="mu-group-header" onClick={() => setExpandedGroups(p => ({ ...p, [`m-${s.id}-${typeName}`]: !isGroupOpen }))}>
                                  <div className="mu-group-title">{getGroupIcon(typeName as TaskType)} {typeName}</div>
                                  <CaretDown size={16} className={`mu-group-arrow ${isGroupOpen ? "open" : ""}`} />
                                </div>
                                <AnimatePresence>
  {isGroupOpen && (
    <motion.div 
      initial={{ height: 0, opacity: 0 }} 
      animate={{ height: "auto", opacity: 1 }} 
      exit={{ height: 0, opacity: 0 }}
      style={{ overflow: 'hidden' }}
    >
      {tasks.map(t => (
        <div key={t.id} className="mu-task-row">
          
          {/* 1. НАЗВА (з автоматичним переносом тексту) */}
          <div className="col-name" style={{ marginLeft: "10px" }}>
            {t.name}
          </div>

          {/* 2. СТАТУС */}
          <div className="col-status">
            <span className={`status-badge ${getStatusClass(t.status)}`}>
              {t.status}
            </span>
          </div>

          {/* 3. БАЛИ (Інпут + Макс. бал) */}
          <div className="col-score" style={{ fontSize: '14px'
}}>
            <input 
              type="text" 
              disabled={isArchived} 
              className="score-edit-input" 
              style={{ 
                width: t.score === null ? "1.5ch" : `${t.score.toString().length + 0.5}ch`,
                textAlign: 'right',
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                font: 'inherit',
                fontWeight: '600',
                outline: 'none'
              }} 
              value={t.score === null ? "-" : t.score} 
              onChange={(e) => {
                if (isArchived) return;
                const val = e.target.value.replace(/[^0-9]/g, "");
                const num = val === "" ? null : Math.min(Number(val), t.maxScore);
                
                // Оновлення списку предметів
                const updated = subjects.map(subj => 
                  subj.id === s.id ? { 
                    ...subj, 
                    tasks: subj.tasks.map(x => x.id === t.id ? { 
                      ...x, 
                      score: num, 
                      status: determineStatus(x.deadline, num) 
                    } : x) 
                  } : subj
                );
                
                setSubjects(updated); 
                syncWithGlobalStorage(updated);
              }} 
            />
            <span style={{ opacity: 0.6, marginLeft: '2px' }}>/ {t.maxScore}</span>
          </div>

          {/* 4. ДІЇ (Олівець та Кошик) */}
          <div className="mu-task-actions">
            {!isArchived && (
              <>
                <PencilSimple 
                  size={18} 
                  weight="duotone" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => { 
                    setEditingTaskId(t.id); 
                    setNewTaskType(t.type); 
                    setNewTaskName(t.type === "Курсова робота" ? "" : t.name); 
                    setNewTaskMaxScore(t.maxScore); 
                    setNewTaskCredits(t.credits || ""); 
                    setNewTaskDeadline(t.deadline || ""); 
                    setIsTaskModalOpen(true); 
                  }} 
                />
                <Trash 
                  size={18} 
                  weight="duotone" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => { 
                    const u = subjects.map(subj => 
                      subj.id === s.id ? { 
                        ...subj, 
                        tasks: subj.tasks.filter(x => x.id !== t.id) 
                      } : subj
                    ); 
                    setSubjects(u); 
                    syncWithGlobalStorage(u); 
                  }} 
                />
              </>
            )}
          </div>
        </div>
      ))}
    </motion.div>
  )}
</AnimatePresence>
                              </div>
                            );
                          })}
                          {!isArchived && (
                            <button className="mu-add-task-btn" onClick={() => { setIsTaskModalOpen(true); setEditingTaskId(null); setNewTaskName(""); setNewTaskMaxScore(""); setNewTaskCredits(""); setNewTaskDeadline(""); }}>
                              <Plus size={16} /> Додати завдання
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mu-footer">
            Кредити: <strong style={{ color: totalCredits > 30 ? "#e63946" : "#4a3e75" }}>{totalCredits} / 30</strong>
          </div>
        </div>
      ) : (
        // ДЕСКТОПНА ВЕРСІЯ (Дві панелі)
        <div className={`dashboard-grid desktop-view ${isArchived ? "is-archived-view" : ""}`}>
          <div className="dash-left-panel">
            <div className="dash-panel-header">
              <h2>Мій Семестр</h2>
              {!isArchived && <button className="dash-add-subject-btn" onClick={() => { setEditingSubjectId(null); setNewSubName(""); setNewSubCredits(""); setIsSubjectModalOpen(true); }}><Plus size={22} weight="bold" /></button>}
            </div>
            <div className="subject-list scrollable-area">
              {subjects.map((s) => (
                <div key={s.id} className={`subject-item-wrapper ${activeSubjectId === s.id ? "active" : ""}`}>
                  <div className="subject-item" onClick={() => setActiveSubjectId(s.id)}>
                    <div className="subject-item-content">
                      <div className="subject-item-icon"><BookOpenText size={20} weight="duotone" /></div>
                      <span className="subject-item-name">{s.name}</span>
                    </div>
                    <div className="subject-item-actions">
                      <span className="subject-item-credits">{s.credits} кр.</span>
                      {!isArchived && (
                        <>
                          <PencilSimple size={18} weight="duotone" className="dash-action-icon" onClick={(e) => { e.stopPropagation(); setEditingSubjectId(s.id); setNewSubName(s.name); setNewSubCredits(s.credits); setIsSubjectModalOpen(true); }} />
                          <Trash size={18} weight="duotone" className="dash-action-icon" onClick={(e) => { e.stopPropagation(); const u = subjects.filter(x => x.id !== s.id); setSubjects(u); syncWithGlobalStorage(u); if (activeSubjectId === s.id) setActiveSubjectId(subjects.length > 1 ? subjects[0].id : null); }} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="dash-left-summary"><div className="summary-row"><span>Кредити</span><strong style={{ color: totalCredits > 30 ? "#e63946" : "inherit" }}>{totalCredits} / 30</strong></div></div>
          </div>

          <div className="dash-right-panel">
            {activeSubject ? (
              <>
                <div className="subject-detail-header">
                  <div className="subject-detail-title">
                    <div className="subject-detail-icon"><BookOpenText size={24} weight="duotone" /></div>
                    <div className="subject-detail-text"><h2>{activeSubject.name}</h2></div>
                  </div>
                  {!isArchived && <button className="dash-primary-btn-transparent" onClick={() => { setIsTaskModalOpen(true); setEditingTaskId(null); setNewTaskName(""); setNewTaskMaxScore(""); setNewTaskCredits(""); setNewTaskDeadline(""); }}><Plus size={18} weight="bold" /> Додати завдання</button>}
                </div>
                <div className="tasks-container scrollable-area">
                  <div className="task-list-table-header"><div className="col-name">Назва</div><div className="col-status">Статус</div><div className="col-score">Бал</div><div className="col-actions"></div></div>
                  {Object.entries(activeSubject.tasks.reduce((acc, t) => { if (!acc[t.type]) acc[t.type] = []; acc[t.type].push(t); return acc; }, {} as Record<string, Task[]>)).map(([name, tasks]) => (
                    <div key={name} className={`task-group ${expandedGroups[name] ? "is-open" : ""}`}>
                      <div className="task-group-header" onClick={() => setExpandedGroups(p => ({ ...p, [name]: !p[name] }))}>
                        <div className="group-title-left"><div className="group-icon-container">{getGroupIcon(name as TaskType)}</div><h4>{name}</h4><span className="category-score-label">{tasks.reduce((s, t) => s + (t.score || 0), 0)} / {tasks.reduce((s, t) => s + t.maxScore, 0)}</span></div>
                        <CaretDown size={20} weight="bold" className="group-toggle-arrow" />
                      </div>
                      <AnimatePresence>
                        {expandedGroups[name] && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="task-rows-container">
                            {tasks.map(t => (
                              <div key={t.id} className="task-row">
                                <div className="col-name">{t.name}</div>
                                <div className="col-status"><span className={`status-badge ${getStatusClass(t.status)}`}>{t.status}</span></div>
                                <div className="col-score">
                                  <input type="text" disabled={isArchived} className="score-edit-input" style={{ width: t.score === null ? "1.2ch" : `${t.score.toString().length + 0.2}ch` }} value={t.score === null ? "-" : t.score} 
                                    onChange={(e) => {
                                      if (isArchived) return;
                                      const val = e.target.value.replace(/[^0-9]/g, "");
                                      const num = val === "" ? null : Math.min(Number(val), t.maxScore);
                                      const u = subjects.map(s => s.id === activeSubjectId ? { ...s, tasks: s.tasks.map(x => x.id === t.id ? { ...x, score: num, status: determineStatus(x.deadline, num) } : x) } : s);
                                      setSubjects(u); syncWithGlobalStorage(u);
                                    }} 
                                  /> / {t.maxScore}
                                </div>
                                <div className="col-actions">{!isArchived && <><PencilSimple size={18} weight="duotone" className="dash-action-icon" onClick={() => { setEditingTaskId(t.id); setNewTaskType(t.type); setNewTaskName(t.type === "Курсова робота" ? "" : t.name); setNewTaskMaxScore(t.maxScore); setNewTaskCredits(t.credits || ""); setNewTaskDeadline(t.deadline || ""); setIsTaskModalOpen(true); }} /><Trash size={18} weight="duotone" className="dash-action-icon" onClick={() => { const u = subjects.map(s => s.id === activeSubjectId ? { ...s, tasks: s.tasks.filter(x => x.id !== t.id) } : s); setSubjects(u); syncWithGlobalStorage(u); }} /></>}</div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </>
            ) : <div className="empty-dash-state">Оберіть предмет зі списку</div>}
          </div>
        </div>
      )}

      {/* --- МОДАЛЬНІ ВІКНА (Ретельно відформатовані для уникнення помилок) --- */}
      <AnimatePresence>
        {(isSubjectModalOpen || isTaskModalOpen) && (
          <div className="sem-modal-overlay" onClick={() => { setIsSubjectModalOpen(false); setIsTaskModalOpen(false); setIsTypeDropdownOpen(false); setEditingSubjectId(null); setEditingTaskId(null); setErrorMsg(""); }}>
            <motion.div className="sem-modal-card" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <h2 className="sem-modal-title">{isSubjectModalOpen ? (editingSubjectId ? "Редагувати предмет" : "Новий предмет") : "Деталі завдання"}</h2>
              
              {errorMsg && <div className="modal-error-msg"><WarningCircle size={18} /> {errorMsg}</div>}
              
              <div className="sem-modal-form">
                {isSubjectModalOpen ? (
                  <>
                    <div className="sem-input-group">
                      <label>Назва предмета</label>
                      <input type="text" value={newSubName} placeholder="Напр: Мат аналіз" onChange={(e) => setNewSubName(e.target.value)} />
                    </div>
                    <div className="sem-input-group">
                      <label>Кредити</label>
                      <input type="text" value={newSubCredits} placeholder="Число (напр. 5)" onChange={(e) => handleNumberChange(e.target.value, setNewSubCredits)} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="sem-input-group">
                      <label>Тип завдання</label>
                      <div className="custom-select-container">
                        <button type="button" className="custom-select-trigger" onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}>
                          <span>{newTaskType}</span>
                          <CaretDown size={16} className={isTypeDropdownOpen ? "rotate" : ""} />
                        </button>
                        <AnimatePresence>
                          {isTypeDropdownOpen && (
                            <motion.div className="custom-select-options" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                              {["Лабораторні", "Розрахункові роботи", "Курсова робота", "КР", "ДЗ", "Індивідуальна робота", "Проект"].map((t) => (
                                <div key={t} className="custom-option" onClick={() => { setNewTaskType(t as TaskType); setIsTypeDropdownOpen(false); }}>
                                  {t}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {newTaskType === "Курсова робота" ? (
                      <div className="sem-input-group">
                        <label>Кредити за курсову</label>
                        <input type="text" value={newTaskCredits} placeholder="Число (напр. 3)" onChange={(e) => handleNumberChange(e.target.value, setNewTaskCredits)} />
                      </div>
                    ) : (
                      <>
                        <div className="sem-input-group">
                          <label>Назва завдання</label>
                          <input type="text" value={newTaskName} placeholder="Напр: Лаба 1" onChange={(e) => setNewTaskName(e.target.value)} />
                        </div>
                        <div className="sem-input-group">
                          <label>Дедлайн</label>
                          <DatePicker selected={newTaskDeadline ? new Date(newTaskDeadline) : null} placeholderText="Оберіть дату" onChange={(d: Date | null) => setNewTaskDeadline(d ? d.toISOString().split("T")[0] : "")} dateFormat="dd.MM.yyyy" locale="uk" />
                        </div>
                        <div className="sem-input-group">
                          <label>Максимальний бал</label>
                          <input type="text" value={newTaskMaxScore} placeholder="Число (напр. 10)" onChange={(e) => handleNumberChange(e.target.value, setNewTaskMaxScore)} />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              <div className="sem-modal-actions">
                <button className="sem-btn-confirm" onClick={isSubjectModalOpen ? handleSaveSubject : handleSaveTask}>Зберегти</button>
                <button className="sem-btn-cancel" onClick={() => { setIsSubjectModalOpen(false); setIsTaskModalOpen(false); setEditingSubjectId(null); setEditingTaskId(null); setErrorMsg(""); }}>Скасувати</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};