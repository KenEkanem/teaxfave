import { motion } from "framer-motion";

interface PhotoCardProps {
  src: string;
  contributor: string;
  section: string;
  index: number;
}

const PhotoCard = ({ src, contributor, section, index }: PhotoCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group"
    >
      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="relative overflow-hidden">
          <img
            src={src}
            alt={`Photo by ${contributor}`}
            className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
        <div className="flex items-center justify-between gap-2 p-3">
          <span className="truncate text-[11px] font-body capitalize text-muted-foreground">{section}</span>
          <span className="truncate rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-body font-medium text-primary">
            {contributor}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default PhotoCard;
