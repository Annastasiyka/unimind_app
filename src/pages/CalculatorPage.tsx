import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import localforage from "localforage";
import {
  Plus,
  ArrowCounterClockwise,
  CaretDown,
  User,
  X,
  Trash,
  Copy,
  FilePlus,
} from "@phosphor-icons/react";

// --- ІНТЕРФЕЙСИ ---
interface UserData {
  id: number;
  name: string;
  email: string;
}

interface Task {
  id: string;
  name: string;
  type: string;
  score: number | null;
  maxScore: number;
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
  subjects: Subject[];
}

interface SimulatedSubject {
  id: string;
  name: string;
  credits: number;
  grade: number | "";
  lastValidGrade: number | ""; 
  isCourseWork: boolean;
}

interface Profile {
  id: string;
  name: string;
  subjects: SimulatedSubject[];
  bonus: number | ""; 
}

// --- ДОПОМІЖНІ ФУНКЦІЇ ---
const mapSemesterToSimulated = (
  sem: Semester | undefined,
  clearGrades = false,
): SimulatedSubject[] => {
  if (!sem) return [];
  const finalItems: SimulatedSubject[] = [];

  sem.subjects.forEach((s) => {
    const standardTasks = s.tasks.filter((t) => t.type !== "Курсова робота");
    const courseWorkTasks = s.tasks.filter((t) => t.type === "Курсова робота");

    const currentScore = clearGrades
      ? 0
      : standardTasks.reduce((sum, t) => sum + (t.score || 0), 0);

    finalItems.push({
      id: s.id,
      name: s.name,
      credits: s.credits,
      grade: currentScore,
      lastValidGrade: currentScore,
      isCourseWork: false,
    });

    courseWorkTasks.forEach((cw) => {
      const cwScore = clearGrades ? 0 : cw.score || 0;
      finalItems.push({
        id: cw.id,
        name: `Курсова робота: ${s.name}`,
        credits: cw.credits || 0,
        grade: cwScore,
        lastValidGrade: cwScore,
        isCourseWork: true,
      });
    });
  });
  return finalItems;
};

const syncSubjects = (
  realSubjects: SimulatedSubject[],
  currentSimulated: SimulatedSubject[],
) => {
  return realSubjects.map((realSub) => {
    const existingSub = currentSimulated.find((s) => s.id === realSub.id);
    if (existingSub) {
      const hasRealChanged = realSub.grade !== existingSub.lastValidGrade;
      return {
        ...realSub,
        grade: hasRealChanged ? realSub.grade : existingSub.grade,
        lastValidGrade: realSub.grade,
      };
    }
    return realSub;
  });
};

export const CalculatorPage = () => {
  // --- СТАНИ (STATES) ---
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  
  const [allSemesters, setAllSemesters] = useState<Semester[]>([]);
  const [selectedSemId, setSelectedSemId] = useState<string>("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>("me");
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSemDropdownOpen, setIsSemDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // --- 1. ІНІЦІАЛІЗАЦІЯ ---
  useEffect(() => {
    const initCalc = async () => {
      setIsLoading(true);
      const guestStatus = await localforage.getItem("isGuest") === "true";
      const storedUser = await localforage.getItem<UserData>("userData");
      
      setIsGuest(guestStatus);
      setUserData(storedUser);

      const namePart = guestStatus ? "guest" : (storedUser?.name || "user");
      const storageKey = `unimind-semesters-${namePart}`;
      const simulationsKey = `unimind-simulations-${namePart}`;

      const savedSemesters = await localforage.getItem<Semester[]>(storageKey) || [];
      const savedSims = await localforage.getItem<Profile[]>(simulationsKey);

      setAllSemesters(savedSemesters);

      // ВИПРАВЛЕННЯ: Тепер автоматично беремо перший семестр у списку (індекс 0), бо він найновіший
      const initialSemId = savedSemesters.length > 0 ? savedSemesters[0].id : "";
      
      setSelectedSemId(initialSemId);

      const currentSem = savedSemesters.find(s => s.id === initialSemId);
      const realMapped = mapSemesterToSimulated(currentSem);

      if (savedSims && savedSims.length > 0) {
        const syncedProfiles = savedSims.map(p => {
          if (p.id === "me" && currentSem) {
            return { ...p, subjects: syncSubjects(realMapped, p.subjects) };
          }
          return p;
        });
        setProfiles(syncedProfiles);
      } else {
        setProfiles([{ id: "me", name: "Мій рейтинг", subjects: realMapped, bonus: 0 }]);
      }

      setTimeout(() => setIsLoading(false), 100);
    };

    initCalc();
  }, []);

  // --- 2. ЗБЕРЕЖЕННЯ ---
  useEffect(() => {
    if (isLoading) return;
    const saveData = async () => {
      const namePart = isGuest ? "guest" : (userData?.name || "user");
      await localforage.setItem(`unimind-simulations-${namePart}`, profiles);
      if (selectedSemId) {
        await localforage.setItem(`unimind-semesters-${namePart}-last-id`, selectedSemId);
      }
    };
    saveData();
  }, [profiles, selectedSemId, isGuest, userData, isLoading]);

  // --- 3. ОБЧИСЛЕННЯ ---
  const activeProfile = useMemo(() => {
    return profiles.find((p) => p.id === activeProfileId) || profiles[0] || { subjects: [], bonus: 0 };
  }, [profiles, activeProfileId]);

  const selectedSemester = useMemo(() => {
    return allSemesters.find((s) => s.id === selectedSemId);
  }, [allSemesters, selectedSemId]);

  const currentRating = useMemo(() => {
    if (!activeProfile?.subjects || activeProfile.subjects.length === 0) return 0;
    const weightedSum = activeProfile.subjects.reduce(
      (sum, s) => sum + (Number(s.grade) || 0) * s.credits,
      0,
    );
    return parseFloat((0.95 * (weightedSum / 30) + 0.05 * Number(activeProfile.bonus || 0)).toFixed(2));
  }, [activeProfile]);

  const totalCredits = useMemo(() => {
    return activeProfile?.subjects?.reduce((sum, s) => sum + s.credits, 0) || 0;
  }, [activeProfile]);

  // --- 4. ОБРОБНИКИ ПОДІЙ ---
  const handleSemesterChange = (id: string) => {
    setSelectedSemId(id);
    const newSem = allSemesters.find((s) => s.id === id);
    if (newSem) {
      const newSubjects = mapSemesterToSimulated(newSem);
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === "me" ? { ...p, subjects: syncSubjects(newSubjects, p.subjects) } : p,
        ),
      );
    }
  };

  const handleAddProfile = (mode: "copy" | "fresh") => {
    if (profiles.length >= 4) return;
    const newId = crypto.randomUUID();
    const newSubjects = mode === "copy" ? mapSemesterToSimulated(selectedSemester, true) : [];
    setProfiles((prev) => [...prev, {
      id: newId,
      name: `Нові розрахунки`,
      subjects: newSubjects,
      bonus: 0,
    }]);
    setActiveProfileId(newId);
    setShowAddModal(false);
  };

  const removeProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    setActiveProfileId("me");
  };

  const addSubjectToProfile = () => {
    const newSub: SimulatedSubject = {
      id: crypto.randomUUID(),
      name: "Новий предмет",
      credits: 3,
      grade: 0,
      lastValidGrade: 0,
      isCourseWork: false,
    };
    setProfiles((prev) => prev.map((p) =>
      p.id === activeProfileId ? { ...p, subjects: [...p.subjects, newSub] } : p,
    ));
  };

  const updateSubject = <K extends keyof SimulatedSubject>(
    id: string,
    field: K,
    value: SimulatedSubject[K],
  ) => {
    setProfiles((prev) => prev.map((p) =>
      p.id === activeProfileId
        ? {
            ...p,
            subjects: p.subjects.map((s) => s.id === id ? { ...s, [field]: value } : s),
          }
        : p,
    ));
  };

  const deleteSubject = (id: string) => {
    setProfiles((prev) => prev.map((p) =>
      p.id === activeProfileId ? { ...p, subjects: p.subjects.filter((s) => s.id !== id) } : p,
    ));
  };

  const handleBlur = (id: string) => {
    setProfiles((prev) => prev.map((p) => {
      if (p.id === activeProfileId) {
        const updatedSubjects = p.subjects.map((s) =>
          s.id === id && s.grade === "" ? { ...s, grade: s.lastValidGrade } : s,
        );
        return { ...p, subjects: updatedSubjects };
      }
      return p;
    }));
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- 5. КОНТРОЛЬОВАНІ РЕТУРНИ ---

  if (isLoading) {
    return <div className="calc-container" style={{ opacity: 0 }} />;
  }

  if (allSemesters.length === 0) {
    return (
      <motion.div 
        className="empty-dash-state" 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ height: "80dvh", display: "flex", flexDirection: "column", gap: "20px", justifyContent: "center", alignItems: "center" }}
      >
        <p>Спочатку додайте дані в основному розділі</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={`calc-container ${isMobile ? "mobile-v" : ""}`}
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }}
    >
      <header className="calc-top-header">
        <h1 style={isMobile ? { fontSize: "20px", lineHeight: "1.2", marginBottom: "8px", textAlign: "center" } : {}}>
          Інструмент для прогнозування рейтингу
        </h1>
        <p className="calc-description" style={isMobile ? { fontSize: "14px", lineHeight: "1.4", margin: "0 auto", textAlign: "center", padding: "0 10px" } : {}}>
          Отримайте свої бали в реальному часі або спрогнозуйте результати, змінюючи оцінки та плани.
        </p>
      </header>

      {/* Селектор семестру (Мобільна версія) */}
{isMobile && (
  <div className="mobile-sem-selector" style={{ marginBottom: "15px", padding: "0 15px" }}>
    {/* Контейнер тепер має фіксовану ширину та центрований */}
    <div 
      className="custom-select-container compact" 
      style={{ 
        position: "relative", 
        width: "160px", 
        margin: "0 auto" ,
        

      }}
    >
      <button
        className="custom-select-trigger"
        onClick={() => setIsSemDropdownOpen(!isSemDropdownOpen)}
        style={{
          width: "auto", 
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "12px 20px",
          borderRadius: "16px",
          backgroundColor: "white",
          border: "1px solid rgba(0, 0, 0, 0.1)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
          fontSize: "15px",
          fontWeight: "600",
          height: "auto",
          outline: "none",
        }}
      >
        <span>{selectedSemester?.name || "Оберіть семестр"}</span>
        <CaretDown size={16} className={isSemDropdownOpen ? "rotate" : ""} style={{ position: "static" }} />
      </button>

      <AnimatePresence>
        {isSemDropdownOpen && (
          <motion.div 
            className="custom-select-options downwards" 
            initial={{ opacity: 0, y: -5 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -5 }} 
            // Список тепер займає 100% ширини контейнера (280px) і починається від лівого краю
            style={{ 
              left: 0, 
              width: "100%",
              top: "calc(100% + 5px)" 
            }}
          >
            {allSemesters.map((sem) => (
              <div 
                key={sem.id} 
                className="custom-option" 
                onClick={() => { handleSemesterChange(sem.id); setIsSemDropdownOpen(false); }}
              >
                {sem.name}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
)}

      <div className="calc-top-section">
        <div className="calc-controls-row">
          <div className="calc-tabs-container" style={isMobile ? { overflowX: "auto", whiteSpace: "nowrap" } : {}}>
            {profiles.map((p) => (
              <div key={p.id} className={`calc-tab-item ${activeProfileId === p.id ? "active" : ""}`} onClick={() => setActiveProfileId(p.id)}>
                <User size={16} weight={activeProfileId === p.id ? "fill" : "bold"} />
                <span>{p.name}</span>
                {p.id !== "me" && <X size={16} weight="bold" className="dash-action-icon" style={{ marginLeft: "5px" }} onClick={(e) => removeProfile(p.id, e)} />}
              </div>
            ))}
            {profiles.length < 4 && (
              <button className="add-tab-btn" onClick={() => setShowAddModal(true)} style={isMobile ? { minWidth: "fit-content" } : {}}>
                <Plus size={18} weight="bold" /> {!isMobile && "Додати"}
              </button>
            )}
          </div>

          {!isMobile && (
            <div className="sem-selector-compact">
              <span className="sem-label">Семестр:</span>
              <div className="custom-select-container compact">
                <button className="custom-select-trigger" onClick={() => setIsSemDropdownOpen(!isSemDropdownOpen)}>
                  <span>{selectedSemester?.name || "Оберіть..."}</span>
                  <CaretDown size={14} style={{ position: "relative", top: "2px" }} className={isSemDropdownOpen ? "rotate" : ""} />
                </button>
                <AnimatePresence>
                  {isSemDropdownOpen && (
                    <motion.div className="custom-select-options downwards" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                      {allSemesters.map((sem) => (
                        <div key={sem.id} className="custom-option" onClick={() => { handleSemesterChange(sem.id); setIsSemDropdownOpen(false); }}>
                          {sem.name}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        <section className="formula-card-refined" style={isMobile ? { minHeight: "auto" } : {}}>
          <div className="formula-img-wrapper">
            <img
              src={isMobile 
                ? "https://latex.codecogs.com/svg.image?\\small&space;R=0.95\\times\\left(\\frac{\\sum(G\\times&space;C)}{30}\\right)&plus;0.05\\times&space;B" 
                : "https://latex.codecogs.com/svg.image?\\small&space;R=0.95\\times\\left(\\frac{\\sum(Grade\\times&space;Credit)}{30}\\right)&plus;0.05\\times&space;Bonus"
              }
              alt="formula"
              style={isMobile ? { maxHeight: "45px" } : {}}
            />
          </div>
          <div className="formula-legend-refined" style={isMobile ? { fontSize: "13px", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px" } : {}}>
            {isMobile ? (
              <><span><b>R</b>-рейтинг</span><span><b>G</b>-бали</span><span><b>C</b>-кредити</span><span><b>B</b>-дод.</span></>
            ) : (
              <><span><b>R</b> — рейтинг</span><span><b>Grade</b> — бали</span><span><b>Credit</b> — кредити</span><span><b>Bonus</b> — дод. бали</span></>
            )}
          </div>
        </section>
      </div>

      <div className="calc-main-grid" style={isMobile ? { gap: "15px", height: "auto" } : {}}>
        <div className="rating-display-card">
          <h3 style={isMobile ? { fontSize: "16px", margin: "0 0 25px 0", textAlign: "center", width: "100%" } : {}}>
            Прогноз рейтингу
          </h3>
          <div className="gauge-wrapper" style={isMobile ? { width: "140px", height: "140px", margin: "5px auto", marginTop: "-15px" } : {}}>
            <svg viewBox="0 0 100 100" className="gauge">
              <circle className="gauge-bg" cx="50" cy="50" r="45" />
              <motion.circle 
                className="gauge-fill" cx="50" cy="50" r="45" 
                initial={{ strokeDasharray: "0 283" }} 
                animate={{ strokeDasharray: `${(currentRating / 100) * 283} 283` }} 
                transition={{ duration: 0.8 }} 
              />
            </svg>
            <div className="gauge-text">
              <span className="rating-value" style={isMobile ? { fontSize: "24px" } : {}}>{currentRating}</span>
              <span className="rating-max">/ 100</span>
            </div>
          </div>
        </div>

        <div className="subjects-card">
          <div className="subjects-table-header">
            <span>Предмет</span><span>Бали</span><span>Кредити</span><span></span>
          </div>

          <div className="subjects-list-scroll">
            {activeProfile.subjects.map((s) => (
              <div key={s.id} className={`subject-row-input ${s.isCourseWork ? "coursework-row" : ""}`}>
                <input 
                  type="text" className="sub-name-input" value={s.name} 
                  onChange={(e) => updateSubject(s.id, "name", e.target.value)} 
                  disabled={activeProfileId === "me"} 
                />
                <div className="input-wrapper-centered" style={isMobile ? { width: "50px" } : {}}>
                  <input
                    type="text" className="calc-input-small" value={s.grade}
                    style={isMobile ? { textAlign: "center", width: "100%" } : {}}
                    onChange={(e) =>
                      updateSubject(s.id, "grade", e.target.value === "" ? "" : Math.min(100, parseInt(e.target.value) || 0))
                    }
                    onBlur={() => handleBlur(s.id)}
                  />
                </div>
                <div className="input-wrapper-centered credits-shift">
                  <input 
                    type="text" className="calc-input-small" value={s.credits} 
                    onChange={(e) => updateSubject(s.id, "credits", parseInt(e.target.value) || 0)} 
                    disabled={activeProfileId === "me"} 
                  />
                </div>
                {activeProfileId !== "me" && (
                  <Trash size={18} weight="duotone" className="dash-action-icon" style={{ justifySelf: "center" }} onClick={() => deleteSubject(s.id)} />
                )}
              </div>
            ))}
            {activeProfileId !== "me" && (
              <button className="add-sub-inline" onClick={addSubjectToProfile}>
                <Plus size={14} weight="bold" /> Додати предмет
              </button>
            )}
          </div>

          <div className="bonus-row-calc">
            <span className="subject-name">Додаткові бали</span>
            <div className="bonus-input-group">
              <input 
                type="text" className="calc-input-small" value={activeProfile.bonus} 
                onChange={(e) => {
                  const val = e.target.value === "" ? "" : Math.min(100, parseInt(e.target.value) || 0);
                  setProfiles((prev) => prev.map((p) => p.id === activeProfileId ? { ...p, bonus: val } : p));
                }} 
              />
              <span className="rating-max">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="sem-modal-overlay" onClick={() => setShowAddModal(false)}>
            <motion.div className="choice-modal-card" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <h3>Новий розрахунок</h3>
              <div className="choice-grid">
                <button className="choice-btn" onClick={() => handleAddProfile("copy")}><Copy size={32} weight="duotone" /><span>Копіювати мої предмети</span></button>
                <button className="choice-btn" onClick={() => handleAddProfile("fresh")}><FilePlus size={32} weight="duotone" /><span>Почати заново</span></button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="simulation-footer" style={isMobile ? { display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: "10px 15px", gap: "10px" } : {}}>
        <div className="sim-status" style={isMobile ? { margin: 0, display: "flex", alignItems: "center", gap: "8px" } : {}}>
          <div className="sim-icon" style={isMobile ? { margin: 0 } : {}}>✨</div>
          <div style={isMobile ? { display: "flex", alignItems: "center", gap: "5px" } : {}}>
            <strong style={{ whiteSpace: "nowrap" }}>{activeProfile.name}:</strong>
            <p style={isMobile ? { margin: 0, display: "inline", color: "var(--accent-color)"} : {}}>{totalCredits} / 30 кр.</p>
          </div>
        </div>
        <div className="footer-actions" style={isMobile ? { margin: 0 } : { display: "flex", flexDirection: "row", alignItems: "center", gap: "15px" }}>
          {!isMobile && activeProfileId !== "me" && <span className="reset-hint" style={{ whiteSpace: "nowrap" }}>Скидання доступне лише для вашого рейтингу</span>}
          <button
            onClick={() => setProfiles((prev) => prev.map((p) => 
              p.id === activeProfileId ? { ...p, subjects: mapSemesterToSimulated(selectedSemester) } : p
            ))}
            className="btn-outline"
            disabled={activeProfileId !== "me"}
            style={isMobile ? { padding: "6px 12px", height: "auto", fontSize: "15px", display: "flex", alignItems: "center", gap: "5px", minWidth: "fit-content" } : {}}
          >
            <ArrowCounterClockwise size={isMobile ? 14 : 18} weight="bold" /> {isMobile ? "Скинути" : "Скинути до реальних"}
          </button>
        </div>
      </footer>
    </motion.div>
  );
};