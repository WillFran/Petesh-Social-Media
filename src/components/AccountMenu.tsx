// src/components/AccountMenu.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";

function getInitials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "U";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

const COLORS = {
  text: "rgba(255,255,255,0.92)",
  muted: "rgba(255,255,255,0.72)",
  muted2: "rgba(255,255,255,0.62)",
  border: "rgba(255,255,255,0.12)",
  borderSoft: "rgba(255,255,255,0.10)",
  bgPanel: "rgba(10,10,14,0.92)",
  bgBtn: "rgba(255,255,255,0.06)",
  bgBtnStrong: "rgba(255,255,255,0.10)",
  bgHover: "rgba(255,255,255,0.12)",
};

export default function AccountMenu() {
  const { user, profile, loading, signInWithGoogle, signOut, updateDisplayName } = useAuth();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [alias, setAlias] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
        setError(null);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setEditing(false);
        setError(null);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!editing) setAlias(profile?.display_name ?? "");
  }, [profile?.display_name, editing]);

  const email = user?.email ?? "";
  const provider = user?.app_metadata?.provider ?? "unknown";

  const avatarUrl =
    profile?.avatar_url ||
    (user?.user_metadata as any)?.avatar_url ||
    (user?.user_metadata as any)?.picture;

  const displayName =
    profile?.display_name ||
    (user?.user_metadata as any)?.full_name ||
    (user?.user_metadata as any)?.name ||
    "Usuario";

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const onSaveAlias = async () => {
    setError(null);
    setBusy(true);
    try {
      await updateDisplayName(alias);
      setEditing(false);
    } catch (e: any) {
      setError(e?.message ?? "Error updating alias");
    } finally {
      setBusy(false);
    }
  };

  const closeMenu = () => {
    setOpen(false);
    setEditing(false);
    setError(null);
  };

  const menuButtonStyle: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: 999,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.bgBtn,
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    cursor: "pointer",
    color: COLORS.text,
  };

  const panelStyle: React.CSSProperties = {
    position: "absolute",
    right: 0,
    top: 46,
    width: 280,
    borderRadius: 12,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.bgPanel,
    backdropFilter: "blur(10px)",
    padding: 12,
    boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
    zIndex: 50,

    // ✅ Clave: define el color base para que no salga negro por defecto
    color: COLORS.text,
  };

  const cardRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginBottom: 10,
  };

  const avatarBoxStyle: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 999,
    overflow: "hidden",
    border: `1px solid ${COLORS.border}`,
    display: "grid",
    placeItems: "center",
    background: COLORS.bgBtn,
    flex: "0 0 auto",
    color: COLORS.text,
  };

  const dividerStyle: React.CSSProperties = {
    borderTop: `1px solid ${COLORS.borderSoft}`,
    paddingTop: 10,
  };

  const itemButtonBase: React.CSSProperties = {
    width: "100%",
    textAlign: "left",
    padding: "10px 10px",
    borderRadius: 10,
    border: `1px solid ${COLORS.borderSoft}`,
    background: "rgba(255,255,255,0.04)",
    color: COLORS.text,
    cursor: "pointer",
    transition: "background 120ms ease, border-color 120ms ease",
  };

  const primaryButtonBase: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.10)",
    color: COLORS.text,
    cursor: "pointer",
    transition: "background 120ms ease, border-color 120ms ease",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: COLORS.text,
    outline: "none",
    marginBottom: 8,
  };

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)} aria-label="Account menu" style={menuButtonStyle}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: 12, color: COLORS.text }}>{initials}</span>
        )}
      </button>

      {open && (
        <div style={panelStyle}>
          {loading ? (
            <div style={{ padding: 8, color: COLORS.muted }}>Cargando…</div>
          ) : !user ? (
            <>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Cuenta</div>
              <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 10 }}>
                Inicia sesión para comentar y chatear.
              </div>
              <button
                onMouseEnter={() => setHoverKey("google")}
                onMouseLeave={() => setHoverKey(null)}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await signInWithGoogle();
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
                style={{
                  ...primaryButtonBase,
                  background: hoverKey === "google" ? "rgba(255,255,255,0.12)" : primaryButtonBase.background,
                }}
              >
                Ingresar con Google
              </button>
            </>
          ) : (
            <>
              <div style={cardRowStyle}>
                <div style={avatarBoxStyle}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 12, color: COLORS.text }}>{initials}</span>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      lineHeight: 1.1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: COLORS.text,
                    }}
                  >
                    {displayName}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: COLORS.muted,
                      marginTop: 2,
                    }}
                  >
                    {email}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.muted2, marginTop: 2 }}>Proveedor: {provider}</div>
                </div>
              </div>

              <div style={dividerStyle}>
                {!editing ? (
                  <button
                    onMouseEnter={() => setHoverKey("alias")}
                    onMouseLeave={() => setHoverKey(null)}
                    onClick={() => setEditing(true)}
                    style={{
                      ...itemButtonBase,
                      background: hoverKey === "alias" ? COLORS.bgHover : itemButtonBase.background,
                      marginBottom: 8,
                    }}
                  >
                    Cambiar alias
                  </button>
                ) : (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>Alias</div>
                    <input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Tu alias" style={inputStyle} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onMouseEnter={() => setHoverKey("cancel")}
                        onMouseLeave={() => setHoverKey(null)}
                        onClick={() => {
                          setEditing(false);
                          setError(null);
                        }}
                        disabled={busy}
                        style={{
                          ...itemButtonBase,
                          flex: 1,
                          background: hoverKey === "cancel" ? COLORS.bgHover : itemButtonBase.background,
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        onMouseEnter={() => setHoverKey("save")}
                        onMouseLeave={() => setHoverKey(null)}
                        onClick={onSaveAlias}
                        disabled={busy}
                        style={{
                          ...primaryButtonBase,
                          flex: 1,
                          background: hoverKey === "save" ? "rgba(255,255,255,0.14)" : primaryButtonBase.background,
                        }}
                      >
                        Guardar
                      </button>
                    </div>
                    {error && <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,120,120,0.92)" }}>{error}</div>}
                  </div>
                )}

                <button
                  onMouseEnter={() => setHoverKey("signout")}
                  onMouseLeave={() => setHoverKey(null)}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await signOut();
                      closeMenu();
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                  style={{
                    ...itemButtonBase,
                    background: hoverKey === "signout" ? COLORS.bgHover : itemButtonBase.background,
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}