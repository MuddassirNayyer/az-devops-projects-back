import { useState, useEffect, useRef } from "react";
import Head from "next/head";

const THEMES = {
  dawn: {
    hour: [5, 8],
    bg: "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 30%, #7c3d6b 60%, #e8845a 85%, #f5b87a 100%)",
    accent: "#f5a05a",
    accentDark: "#c4733a",
    text: "#fff5ee",
    textMuted: "rgba(255,240,220,0.6)",
    card: "rgba(255,255,255,0.08)",
    cardBorder: "rgba(255,200,150,0.2)",
    btnBg: "#e8845a",
    btnHover: "#d4703f",
    label: "Dawn",
    greeting: "Good morning",
    particles: ["#f5b87a", "#e8845a", "#c97bb5", "#9b59b6"],
    particleType: "sunrise",
  },
  morning: {
    hour: [8, 12],
    bg: "linear-gradient(160deg, #1a3a5c 0%, #1e5f8a 35%, #2e86c1 65%, #5dade2 85%, #aed6f1 100%)",
    accent: "#5dade2",
    accentDark: "#2e86c1",
    text: "#e8f4fd",
    textMuted: "rgba(200,230,250,0.65)",
    card: "rgba(255,255,255,0.09)",
    cardBorder: "rgba(150,210,250,0.2)",
    btnBg: "#2e86c1",
    btnHover: "#1a6fa8",
    label: "Morning",
    greeting: "Good morning",
    particles: ["#aed6f1", "#5dade2", "#85c1e9", "#d6eaf8"],
    particleType: "float",
  },
  afternoon: {
    hour: [12, 17],
    bg: "linear-gradient(150deg, #0d2137 0%, #0e3460 30%, #1a5276 55%, #2980b9 75%, #7fb3d3 100%)",
    accent: "#2980b9",
    accentDark: "#1f6899",
    text: "#eaf4fb",
    textMuted: "rgba(190,225,245,0.6)",
    card: "rgba(255,255,255,0.08)",
    cardBorder: "rgba(130,200,240,0.18)",
    btnBg: "#2980b9",
    btnHover: "#1a6a9a",
    label: "Afternoon",
    greeting: "Good afternoon",
    particles: ["#7fb3d3", "#2980b9", "#5dade2", "#aed6f1"],
    particleType: "float",
  },
  evening: {
    hour: [17, 20],
    bg: "linear-gradient(140deg, #0d0d1a 0%, #1a1040 30%, #3d1c72 55%, #c0392b 78%, #e67e22 100%)",
    accent: "#e67e22",
    accentDark: "#c4671c",
    text: "#fdf2e9",
    textMuted: "rgba(250,220,180,0.6)",
    card: "rgba(255,255,255,0.07)",
    cardBorder: "rgba(230,130,50,0.2)",
    btnBg: "#c0392b",
    btnHover: "#a93226",
    label: "Evening",
    greeting: "Good evening",
    particles: ["#e67e22", "#c0392b", "#8e44ad", "#f39c12"],
    particleType: "sunset",
  },
  night: {
    hour: [20, 24],
    bg: "linear-gradient(160deg, #020409 0%, #05080f 30%, #080e1f 55%, #0d1530 75%, #111d42 100%)",
    accent: "#4a6fa5",
    accentDark: "#3a5a8a",
    text: "#d0ddf0",
    textMuted: "rgba(180,200,230,0.55)",
    card: "rgba(255,255,255,0.05)",
    cardBorder: "rgba(100,140,200,0.15)",
    btnBg: "#2c4a7a",
    btnHover: "#3a5a8a",
    label: "Night",
    greeting: "Good evening",
    particles: ["#ffffff", "#aac4ff", "#7fa8f5", "#d0ddf0"],
    particleType: "stars",
  },
  latenight: {
    hour: [0, 5],
    bg: "linear-gradient(180deg, #010205 0%, #020409 40%, #040810 70%, #05091a 100%)",
    accent: "#3a5a8a",
    accentDark: "#2a4470",
    text: "#b0c4de",
    textMuted: "rgba(140,170,210,0.5)",
    card: "rgba(255,255,255,0.04)",
    cardBorder: "rgba(80,120,180,0.12)",
    btnBg: "#1e3355",
    btnHover: "#2a4470",
    label: "Late night",
    greeting: "Working late",
    particles: ["#ffffff", "#9ab0d0", "#6080b0", "#4060a0"],
    particleType: "stars",
  },
};

function getTheme(hour) {
  for (const key of [
    "latenight",
    "dawn",
    "morning",
    "afternoon",
    "evening",
    "night",
  ]) {
    const t = THEMES[key];
    const [s, e] = t.hour;
    if (key === "night" && (hour >= 20 || hour < 0)) return t;
    if (key === "latenight" && hour >= 0 && hour < 5) return t;
    if (hour >= s && hour < e) return t;
  }
  return THEMES.morning;
}

function Canvas({ theme }) {
  const ref = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W = canvas.offsetWidth;
    let H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;

    const type = theme.particleType;
    const colors = theme.particles;
    const count = type === "stars" ? 120 : 55;
    const particles = [];

    for (let i = 0; i < count; i++) {
      if (type === "stars") {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.5 + 0.3,
          alpha: Math.random() * 0.8 + 0.2,
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.01 + Math.random() * 0.03,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      } else if (type === "sunrise" || type === "sunset") {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 3 + 1,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -Math.random() * 0.5 - 0.1,
          alpha: Math.random() * 0.5 + 0.1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      } else {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 3 + 1,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          alpha: Math.random() * 0.4 + 0.1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    }
    particlesRef.current = particles;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        if (type === "stars") {
          p.twinkle += p.twinkleSpeed;
          const a = p.alpha * (0.6 + 0.4 * Math.sin(p.twinkle));
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle =
            p.color +
            Math.floor(a * 255)
              .toString(16)
              .padStart(2, "0");
          ctx.fill();
        } else {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = W;
          if (p.x > W) p.x = 0;
          if (p.y < 0) p.y = H;
          if (p.y > H) p.y = 0;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle =
            p.color +
            Math.floor(p.alpha * 255)
              .toString(16)
              .padStart(2, "0");
          ctx.fill();
        }
      }
      animRef.current = requestAnimationFrame(draw);
    }
    draw();

    const onResize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [theme]);

  return (
    <canvas
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

export default function Home() {
  const [hour, setHour] = useState(null);
  const [theme, setTheme] = useState(THEMES.morning);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [expanded, setExpanded] = useState(new Set());
  const [repoStatus, setRepoStatus] = useState({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [logs, setLogs] = useState([]);
  const [showRepos, setShowRepos] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    const h = new Date().getHours();
    setHour(h);
    setTheme(getTheme(h));
  }, []);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          setLoading(false);
          return;
        }
        setData(d);
        setSelected(new Set(d.projects.map((p) => p.id)));
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const addLog = (msg, type = "") =>
    setLogs((prev) => [
      ...prev,
      { msg, type, t: new Date().toLocaleTimeString() },
    ]);

  const totalRepos = data
    ? data.projects.reduce((s, p) => s + p.repos.length, 0)
    : 0;
  const selectedRepos = data
    ? data.projects
        .filter((p) => selected.has(p.id))
        .reduce((s, p) => s + p.repos.length, 0)
    : 0;
  const pct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  const toggleProject = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleAll = () => {
    if (!data) return;
    const all = data.projects.map((p) => p.id);
    setSelected((prev) =>
      prev.size === all.length ? new Set() : new Set(all),
    );
  };

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const startBackup = async () => {
    if (!data || running || selectedRepos === 0) return;
    const repos = [];
    data.projects.forEach((proj) => {
      if (selected.has(proj.id))
        proj.repos.forEach((repo) =>
          repos.push({
            projectId: proj.id,
            projectName: proj.name,
            repoId: repo.id,
            repoName: repo.name,
            branch: repo.defaultBranch || "main",
          }),
        );
    });

    setRunning(true);
    setLogs([]);
    setRepoStatus({});
    setProgress({ done: 0, total: repos.length });
    setShowRepos(true);

    // Mark all as downloading
    const statusObj = {};
    repos.forEach((r) => {
      statusObj[r.repoId] = "downloading";
    });
    setRepoStatus(statusObj);

    addLog(`Bundling ${repos.length} repo(s) into a single ZIP...`, "info");

    try {
      const r = await fetch("/api/backup-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repos }),
      });

      if (!r.ok) throw new Error(`Server error: HTTP ${r.status}`);

      addLog("Receiving bundle...", "info");
      const blob = await r.blob();
      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ado-backup-${date}.zip`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(a.href);
      document.body.removeChild(a);

      // Mark all done
      const doneObj = {};
      repos.forEach((r) => {
        doneObj[r.repoId] = "done";
      });
      setRepoStatus(doneObj);
      setProgress({ done: repos.length, total: repos.length });
      addLog(
        `Done! Single ZIP downloaded with ${repos.length} repos inside.`,
        "ok",
      );
    } catch (e) {
      const errObj = {};
      repos.forEach((r) => {
        errObj[r.repoId] = "error";
      });
      setRepoStatus(errObj);
      addLog(`Failed: ${e.message}`, "err");
    }

    setRunning(false);
  };

  if (hour === null) return null;

  const T = theme;
  const btnStyle = {
    width: "100%",
    padding: "18px 28px",
    background: running ? T.accentDark : T.btnBg,
    border: "none",
    borderRadius: "14px",
    color: "#fff",
    fontSize: "17px",
    fontFamily: "'Instrument Sans', sans-serif",
    fontWeight: "600",
    letterSpacing: "0.01em",
    cursor: running ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    transition: "all 0.2s",
    position: "relative",
    overflow: "hidden",
    boxShadow: `0 8px 32px ${T.btnBg}55`,
  };

  return (
    <>
      <Head>
        <title>ADO Backup — {T.label}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Playfair+Display:ital@0;1&display=swap"
          rel="stylesheet"
        />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { min-height: 100vh; }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
          @keyframes shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          .fade1 { animation: fadeUp 0.7s ease both; }
          .fade2 { animation: fadeUp 0.7s 0.15s ease both; }
          .fade3 { animation: fadeUp 0.7s 0.3s ease both; }
          .fade4 { animation: fadeUp 0.7s 0.45s ease both; }
          .spin { animation: spin 0.8s linear infinite; display: inline-block; }
          .blink { animation: pulse 1.2s ease-in-out infinite; }
          .bigbtn:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-2px); box-shadow: 0 12px 40px var(--btn-shadow) !important; }
          .bigbtn:active:not(:disabled) { transform: translateY(0px); }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
        `}</style>
      </Head>

      <div
        style={{
          minHeight: "100vh",
          position: "relative",
          overflow: "hidden",
          background: T.bg,
          fontFamily: "'Instrument Sans', sans-serif",
          "--btn-shadow": T.btnBg + "66",
        }}
      >
        <Canvas theme={T} />

        {/* Frosted noise overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.03) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(255,255,255,0.02) 0%, transparent 50%)",
            pointerEvents: "none",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "40px 24px",
          }}
        >
          <div style={{ width: "100%", maxWidth: "560px" }}>
            {/* Time badge */}
            <div
              className="fade1"
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "32px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: T.accent,
                  background: T.card,
                  border: `1px solid ${T.cardBorder}`,
                  padding: "5px 16px",
                  borderRadius: "99px",
                  fontWeight: "500",
                }}
              >
                {T.label} ·{" "}
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {/* Greeting */}
            <div
              className="fade2"
              style={{ textAlign: "center", marginBottom: "12px" }}
            >
              <div
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(32px, 6vw, 52px)",
                  fontWeight: "400",
                  fontStyle: "italic",
                  color: T.text,
                  lineHeight: "1.15",
                  letterSpacing: "-0.01em",
                  textShadow: "0 2px 20px rgba(0,0,0,0.4)",
                }}
              >
                {T.greeting},
              </div>
              <div
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(32px, 6vw, 52px)",
                  fontWeight: "400",
                  color: T.accent,
                  lineHeight: "1.15",
                  letterSpacing: "-0.01em",
                  textShadow: `0 2px 30px ${T.accent}66`,
                }}
              >
                Arby Khan.
              </div>
            </div>

            <div
              className="fade2"
              style={{
                textAlign: "center",
                marginBottom: "48px",
                fontSize: "15px",
                color: T.textMuted,
                letterSpacing: "0.01em",
              }}
            >
              Your Azure DevOps repos are ready to back up.
            </div>

            {/* Stats row */}
            {data && !loading && (
              <div
                className="fade3"
                style={{
                  display: "flex",
                  gap: "12px",
                  marginBottom: "24px",
                }}
              >
                {[
                  { n: data.projects.length, l: "Projects" },
                  { n: totalRepos, l: "Repositories" },
                  { n: selectedRepos, l: "Selected", accent: true },
                ].map(({ n, l, accent }) => (
                  <div
                    key={l}
                    style={{
                      flex: 1,
                      background: T.card,
                      border: `1px solid ${accent ? T.cardBorder : "rgba(255,255,255,0.06)"}`,
                      borderRadius: "12px",
                      padding: "14px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "26px",
                        fontWeight: "600",
                        color: accent ? T.accent : T.text,
                        fontFamily: "'Instrument Sans', sans-serif",
                      }}
                    >
                      {n}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: T.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginTop: "2px",
                      }}
                    >
                      {l}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Progress */}
            {running && (
              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    color: T.textMuted,
                    marginBottom: "8px",
                  }}
                >
                  <span>
                    {progress.done} / {progress.total} repos
                  </span>
                  <span>{pct}%</span>
                </div>
                <div
                  style={{
                    height: "4px",
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "99px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: pct + "%",
                      background: T.accent,
                      borderRadius: "99px",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                className="fade3"
                style={{
                  background: "rgba(200,50,50,0.15)",
                  border: "1px solid rgba(200,80,80,0.3)",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "20px",
                  color: "#ffaaaa",
                  fontSize: "13px",
                }}
              >
                <strong>Connection error:</strong> {error}
                <br />
                <span
                  style={{
                    opacity: 0.7,
                    fontSize: "12px",
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  Check ADO_ORG_URL and ADO_PAT in Vercel environment variables.
                </span>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div
                className="fade3"
                style={{
                  textAlign: "center",
                  color: T.textMuted,
                  fontSize: "14px",
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
              >
                <span
                  className="spin"
                  style={{ fontSize: "16px", color: T.accent }}
                >
                  ↻
                </span>
                Connecting to Azure DevOps...
              </div>
            )}

            {/* Main CTA */}
            {data && !loading && (
              <div className="fade4">
                <button
                  className="bigbtn"
                  style={btnStyle}
                  disabled={running || selectedRepos === 0}
                  onClick={startBackup}
                >
                  {running ? (
                    <>
                      <span className="spin">↻</span> Building ZIP... please
                      wait
                    </>
                  ) : (
                    <>
                      <svg
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        viewBox="0 0 24 24"
                      >
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Take Backup Now
                    </>
                  )}
                </button>

                {/* Toggle repos */}
                <div style={{ textAlign: "center", marginTop: "16px" }}>
                  <button
                    onClick={() => setShowRepos((v) => !v)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: T.textMuted,
                      fontSize: "13px",
                      fontFamily: "inherit",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {showRepos ? "▲ Hide" : "▼ Show"} repositories
                  </button>
                </div>
              </div>
            )}

            {/* Repos panel */}
            {data && showRepos && (
              <div
                style={{
                  marginTop: "20px",
                  background: T.card,
                  border: `1px solid ${T.cardBorder}`,
                  borderRadius: "14px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: `1px solid ${T.cardBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: T.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Repositories
                  </span>
                  <button
                    onClick={toggleAll}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: T.accent,
                      fontSize: "12px",
                      fontFamily: "inherit",
                    }}
                  >
                    {selected.size === data.projects.length
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                </div>

                <div
                  style={{
                    maxHeight: "320px",
                    overflowY: "auto",
                    padding: "8px",
                  }}
                >
                  {data.projects.map((proj) => {
                    const isSel = selected.has(proj.id);
                    const isExp = expanded.has(proj.id);
                    return (
                      <div key={proj.id} style={{ marginBottom: "4px" }}>
                        <div
                          onClick={() => toggleProject(proj.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "9px 12px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            background: isSel
                              ? "rgba(255,255,255,0.07)"
                              : "transparent",
                            transition: "background 0.15s",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggleProject(proj.id)}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              accentColor: T.accent,
                              width: "14px",
                              height: "14px",
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              flex: 1,
                              fontSize: "13px",
                              color: T.text,
                              fontWeight: "500",
                            }}
                          >
                            {proj.name}
                          </span>
                          <span
                            style={{ fontSize: "11px", color: T.textMuted }}
                          >
                            {proj.repos.length} repos
                          </span>
                          {proj.repos.length > 0 && (
                            <button
                              onClick={(e) => toggleExpand(proj.id, e)}
                              style={{
                                background: "none",
                                border: "none",
                                color: T.textMuted,
                                cursor: "pointer",
                                fontSize: "10px",
                                padding: "0 2px",
                              }}
                            >
                              {isExp ? "▲" : "▼"}
                            </button>
                          )}
                        </div>

                        {isExp && (
                          <div
                            style={{
                              paddingLeft: "36px",
                              paddingBottom: "4px",
                            }}
                          >
                            {proj.repos.map((repo) => {
                              const st = repoStatus[repo.id];
                              return (
                                <div
                                  key={repo.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    fontSize: "12px",
                                    padding: "3px 0",
                                    color:
                                      st === "done"
                                        ? "#6bcf7a"
                                        : st === "error"
                                          ? "#ff7070"
                                          : st === "empty"
                                            ? "#555"
                                            : st === "downloading"
                                              ? T.accent
                                              : T.textMuted,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: "5px",
                                      height: "5px",
                                      borderRadius: "50%",
                                      flexShrink: 0,
                                      background:
                                        st === "done"
                                          ? "#6bcf7a"
                                          : st === "error"
                                            ? "#ff7070"
                                            : st === "empty"
                                              ? "#444"
                                              : st === "downloading"
                                                ? T.accent
                                                : "rgba(255,255,255,0.2)",
                                      ...(st === "downloading"
                                        ? {
                                            animation:
                                              "pulse 0.9s ease-in-out infinite",
                                          }
                                        : {}),
                                    }}
                                  />
                                  {repo.name}
                                  {st === "done" && (
                                    <span style={{ opacity: 0.7 }}>✓</span>
                                  )}
                                  {st === "empty" && (
                                    <span
                                      style={{ opacity: 0.5, fontSize: "10px" }}
                                    >
                                      empty
                                    </span>
                                  )}
                                  {st === "error" && (
                                    <span style={{ opacity: 0.7 }}>✗</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Log */}
            {logs.length > 0 && (
              <div
                ref={logRef}
                style={{
                  marginTop: "16px",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  maxHeight: "140px",
                  overflowY: "auto",
                  fontFamily: "'Courier New', monospace",
                }}
              >
                {logs.map((l, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: "11px",
                      marginBottom: "2px",
                      color:
                        l.type === "ok"
                          ? "#6bcf7a"
                          : l.type === "err"
                            ? "#ff7070"
                            : l.type === "info"
                              ? T.accent
                              : T.textMuted,
                    }}
                  >
                    [{l.t}] {l.msg}
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div
              style={{
                textAlign: "center",
                marginTop: "40px",
                fontSize: "12px",
                color: T.textMuted,
                opacity: 0.5,
              }}
            >
              {data?.org?.replace("https://dev.azure.com/", "") ||
                "Azure DevOps"}{" "}
              · Aquila360
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
