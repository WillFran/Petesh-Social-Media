// src/components/GalleryGrid.tsx
import { buildImageUrl } from "../lib/cloudinary"

type Photo = { public_id: string }

export default function GalleryGrid({
  photos,
  onSelect,
}: {
  photos: Photo[]
  onSelect: (id: string) => void
}) {
  return (
    <div className="grid">
      {photos.map((p) => (
        <button
          key={p.public_id}
          className="card"
          onClick={() => onSelect(p.public_id)}
        >
          <img
            className="cardImg"
            src={buildImageUrl(p.public_id, 900)}
            alt=""
            loading="lazy"
          />

          <div className="cardOverlay">
            <span className="openText">Pulsa para abrir</span>
          </div>
        </button>
      ))}
    </div>
  )
}