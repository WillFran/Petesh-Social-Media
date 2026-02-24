// src/components/Chat.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
};

function samePair(m: Message, me: string, other: string) {
  return (
    (m.sender_id === me && m.receiver_id === other) ||
    (m.sender_id === other && m.receiver_id === me)
  );
}

// ✅ canal determinístico: dm:<min>:<max>
function dmChannel(me: string, other: string) {
  return me < other ? `dm:${me}:${other}` : `dm:${other}:${me}`;
}

export default function Chat() {
  const { user, profile, loading: authLoading } = useAuth();
  const me = user?.id;

  // ✅ responsive by container width (works inside drawer)
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      // threshold: under this, 2 columns looks bad → WhatsApp mode
      setIsNarrow(entry.contentRect.width < 720);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);

  // ✅ narrow mode navigation (WhatsApp style)
  const [view, setView] = useState<"list" | "chat">("list");

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  // ✅ Auto-scroll
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const headerName = useMemo(() => {
    if (!user) return "";
    return (
      profile?.display_name ||
      (user.user_metadata as any)?.full_name ||
      user.email ||
      "Usuario"
    );
  }, [user, profile]);

  async function loadProfiles() {
    if (!me) return;
    setError("");

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .order("display_name", { ascending: true, nullsFirst: false });

    if (error) {
      setProfiles([]);
      setSelected(null);
      return setError(error.message);
    }

    const list = (data ?? []) as Profile[];
    const others = list.filter((p) => p.id !== me);

    setProfiles(others);
    setSelected((prev) => {
      if (prev && others.some((o) => o.id === prev.id)) return prev;
      return others.length ? others[0] : null;
    });
  }

  async function loadMessages(otherId: string) {
    if (!me) return;
    setError("");

    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, body, created_at")
      .or(
        `and(sender_id.eq.${me},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${me})`
      )
      .order("created_at", { ascending: true });

    if (error) return setError(error.message);
    setMessages((data ?? []) as Message[]);
  }

  // ✅ when changes me → load users
  useEffect(() => {
    if (!me) {
      setProfiles([]);
      setSelected(null);
      setMessages([]);
      setView("list");
      return;
    }
    loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  // ✅ when changes selected → load messages
  useEffect(() => {
    if (!me || !selected?.id) {
      setMessages([]);
      return;
    }
    loadMessages(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, selected?.id]);

  // ✅ realtime subscription
  useEffect(() => {
    if (!me || !selected?.id) return;

    const channel = supabase
      .channel(dmChannel(me, selected.id))
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          if (!samePair(m, me, selected.id)) return;

          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, selected?.id]);

  // ✅ Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selected?.id]);

  // ✅ "unread" naive (UX only)
  const unreadByUser = useMemo(() => {
    if (!me) return new Map<string, number>();

    const map = new Map<string, number>();
    for (const m of messages) {
      if (m.receiver_id !== me) continue;
      const other = m.sender_id;
      map.set(other, (map.get(other) ?? 0) + 1);
    }
    return map;
  }, [messages, me]);

  async function send() {
    if (!me || !selected?.id) return;
    const body = text.trim();
    if (!body) return;

    setError("");
    setText("");

    const id = crypto.randomUUID();

    const optimistic: Message = {
      id,
      sender_id: me,
      receiver_id: selected.id,
      body,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);

    const { error } = await supabase.from("messages").insert({
      id,
      sender_id: me,
      receiver_id: selected.id,
      body,
    });

    if (error) {
      setError(error.message);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }
  }

  // ✅ when layout becomes wide again, keep experience stable
  useEffect(() => {
    if (!isNarrow) {
      // desktop: no "view" needed
      return;
    }
    // narrow: if user already selected, you may prefer to stay in list until they pick
    if (!selected) setView("list");
  }, [isNarrow, selected]);

  const shellStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isNarrow ? "1fr" : "280px 1fr",
    gap: 12,
    padding: 12,
    height: "100%",
    boxSizing: "border-box",
  };

  const panelStyle: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 12,
    background: "rgba(255,255,255,0.02)",
    minHeight: 0,
  };

  const listPanel = (
    <aside style={{ ...panelStyle, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <b style={{ fontSize: 18 }}>Usuarios</b>
      </div>

      {user && (
        <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13 }}>
          Sesión: <b>{headerName}</b>
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, overflow: "auto" }}>
        {authLoading ? (
          <div style={{ opacity: 0.75 }}>Cargando sesión…</div>
        ) : !user ? (
          <div style={{ opacity: 0.75 }}>Inicia sesión para ver usuarios.</div>
        ) : error ? (
          <div style={{ color: "crimson" }}>{error}</div>
        ) : profiles.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No hay otros usuarios aún.</div>
        ) : (
          profiles.map((p) => {
            const active = selected?.id === p.id;
            const unread = unreadByUser.get(p.id) ?? 0;

            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelected(p);
                  if (isNarrow) setView("chat"); // ✅ WhatsApp navigation
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  textAlign: "left",
                  border: "1px solid " + (active ? "#4b7cff" : "rgba(255,255,255,0.10)"),
                  background: active ? "rgba(75,124,255,0.15)" : "rgba(255,255,255,0.02)",
                  borderRadius: 14,
                  padding: "10px 12px",
                  cursor: "pointer",
                  color: "inherit",
                }}
              >
                <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.display_name || "Usuario"}
                </b>

                {unread > 0 && !active && (
                  <span
                    style={{
                      fontSize: 12,
                      padding: "2px 8px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.08)",
                      opacity: 0.95,
                    }}
                    title="Mensajes nuevos (estimado)"
                  >
                    {unread}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );

  const chatPanel = (
    <section style={{ ...panelStyle, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isNarrow && (
            <button
              type="button"
              onClick={() => setView("list")}
              style={{
                width: 40,
                height: 36,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                cursor: "pointer",
                color: "inherit",
              }}
              aria-label="Volver"
              title="Volver"
            >
              ←
            </button>
          )}

          <div>
            <b style={{ fontSize: 18 }}>Chat</b>
            <div style={{ opacity: 0.75, fontSize: 13 }}>
              {selected ? `Con: ${selected.display_name || "Usuario"}` : "Selecciona un usuario"}
            </div>
          </div>
        </div>
      </div>

      {error && user && <div style={{ color: "crimson", marginTop: 10 }}>{error}</div>}

      {/* Messages */}
      <div
        style={{
          marginTop: 12,
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          padding: 12,
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          background: "rgba(0,0,0,0.18)",
        }}
      >
        {!user ? (
          <div style={{ opacity: 0.75 }}>Inicia sesión para chatear.</div>
        ) : !selected ? (
          <div style={{ opacity: 0.75 }}>Selecciona un usuario.</div>
        ) : messages.length === 0 ? (
          <div style={{ opacity: 0.75 }}>Aún no hay mensajes.</div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === me;
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: mine ? "flex-end" : "flex-start",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    maxWidth: "78%",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 16,
                    padding: "10px 12px",
                    background: mine ? "rgba(75,124,255,0.18)" : "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>
                  <div style={{ opacity: 0.65, fontSize: 11, marginTop: 6 }}>
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={user ? "Escribe un mensaje..." : "Inicia sesión..."}
          disabled={!user || !selected}
          style={{
            flex: 1,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.10)",
            padding: "10px 12px",
            background: "rgba(255,255,255,0.03)",
            color: "inherit",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button
          onClick={send}
          disabled={!user || !selected || !text.trim()}
          style={{
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.06)",
            color: "inherit",
            padding: "10px 14px",
            cursor: "pointer",
            opacity: !user || !selected || !text.trim() ? 0.5 : 1,
          }}
        >
          Enviar
        </button>
      </div>
    </section>
  );

  return (
    <div ref={rootRef} style={shellStyle}>
      {/* ✅ Narrow: WhatsApp navigation */}
      {isNarrow ? (view === "list" ? listPanel : chatPanel) : (
        <>
          {listPanel}
          {chatPanel}
        </>
      )}
    </div>
  );
}