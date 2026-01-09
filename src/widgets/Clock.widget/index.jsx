import { useState, useEffect } from "react";

const Clock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="relative widget w-screen h-screen bg-[#00000057] flex flex-col items-center justify-center"
      style={{
        pointerEvents: "auto",
        color: "#fff",
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        borderRadius: 7,
        display: "flex",
        flexDirection: "column",
        gap: "5px",
      }}
    >
      <h1
        style={{
          fontSize: "5rem",
          margin: 0,
          fontWeight: 200,
          lineHeight: 1,
        }}
      >
        {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </h1>
      <h2
        style={{
          fontSize: "1.2rem",
          margin: 0,
          opacity: 0.7,
          fontWeight: 400,
          letterSpacing: "2px",
        }}
      >
        {time.toLocaleDateString(undefined, {
          weekday: "short",
          month: "long",
          day: "numeric",
        })}
      </h2>
    </div>
  );
};

export const windowTop = 50;
export const windowLeft = 50;
export const windowHeight = 170;
export const windowWidth = 280;

export default Clock;