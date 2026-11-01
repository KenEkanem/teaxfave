import { SyntheticEvent, useState } from "react";
import { motion } from "framer-motion";
import { Download, LoaderCircle, Trash2, X } from "lucide-react";
import { Button } from "./ui/button";
import { getDriveFileId, getDriveThumbnailUrl } from "@/lib/drive-images";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface PhotoCardProps {
  src: string;
  contributor: string;
  section: string;
  index: number;
  canDelete?: boolean;
  isDeleting?: boolean;
  onDelete?: () => void;
  /** Hide the contributor tag when the card already sits under the contributor's name. */
  showContributor?: boolean;
}

const PhotoCard = ({
  src,
  contributor,
  section,
  index,
  canDelete = false,
  isDeleting = false,
  onDelete,
  showContributor = true,
}: PhotoCardProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewLoaded, setIsPreviewLoaded] = useState(false);

  const suggestedFileName = `${section}-${contributor}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const driveFileId = getDriveFileId(src);
  const cardSrc = getDriveThumbnailUrl(src, 480);
  const previewSrc = getDriveThumbnailUrl(src, 1600);

  const fallBackToOriginal = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;

    if (image.dataset.fallbackApplied === "true") {
      return;
    }

    image.dataset.fallbackApplied = "true";
    image.src = src;
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      if (driveFileId) {
        const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
        const link = document.createElement("a");
        link.href = directDownloadUrl;
        link.download = `${suggestedFileName || "wedding-photo"}.jpg`;
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }

      const response = await fetch(src);
      if (!response.ok) {
        throw new Error("Unable to download image.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${suggestedFileName || "wedding-photo"}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(src, "_blank", "noopener,noreferrer");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: Math.min(index, 6) * 0.06, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -4, scale: 1.02 }}
          className="group min-w-0"
        >
          <div className="glass-card overflow-hidden rounded-xl transition-[box-shadow,border-color] duration-500 group-hover:border-primary/40 group-hover:shadow-[0_0_28px_-4px_hsla(43,85%,55%,0.45)] sm:rounded-2xl">
            <div className="relative overflow-hidden">
              {canDelete && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete?.();
                  }}
                  disabled={isDeleting}
                  className="absolute right-1.5 top-1.5 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-destructive shadow-md transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60 sm:right-2 sm:top-2"
                  aria-label="Delete uploaded photo"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="block w-full text-left"
                aria-label={`View photo by ${contributor}`}
              >
                <img
                  src={cardSrc}
                  alt={`Photo by ${contributor}`}
                  className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                  fetchPriority={index < 4 ? "high" : "auto"}
                  sizes="(min-width: 1024px) 180px, (min-width: 768px) 20vw, (min-width: 640px) 25vw, 33vw"
                  onError={fallBackToOriginal}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-1.5 px-2 py-1.5">
              <span className="truncate text-[9px] font-body capitalize text-muted-foreground sm:text-[10px]">{section}</span>
              {showContributor && (
                <span className="hidden max-w-[55%] truncate rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-body font-medium text-primary sm:inline">
                  {contributor}
                </span>
              )}
            </div>
          </div>
        </motion.div>

        <DialogContent
          hideCloseButton
          className="w-auto max-w-[94vw] gap-0 border-0 bg-transparent p-0 shadow-none sm:max-w-4xl"
        >
          <div
            className={`relative ${isPreviewLoaded ? "" : "min-h-[45vh] min-w-[80vw] sm:min-w-[28rem]"}`}
          >
            <DialogClose asChild>
              <motion.button
                type="button"
                initial={{ scale: 0, rotate: -90, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.1 }}
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.88 }}
                className="absolute -left-2 -top-2 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-900 shadow-[0_8px_24px_rgba(0,0,0,0.35)] ring-1 ring-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:-left-3 sm:-top-3 sm:h-11 sm:w-11"
                aria-label="Close photo"
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </motion.button>
            </DialogClose>

            {!isPreviewLoaded && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30">
                <LoaderCircle className="h-6 w-6 animate-spin text-white" />
              </div>
            )}

            <img
              src={previewSrc}
              alt={`Photo by ${contributor}`}
              className={`block h-auto max-h-[82vh] w-auto max-w-[94vw] rounded-2xl object-contain shadow-2xl transition-opacity duration-300 sm:max-w-4xl ${
                isPreviewLoaded ? "opacity-100" : "absolute inset-0 opacity-0"
              }`}
              decoding="async"
              onLoad={() => setIsPreviewLoaded(true)}
              onError={fallBackToOriginal}
            />

            {isPreviewLoaded && (
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 rounded-b-2xl bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 pt-10 sm:p-4 sm:pt-12">
                <DialogHeader className="min-w-0 space-y-0.5 text-left">
                  <DialogTitle className="truncate font-display text-base text-white sm:text-lg">
                    {contributor}
                  </DialogTitle>
                  <DialogDescription className="truncate text-xs text-white/80">{section}</DialogDescription>
                </DialogHeader>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="shrink-0 rounded-full bg-white text-neutral-900 shadow-lg hover:bg-white/90"
                >
                  {isDownloading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoCard;
