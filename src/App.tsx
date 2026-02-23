// src/App.tsx
import { useState } from "react"
import { photos } from "./data/photos"
import GalleryGrid from "./components/GalleryGrid"
import PhotoModal from "./components/PhotoModal"
import Comments from "./components/Comments"

type SortMode = "recent" | "comments"

export default function App() {
  const [selected, setSelected] = useState<string | null>(null)
  const [sort, setSort] = useState<SortMode>("recent")

  const sortedPhotos =
    sort === "recent"
      ? [...photos].reverse()
      : photos // luego: ordenar por cantidad real de comentarios

  return (
    <div className="appShell">
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

            <button type="button" className="userBtn" aria-label="Perfil">
              <span className="avatar">FD</span>
            </button>
          </div>
        </div>
      </header>

      <main className="content">
        <h1 className="pageTitle">Álbum</h1>
        <GalleryGrid photos={sortedPhotos} onSelect={setSelected} />
      </main>

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

      {selected && (
        <PhotoModal publicId={selected} onClose={() => setSelected(null)}>
          <Comments photoId={selected} />
        </PhotoModal>
      )}
    </div>
  )
}