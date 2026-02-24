// src/components/Comments.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";

type Props = { photoId: string };

type Row = {
  id: string;
  photo_id: string;
  parent_id: string | null;
  user_id: string;
  display_name: string | null;
  body: string;
  created_at: string;
};

type Node = Row & { replies: Node[] };

function buildTree(rows: Row[]): Node[] {
  const byId = new Map<string, Node>(rows.map((r) => [r.id, { ...r, replies: [] }]));
  const roots: Node[] = [];

  for (const n of byId.values()) {
    if (n.parent_id && byId.has(n.parent_id)) byId.get(n.parent_id)!.replies.push(n);
    else roots.push(n);
  }

  const sortRec = (arr: Node[]) => {
    arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    arr.forEach((x) => sortRec(x.replies));
  };

  sortRec(roots);
  return roots;
}

export default function Comments({ photoId }: Props) {
  const { user, profile, loading: authLoading } = useAuth();

  const [rows, setRows] = useState<Row[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const tree = useMemo(() => buildTree(rows), [rows]);

  const displayName = useMemo(() => {
    if (!user) return "";
    return (
      profile?.display_name ||
      (user.user_metadata as any)?.full_name ||
      user.email ||
      "Usuario"
    );
  }, [user, profile]);

  async function load() {
    setError("");

    const { data, error } = await supabase
      .from("comments")
      .select("id,photo_id,parent_id,user_id,display_name,body,created_at")
      .eq("photo_id", photoId)
      .order("created_at", { ascending: true });

    if (error) setError(error.message);
    else setRows((data ?? []) as Row[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoId]);

  async function submit() {
    setError("");

    const body = text.trim();
    if (!user) return setError("Inicia sesión para comentar.");
    if (!body) return;

    const { error } = await supabase.from("comments").insert({
      photo_id: photoId,
      parent_id: replyTo,
      user_id: user.id,
      // 👇 mantenemos display_name en la fila para snapshot histórico
      display_name: displayName,
      body,
    });

    if (error) return setError(error.message);

    setText("");
    setReplyTo(null);
    load();
  }

  async function deleteComment(id: string) {
    setError("");
    if (!user) return setError("Inicia sesión para administrar tus comentarios.");

    const ok = window.confirm("¿Eliminar este comentario? (No se puede deshacer)");
    if (!ok) return;

    try {
      setBusyId(id);

      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) return setError(error.message);

      // remover localmente comentario y descendientes (mantienes UI limpia)
      setRows((prev) => {
        const byId = new Map(prev.map((r) => [r.id, r]));
        const childrenByParent = new Map<string, string[]>();

        for (const r of prev) {
          if (r.parent_id) {
            const arr = childrenByParent.get(r.parent_id) ?? [];
            arr.push(r.id);
            childrenByParent.set(r.parent_id, arr);
          }
        }

        const toRemove = new Set<string>();
        const stack = [id];

        while (stack.length) {
          const cur = stack.pop()!;
          if (toRemove.has(cur)) continue;
          toRemove.add(cur);
          const kids = childrenByParent.get(cur) ?? [];
          kids.forEach((k) => stack.push(k));
        }

        if (!byId.has(id)) return prev;
        return prev.filter((r) => !toRemove.has(r.id));
      });

      if (replyTo === id) setReplyTo(null);
    } finally {
      setBusyId(null);
    }
  }

  function CommentNode({ c, depth = 0 }: { c: Node; depth?: number }) {
    const isOwner = user?.id === c.user_id;

    return (
      <div
        style={{
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          padding: 12,
          marginTop: 10,
          marginLeft: depth ? 16 : 0,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <b>{c.display_name || "Usuario"}</b>
          <span style={{ opacity: 0.7, fontSize: 12 }}>
            {new Date(c.created_at).toLocaleString()}
          </span>
        </div>

        <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{c.body}</div>

        <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => setReplyTo(c.id)}
            style={{
              border: "none",
              background: "none",
              color: "#4da6ff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Responder
          </button>

          {replyTo === c.id && <span style={{ fontSize: 12, opacity: 0.7 }}>Respondiendo…</span>}

          {isOwner && (
            <button
              onClick={() => deleteComment(c.id)}
              disabled={busyId === c.id}
              style={{
                border: 0,
                background: "transparent",
                cursor: busyId === c.id ? "not-allowed" : "pointer",
                color: "crimson",
                opacity: busyId === c.id ? 0.6 : 1,
              }}
              title="Eliminar comentario"
            >
              {busyId === c.id ? "Eliminando..." : "Eliminar"}
            </button>
          )}
        </div>

        {c.replies.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {c.replies.map((r) => (
              <CommentNode key={r.id} c={r} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ margin: "10px 0" }}>Comentarios</h3>

      {/* ✅ estado de sesión: informativo, sin login/logout aquí */}
      <div style={{ marginBottom: 10, fontSize: 14, opacity: 0.85 }}>
        {authLoading ? (
          "Cargando sesión…"
        ) : user ? (
          <>
            Sesión: <b>{displayName}</b>
          </>
        ) : (
          "Inicia sesión (icono de avatar arriba) para comentar."
        )}
      </div>

      {error && <div style={{ color: "crimson", marginBottom: 10 }}>{error}</div>}

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <b>{replyTo ? "Responder comentario" : "Nuevo comentario"}</b>
          {replyTo && <button onClick={() => setReplyTo(null)}>Cancelar</button>}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          style={{ width: "100%", marginTop: 10, padding: 10, borderRadius: 10 }}
          disabled={!user}
          placeholder={user ? "Escribe aquí..." : "Inicia sesión para comentar..."}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button onClick={submit} disabled={!user || !text.trim()}>
            Publicar
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {tree.length === 0 ? (
          <div style={{ opacity: 0.75 }}>Aún no hay comentarios.</div>
        ) : (
          tree.map((c) => <CommentNode key={c.id} c={c} />)
        )}
      </div>
    </div>
  );
}