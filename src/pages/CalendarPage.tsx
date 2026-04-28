import { useState, useEffect, useRef } from "react";

type SyncMode = "local-only" | "google-sync";

export const CalendarPage = () => {
  const [isLoggedIn] = useState(false);
  const [syncMode, setSyncMode] = useState<SyncMode | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Стани для вибору дати
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState<"year" | "month">("year"); // Крок вибору
  const [tempYear, setTempYear] = useState(new Date().getFullYear());

  const pickerRef = useRef<HTMLDivElement>(null);

  // Закриття при кліку за межами
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

    if (isPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPickerOpen]);

  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();

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

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(viewYear, viewMonth + offset, 1));
  };

  // Вибір року (перехід до кроку 2)
  const handleYearClick = (year: number) => {
    setTempYear(year);
    setPickerStep("month");
  };

  // Вибір місяця (фінальне оновлення дати)
  const handleMonthClick = (monthIdx: number) => {
    setCurrentDate(new Date(tempYear, monthIdx, 1));
    setIsPickerOpen(false);
    setPickerStep("year"); // Скидаємо для наступного відкриття
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
    <div className="calendar-page" style={{ position: "relative" }}>
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
                  увійдіть або створіть акаунт у Профілі.
                </p>
              </div>
            ) : (
              <div className="auth-settings">
                <div
                  style={{
                    marginTop: "15px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
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

          {/* вибір місяця та року для перегляду */}
          {isPickerOpen && (
            <div ref={pickerRef} className="card-glass calendar-picker-modal">
              <p className="picker-step-title">
                {pickerStep === "year"
                  ? "Оберіть рік"
                  : `Оберіть місяць ${tempYear}`}
              </p>

              {pickerStep === "year" ? (
                /* КРОК 1: ВИБІР РОКУ */
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
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
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
                  <p className="picker-hint">
                    Оберіть зі списку або введіть вручну
                  </p>
                </div>
              ) : (
                /* КРОК 2: ВИБІР МІСЯЦЯ */
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
                    ← Повернутися до вибору року
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

            {/* дні календаря */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNumber = i + 1;
              return (
                <div
                  key={dayNumber}
                  className={`calendar-day ${isToday(dayNumber) ? "selected" : ""}`}
                >
                  <span
                    style={{
                      fontWeight: isToday(dayNumber) ? "bold" : "normal",
                    }}
                  >
                    {dayNumber}
                  </span>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
};
