import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserGraduate } from "@fortawesome/free-solid-svg-icons";
import React, { useState } from "react";
import { Clock } from "lucide-react";

interface ProfilePageProps {
  handleLogout: () => void;
  setCurrentScreen: (screen: string) => void;
}

const hours = Array.from({ length: 24 }, (_, i) => (i < 10 ? `0${i}:00` : `${i}:00`));

export const ProfilePage: React.FC<ProfilePageProps> = ({ handleLogout, setCurrentScreen }) => {
  const isGuest = localStorage.getItem("isGuest") === "true";
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<{ [key: string]: string }>({});

  const handleSelect = (day: string, type: string, hour: string) => {
    setSelectedTime((prev) => ({ ...prev, [`${day}-${type}`]: hour }));
    setOpenPicker(null);
  };

  const days = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота", "Неділя"];

  return (
    <div className="profile-container">
      <div className="prof-body">
        <div className="prof-info">
          <p className="profile-text">{isGuest ? "Профіль користувача" : "Мій профіль"}</p>
          <div className="guest-mode">
            <div className="guest-icon">
              <FontAwesomeIcon 
                icon={faUserGraduate} 
                style={{ fontSize: "100px", color: "#ffffff", opacity: 0.4 }} 
              />
            </div>
            {isGuest ? (
              <div className="guest-auth">
                <p className="message">
                  Не витрачай час на повторні налаштування. <br />
                  Створи акаунт, щоб твої дані завжди залишалися з тобою на будь-якому пристрої.
                </p>
                <button className="register-btn" onClick={() => setCurrentScreen("signup")}>
                  Створити акаунт
                </button>
              </div>
            ) : (
              <div className="account">
                <span className="loginTitle">
                  {JSON.parse(localStorage.getItem("userData") || "{}").name}
                </span>
                <button className="register-btn" onClick={handleLogout}>
                  Вийти з акаунта
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="work-hours-block">
          <p className="profile-text" style={{ margin: 0 }}>Робочі години</p>
          <div className="days-list">
            {days.map((day) => (
              <div 
                key={day} 
                className={`day-row ${openPicker?.startsWith(day) ? "active-row" : ""}`}
              >
                <div className="day-info">
                  <span className="day-label">{day}</span>
                  <label className="switch">
                    <input type="checkbox" defaultChecked={day !== "Sat" && day !== "Sun"} />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="time-controls">
                  <div className="custom-dropdown-container">
                    <div 
                      className="time-picker-trigger" 
                      onClick={() => setOpenPicker(openPicker === `${day}-from` ? null : `${day}-from`)}
                    >
                      <Clock size={18} color="#5c4b75" />
                      <span>{selectedTime[`${day}-from`] || "09:00"}</span>
                    </div>
                    {openPicker === `${day}-from` && (
                      <div className="dropdown-list-portal">
                        {hours.map((h) => (
                          <div 
                            key={h} 
                            className="dropdown-item" 
                            onClick={() => handleSelect(day, "from", h)}
                          >
                            {h}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <span className="separator">—</span>

                  <div className="custom-dropdown-container">
                    <div 
                      className="time-picker-trigger" 
                      onClick={() => setOpenPicker(openPicker === `${day}-to` ? null : `${day}-to`)}
                    >
                      <Clock size={18} color="#5c4b75" />
                      <span>{selectedTime[`${day}-to`] || "17:00"}</span>
                    </div>
                    {openPicker === `${day}-to` && (
                      <div className="dropdown-list-portal">
                        {hours.map((h) => (
                          <div 
                            key={h} 
                            className="dropdown-item" 
                            onClick={() => handleSelect(day, "to", h)}
                          >
                            {h}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};