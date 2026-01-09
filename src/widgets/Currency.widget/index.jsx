export const command = "../src/widgets/Currency.widget/rates.sh";
export const refreshFrequency = 60 * 1000 * 60 * 24;

const Currency = ({ output, error }) => {
  // Styles
  const styles = {
    wrapper: {
      color: "white",
      fontFamily: "'Space Mono', 'JetBrains Mono', monospace",
      userSelect: "none",
      cursor: "default",
      fontWeight: 300,
      borderRadius: 16,
      width: "100vw",
      height: "100vh",
      background: "#111",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 16px",
      position: "relative",
      overflow: "hidden",
    },
    infoSection: {
      display: "flex",
      flexDirection: "column",
      gap: 1,
    },
    header: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    currencyPair: {
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 0.5,
      color: "#ffffff90",
      textTransform: "uppercase",
    },
    dateBadge: {
      fontSize: 9,
      color: "#ffffff70",
    },
    rateDisplay: {
      display: "flex",
      alignItems: "baseline",
      gap: 5,
    },
    rateValue: {
      fontSize: 17,
      fontWeight: 400,
      color: "#ffffff",
      lineHeight: 1,
      letterSpacing: -0.5,
    },
    currencyLabel: {
      fontSize: 11,
      color: "#ffffff90",
      fontWeight: 400,
      letterSpacing: 0.3,
    },
    metricsRow: {
      display: "flex",
      alignItems: "center",
      justifyItem: "center",
      gap: 5,
    },
    metricLabel: {
      fontSize: 10,
      color: "#ffffff90",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    metricValue: {
      fontSize: 10,
      color: "#ffffffcc",
      fontWeight: 400,
    },
    chartSection: {
      display: "flex",
      alignItems: "center",
      height: 50,
    },
    chartGrid: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      height: "100%",
    },
    chartBar: (color, height, translateY) => ({
      width: 5,
      height,
      borderRadius: 2.5,
      background: color,
      opacity: 0.85,
      transform: `translateY(${translateY}px)`,
      transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
      position: "relative",
    }),
    loadingContainer: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      height: "100%",
      gap: 10,
    },
    spinner: {
      width: 28,
      height: 28,
      position: "relative",
    },
    spinnerRing: (delay, color) => ({
      position: "absolute",
      width: "100%",
      height: "100%",
      border: "2px solid transparent",
      borderTopColor: color,
      borderRadius: "50%",
      animation: `spin 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite`,
      animationDelay: delay,
    }),
    loadingText: {
      fontSize: 10,
      color: "rgba(148, 163, 184, 0.7)",
      letterSpacing: 0.3,
    },
    errorText: {
      fontSize: 10,
      color: "rgba(239, 68, 68, 0.85)",
      letterSpacing: 0.3,
    },
  };

  // Loading/Error States
  if (
    !output ||
    !output.includes(":") ||
    output.split("!!").every((pair) => pair.includes("N/A"))
  ) {
    return (
      <div style={styles.wrapper}>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}>
            <div style={styles.spinnerRing("0s", "#ffffff30")}></div>
          </div>
          <p style={error ? styles.errorText : styles.loadingText}>
            {error ? "Unable to load rates" : "Fetching exchange rates..."}
          </p>
        </div>
      </div>
    );
  }

  try {
    const pairs = output.split("!!");
    const rateData = pairs
      .map((pair) => {
        const [date, rate, diff] = pair.split(":");
        if (rate === "N/A" || !rate) return null;
        return { date, rate: parseFloat(rate), diff: parseFloat(diff) || 0 };
      })
      .filter(Boolean);

    if (rateData.length === 0) {
      return (
        <div style={styles.wrapper}>
          <div style={styles.loadingContainer}>
            <p style={styles.errorText}>No valid data available</p>
          </div>
        </div>
      );
    }

    const todays = rateData[0] || { date: "", rate: 0, diff: 0 };

    const calculateAverage = () => {
      if (rateData.length === 0) return 0;
      const sum = rateData.reduce((acc, item) => acc + item.rate, 0);
      return sum / rateData.length;
    };

    const formatRate = (rate) => {
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(rate);
    };

    const formatDate = (dateStr) => {
      const [year, month, day] = dateStr.split("-");
      return `${day}.${month}.${year}`;
    };

    const getDiffColor = (diff) => {
      if (diff > 0) return "#10b981";
      if (diff < 0) return "#ef4444";
      return "#6b7280";
    };

    const getDiffIcon = (diff) => {
      if (diff > 0) return "↑";
      if (diff < 0) return "↓";
      return "→";
    };

    const getBarHeight = (rate) => {
      const average = calculateAverage();
      const maxDeviation = Math.max(
        ...rateData.map((item) => Math.abs(item.rate - average))
      );
      const deviation = Math.abs(rate - average);
      const normalizedHeight = maxDeviation > 0 ? deviation / maxDeviation : 0;
      return 8 + normalizedHeight * 28;
    };

    const getBarTranslate = (rate) => {
      const average = calculateAverage();
      const deviation = rate - average;
      const maxDeviation = Math.max(
        ...rateData.map((item) => Math.abs(item.rate - average))
      );
      const normalizedDeviation =
        maxDeviation > 0 ? deviation / maxDeviation : 0;
      return normalizedDeviation * -12;
    };

    const changeBadgeStyle = {
      display: "inline-flex",
      alignItems: "center",
      gap: 3,
      fontSize: 10,
      fontWeight: 500,
      color: getDiffColor(todays.diff),
      marginLeft: "auto",
    };

    return (
      <div style={styles.wrapper}>
        {/* Info Section */}
        <div style={styles.infoSection}>
          <div style={styles.header}>
            <span style={styles.dateBadge}>{formatDate(todays.date)}</span>
          </div>

          <div style={styles.rateDisplay}>
            <span style={styles.rateValue}>{formatRate(todays.rate)}</span>
            <span style={styles.currencyLabel}>UZS</span>
          </div>

          <div style={styles.metricsRow}>
            <span style={styles.metricLabel}>avg</span>
            <span style={styles.metricValue}>
              {formatRate(calculateAverage()).slice(0, 8)}
            </span>
            <span style={changeBadgeStyle}>
              <span style={{ fontSize: 9, lineHeight: 1 }}>
                {getDiffIcon(todays.diff)}
              </span>
              {Math.abs(todays.diff).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Chart Section */}
        <div style={styles.chartSection}>
          <div style={styles.chartGrid}>
            {rateData
              .slice()
              .reverse()
              .map((item, i) => (
                <div
                  key={i}
                  title={`${formatDate(item.date)}: ${formatRate(
                    item.rate
                  )} UZS (${item.diff > 0 ? "+" : ""}${item.diff}%)`}
                  style={styles.chartBar(
                    getDiffColor(item.diff),
                    getBarHeight(item.rate),
                    getBarTranslate(item.rate)
                  )}
                />
              ))}
          </div>
        </div>
      </div>
    );
  } catch (err) {
    console.error("Error rendering currency widget:", err);
    return (
      <div style={styles.wrapper}>
        <div style={styles.loadingContainer}>
          <p style={styles.errorText}>Render error: {err.message}</p>
        </div>
      </div>
    );
  }
};

export default Currency;

export const windowTop = 700;
export const windowLeft = 0;
export const windowHeight = 80;
export const windowWidth = 230;
