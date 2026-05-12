import type React from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PinIcon } from "@/components/ui/pindeck";
import { SmartImage } from "@/components/SmartImage";
import { downloadImage } from "@/lib/imageDownload";
import { toast } from "sonner";

type ImageLightboxProps = {
  image: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const iconButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 4,
  border: "1px solid var(--pd-glass-line-hi)",
  background: "rgba(0,0,0,0.34)",
  color: "var(--pd-ink)",
  backdropFilter: "blur(10px)",
};

export function ImageLightbox({ image, open, onOpenChange }: ImageLightboxProps) {
  if (!image) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="pd-image-lightbox !max-w-[calc(100vw-32px)] !w-[calc(100vw-32px)] !max-h-[calc(100vh-32px)] !p-0"
      >
        <DialogTitle className="sr-only">{image.title || "Image preview"}</DialogTitle>
        <DialogDescription className="sr-only">Large image preview</DialogDescription>

        <div className="pd-image-lightbox-stage">
          <SmartImage
            image={image}
            variant="lightbox"
            alt={image.title || "Pindeck image"}
            className="pd-image-lightbox-img"
          />

          <div className="pd-image-lightbox-topbar">
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "var(--pd-ink)",
                  fontSize: 13,
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {image.title || "Untitled"}
              </div>
              <div className="pd-mono" style={{ marginTop: 2, color: "var(--pd-ink-faint)", fontSize: 10 }}>
                {image.shot || image.style || image.genre
                  ? [image.shot, image.style, image.genre].filter(Boolean).join(" / ")
                  : "Full image preview"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
              <button
                type="button"
                aria-label="Download high-res"
                title="Download high-res"
                onClick={() => {
                  if (downloadImage(image)) toast.success("Started high-res download.");
                  else toast.error("No downloadable image URL found.");
                }}
                style={iconButtonStyle}
              >
                <PinIcon name="download" size={14} />
              </button>
              <button
                type="button"
                aria-label="Close preview"
                title="Close preview"
                onClick={() => onOpenChange(false)}
                style={iconButtonStyle}
              >
                <PinIcon name="close" size={14} />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
