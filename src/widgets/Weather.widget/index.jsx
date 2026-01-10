import { Cloud, Sun } from "lucide-react";

export default function WeatherCard() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        padding: "16px 20px",
        borderRadius: 18,
        backgroundColor: "#8dc6ae50",
        color: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              opacity: 0.75,
              fontWeight: 500,
            }}
          >
            San Francisco
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 6,
            }}
          >
            <Cloud size={22} opacity={0.8} />
            <div
              style={{
                fontSize: 52,
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              59°
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 14,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <Hour time="1PM" temp="57°" icon="cloud" />
          <Hour time="2PM" temp="60°" icon="cloud-sun" />
          <Hour time="3PM" temp="63°" icon="sun" />
          <Hour time="4PM" temp="63°" icon="sun" />
          <Hour time="5PM" temp="63°" icon="sun" />
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 16,
          fontSize: 14,
          opacity: 0.75,
        }}
      >
        <span>↓ 52°</span>
        <span>↑ 64°</span>
      </div>
    </div>
  );
}

function Hour({ time, temp, icon }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
      }}
    >
      <span style={{ width: 38 }}>{time}</span>

      {icon === "cloud" && <Cloud size={16} opacity={0.7} />}
      {icon === "cloud-sun" && <Cloud size={16} opacity={0.7} />}
      {icon === "sun" && <Sun size={16} opacity={0.7} />}

      <span style={{ width: 32, textAlign: "right" }}>{temp}</span>
    </div>
  );
}

export const windowTop = 15;
export const windowLeft = 400;
export const windowHeight = 150;
export const windowWidth = 360;
