import { useState, useEffect, useRef } from "react";

type Plan = {
  id: number | string;
  text: string;
  completed: boolean;
  date: string;
  type: string;
  time?: string;
};

export const CalendarPage = () => {
  const [isLoggedIn] = useState(() => {
    const isGuest = localStorage.getItem("isGuest") === "true";
    const userData = localStorage.getItem("userData");
    return !isGuest && !!userData;
  });

  const storageKey = (() => {
    if (!isLoggedIn) return "unimind-plans-guest";
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const name = userData.name || "user";
    return `unimind-plans-${name}`;
  })();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayPlans, setSelectedDayPlans] = useState<number | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState<"year" | "month">("year");
  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const categories = ["Особисте", "Навчання", "Лабораторна", "Робота"];
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

  const [plans, setPlans] = useState<Plan[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Помилка парсингу планів:", e);
      return [];
    }
  });

  const [newPlanText, setNewPlanText] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();

  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [planType, setPlanType] = useState("Особисте");
  const [planTime, setPlanTime] = useState("");
  const [hasFetched, setHasFetched] = useState(false);
  
  const [editingPlanId, setEditingPlanId] = useState<number | string | null>(null);
  const [editText, setEditText] = useState("");
  const [editType, setEditType] = useState("Особисте");
  const [editTime, setEditTime] = useState("");

  const dateKey = selectedDayPlans !== null ? `${selectedDayPlans}-${viewMonth}-${viewYear}` : "";

  // --- ЕФЕКТИ (ПРАВИЛЬНО РОЗДІЛЕНІ) ---

  // 1. Завантаження планів з БД при вході
  useEffect(() => {
    const fetchPlansFromDB = async () => {
      const isGuestMode = localStorage.getItem("isGuest") === "true";
      const userDataString = localStorage.getItem("userData");
      const userData = userDataString ? JSON.parse(userDataString) : {};

      if (isGuestMode || !userData.id || hasFetched) return;

      try {
        const response = await fetch(`http://127.0.0.1:5000/api/profile/${userData.id}`);
        const dbUser = await response.json();
        
        if (response.ok && dbUser.plans && dbUser.plans.length > 0) {
          if (plans.length === 0) {
            setPlans(dbUser.plans);
          }
        }
        setHasFetched(true);
      } catch (error) {
        console.error("Не вдалося підтягнути плани з бази", error);
        setHasFetched(true);
      }
    };

    fetchPlansFromDB();
  }, [hasFetched, plans.length]);

  // 2. Збереження в LocalStorage та синхронізація з сервером
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(plans));

    const syncWithServer = async () => {
      const isGuestMode = localStorage.getItem("isGuest") === "true";
      const userDataString = localStorage.getItem("userData");
      const userData = userDataString ? JSON.parse(userDataString) : {};

      if (!isGuestMode && userData.id) {
        try {
          const semestersKey = `unimind-semesters-${userData.name || "user"}`;
          const currentSemesters = JSON.parse(localStorage.getItem(semestersKey) || "[]");

          await fetch("http://127.0.0.1:5000/api/sync/all", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: userData.id,
              plans: plans,
              semesters: currentSemesters
            }),
          });
        } catch (error) {
          console.error("Синхронізація календаря не вдалася:", error);
        }
      }
    };

    const timeoutId = setTimeout(syncWithServer, 1000);
    return () => clearTimeout(timeoutId);
  }, [plans, storageKey]);

  // 3. Закриття пікера при кліку зовні
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

  // --- ЛОГІКА КАЛЕНДАРЯ ---

  const getCategoryClass = (type: string) => {
    switch (type) {
      case "Навчання": return "cat-study";
      case "Лабораторна": return "cat-lab";
      case "Робота": return "cat-work";
      default: return "cat-personal";
    }
  };

  const dayPlans = plans
    .filter((p) => p.date === dateKey)
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
    };
    setPlans([...plans, plan]);
    setNewPlanText("");
    setPlanTime("");
    setIsAddingPlan(false);
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
        p.id === id ? { ...p, text: editText, type: editType, time: editTime } : p,
      ),
    );
    setEditingPlanId(null);
  };

  const togglePlan = (id: number | string) =>
    setPlans(plans.map((p) => (p.id === id ? { ...p, completed: !p.completed } : p)));

  const deletePlan = (id: number | string) =>
    setPlans(plans.filter((p) => p.id !== id));

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



  return (
    <div className="calendar-page">
      <div className="Calendar-message">
        <p>Твій простір подій</p>
      </div>

      <div className="calendar-layout">
        <aside className="calendar-sidebar">
          {!isLoggedIn && (
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
          {/* Навігація по місяцях */}
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
              {monthLabel}
            </h2>
            <button className="calendar-date" onClick={() => changeMonth(1)}>
              ›
            </button>
          </div>

          {/* Вибір Року та Місяця (Picker) */}
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
                        key={y}
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
                        key={m}
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

          {/* Сітка календаря */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "10px",
            }}
          >
            {weekDays.map((day) => (
              <div className="week" key={day}>
                {day}
              </div>
            ))}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} style={{ height: "100px" }}></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNumber = i + 1;
              const dateStr = `${dayNumber}-${viewMonth}-${viewYear}`;
              const plansForThisDay = plans
                .filter((p) => p.date === dateStr && !p.completed)
                .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

              return (
                <div
                  key={dayNumber}
                  className={`calendar-day ${isToday(dayNumber) ? "selected" : ""}`}
                  onClick={() => setSelectedDayPlans(dayNumber)}
                >
                  <span className="day-number">{dayNumber}</span>
                  {plansForThisDay.length > 0 && (
                    <div className="mini-plans-grid">
                      {plansForThisDay.slice(0, 3).map((plan) => (
                        <div
                          key={plan.id}
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

      {/* Модальне вікно планів на обраний день */}
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
                ? dayPlans.map((plan) =>
                    editingPlanId === plan.id ? (
                      <div key={plan.id} className="edit-plan-inline-block">
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
                          {/* Вибір часу */}
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
                                        key={h}
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
                                        key={m}
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
                                  className="time-done-btn"
                                  onClick={() => setActiveDropdown(null)}
                                >
                                  Готово
                                </button>
                              </div>
                            )}
                          </div>
                          {/* Вибір категорії */}
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
                                {categories.map((cat) => (
                                  <li
                                    key={cat}
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
                        key={plan.id}
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

            {/* Додавання нового плану */}
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
                                key={h}
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
                                key={m}
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
                        {categories.map((cat) => (
                          <li
                            key={cat}
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
    </div>
  );
};
