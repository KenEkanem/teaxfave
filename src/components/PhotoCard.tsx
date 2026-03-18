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
      className="group break-inside-avoid mb-4"
    >
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="relative overflow-hidden">
          <img
            src={src}
            alt={`Photo by ${contributor}`}
            className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
        <div className="p-3 flex items-center justify-between">
          <span className="text-xs font-body text-muted-foreground capitalize">{section}</span>
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-body font-medium">
            {contributor}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default PhotoCard;
