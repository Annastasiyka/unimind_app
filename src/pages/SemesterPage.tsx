import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpenText, ChartBar, Atom, Books, GlobeHemisphereWest, 
  Microscope, MathOperations, Calculator, Laptop, PenNib, 
  Student, Certificate, Brain, Lightbulb, Flask, Plus, Minus,
  GraduationCap
} from "@phosphor-icons/react";

// --- КОНСТАНТИ ---
// Цей рядок автоматично підставить адресу з Vercel або localhost
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";

// --- ТИПИ ---
interface Task {
  id: string;
  type: string;
  score: number | null;
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
  name: string;
  yearString: string;
  subjects: Subject[];
  iconIndex: number;
}

interface SemesterPageProps {
  setCurrentScreen: (screen: string) => void;
  setSelectedSemesterId: (id: string) => void;
}

const semesterIcons = [
  <BookOpenText size={24} weight="duotone" />,
  <ChartBar size={24} weight="duotone" />,
  <Atom size={24} weight="duotone" />,
  <Books size={24} weight="duotone" />,
  <GlobeHemisphereWest size={24} weight="duotone" />,
  <Microscope size={24} weight="duotone" />,
  <MathOperations size={24} weight="duotone" />,
  <Calculator size={24} weight="duotone" />,
  <Laptop size={24} weight="duotone" />,
  <PenNib size={24} weight="duotone" />,
  <Student size={24} weight="duotone" />,
  <Certificate size={24} weight="duotone" />,
  <Brain size={24} weight="duotone" />,
  <Lightbulb size={24} weight="duotone" />,
  <Flask size={24} weight="duotone" />
];

export const SemesterPage = ({ setCurrentScreen, setSelectedSemesterId }: SemesterPageProps) => {
  const isGuest = localStorage.getItem("isGuest") === "true";
  const userDataString = localStorage.getItem("userData");
  
  const userData = userDataString && userDataString !== "undefined" ? JSON.parse(userDataString) : {};
  const storageKey = isGuest ? "unimind-semesters-guest" : `unimind-semesters-${userData.name || "user"}`;
  const plansKey = isGuest ? "unimind-plans-guest" : `unimind-plans-${userData.name || "user"}`;

  const [semesters, setSemesters] = useState<Semester[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved && saved !== "undefined") {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Помилка парсингу семестрів:", e);
        return [];
      }
    }
    return [];
  });

  const [hasFetched, setHasFetched] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSemName, setNewSemName] = useState("");
  const [newSemYear, setNewSemYear] = useState("");

  // 1. Ефект збереження та синхронізації
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(semesters));

    const syncWithServer = async () => {
      if (!isGuest && userData.id) {
        try {
          const savedPlans = localStorage.getItem(plansKey);
          const currentPlans = savedPlans ? JSON.parse(savedPlans) : [];

          // ВИПРАВЛЕНО: Використовуємо API_URL замість жорсткої адреси
          const response = await fetch(`${API_URL}/sync/all`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: userData.id,
              semesters: semesters,
              plans: currentPlans
            }),
          });
          
          if (!response.ok) throw new Error("Server error");
        } catch (error) {
          console.error("Фонова синхронізація не вдалася:", error);
        }
      }
    };

    const timeoutId = setTimeout(syncWithServer, 1000);
    return () => clearTimeout(timeoutId);
  }, [semesters, storageKey, isGuest, userData.id, plansKey]);

  // 2. Ефект завантаження з БД
  useEffect(() => {
    const fetchFromDB = async () => {
      if (isGuest || !userData.id || hasFetched) return;

      try {
        // ВИПРАВЛЕНО: Використовуємо API_URL
        const response = await fetch(`${API_URL}/profile/${userData.id}`);
        const dbUser = await response.json();
        
        if (response.ok && dbUser.semesters && dbUser.semesters.length > 0) {
          if (semesters.length === 0) {
            setSemesters(dbUser.semesters);
          }
        }
        setHasFetched(true); 
      } catch {
        console.error("Не вдалося підтягнути дані з бази");
        setHasFetched(true);
      }
    };
    fetchFromDB();
  }, [isGuest, userData.id, semesters.length, hasFetched]);

  // --- Решта коду без змін (calculateDefaultData, handleAddSemester тощо) ---
  const calculateDefaultData = () => {
    const nextName = `Семестр ${semesters.length + 1}`;
    if (semesters.length === 0) {
      const today = new Date();
      const year = today.getFullYear();
      const nextYear = today.getMonth() >= 7 ? `${year}/${year + 1} (Осінній)` : `${year - 1}/${year} (Весняний)`;
      return { nextName, nextYear };
    }
    const lastSem = semesters[semesters.length - 1];
    if (!lastSem || !lastSem.yearString) {
      return { nextName, nextYear: "2026/2027 (Осінній)" };
    }
    const match = lastSem.yearString.match(/(\d{4})\/(\d{4})\s*\((Осінній|Весняний)\)/);
    let nextYear = lastSem.yearString;
    if (match) {
      const startYear = parseInt(match[1], 10);
      const endYear = parseInt(match[2], 10);
      nextYear = lastSem.yearString.includes("Осінній") 
        ? `${startYear}/${endYear} (Весняний)` 
        : `${startYear + 1}/${endYear + 1} (Осінній)`;
    }
    return { nextName, nextYear };
  };

  const handleOpenModal = () => {
    const { nextName, nextYear } = calculateDefaultData();
    setNewSemName(nextName);
    setNewSemYear(nextYear);
    setIsModalOpen(true);
  };

  const handleAddSemester = () => {
    if (!newSemName.trim() || !newSemYear.trim()) return;
    const newSemester: Semester = {
      id: crypto.randomUUID(),
      name: newSemName,
      yearString: newSemYear,
      subjects: [], 
      iconIndex: semesters.length % semesterIcons.length, 
    };
    setSemesters([...semesters, newSemester]);
    setIsModalOpen(false);
  };

  return (
    <div className="semester-page">
      <h2 className="semester-header">Академічний Простір</h2>
      <div className="semesters-grid">
        <AnimatePresence mode="popLayout">
          {semesters.map((sem, index) => {
             const subjects = sem.subjects || [];
             const allTasks = subjects.flatMap(s => s.tasks || []);
             const tasksCompleted = allTasks.filter(t => t.score !== null).length;
             const progress = allTasks.length > 0 ? (tasksCompleted / allTasks.length) * 100 : 0;

             let weightedSum = 0;
             let courseWorkCount = 0;

             subjects.forEach(s => {
               const standardTasks = s.tasks.filter(t => t.type !== "Курсова робота");
               const subjectScore = standardTasks.reduce((sum, t) => sum + (t.score || 0), 0);
               weightedSum += subjectScore * (s.credits || 0);

               const subjectCWs = s.tasks.filter(t => t.type === "Курсова робота");
               courseWorkCount += subjectCWs.length;
               
               subjectCWs.forEach(cw => {
                 weightedSum += (cw.score || 0) * (cw.credits || 0);
               });
             });

             const semesterRating = parseFloat((weightedSum / 30).toFixed(2));
             const totalItemsCount = subjects.length + courseWorkCount;

             return (
              <motion.div 
                key={sem.id} className="semester-card" onClick={() => { setSelectedSemesterId(sem.id); setCurrentScreen("dashboard"); }}
                initial={{ opacity: 0, scale: 0.8, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }} layout
              >
                <button className="delete-sem-btn" onClick={(e) => { e.stopPropagation(); setSemesters(semesters.filter(s => s.id !== sem.id)); }}>
                  <Minus size={16} weight="bold" />
                </button>
                <div className="sem-card-top">
                  <div className="sem-title-row">
                    <h3 className="sem-title">{sem.name}</h3>
                    <div className="sem-icon-wrapper">{semesterIcons[sem.iconIndex]}</div>
                  </div>
                  <span className="sem-year">{sem.yearString}</span>
                </div>
                <div className="sem-stats">
                  <div className="sem-stat-row">
                    <span className="sem-stat-label"><GraduationCap size={18} /> Семестровий рейтинг </span>
                    <span className="sem-stat-value">{semesterRating > 0 ? semesterRating : "—"}</span>
                  </div>
                  <div className="sem-stat-row">
                    <span className="sem-stat-label"><Books size={18} /> Кількість предметів</span>
                    <span className="sem-stat-value">{totalItemsCount}</span> 
                  </div>
                </div>
                <div className="sem-progress-section">
                  <div className="sem-progress-text">{tasksCompleted}/{allTasks.length} завдань завершено</div>
                  <div className="sem-progress-bar-bg"><div className="sem-progress-fill" style={{ width: `${progress}%` }} /></div>
                </div>
              </motion.div>
            );
          })}
          <motion.div className="add-semester-card" onClick={handleOpenModal} layout>
            <div className="add-sem-btn"><Plus size={28} weight="bold" /></div>
            <span className="add-sem-text">Додати новий семестр</span>
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="sem-modal-overlay">
            <motion.div className="sem-modal-card" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <h2 className="sem-modal-title">Новий семестр</h2>
              <div className="sem-modal-form">
                <div className="sem-input-group">
                  <label>Назва семестру</label>
                  <input type="text" value={newSemName} onChange={(e) => setNewSemName(e.target.value)} />
                </div>
                <div className="sem-input-group">
                  <label>Навчальний рік</label>
                  <input type="text" value={newSemYear} onChange={(e) => setNewSemYear(e.target.value)} />
                </div>
              </div>
              <div className="sem-modal-actions">
                <button className="sem-btn-confirm" onClick={handleAddSemester}>Створити</button>
                <button className="sem-btn-cancel" onClick={() => setIsModalOpen(false)}>Скасувати</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};