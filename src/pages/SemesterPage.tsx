import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import localforage from "localforage";
import { 
  BookOpenText, ChartBar, Atom, Books, GlobeHemisphereWest, 
  Microscope, MathOperations, Calculator, Laptop, PenNib, 
  Student, Certificate, Brain, Lightbulb, Flask, Plus, Minus,
  GraduationCap
} from "@phosphor-icons/react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface UserData {
  id: number;
  name: string;
  email: string;
}

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
interface Plan {
  id?: number | string;
  subjectId?: string;
  [key: string]: unknown; 
}

interface Semester {
  id: string;
  name: string;
  yearString: string;
  subjects: Subject[];
  iconIndex: number;
  isArchived?: boolean; 
  updatedAt?: number; 
  isDeleted?: boolean; 
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
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSemName, setNewSemName] = useState("");
  const [newSemYear, setNewSemYear] = useState("");

  const getStorageKey = (guest: boolean, user: UserData | null) => {
    return guest ? "unimind-semesters-guest" : `unimind-semesters-${user?.name || "user"}`;
  };
const mergeSemesters = (local: Semester[], server: Semester[]): Semester[] => {
  const mergedMap = new Map<string, Semester>();

  local.forEach(sem => mergedMap.set(sem.id, sem));

  server.forEach(serverSem => {
    const localSem = mergedMap.get(serverSem.id);
    if (!localSem) {
      mergedMap.set(serverSem.id, serverSem);
    } else {
      const localTime = localSem.updatedAt || 0;
      const serverTime = serverSem.updatedAt || 0;
      if (serverTime > localTime) {
        mergedMap.set(serverSem.id, serverSem); 
      }
    }
  });

  return Array.from(mergedMap.values());
};

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      const guestStatus = await localforage.getItem("isGuest") === "true";
      const storedUser = await localforage.getItem<UserData>("userData");
      
      setIsGuest(guestStatus);
      setUserData(storedUser);

      const key = getStorageKey(guestStatus, storedUser);
      let savedSemesters = (await localforage.getItem<Semester[]>(key)) || [];

      // Якщо це не гість і є інтернет, пробуємо взяти нові дані з сервера
      if (!guestStatus && storedUser?.id && navigator.onLine) {
        try {
          const response = await fetch(`${API_URL}/profile/${storedUser.id}`);
          if (response.ok) {
            const dbUser = await response.json();
            if (dbUser.semesters) {
              // ОБ'ЄДНУЄМО ДАНІ!
              savedSemesters = mergeSemesters(savedSemesters, dbUser.semesters);
              // Зберігаємо оновлені дані локально (щоб вони були доступні офлайн)
              await localforage.setItem(key, savedSemesters);
            }
          }
        } catch (e) { 
          console.error("Не вдалося синхронізуватися з сервером при завантаженні:", e); 
        }
      }

      setSemesters(savedSemesters);
      setTimeout(() => setIsLoading(false), 150);
    };
    initData();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const syncData = async () => {
      const key = getStorageKey(isGuest, userData);
      await localforage.setItem(key, semesters);
      if (!isGuest && userData?.id) {
        try {
          const plansKey = `unimind-plans-${userData.name}`;
          const currentPlans = await localforage.getItem(plansKey) || [];
          await fetch(`${API_URL}/sync/all`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: userData.id, semesters, plans: currentPlans }),
          });
        } catch (error) { console.error(error); }
      }
    };
    const timeoutId = setTimeout(syncData, 1000);
    return () => clearTimeout(timeoutId);
  }, [semesters, isGuest, userData, isLoading]);

  const calculateDefaultData = () => {
    const activeSemesters = semesters.filter(sem => !sem.isDeleted);

    let maxNum = 0;
    activeSemesters.forEach(sem => {
      const match = sem.name.match(/Семестр\s+(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    
    const nextName = `Семестр ${maxNum + 1}`;

    if (activeSemesters.length === 0) {
      const today = new Date();
      const year = today.getFullYear();
      const nextYear = today.getMonth() >= 7 ? `${year}/${year + 1} (Осінній)` : `${year - 1}/${year} (Весняний)`;
      return { nextName, nextYear };
    }
    
    const lastSem = activeSemesters[0]; 
    const matchYear = lastSem.yearString.match(/(\d{4})\/(\d{4})\s*\((Осінній|Весняний)\)/);
    let nextYear = lastSem.yearString;
    
    if (matchYear) {
      const startYear = parseInt(matchYear[1], 10);
      const endYear = parseInt(matchYear[2], 10);
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
      iconIndex: Math.floor(Math.random() * semesterIcons.length),
      isArchived: false,
      updatedAt: Date.now()
    };
    setSemesters([newSemester, ...semesters]); 
    setIsModalOpen(false);
  };


const handleDeleteSemester = async (id: string) => {
    // 1. Знаходимо семестр, щоб витягнути ID всіх його предметів
    const semesterToDelete = semesters.find(s => s.id === id);
    const subjectIdsInSemester = semesterToDelete?.subjects.map(sub => sub.id) || [];

    // 2. Оновлюємо стан семестрів (твоя логіка софт-видалення)
    setSemesters(semesters.map(s => 
      s.id === id 
        ? { ...s, isDeleted: true, updatedAt: Date.now() } 
        : s
    ));

    if (subjectIdsInSemester.length > 0) {
      try {
        const guestStatus = (await localforage.getItem("isGuest")) === "true";
        const storedUser = await localforage.getItem<UserData>("userData");
        const plansKey = guestStatus ? "unimind-plans-guest" : `unimind-plans-${storedUser?.name || "user"}`;

const existingPlans: Plan[] = (await localforage.getItem(plansKey)) || [];      

       const updatedPlans = existingPlans.map((p) =>
  p.subjectId && subjectIdsInSemester.includes(p.subjectId)
    ? { ...p, isDeleted: true, updatedAt: Date.now() }
    : p
);
await localforage.setItem(plansKey, updatedPlans);
        
        window.dispatchEvent(new Event("plansUpdated"));
      } catch (error) {
        console.error("Помилка очищення календаря після видалення семестру:", error);
      }
    }
  };

const displaySemesters = [...semesters]
    .filter(sem => !sem.isDeleted)
    .sort((a, b) => {
      if (a.isArchived === b.isArchived) return 0; 
      return a.isArchived ? 1 : -1; 
    });

  if (isLoading) return <div className="semester-page" style={{ opacity: 0 }} />;

  return (
    <motion.div 
      className="semester-page"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }}
    >
      <h2 className="semester-header">Академічний Простір</h2>
      <div className="semesters-grid">
        <AnimatePresence mode="popLayout">
          <motion.div 
            key="add-card"
            className="add-semester-card" 
            onClick={handleOpenModal} 
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="add-sem-btn"><Plus size={28} weight="bold" /></div>
            <span className="add-sem-text">Додати новий семестр</span>
          </motion.div>

          {displaySemesters.map((sem) => {
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

             return (
              <motion.div 
                key={sem.id} 
                className={`semester-card ${sem.isArchived ? "is-archived" : ""}`} 
                onClick={() => { setSelectedSemesterId(sem.id); setCurrentScreen("dashboard"); }}
                initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5 }} 
                transition={{ duration: 0.3, ease: "easeOut" }} 
                layout 
              >
                <button className="delete-sem-btn" onClick={(e) => { e.stopPropagation(); handleDeleteSemester(sem.id); }}>
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
                    <span className="sem-stat-label"><GraduationCap size={18} /> Рейтинг</span>
                    <span className="sem-stat-value">{semesterRating > 0 ? semesterRating : "—"}</span>
                  </div>
                  <div className="sem-stat-row">
                    <span className="sem-stat-label"><Books size={18} /> Предмети</span>
                    <span className="sem-stat-value">{subjects.length + courseWorkCount}</span> 
                  </div>
                </div>
                <div className="sem-progress-section">
                  <div className="sem-progress-text">{tasksCompleted}/{allTasks.length} завдання</div>
                  <div className="sem-progress-bar-bg"><div className="sem-progress-fill" style={{ width: `${progress}%` }} /></div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="sem-modal-overlay" onClick={() => setIsModalOpen(false)}>
            <motion.div 
              className="sem-modal-card" 
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
            >
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
    </motion.div>
  );
};