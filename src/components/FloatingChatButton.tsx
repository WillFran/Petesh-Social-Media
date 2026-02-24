// src/components/FloatingChatButton.tsx
type Props = {
  onClick: () => void;
  unreadCount?: number;
};

export default function FloatingChatButton({ onClick, unreadCount = 0 }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 999,
        background: "linear-gradient(135deg, #7c3aed, #ec4899)",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
        zIndex: 100,
      }}
    >
      <span style={{ fontSize: 22 }}>💬</span>

      {unreadCount > 0 && (
        <div
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            background: "#ef4444",
            color: "white",
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 999,
            padding: "2px 6px",
          }}
        >
          {unreadCount}
        </div>
      )}
    </div>
  );
}