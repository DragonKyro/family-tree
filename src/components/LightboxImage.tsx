import { useEffect } from 'react'

interface Props {
  src: string
  alt: string
  onClose: () => void
}

export function LightboxImage({ src, alt, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div
      className="lightbox-backdrop"
      onMouseDown={onClose}
      role="dialog"
      aria-label="Enlarged photo"
    >
      <button
        type="button"
        className="lightbox-close"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
      <img
        className="lightbox-img"
        src={src}
        alt={alt}
        onMouseDown={(e) => e.stopPropagation()}
      />
    </div>
  )
}
