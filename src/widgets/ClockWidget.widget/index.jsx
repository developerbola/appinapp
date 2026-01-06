import { useState, useEffect } from "react";

const ClockWidget = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="widget w-fit h-fit"
      style={{
        pointerEvents: "auto",
        top: "40px",
        left: "40px",
        color: "#fff",
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        background: "#111",
        padding: "20px 30px",
        borderRadius: "16px",
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
          textTransform: "uppercase",
          letterSpacing: "2px",
        }}
      >
        {time.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </h2>
    </div>
  );
};

export default ClockWidget;
