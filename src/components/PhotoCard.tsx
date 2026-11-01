import { SyntheticEvent, useState } from "react";
import { motion } from "framer-motion";
import { Download, LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { getDriveFileId, getDriveThumbnailUrl } from "@/lib/drive-images";
import {
  Dialog,
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
}

const PhotoCard = ({
  src,
  contributor,
  section,
  index,
  canDelete = false,
  isDeleting = false,
  onDelete,
}: PhotoCardProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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
          transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -4, scale: 1.02 }}
          className="group min-w-0"
        >
          <div className="glass-card overflow-hidden rounded-[1.15rem] sm:rounded-2xl">
            <div className="relative overflow-hidden">
              {canDelete && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete?.();
                  }}
                  disabled={isDeleting}
                  className="absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-destructive shadow-md transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60 sm:right-2.5 sm:top-2.5 sm:h-7 sm:w-7"
                  aria-label="Delete uploaded photo"
                >
                  <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
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
                  sizes="(min-width: 1024px) 280px, (min-width: 768px) 33vw, 50vw"
                  onError={fallBackToOriginal}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3">
              <span className="truncate text-[10px] font-body capitalize text-muted-foreground sm:text-[11px]">{section}</span>
              <span className="max-w-[60%] truncate rounded-full bg-primary/10 px-2 py-1 text-[10px] font-body font-medium text-primary sm:px-2.5 sm:text-[11px]">
                {contributor}
              </span>
            </div>
          </div>
        </motion.div>

        <DialogContent className="max-w-[94vw] overflow-hidden rounded-[1.5rem] border-white/40 bg-background/95 p-0 sm:max-w-3xl">
          <div className="space-y-4 p-4 sm:p-6">
            <DialogHeader className="space-y-2 pr-10 text-left">
              <DialogTitle className="font-display text-xl sm:text-2xl">{contributor}</DialogTitle>
              <DialogDescription>
                {section}
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-hidden rounded-[1.25rem] bg-muted/40">
              <img
                src={previewSrc}
                alt={`Photo by ${contributor}`}
                className="max-h-[72vh] w-full object-contain"
                decoding="async"
                onError={fallBackToOriginal}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownload}
                disabled={isDownloading}
                className="rounded-full"
              >
                {isDownloading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoCard;
