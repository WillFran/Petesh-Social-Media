// src/components/ChatDrawer.tsx
import React, { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

// ✅ Hook pequeño para responsive sin CSS extra
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
}

export default function ChatDrawer({ open, onClose, children }: Props) {
  const isMobile = useIsMobile(768);

  // ✅ UX: Esc + bloquear scroll cuando open
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  // ✅ Medidas “modernas” que se ven bien en tamaños intermedios
  const sheet = useMemo(() => {
    if (isMobile) {
      return {
        width: "100vw",
        height: "100dvh",
        right: 0,
        top: 0,
        bottom: 0,
        borderRadius: 0,
      } as const;
    }

    // Desktop / tablet: card flotante con margen
    return {
      width: "clamp(340px, 32vw, 440px)",
      height: "calc(100dvh - 96px)", // deja respirar arriba/abajo
      right: 24,
      top: 72,
      bottom: 24,
      borderRadius: 22,
    } as const;
  }, [isMobile]);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={open ? onClose : undefined}
        style={{
          position: "fixed",
          inset: 0,
          background: open ? "rgba(0,0,0,0.35)" : "transparent",
          backdropFilter: open ? "blur(6px)" : "none",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 180ms ease",
          zIndex: 90,
        }}
      />

      {/* Sheet / Drawer (card flotante) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        style={{
          position: "fixed",
          right: sheet.right,
          top: sheet.top,
          width: sheet.width,
          height: sheet.height,

          background: "rgba(10,10,14,0.96)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: sheet.borderRadius,
          boxShadow: "0 26px 90px rgba(0,0,0,0.65)",
          backdropFilter: "blur(14px)",

          transform: open ? "translateX(0)" : "translateX(120%)",
          opacity: open ? 1 : 0.98,
          transition: "transform 260ms cubic-bezier(.2,.8,.2,1), opacity 220ms ease",

          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header minimal (se siente app) */}
        <div
          style={{
            padding: "12px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "rgba(255,255,255,0.92)",
          }}
        >
          <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>Chat</div>

          <button
            onClick={onClose}
            aria-label="Cerrar chat"
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.92)",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>{children}</div>
      </div>
    </>
  );
}