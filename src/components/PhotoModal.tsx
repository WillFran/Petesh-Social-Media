// src/components/PhotoModal.tsx
import { buildImageUrl } from "../lib/cloudinary"

export default function PhotoModal({
  publicId,
  onClose,
  children,
}: {
  publicId: string
  onClose: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <img className="full" src={buildImageUrl(publicId, 1600)} alt="" />

        <div className="modalBar">
            <button className="btn" onClick={onClose}>Cerrar</button>
        </div>

        <div className="modalBody">
          {children}
        </div>
      </div>
    </div>
  )
}