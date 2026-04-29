import { useState, useEffect, useRef } from "react";

type SyncMode = "local-only" | "google-sync";
type Plan = {
  id: number;
  text: string;
  completed: boolean;
  date: string;
  type: string;
  time?: string;
};

export const CalendarPage = () => {
  const [isLoggedIn] = useState(false);
  const [syncMode, setSyncMode] = useState<SyncMode | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayPlans, setSelectedDayPlans] = useState<number | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState<"year" | "month">("year");
  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const categories = ["Особисте", "Навчання", "Лабораторна", "Робота"];
  const hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0"),
  );
  const minutes = Array.from({ length: 12 }, (_, i) =>
    (i * 5).toString().padStart(2, "0"),
  );

  const [plans, setPlans] = useState<Plan[]>(() => {
    const saved = localStorage.getItem("unimind-plans");
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
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editType, setEditType] = useState("Особисте");
  const [editTime, setEditTime] = useState("");

  const dateKey =
    selectedDayPlans !== null
      ? `${selectedDayPlans}-${viewMonth}-${viewYear}`
      : "";

  const getCategoryClass = (type: string) => {
    switch (type) {
      case "Навчання":
        return "cat-study";
      case "Лабораторна":
        return "cat-lab";
      case "Робота":
        return "cat-work";
      default:
        return "cat-personal";
    }
  };

  const dayPlans = plans
    .filter((p) => p.date === dateKey)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time && !b.time) return -1;
      if (!a.time && b.time) return 1;
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

  const saveEdit = (id: number) => {
    setPlans(
      plans.map((p) =>
        p.id === id
          ? { ...p, text: editText, type: editType, time: editTime }
          : p,
      ),
    );
    setEditingPlanId(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setIsPickerOpen(false);
        setPickerStep("year");
      }
    };
    if (isPickerOpen)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPickerOpen]);

  useEffect(() => {
    localStorage.setItem("unimind-plans", JSON.stringify(plans));
  }, [plans]);

  const monthLabel = new Intl.DateTimeFormat("uk-UA", { month: "long" }).format(
    currentDate,
  );
  const allMonths = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat("uk-UA", { month: "long" }).format(
      new Date(2026, i, 1),
    ),
  );
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  let firstDayIndex = new Date(viewYear, viewMonth, 1).getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6;
  const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

  const changeMonth = (offset: number) =>
    setCurrentDate(new Date(viewYear, viewMonth + offset, 1));
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
  const togglePlan = (id: number) =>
    setPlans(
      plans.map((p) => (p.id === id ? { ...p, completed: !p.completed } : p)),
    );
  const deletePlan = (id: number) => setPlans(plans.filter((p) => p.id !== id));

  return (
    <div className="calendar-page">
      <div className="Calendar-message">
        <p>{isLoggedIn ? "Керування розкладом" : "Твій простір подій"}</p>
      </div>

      <div className="calendar-layout">
        <aside className="calendar-sidebar">
          <div className="card-glass">
            {!isLoggedIn ? (
              <div className="status-info">
                <p>
                  Дані зберігаються локально. Для синхронізації з Google
                  увійдіть у Профілі.
                </p>
              </div>
            ) : (
              <div className="auth-settings">
                <button
                  className={`calendar-day ${syncMode === "local-only" ? "selected" : ""}`}
                  onClick={() => setSyncMode("local-only")}
                >
                  Тільки UniMind
                </button>
                <button
                  className={`calendar-day ${syncMode === "google-sync" ? "selected" : ""}`}
                  onClick={() => setSyncMode("google-sync")}
                >
                  Google Синхронізація
                </button>
              </div>
            )}
          </div>
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
              {monthLabel}
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
                .sort((a, b) =>
                  a.completed !== b.completed
                    ? a.completed
                      ? 1
                      : -1
                    : (a.time || "").localeCompare(b.time || ""),
                );

              return (
                <div
                  key={dayNumber}
                  className={`calendar-day ${isToday(dayNumber) ? "selected" : ""}`}
                  onClick={() => setSelectedDayPlans(dayNumber)}
                >
                  <span className="day-number">{dayNumber}</span>

                  {plansForThisDay.length > 0 && (
                    <div className="mini-plans-grid">
                      {/* Показуємо лише перші 3 плани */}
                      {plansForThisDay.slice(0, 3).map((plan) => (
                        <div
                          key={plan.id}
                          className={`mini-plan-item ${getCategoryClass(plan.type)} ${plan.completed ? "mini-done" : ""}`}
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
                ? dayPlans.map((plan) => {
                    if (editingPlanId === plan.id) {
                      return (
                        <div key={plan.id} className="edit-plan-inline-block">
                          <label
                            htmlFor={`edit-text-${plan.id}`}
                            className="visually-hidden"
                          >
                            Редагувати текст
                          </label>
                          <textarea
                            id={`edit-text-${plan.id}`}
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
                            {/* ВИБІР ЧАСУ В РЕДАГУВАННІ (Відкривається вниз) */}
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
                              <label htmlFor={`edit-time-input-${plan.id}`}>
                                Час :
                              </label>
                              <div className="custom-select-trigger">
                                <span>{editTime || "-- : --"}</span>
                                <span
                                  className={`arrow ${activeDropdown === "edit-time" ? "up" : ""}`}
                                >
                                  ▾
                                </span>
                              </div>
                              {/* ВИПРАВЛЕНО: Використовуємо клас visually-hidden замість display:none */}
                              <input
                                type="time"
                                id={`edit-time-input-${plan.id}`}
                                className="visually-hidden"
                                value={editTime}
                                readOnly
                              />

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

                            {/* ВИБІР КАТЕГОРІЇ В РЕДАГУВАННІ (Відкривається вниз) */}
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
                              <label htmlFor={`edit-cat-input-${plan.id}`}>
                                Тип :
                              </label>
                              <div className="custom-select-trigger">
                                <span>{editType}</span>
                                <span
                                  className={`arrow ${activeDropdown === "edit-category" ? "up" : ""}`}
                                >
                                  ▾
                                </span>
                              </div>
                              <input
                                id={`edit-cat-input-${plan.id}`}
                                type="text"
                                className="visually-hidden"
                                value={editType}
                                readOnly
                              />

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
                                      className={
                                        editType === cat ? "active" : ""
                                      }
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
                      );
                    }
                    return (
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
                    );
                  })
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
                <label htmlFor="new-plan-text-area" className="visually-hidden">
                  Текст завдання
                </label>
                <textarea
                  id="new-plan-text-area"
                  name="new-plan-text"
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
                  {/* ВИБІР ЧАСУ ПРИ ДОДАВАННІ */}
                  <div
                    className="control-group-interactive"
                    onClick={() =>
                      setActiveDropdown(
                        activeDropdown === "add-time" ? null : "add-time",
                      )
                    }
                  >
                    <label htmlFor="new-plan-time-input">Час :</label>
                    <div className="custom-select-trigger">
                      <span>{planTime || "-- : --"}</span>
                      <span
                        className={`arrow ${activeDropdown === "add-time" ? "up" : ""}`}
                      >
                        ▾
                      </span>
                    </div>
                    {/* ВИПРАВЛЕНО: visually-hidden замість display:none */}
                    <input
                      type="time"
                      id="new-plan-time-input"
                      name="new-plan-time"
                      className="visually-hidden"
                      value={planTime}
                      readOnly
                    />

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

                  {/* ВИБІР КАТЕГОРІЇ ПРИ ДОДАВАННІ */}
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
                    <label htmlFor="new-plan-category-input">Категорія :</label>
                    <div className="custom-select-trigger">
                      <span>{planType}</span>
                      <span
                        className={`arrow ${activeDropdown === "add-category" ? "up" : ""}`}
                      >
                        ▾
                      </span>
                    </div>
                    {/* ВИПРАВЛЕНО: type="text" + visually-hidden */}
                    <input
                      id="new-plan-category-input"
                      name="new-plan-category"
                      type="text"
                      className="visually-hidden"
                      value={planType}
                      readOnly
                    />

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
