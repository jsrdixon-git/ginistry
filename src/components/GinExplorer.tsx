import { useEffect, useMemo, useState } from "react";
import { GINS, MILESTONES, STYLE_FILTERS, type Gin } from "@/data/gins";

const C = {
  bg: "#2c2416",
  card: "#332a18",
  border: "#4a3c22",
  gold: "#e8b84b",
  cream: "#f5ede0",
};
const HEAD = "'Cinzel', serif";
const BODY = "'Cormorant Garamond', serif";

const CURRENT_KEY = "ginistry_current_user";

type Passport = { profile: { name: string; id: string; created: string }; tried: number[] };

function loadPassport(id: string): Passport | null {
  try {
    const raw = localStorage.getItem(`passport:${id}`);
    return raw ? (JSON.parse(raw) as Passport) : null;
  } catch {
    return null;
  }
}
function savePassport(p: Passport) {
  localStorage.setItem(`passport:${p.profile.id}`, JSON.stringify(p));
}
function newId() {
  return "gp_" + Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
}

const btn = (filled: boolean): React.CSSProperties => ({
  fontFamily: HEAD,
  fontSize: 13,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  padding: "12px 18px",
  borderRadius: 8,
  cursor: "pointer",
  border: `1px solid ${C.gold}`,
  background: filled ? C.gold : "transparent",
  color: filled ? "#241d10" : C.gold,
});

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#241d10",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "12px 14px",
  color: C.cream,
  fontFamily: BODY,
  fontSize: 17,
  outline: "none",
};

export default function GinExplorer() {
  const [passport, setPassport] = useState<Passport | null>(null);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<"main" | "passport">("main");
  const [nameInput, setNameInput] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [style, setStyle] = useState("All");
  const [triedOnly, setTriedOnly] = useState(false);
  const [selected, setSelected] = useState<Gin | null>(null);
  const [copied, setCopied] = useState(false);
  const [celebration, setCelebration] = useState<(typeof MILESTONES)[number] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    try {
      const cur = localStorage.getItem(CURRENT_KEY);
      if (cur) {
        const { passportId } = JSON.parse(cur);
        const p = passportId ? loadPassport(passportId) : null;
        if (p) setPassport(p);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const tried = passport?.tried ?? [];
  const triedSet = useMemo(() => new Set(tried), [tried]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return GINS.filter((g) => {
      if (style !== "All" && g.style !== style) return false;
      if (triedOnly && !triedSet.has(g.id)) return false;
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        g.origin.toLowerCase().includes(q) ||
        g.style.toLowerCase().includes(q) ||
        g.tags.some((t) => t.includes(q))
      );
    });
  }, [search, style, triedOnly, triedSet]);

  function ensurePassport() {
    if (!passport) {
      setCreateOpen(true);
      return false;
    }
    return true;
  }

  function toggleTried(id: number) {
    if (!ensurePassport()) return;
    const has = passport.tried.includes(id);
    const next: Passport = {
      ...passport,
      tried: has ? passport.tried.filter((x) => x !== id) : [...passport.tried, id],
    };
    savePassport(next);
    setPassport(next);
    if (!has) {
      const m = MILESTONES.find((mm) => mm.count === next.tried.length);
      if (m) setCelebration(m);
    }
  }

  function createPassport() {
    const name = nameInput.trim();
    if (!name) return setError("Please enter your name.");
    const id = newId();
    const p: Passport = { profile: { name, id, created: new Date().toISOString() }, tried: [] };
    savePassport(p);
    localStorage.setItem(CURRENT_KEY, JSON.stringify({ passportId: id }));
    setPassport(p);
    setCreateOpen(false);
    setError("");
  }

  function download() {
    if (!passport) return;
    const lines = [
      "THE GINISTRY GIN EXPLORER — PASSPORT",
      "Oxted, Surrey",
      "",
      `Name: ${passport.profile.name}`,
      `Passport ID: ${passport.profile.id}`,
      `Gins tried: ${passport.tried.length} / ${GINS.length}`,
      "",
      "GINS TRIED:",
      ...passport.tried.map((id, i) => {
        const g = GINS.find((x) => x.id === id);
        return g ? `${i + 1}. ${g.name} — ${g.style}, ${g.origin} (${g.abv}%)` : "";
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ginistry-passport-${passport.profile.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!ready) return <div style={{ background: C.bg, minHeight: "100vh" }} />;

  const pct = Math.round((tried.length / GINS.length) * 100);
  const nextMilestone = MILESTONES.find((m) => m.count > tried.length);

  /* ---------- Passport screen ---------- */
  if (screen === "passport") {
    return (
      <div
        style={{
          background: C.bg,
          minHeight: "100vh",
          color: C.cream,
          fontFamily: BODY,
          padding: "20px 16px 60px",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <button onClick={() => setScreen("main")} style={{ ...btn(false), marginBottom: 18 }}>
            ← Back to Explorer
          </button>

          {!passport ? (
            <div
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: 28,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 44, marginBottom: 12 }}>🥃</div>
              <div style={{ fontFamily: HEAD, fontSize: 22, color: C.gold }}>
                Your Ginistry Passport
              </div>
              <p style={{ fontSize: 17, opacity: 0.8, marginTop: 10, lineHeight: 1.5 }}>
                Create a free passport to track the gins you try, collect stamps, and unlock
                tasting milestones.
              </p>
              <button
                onClick={() => setCreateOpen(true)}
                style={{ ...btn(true), width: "100%", marginTop: 20 }}
              >
                Start My Passport
              </button>
            </div>
          ) : (
            <div
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: 20,
              }}
            >
              <div style={{ fontFamily: HEAD, fontSize: 22, color: C.gold }}>
                {passport.profile.name}
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <code style={{ fontFamily: "monospace", fontSize: 15, color: C.cream }}>
                  {passport.profile.id}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(passport.profile.id);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  style={{ ...btn(false), padding: "6px 12px", fontSize: 11 }}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <div style={{ marginTop: 20, fontSize: 40, fontFamily: HEAD, color: C.gold }}>
                {tried.length}
                <span style={{ fontSize: 18, opacity: 0.7 }}> / {GINS.length} gins tried</span>
              </div>

              <div
                style={{
                  height: 8,
                  background: "#241d10",
                  borderRadius: 99,
                  overflow: "hidden",
                  marginTop: 12,
                }}
              >
                <div style={{ width: `${pct}%`, height: "100%", background: C.gold }} />
              </div>
            </div>
          )}

          <h2
            style={{
              fontFamily: HEAD,
              fontSize: 13,
              letterSpacing: "0.2em",
              color: C.gold,
              margin: "28px 0 12px",
            }}
          >
            MILESTONES
          </h2>
          <div style={{ display: "grid", gap: 10 }}>
            {MILESTONES.map((m) => {
              const done = tried.length >= m.count;
              return (
                <div
                  key={m.count}
                  style={{
                    background: C.card,
                    border: `1px solid ${done ? C.gold : C.border}`,
                    borderRadius: 12,
                    padding: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    opacity: done ? 1 : 0.6,
                  }}
                >
                  <span style={{ fontSize: 26 }}>{m.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: HEAD, fontSize: 15, color: done ? C.gold : C.cream }}>
                      {m.title}
                    </div>
                    <div style={{ fontSize: 15, opacity: 0.7 }}>
                      {Math.min(tried.length, m.count)} / {m.count} gins
                    </div>
                  </div>
                  {done && <span style={{ color: C.gold, fontSize: 18 }}>✓</span>}
                </div>
              );
            })}
          </div>

          {passport && (
            <>
              <h2
                style={{
                  fontFamily: HEAD,
                  fontSize: 13,
                  letterSpacing: "0.2em",
                  color: C.gold,
                  margin: "28px 0 12px",
                }}
              >
                GINS TRIED
              </h2>
              {tried.length === 0 ? (
                <div style={{ fontStyle: "italic", opacity: 0.7 }}>
                  No gins logged yet. Tap “Mark as Tried” from the explorer to add your first stamp.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {tried.map((id) => {
                    const g = GINS.find((x) => x.id === id);
                    if (!g) return null;
                    return (
                      <div
                        key={id}
                        style={{
                          background: C.card,
                          border: `1px solid ${C.border}`,
                          borderLeft: `4px solid ${g.colour}`,
                          borderRadius: 10,
                          padding: "10px 14px",
                        }}
                      >
                        <div style={{ fontFamily: HEAD, fontSize: 15 }}>{g.name}</div>
                        <div style={{ fontSize: 15, opacity: 0.7 }}>
                          {g.style} · {g.origin} · {g.abv}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <button onClick={download} style={{ ...btn(true), width: "100%", marginTop: 24 }}>
                Download Passport
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ---------- Main ---------- */
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.cream, fontFamily: BODY }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: C.bg,
          borderBottom: `1px solid ${C.border}`,
          padding: "14px 16px 10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div
              style={{
                fontFamily: HEAD,
                fontSize: 20,
                color: C.gold,
                letterSpacing: "0.08em",
              }}
            >
              The Ginistry
            </div>
            <div style={{ fontSize: 12, letterSpacing: "0.24em", opacity: 0.6, fontFamily: HEAD }}>
              GIN EXPLORER
            </div>
          </div>
          <button
            onClick={() => setScreen("passport")}
            style={{ ...btn(false), padding: "8px 14px", fontSize: 11 }}
          >
            {passport ? "Passport" : "Start Passport"}
          </button>
        </div>

        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{ flex: 1, height: 6, background: "#241d10", borderRadius: 99, overflow: "hidden" }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: C.gold,
                transition: "width .3s",
              }}
            />
          </div>
          <span style={{ fontFamily: HEAD, fontSize: 12, color: C.gold }}>
            {tried.length}/{GINS.length}
          </span>
        </div>
        {nextMilestone && (
          <div style={{ fontSize: 14, opacity: 0.65, marginTop: 4, fontStyle: "italic" }}>
            {nextMilestone.count - tried.length} more to {nextMilestone.title} {nextMilestone.icon}
          </div>
        )}

        <input
          style={{ ...inputStyle, marginTop: 12, padding: "10px 12px", fontSize: 16 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search gins, origins, flavours…"
        />

        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            marginTop: 10,
            paddingBottom: 4,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {STYLE_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              style={{
                ...btn(style === s),
                padding: "7px 14px",
                fontSize: 11,
                borderRadius: 99,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      {/* Passport teaser */}
      {!passport && (
        <div
          style={{
            background: "#241d10",
            borderBottom: `1px solid ${C.border}`,
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              maxWidth: 560,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: HEAD, fontSize: 13, color: C.gold, letterSpacing: "0.1em" }}>
                GINISTRY PASSPORT
              </div>
              <div style={{ fontSize: 15, opacity: 0.8, marginTop: 2 }}>
                Track your tasting journey across {GINS.length} gins.
              </div>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              style={{ ...btn(true), padding: "8px 14px", fontSize: 11, flexShrink: 0 }}
            >
              Start free
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: `1px solid ${C.border}`,
          background: "#241d10",
        }}
      >
        <span style={{ fontSize: 16, opacity: 0.75 }}>
          {filtered.length} gin{filtered.length === 1 ? "" : "s"}
        </span>
        <button
          onClick={() => setTriedOnly((v) => !v)}
          style={{ ...btn(triedOnly), padding: "6px 12px", fontSize: 11 }}
        >
          Tried Only
        </button>
      </div>

      <div style={{ padding: "12px 16px 80px", display: "grid", gap: 10 }}>
        {filtered.map((g) => {
          const isTried = triedSet.has(g.id);
          return (
            <div
              key={g.id}
              onClick={() => setSelected(g)}
              style={{
                display: "flex",
                background: C.card,
                border: `1px solid ${isTried ? C.gold : C.border}`,
                borderRadius: 12,
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <div style={{ width: 5, background: g.colour, flexShrink: 0 }} />
              <div style={{ padding: "12px 14px", flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTried(g.id);
                    }}
                    aria-label={isTried ? "Mark as not tried" : "Mark as tried"}
                    style={{
                      width: 26,
                      height: 26,
                      flexShrink: 0,
                      borderRadius: 6,
                      border: `1.5px solid ${C.gold}`,
                      background: isTried ? C.gold : "transparent",
                      color: "#241d10",
                      cursor: "pointer",
                      fontSize: 15,
                      lineHeight: 1,
                    }}
                  >
                    {isTried ? "✓" : ""}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: HEAD,
                        fontSize: 17,
                        color: C.cream,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <span>{g.name}</span>
                      <span style={{ color: C.gold, fontSize: 13, flexShrink: 0 }}>{g.abv}%</span>
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        letterSpacing: "0.08em",
                        opacity: 0.65,
                        marginTop: 2,
                        fontFamily: HEAD,
                      }}
                    >
                      {g.style} · {g.origin}
                    </div>
                    <p style={{ fontStyle: "italic", fontSize: 16, opacity: 0.85, margin: "8px 0 0" }}>
                      {g.description.length > 90
                        ? g.description.slice(0, 90).trimEnd() + "…"
                        : g.description}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                      {g.tags.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: 12,
                            padding: "3px 9px",
                            borderRadius: 99,
                            border: `1px solid ${C.border}`,
                            background: "#241d10",
                            color: C.gold,
                            fontFamily: HEAD,
                            letterSpacing: "0.05em",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, fontStyle: "italic", opacity: 0.7 }}>
            No gins match your search.
          </div>
        )}
      </div>

      {/* Bottom sheet */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 40,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.card,
              borderTop: `3px solid ${selected.colour}`,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "18px 20px 28px",
            }}
          >
            <div
              style={{
                width: 42,
                height: 4,
                borderRadius: 99,
                background: C.border,
                margin: "0 auto 16px",
              }}
            />
            <div style={{ fontFamily: HEAD, fontSize: 24, color: C.gold }}>{selected.name}</div>
            <div style={{ fontFamily: HEAD, fontSize: 13, opacity: 0.7, marginTop: 4 }}>
              {selected.style} · {selected.origin} · {selected.abv}%
            </div>
            <p style={{ fontSize: 19, lineHeight: 1.5, marginTop: 16 }}>{selected.description}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
              {selected.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 12,
                    padding: "4px 10px",
                    borderRadius: 99,
                    border: `1px solid ${C.border}`,
                    background: "#241d10",
                    color: C.gold,
                    fontFamily: HEAD,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
            <button
              onClick={() => toggleTried(selected.id)}
              style={{ ...btn(!triedSet.has(selected.id)), width: "100%", marginTop: 22 }}
            >
              {triedSet.has(selected.id) ? "Tried ✓ — Undo" : "Mark as Tried"}
            </button>
          </div>
        </div>
      )}

      {/* Create passport modal */}
      {createOpen && (
        <div
          onClick={() => setCreateOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.card,
              border: `1px solid ${C.gold}`,
              borderRadius: 16,
              padding: "28px 24px",
              maxWidth: 360,
              width: "100%",
            }}
          >
            <div style={{ fontSize: 44, textAlign: "center" }}>🥃</div>
            <div
              style={{
                fontFamily: HEAD,
                fontSize: 12,
                letterSpacing: "0.28em",
                color: C.gold,
                textAlign: "center",
                marginTop: 10,
              }}
            >
              GINISTRY PASSPORT
            </div>
            <div
              style={{ fontFamily: HEAD, fontSize: 24, color: C.cream, textAlign: "center", margin: "8px 0" }}
            >
              Start your journey
            </div>
            <p style={{ fontSize: 16, opacity: 0.8, textAlign: "center", lineHeight: 1.5 }}>
              Enter your name to create a free passport and keep a record of every gin you try at
              The Ginistry.
            </p>
            <label
              style={{
                fontFamily: HEAD,
                fontSize: 11,
                letterSpacing: "0.16em",
                color: C.gold,
                display: "block",
                margin: "18px 0 8px",
              }}
            >
              YOUR NAME
            </label>
            <input
              style={inputStyle}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Alex Fletcher"
              onKeyDown={(e) => {
                if (e.key === "Enter") createPassport();
              }}
            />
            {error && (
              <div style={{ marginTop: 10, color: "#e08b6a", fontSize: 15 }}>{error}</div>
            )}
            <button
              onClick={createPassport}
              style={{ ...btn(true), width: "100%", marginTop: 18 }}
            >
              Create Passport
            </button>
            <button
              onClick={() => setCreateOpen(false)}
              style={{ ...btn(false), width: "100%", marginTop: 10 }}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Milestone celebration */}
      {celebration && (
        <div
          onClick={() => setCelebration(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.gold}`,
              borderRadius: 16,
              padding: "32px 24px",
              textAlign: "center",
              maxWidth: 340,
            }}
          >
            <div style={{ fontSize: 54 }}>{celebration.icon}</div>
            <div
              style={{
                fontFamily: HEAD,
                fontSize: 12,
                letterSpacing: "0.28em",
                color: C.gold,
                marginTop: 10,
              }}
            >
              MILESTONE UNLOCKED
            </div>
            <div style={{ fontFamily: HEAD, fontSize: 26, color: C.cream, margin: "8px 0" }}>
              {celebration.title}
            </div>
            <p style={{ fontStyle: "italic", opacity: 0.8, fontSize: 17 }}>
              {celebration.count} gins tried at The Ginistry.
            </p>
            <button
              onClick={() => setCelebration(null)}
              style={{ ...btn(true), width: "100%", marginTop: 18 }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
