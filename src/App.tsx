// src/App.tsx
import { useState } from "react";
import { photos } from "./data/photos";
import GalleryGrid from "./components/GalleryGrid";
import PhotoModal from "./components/PhotoModal";
import Comments from "./components/Comments";
import Chat from "./components/Chat";
import AccountMenu from "./components/AccountMenu";
import FloatingChatButton from "./components/FloatingChatButton";
import ChatDrawer from "./components/ChatDrawer";

type SortMode = "recent" | "comments";

export default function App() {
  const [selected, setSelected] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("recent");

  // ✅ Nuevo estado global del chat
  const [chatOpen, setChatOpen] = useState(false);

  const sortedPhotos = sort === "recent" ? [...photos].reverse() : photos;

  return (
    <div className="appShell">
      {/* ================= HEADER ================= */}
      <header className="topbar">
        <div className="topbarInner">
          <div className="brand">
            <div className="logoDot" />
            <div>
              <div className="brandName">L@s PRETESH</div>
              <div className="brandSub">Social Media Cerrado</div>
            </div>
          </div>

          <div className="actions">
            <div className="segmented">
              <button
                type="button"
                className={sort === "recent" ? "segBtn active" : "segBtn"}
                onClick={() => setSort("recent")}
              >
                Recientes
              </button>

              <button
                type="button"
                className={sort === "comments" ? "segBtn active" : "segBtn"}
                onClick={() => setSort("comments")}
              >
                Más comentadas
              </button>
            </div>

            <AccountMenu />
          </div>
        </div>
      </header>

      {/* ================= PAGE CONTENT ================= */}
      <div className="pageContainer">
        {/* ✅ Chat eliminado de aquí */}

        <main className="content">
          <h1 className="pageTitle">Álbum</h1>
          <GalleryGrid photos={sortedPhotos} onSelect={setSelected} />
        </main>
      </div>

      {/* ================= FOOTER ================= */}
      <footer className="footer">
        <div className="footerInner">
          <div className="footerLeft">
            <span className="footerDot" />
            <div className="footerText">
              <div className="footerBrand">L@s PRETESH</div>
              <div className="footerSub">Festival urbano • Álbum privado</div>
            </div>
          </div>

          <div className="footerRight">
            <span className="footerChip">Solo miembros</span>
            <span className="footerMeta">© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>

      {/* ================= CHAT FLOATING SYSTEM ================= */}

      <FloatingChatButton
        onClick={() => setChatOpen(true)}
        unreadCount={0} // luego conectamos esto a Supabase
      />

      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)}>
        <Chat />
      </ChatDrawer>

      {/* ================= MODAL ================= */}
      {selected && (
        <PhotoModal publicId={selected} onClose={() => setSelected(null)}>
          <Comments photoId={selected} />
        </PhotoModal>
      )}
    </div>
  );
}