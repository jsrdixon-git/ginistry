import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MILESTONES, STYLE_FILTERS, type Gin } from "@/data/gins";
import { supabase } from "@/integrations/supabase/client";

const C = {
  bg: "#2c2416",
  card: "#332a18",
  border: "#4a3c22",
  gold: "#e8b84b",
  cream: "#f5ede0",
};
const HEAD = "'Cinzel', serif";
const BODY = "'Cormorant Garamond', serif";

type Passport = {
  profile: { name: string; id: string; email: string; created: string };
  tried: number[];
  ratings: Record<number, number>;

};


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

const labelStyle: React.CSSProperties = {
  fontFamily: HEAD,
  fontSize: 11,
  letterSpacing: "0.16em",
  color: C.gold,
  display: "block",
  margin: "16px 0 8px",
};


export default function GinExplorer({ gins: ginsProp }: { gins?: Gin[] }) {
  const gins = useMemo(() => ginsProp ?? [], [ginsProp]);
  const GINS = gins;
  const MILESTONE_LIST = useMemo(
    () => MILESTONES.map((m) => (m.title === "Gin Master" ? { ...m, count: gins.length } : m)),
    [gins.length],
  );
  const STYLES = useMemo(() => {
    const present = new Set(gins.map((g) => g.style));
    const ordered = STYLE_FILTERS.filter((s) => s === "All" || present.has(s));
    const extra = [...present].filter((s) => !STYLE_FILTERS.includes(s)).sort();
    return [...ordered, ...extra];
  }, [gins]);
  const [passport, setPassport] = useState<Passport | null>(null);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<"main" | "passport">("main");
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [style, setStyle] = useState("All");
  const [triedOnly, setTriedOnly] = useState(false);
  const [selected, setSelected] = useState<Gin | null>(null);
  const [copied, setCopied] = useState(false);
  const [celebration, setCelebration] = useState<(typeof MILESTONES)[number] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [sheetDragY, setSheetDragY] = useState(0);
  const sheetStartY = useRef(0);
  const isDragging = useRef(false);

  const loadAccount = useCallback(async (user: { id: string; email?: string }) => {
    const [{ data: profile }, { data: rows }] = await Promise.all([
      supabase.from("profiles").select("display_name, created_at").eq("id", user.id).maybeSingle(),
      supabase.from("tried_gins").select("gin_id, rating").eq("user_id", user.id),
    ]);
    const ratingMap: Record<number, number> = {};
    for (const r of rows ?? []) ratingMap[r.gin_id] = r.rating ?? 0;
    setPassport({
      profile: {
        name: profile?.display_name || user.email?.split("@")[0] || "Explorer",
        id: user.id,
        email: user.email ?? "",
        created: profile?.created_at ?? new Date().toISOString(),
      },
      tried: (rows ?? []).map((r) => r.gin_id),
      ratings: ratingMap,
    });
  }, []);


  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const user = data.session?.user;
      if (user) void loadAccount(user);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") setPassport(null);
      else if (session?.user) void loadAccount(session.user);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadAccount]);


  const tried = passport?.tried ?? [];
  const ratings = passport?.ratings ?? {};

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
      openCreatePassport();
      return false;
    }
    return true;
  }

  function openCreatePassport() {
    setError("");
    setCreateOpen(true);
  }

  function toggleTried(id: number) {
    if (!ensurePassport()) return;
    const current = passport!;
    const has = current.tried.includes(id);
    const nextRatings = { ...current.ratings };
    if (has) delete nextRatings[id];
    const next: Passport = {
      ...current,
      tried: has ? current.tried.filter((x) => x !== id) : [...current.tried, id],
      ratings: nextRatings,
    };
    setPassport(next);
    const userId = current.profile.id;
    void (has
      ? supabase.from("tried_gins").delete().eq("user_id", userId).eq("gin_id", id)
      : supabase.from("tried_gins").insert({ user_id: userId, gin_id: id }));
    if (!has) {
      const m = MILESTONE_LIST.find((mm) => mm.count === next.tried.length);
      if (m) setCelebration(m);
    }
  }

  function setRating(id: number, value: number) {
    const current = passport;
    if (!current) return;
    setPassport({ ...current, ratings: { ...current.ratings, [id]: value } });
    void supabase
      .from("tried_gins")
      .update({ rating: value })
      .eq("user_id", current.profile.id)
      .eq("gin_id", id);
  }


  async function submitAuth() {
    const email = emailInput.trim();
    const password = passwordInput;
    if (!email || !password) return setError("Please enter your email and password.");
    if (authMode === "signup" && !nameInput.trim()) return setError("Please enter your name.");
    setAuthBusy(true);
    setError("");
    try {
      if (authMode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: nameInput.trim() },
          },
        });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
      setCreateOpen(false);
      setPasswordInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setPassport(null);
    setScreen("main");
  }


  function download() {
    if (!passport) return;
    const lines = [
      "THE GINISTRY GIN EXPLORER — PASSPORT",
      "Oxted, Surrey",
      "",
      `Name: ${passport.profile.name}`,
      `Account: ${passport.profile.email}`,
      `Gins tried: ${passport.tried.length} / ${GINS.length}`,
      "",
      "GINS TRIED:",
      ...passport.tried.map((id, i) => {
        const g = GINS.find((x) => x.id === id);
        if (!g) return "";
        const r = passport.ratings[id] ?? 0;
        const stars = r ? ` — ${"★".repeat(r)}${"☆".repeat(3 - r)}` : "";
        return `${i + 1}. ${g.name} — ${g.style}, ${g.origin} (${g.abv}% ABV)${stars}`;
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

  const createModal = createOpen && (
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
              maxHeight: "88vh",
              overflowY: "auto",

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
              {authMode === "signup" ? "Start your journey" : "Welcome back"}
            </div>
            <p style={{ fontSize: 16, opacity: 0.8, textAlign: "center", lineHeight: 1.5 }}>
              {authMode === "signup"
                ? "Create a free account and keep a record of every gin you try at The Ginistry — on any device."
                : "Sign in to pick up your passport where you left off."}
            </p>

            {authMode === "signup" && (
              <>
                <label style={labelStyle}>YOUR NAME</label>
                <input
                  style={inputStyle}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Alex Fletcher"
                  autoComplete="name"
                />
              </>
            )}

            <label style={labelStyle}>EMAIL</label>
            <input
              style={inputStyle}
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="you@example.com"
            />

            <label style={labelStyle}>PASSWORD</label>
            <input
              style={inputStyle}
              type="password"
              autoComplete={authMode === "signup" ? "new-password" : "current-password"}
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="At least 6 characters"
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitAuth();
              }}
            />

            {error && (
              <div style={{ marginTop: 10, color: "#e08b6a", fontSize: 15 }}>{error}</div>
            )}
            <button
              type="button"
              onClick={() => void submitAuth()}
              disabled={authBusy}
              style={{
                ...btn(true),
                width: "100%",
                marginTop: 18,
                minHeight: 48,
                opacity: authBusy ? 0.6 : 1,
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {authBusy
                ? "Please wait…"
                : authMode === "signup"
                  ? "Create Passport"
                  : "Sign In"}
            </button>
            <button
              type="button"
              onClick={() => {
                setError("");
                setAuthMode(authMode === "signup" ? "signin" : "signup");
              }}
              style={{ ...btn(false), width: "100%", marginTop: 10, minHeight: 44 }}
            >
              {authMode === "signup" ? "I already have a passport" : "Create a new passport"}
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              style={{
                ...btn(false),
                width: "100%",
                marginTop: 10,
                border: "none",
                opacity: 0.7,
              }}
            >
              Maybe later
            </button>

          </div>
        </div>
      );

  if (!ready) return <div style={{ background: C.bg, minHeight: "100vh" }} />;

  const pct = Math.round((tried.length / GINS.length) * 100);
  const nextMilestone = MILESTONE_LIST.find((m) => m.count > tried.length);

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
                Create a free account to track the gins you try, collect stamps, and unlock
                tasting milestones.
              </p>
              <button
                type="button"
                onClick={openCreatePassport}
                style={{
                  ...btn(true),
                  width: "100%",
                  marginTop: 20,
                  minHeight: 48,
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
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
                  marginTop: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 16, opacity: 0.8 }}>{passport.profile.email}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(passport.profile.email);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  style={{ ...btn(false), padding: "6px 12px", fontSize: 11 }}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  style={{ ...btn(false), padding: "6px 12px", fontSize: 11 }}
                >
                  Sign Out
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
            {MILESTONE_LIST.map((m) => {
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
                          {g.style} · {g.origin} · {g.abv}% ABV
                        </div>
                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {[1, 2, 3].map((n) => {
                            const active = (ratings[id] ?? 0) >= n;
                            return (
                              <button
                                key={n}
                                type="button"
                                aria-label={`Rate ${g.name} ${n} star${n > 1 ? "s" : ""}`}
                                onClick={() => setRating(id, (ratings[id] ?? 0) === n ? 0 : n)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: "4px 2px",
                                  cursor: "pointer",
                                  fontSize: 22,
                                  lineHeight: 1,
                                  color: active ? C.gold : "#6b5c3a",
                                  touchAction: "manipulation",
                                  WebkitTapHighlightColor: "transparent",
                                }}
                              >
                                {active ? "★" : "☆"}
                              </button>
                            );
                          })}
                          <span
                            style={{
                              fontFamily: HEAD,
                              fontSize: 10,
                              letterSpacing: "0.14em",
                              opacity: 0.55,
                              marginLeft: 4,
                            }}
                          >
                            {ratings[id] ? `${ratings[id]}/3` : "RATE IT"}
                          </span>
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
        {createModal}
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
          <button
            onClick={() => {
              setScreen("main");
              setSelected(null);
              setSearch("");
              setStyle("All");
              setTriedOnly(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              textAlign: "left",
              cursor: "pointer",
            }}
            aria-label="Go to home screen"
          >
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
            <div style={{ fontSize: 12, letterSpacing: "0.24em", opacity: 0.6, fontFamily: HEAD, color: C.cream }}>
              GIN EXPLORER
            </div>
          </button>
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
          {STYLES.map((s) => (
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
              type="button"
              onClick={openCreatePassport}
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
            ref={sheetRef}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              const t = e.touches[0];
              if (!t) return;
              sheetStartY.current = t.clientY;
              isDragging.current = true;
              setSheetDragY(0);
            }}
            onTouchMove={(e) => {
              const t = e.touches[0];
              if (!t || !isDragging.current) return;
              const delta = t.clientY - sheetStartY.current;
              if (delta > 0) setSheetDragY(delta);
            }}
            onTouchEnd={() => {
              isDragging.current = false;
              if (sheetDragY > 100) {
                setSheetDragY(0);
                setSelected(null);
              } else {
                setSheetDragY(0);
              }
            }}
            style={{
              background: C.card,
              borderTop: `3px solid ${selected.colour}`,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "18px 20px 28px",
              transform: `translateY(${sheetDragY}px)`,
              transition: isDragging.current ? "none" : "transform .25s ease",
              touchAction: "pan-y",
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
              {selected.style} · {selected.origin} · {selected.abv}% ABV
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
              onClick={() => setSelected(null)}
              style={{ ...btn(false), width: "100%", marginTop: 22 }}
            >
              ← Back to gins
            </button>
            <button
              onClick={() => toggleTried(selected.id)}
              style={{ ...btn(!triedSet.has(selected.id)), width: "100%", marginTop: 10 }}
            >
              {triedSet.has(selected.id) ? "Tried ✓ — Undo" : "Mark as Tried"}
            </button>
          </div>
        </div>
      )}

      {createModal}

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
