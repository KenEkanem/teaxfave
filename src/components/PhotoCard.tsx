import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";

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
  return (
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
              onClick={onDelete}
              disabled={isDeleting}
              className="absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-destructive shadow-md transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60 sm:right-2.5 sm:top-2.5 sm:h-7 sm:w-7"
              aria-label="Delete uploaded photo"
            >
              <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          )}
          <img
            src={src}
            alt={`Photo by ${contributor}`}
            className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
        <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3">
          <span className="truncate text-[10px] font-body capitalize text-muted-foreground sm:text-[11px]">{section}</span>
          <span className="max-w-[60%] truncate rounded-full bg-primary/10 px-2 py-1 text-[10px] font-body font-medium text-primary sm:px-2.5 sm:text-[11px]">
            {contributor}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default PhotoCard;
