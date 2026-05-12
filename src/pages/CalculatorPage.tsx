import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

// --- ТИПИ ---
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
  lastValidGrade: number;
  isCourseWork: boolean;
}

interface Profile {
  id: string;
  name: string;
  subjects: SimulatedSubject[];
  bonus: number;
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

const syncSubjects = (realSubjects: SimulatedSubject[], currentSimulated: SimulatedSubject[]) => {
  return realSubjects.map(realSub => {
    const existingSub = currentSimulated.find(s => s.id === realSub.id);
    if (existingSub) {
      return {
        ...realSub,
        grade: existingSub.grade,
        lastValidGrade: existingSub.lastValidGrade
      };
    }
    return realSub;
  });
};

export const CalculatorPage = () => {
  const isGuest = localStorage.getItem("isGuest") === "true";
  const userDataString = localStorage.getItem("userData");
  const userData = userDataString ? JSON.parse(userDataString) : {};
  
  const storageKey = isGuest ? "unimind-semesters-guest" : `unimind-semesters-${userData.name || "user"}`;
  const simulationsKey = isGuest ? "unimind-simulations-guest" : `unimind-simulations-${userData.name || "user"}`;
  const lastSemIdKey = `${storageKey}-last-id`;

  const [allSemesters] = useState<Semester[]>(() =>
    JSON.parse(localStorage.getItem(storageKey) || "[]"),
  );

  const [selectedSemId, setSelectedSemId] = useState<string>(() => {
    const savedId = localStorage.getItem(lastSemIdKey);
    if (savedId && allSemesters.some(s => s.id === savedId)) return savedId;
    return allSemesters.length > 0 ? allSemesters[allSemesters.length - 1].id : "";
  });

  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const savedSimsRaw = localStorage.getItem(simulationsKey);
    const currentSem = allSemesters.find((s) => s.id === selectedSemId);
    
    if (savedSimsRaw) {
      try {
        const savedProfiles: Profile[] = JSON.parse(savedSimsRaw);
        return savedProfiles.map(p => {
          if (p.id === "me" && currentSem) {
            return { ...p, subjects: syncSubjects(mapSemesterToSimulated(currentSem), p.subjects) };
          }
          return p;
        });
      } catch (e) {
        console.error("Error restoration simulation:", e);
      }
    }
    
    return [
      {
        id: "me",
        name: "Мій рейтинг",
        subjects: mapSemesterToSimulated(currentSem),
        bonus: 0,
      },
    ];
  });

  const [activeProfileId, setActiveProfileId] = useState<string>("me");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSemDropdownOpen, setIsSemDropdownOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(simulationsKey, JSON.stringify(profiles));
  }, [profiles, simulationsKey]);

  useEffect(() => {
    if (selectedSemId) localStorage.setItem(lastSemIdKey, selectedSemId);
  }, [selectedSemId, lastSemIdKey]);

  const handleSemesterChange = (id: string) => {
    setSelectedSemId(id);
    const newSem = allSemesters.find(s => s.id === id);
    if (newSem) {
      const newSubjects = mapSemesterToSimulated(newSem);
      setProfiles(prev => prev.map(p => 
        p.id === "me" ? { ...p, subjects: syncSubjects(newSubjects, p.subjects) } : p
      ));
    }
  };

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];
  const selectedSemester = allSemesters.find((s) => s.id === selectedSemId);

  const currentRating = useMemo(() => {
    const weightedSum = activeProfile.subjects.reduce(
      (sum, s) => sum + (Number(s.grade) || 0) * s.credits,
      0,
    );
    const totalCr = activeProfile.subjects.reduce((sum, s) => sum + s.credits, 0);
    if (totalCr === 0) return 0;
    return parseFloat(
      (0.95 * (weightedSum / totalCr) + 0.05 * activeProfile.bonus).toFixed(2),
    );
  }, [activeProfile]);

  const totalCredits = activeProfile.subjects.reduce((sum, s) => sum + s.credits, 0);

  const handleAddProfile = (mode: "copy" | "fresh") => {
    if (profiles.length >= 4) return;
    const newId = crypto.randomUUID();
    const newSubjects = mode === "copy" ? mapSemesterToSimulated(selectedSemester, true) : [];
    setProfiles([
      ...profiles,
      {
        id: newId,
        name: `Нові розрахунки`,
        subjects: newSubjects,
        bonus: 0,
      },
    ]);
    setActiveProfileId(newId);
    setShowAddModal(false);
  };

  const removeProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProfiles(profiles.filter((p) => p.id !== id));
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
    setProfiles(profiles.map((p) =>
      p.id === activeProfileId ? { ...p, subjects: [...p.subjects, newSub] } : p,
    ));
  };

  const updateSubject = <K extends keyof SimulatedSubject>(
    id: string,
    field: K,
    value: SimulatedSubject[K],
  ) => {
    setProfiles(profiles.map((p) =>
      p.id === activeProfileId
        ? {
            ...p,
            subjects: p.subjects.map((s) => s.id === id ? { ...s, [field]: value } : s),
          }
        : p,
    ));
  };

  const deleteSubject = (id: string) => {
    setProfiles(profiles.map((p) =>
      p.id === activeProfileId ? { ...p, subjects: p.subjects.filter((s) => s.id !== id) } : p,
    ));
  };

  const handleBlur = (id: string) => {
    const updatedSubjects = activeProfile.subjects.map((s) =>
      s.id === id && s.grade === "" ? { ...s, grade: s.lastValidGrade } : s,
    );
    setProfiles(profiles.map((p) =>
      p.id === activeProfileId ? { ...p, subjects: updatedSubjects } : p,
    ));
  };

  if (allSemesters.length === 0) {
    return (
      <div className="empty-dash-state" style={{ height: "80dvh", display: "flex", flexDirection: "column", gap: "20px", justifyContent: "center", alignItems: "center" }}>
        <p>Спочатку додайте дані в основному розділі</p>
      </div>
    );
  }

  return (
    <div className="calc-container">
      <header className="calc-top-header">
        <h1>Інструмент для прогнозування рейтингу</h1>
        <p className="calc-description">
          Отримайте свої бали в реальному часі або спрогнозуйте свої чи друга
          бали, змінюючи оцінки та плани.
        </p>
      </header>

      <div className="calc-top-section">
        <div className="calc-controls-row">
          <div className="calc-tabs-container">
            {profiles.map((p) => (
              <div
                key={p.id}
                className={`calc-tab-item ${activeProfileId === p.id ? "active" : ""}`}
                onClick={() => setActiveProfileId(p.id)}
              >
                <User size={16} weight={activeProfileId === p.id ? "fill" : "bold"} />
                <span>{p.name}</span>
                {p.id !== "me" && (
                  <X 
                    size={16} 
                    weight="bold" 
                    className="dash-action-icon" 
                    style={{ marginLeft: '5px' }}
                    onClick={(e) => removeProfile(p.id, e)} 
                  />
                )}
              </div>
            ))}
            {profiles.length < 4 && (
              <button className="add-tab-btn" onClick={() => setShowAddModal(true)}>
                <Plus size={18} weight="bold" /> Додати
              </button>
            )}
          </div>

          <div className="sem-selector-compact">
            <span className="sem-label">Семестр:</span>
            <div className="custom-select-container compact">
              <button className="custom-select-trigger" onClick={() => setIsSemDropdownOpen(!isSemDropdownOpen)}>
                <span>{selectedSemester?.name}</span>
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
        </div>

        <section className="formula-card-refined">
          <div className="formula-img-wrapper">
            <img src="https://latex.codecogs.com/svg.image?\small&space;R=0.95\times\left(\frac{\sum(Grade\times&space;Credit)}{\sum&space;Credit}\right)&plus;0.05\times&space;Bonus" alt="formula" />
          </div>
          <div className="formula-legend-refined">
            <span><b>R</b> — рейтинг</span>
            <span><b>Grade</b> — бали</span>
            <span><b>Credit</b> — кредити</span>
            <span><b>Bonus</b> — дод. бали</span>
          </div>
        </section>
      </div>

      <div className="calc-main-grid">
        <div className="rating-display-card">
          <h3>Прогноз рейтингу</h3>
          <div className="gauge-wrapper">
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
              <span className="rating-value">{currentRating}</span>
              <span className="rating-max">/ 100</span>
            </div>
          </div>
        </div>

        <div className="subjects-card">
          <div className="subjects-table-header">
            <span>Предмет</span>
            <span>Бали</span>
            <span>Кредити</span>
            <span></span>
          </div>

          <div className="subjects-list-scroll">
            {activeProfile.subjects.map((s) => (
              <div key={s.id} className={`subject-row-input ${s.isCourseWork ? "coursework-row" : ""}`}>
                <input
                  type="text" className="sub-name-input" value={s.name}
                  onChange={(e) => updateSubject(s.id, "name", e.target.value)}
                  disabled={activeProfileId === "me"}
                />
                <div className="input-wrapper-centered">
                  <input
                    type="text" className="calc-input-small" value={s.grade}
                    onChange={(e) => updateSubject(s.id, "grade", e.target.value === "" ? "" : Math.min(100, parseInt(e.target.value) || 0))}
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
                  <Trash
                    size={18} weight="duotone" className="dash-action-icon"
                    style={{ justifySelf: "center" }} onClick={() => deleteSubject(s.id)}
                  />
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
                onChange={(e) => setProfiles(profiles.map((p) => p.id === activeProfileId ? { ...p, bonus: Math.min(100, parseInt(e.target.value) || 0) } : p))}
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
              <p>Як ви хочете заповнити нові дані?</p>
              <div className="choice-grid">
                <button className="choice-btn" onClick={() => handleAddProfile("copy")}>
                  <Copy size={32} weight="duotone" />
                  <span>Копіювати мої предмети</span>
                  <small>(бали будуть скинуті)</small>
                </button>
                <button className="choice-btn" onClick={() => handleAddProfile("fresh")}>
                  <FilePlus size={32} weight="duotone" />
                  <span>Почати заново</span>
                  <small>(чистий список)</small>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="simulation-footer">
        <div className="sim-status">
          <div className="sim-icon">✨</div>
          <div>
            <strong>Профіль: {activeProfile.name}</strong>
            <p>Кредити: {totalCredits} / 30</p>
          </div>
        </div>

        <div className="footer-actions" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px' }}>
          {activeProfileId !== "me" && (
            <span className="reset-hint" style={{ whiteSpace: 'nowrap' }}>Скидання доступне лише для вашого рейтингу</span>
          )}
          <button
            onClick={() => setProfiles(profiles.map((p) => p.id === activeProfileId ? { ...p, subjects: mapSemesterToSimulated(selectedSemester), bonus: 0 } : p))}
            className="btn-outline" disabled={activeProfileId !== "me"}
          >
            <ArrowCounterClockwise size={18} weight="bold" /> Скинути до реальних
          </button>
        </div>
      </footer>
    </div>
  );
};