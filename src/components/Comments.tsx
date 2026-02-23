// src/components/Comments.tsx
import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabaseClient"

type Props = { photoId: string }

type Row = {
  id: string
  photo_id: string
  parent_id: string | null
  user_id: string
  display_name: string | null
  body: string
  created_at: string
}

type Node = Row & { replies: Node[] }

function buildTree(rows: Row[]): Node[] {
  const byId = new Map<string, Node>(rows.map((r) => [r.id, { ...r, replies: [] }]))
  const roots: Node[] = []

  for (const n of byId.values()) {
    if (n.parent_id && byId.has(n.parent_id)) byId.get(n.parent_id)!.replies.push(n)
    else roots.push(n)
  }

  const sortRec = (arr: Node[]) => {
    arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    arr.forEach((x) => sortRec(x.replies))
  }

  sortRec(roots)
  return roots
}

export default function Comments({ photoId }: Props) {
  // ✅ FIX: TypeScript no siempre conoce import.meta.env; lo leemos de forma segura
  const env = (import.meta as any).env as {
    VITE_SUPABASE_URL?: string
    VITE_SUPABASE_ANON_KEY?: string
  }
  const hasEnv = Boolean(env?.VITE_SUPABASE_URL && env?.VITE_SUPABASE_ANON_KEY)

  const [session, setSession] = useState<any>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [text, setText] = useState("")
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  const tree = useMemo(() => buildTree(rows), [rows])

  useEffect(() => {
    if (!hasEnv) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null))
    return () => sub.subscription.unsubscribe()
  }, [hasEnv])

  async function load() {
    setError("")
    if (!hasEnv) return

    const { data, error } = await supabase
      .from("comments")
      .select("id,photo_id,parent_id,user_id,display_name,body,created_at")
      .eq("photo_id", photoId)
      .order("created_at", { ascending: true })

    if (error) setError(error.message)
    else setRows((data ?? []) as Row[])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoId])

  async function signInGoogle() {
    setError("")
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function submit() {
    setError("")
    const user = session?.user
    const body = text.trim()
    if (!user) return setError("Inicia sesión para comentar.")
    if (!body) return

    const { error } = await supabase.from("comments").insert({
      photo_id: photoId,
      parent_id: replyTo,
      user_id: user.id,
      display_name: user.user_metadata?.full_name || user.email,
      body,
    })

    if (error) return setError(error.message)

    setText("")
    setReplyTo(null)
    load()
  }

  // ✅ DELETE: borra comentario (y opcionalmente sus respuestas locales)
  async function deleteComment(id: string) {
    setError("")
    if (!session?.user) return setError("Inicia sesión para administrar tus comentarios.")

    const ok = window.confirm("¿Eliminar este comentario? (No se puede deshacer)")
    if (!ok) return

    try {
      setBusyId(id)

      const { error } = await supabase.from("comments").delete().eq("id", id)
      if (error) return setError(error.message)

      // Si borras un comentario padre, suele quedar “huérfano” en UI.
      // Para mantenerlo limpio, removemos localmente el comentario y sus descendientes.
      setRows((prev) => {
        const byId = new Map(prev.map((r) => [r.id, r]))
        const childrenByParent = new Map<string, string[]>()

        for (const r of prev) {
          if (r.parent_id) {
            const arr = childrenByParent.get(r.parent_id) ?? []
            arr.push(r.id)
            childrenByParent.set(r.parent_id, arr)
          }
        }

        const toRemove = new Set<string>()
        const stack = [id]
        while (stack.length) {
          const cur = stack.pop()!
          if (toRemove.has(cur)) continue
          toRemove.add(cur)
          const kids = childrenByParent.get(cur) ?? []
          kids.forEach((k) => stack.push(k))
        }

        // Si por algún motivo el id no existe, no tocamos nada
        if (!byId.has(id)) return prev
        return prev.filter((r) => !toRemove.has(r.id))
      })

      if (replyTo === id) setReplyTo(null)
    } finally {
      setBusyId(null)
    }
  }

  function CommentNode({ c, depth = 0 }: { c: Node; depth?: number }) {
    const isOwner = session?.user?.id === c.user_id

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
        cursor: "pointer"
      }}
    >
      Responder
    </button>

          {replyTo === c.id && (
            <span style={{ fontSize: 12, opacity: 0.7 }}>Respondiendo…</span>
          )}

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
    )
  }

  if (!hasEnv) {
    return (
      <div style={{ marginTop: 16, padding: 12, border: "1px solid #e5e5e5", borderRadius: 12 }}>
        <b>Comentarios desactivados</b>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          Falta configurar <code>.env</code> (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ margin: "10px 0" }}>Comentarios</h3>

      <div style={{ marginBottom: 10 }}>
        {session?.user ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.85 }}>
              Sesión: <b>{session.user.user_metadata?.full_name || session.user.email}</b>
            </div>
            <button onClick={signOut}>Cerrar sesión</button>
          </div>
        ) : (
          <button onClick={signInGoogle}>Entrar con Google</button>
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
          disabled={!session?.user}
          placeholder={session?.user ? "Escribe aquí..." : "Inicia sesión para comentar..."}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button onClick={submit} disabled={!session?.user || !text.trim()}>
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
  )
}