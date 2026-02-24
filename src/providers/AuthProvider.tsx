// src/providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type SessionType = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"];
type UserType = Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"];

type AuthContextValue = {
  session: SessionType;
  user: UserType;
  profile: Profile | null;

  /**
   * ✅ "loading" now means AUTH ready (session/user).
   * Profile hydration runs in background to avoid perceived delay.
   */
  loading: boolean;

  /**
   * Optional: profile sync status (kept internal unless you want it in UI)
   */
  // profileLoading: boolean;

  error: string | null;

  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function buildProfileDefaults(user: NonNullable<UserType>) {
  const meta: any = user.user_metadata ?? {};
  const display_name =
    meta.full_name ||
    meta.name ||
    (typeof user.email === "string" ? user.email.split("@")[0] : null) ||
    "Usuario";

  const avatar_url = meta.avatar_url || meta.picture || null;
  return { display_name, avatar_url };
}

async function selectProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data as Profile;
}

function withTimeout<T>(p: Promise<T>, ms: number, label = "timeout"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} after ${ms}ms`)), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

/**
 * ✅ Optimized profile ensure:
 * - Try SELECT first (fast).
 * - If missing, INSERT once (no "always upsert").
 * - Patch only missing fields (never overwrite custom alias).
 */
async function ensureProfile(user: NonNullable<UserType>): Promise<Profile> {
  const defaults = buildProfileDefaults(user);

  // 1) try read
  const existing = await selectProfile(user.id);
  if (!existing) {
    // 2) create if missing
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      display_name: defaults.display_name,
      avatar_url: defaults.avatar_url,
    });

    if (insertError) {
      // If race condition (trigger created it), just re-select.
      const afterRace = await selectProfile(user.id);
      if (!afterRace) throw insertError;
      return afterRace;
    }

    const created = await selectProfile(user.id);
    if (!created) {
      throw new Error("Unable to read profile after insert (check RLS SELECT on profiles).");
    }
    return created;
  }

  // 3) patch missing only
  const patch: Partial<Profile> = {};
  if (!existing.display_name && defaults.display_name) patch.display_name = defaults.display_name;
  if (!existing.avatar_url && defaults.avatar_url) patch.avatar_url = defaults.avatar_url;

  if (Object.keys(patch).length > 0) {
    const { error: patchError } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (patchError) throw patchError;

    const updated = await selectProfile(user.id);
    if (updated) return updated;
  }

  return existing;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionType>(null);
  const [user, setUser] = useState<UserType>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // ✅ Split loading: auth vs profile
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Concurrency guard: every auth flow increments runId; only latest can commit
  const runIdRef = useRef(0);
  const mountedRef = useRef(true);

  const commitIfLatest = (runId: number, fn: () => void) => {
    if (!mountedRef.current) return;
    if (runId !== runIdRef.current) return;
    fn();
  };

  const hydrateFromSession = async (s: SessionType) => {
    const runId = ++runIdRef.current;

    // AUTH phase starts
    commitIfLatest(runId, () => {
      setAuthLoading(true);
      setErrMsg(null);
    });

    try {
      // ✅ Commit session/user immediately (fast UI)
      commitIfLatest(runId, () => {
        setSession(s);
        setUser(s?.user ?? null);
      });

      // ✅ AUTH is ready now; do not block on profile work
      commitIfLatest(runId, () => setAuthLoading(false));

      if (s?.user) {
        // Provide instant defaults for UI while we hydrate real profile
        const defaults = buildProfileDefaults(s.user);
        commitIfLatest(runId, () => {
          setProfile((prev) =>
            prev ?? { id: s.user!.id, display_name: defaults.display_name, avatar_url: defaults.avatar_url }
          );
          setProfileLoading(true);
        });

        // Hydrate profile in background (timeout protected)
        withTimeout(ensureProfile(s.user), 5000, "ensureProfile")
          .then((p) => commitIfLatest(runId, () => setProfile(p)))
          .catch((e: any) => {
            // Do not "break" auth UI — only report error
            commitIfLatest(runId, () => setErrMsg(e?.message ?? "Profile sync error"));
          })
          .finally(() => commitIfLatest(runId, () => setProfileLoading(false)));
      } else {
        commitIfLatest(runId, () => {
          setProfile(null);
          setProfileLoading(false);
        });
      }
    } catch (e: any) {
      // In case anything unexpected happens in auth hydration
      commitIfLatest(runId, () => {
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
        setErrMsg(e?.message ?? "Auth error");
        setAuthLoading(false);
      });
    }
  };

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const p = await selectProfile(user.id);
    setProfile(p);
  };

  useEffect(() => {
    mountedRef.current = true;

    // init
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setErrMsg(error.message);
        setAuthLoading(false);
        return;
      }
      await hydrateFromSession(data.session ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      await hydrateFromSession(newSession ?? null);
    });

    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Optional: immediate local cleanup (snappier UI)
    setSession(null);
    setUser(null);
    setProfile(null);
    setErrMsg(null);
  };

  const updateDisplayName = async (displayName: string) => {
    if (!user) throw new Error("Not authenticated");

    const clean = displayName.trim();
    if (clean.length < 3) throw new Error("Alias too short");

    const { error } = await supabase.from("profiles").update({ display_name: clean }).eq("id", user.id);
    if (error) throw error;

    setProfile((prev) => (prev ? { ...prev, display_name: clean } : prev));
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      loading: authLoading, // ✅ only auth readiness

      // If you want to use it in UI later, uncomment in types and here:
      // profileLoading,

      error: errMsg,
      signInWithGoogle,
      signOut,
      updateDisplayName,
      refreshProfile,
    }),
    [session, user, profile, authLoading, errMsg]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}