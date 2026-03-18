import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PhotoCard from "./PhotoCard";
import couple1 from "@/assets/couple-1.jpeg";
import couple2 from "@/assets/couple-2.jpeg";
import couple3 from "@/assets/couple-3.jpeg";
import couple4 from "@/assets/couple-4.jpeg";
import couple5 from "@/assets/couple-5.jpeg";

interface GalleryProps {
  userName: string;
}

const EVENT_SECTIONS = [
  "All",
  "The Vows",
  "First Dance",
  "The Party",
  "Getting Ready",
  "Reception",
] as const;

// Mock data - will be replaced with Google Drive integration
const PHOTOS = [
  { src: couple1, contributor: "Steve David", section: "Getting Ready" },
  { src: couple2, contributor: "Steve David", section: "The Vows" },
  { src: couple3, contributor: "Miracle", section: "The Party" },
  { src: couple4, contributor: "Promise", section: "First Dance" },
  { src: couple5, contributor: "Steve David", section: "Reception" },
  { src: couple1, contributor: "Miracle", section: "The Party" },
  { src: couple3, contributor: "Promise", section: "Getting Ready" },
  { src: couple4, contributor: "Steve David", section: "The Vows" },
  { src: couple5, contributor: "Miracle", section: "Reception" },
  { src: couple2, contributor: "Promise", section: "First Dance" },
];

const Gallery = ({ userName }: GalleryProps) => {
  const [activeSection, setActiveSection] = useState<string>("All");
  const [activeContributor, setActiveContributor] = useState<string>("All");

  const contributors = useMemo(
    () => ["All", ...Array.from(new Set(PHOTOS.map((p) => p.contributor)))],
    []
  );

  const filtered = useMemo(() => {
    return PHOTOS.filter((p) => {
      const matchSection = activeSection === "All" || p.section === activeSection;
      const matchContributor = activeContributor === "All" || p.contributor === activeContributor;
      return matchSection && matchContributor;
    });
  }, [activeSection, activeContributor]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="sticky top-0 z-50 glass-card-strong border-b border-border/50"
      >
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold">
              Tee <span className="text-gold-gradient">&</span> Fave
            </h1>
            <p className="text-xs text-muted-foreground font-body">March 20, 2026</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground font-body hidden sm:block">
              Welcome, {userName}
            </span>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-body font-semibold text-sm">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="container max-w-6xl mx-auto px-4 pt-8 pb-4 text-center"
      >
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
          Our Wedding Gallery
        </h2>
        <p className="text-muted-foreground font-body text-sm mt-2">
          Moments captured by our beloved guests
        </p>
      </motion.div>

      {/* Event Section Filters */}
      <div className="container max-w-6xl mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {EVENT_SECTIONS.map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-4 py-2 rounded-full font-body text-xs font-medium whitespace-nowrap transition-all duration-300 ${
                activeSection === section
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "glass-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {section}
            </button>
          ))}
        </div>

        {/* Contributor Filter */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
          <span className="text-xs text-muted-foreground font-body self-center mr-1 whitespace-nowrap">
            By:
          </span>
          {contributors.map((c) => (
            <button
              key={c}
              onClick={() => setActiveContributor(c)}
              className={`px-3 py-1.5 rounded-full font-body text-xs transition-all duration-300 ${
                activeContributor === c
                  ? "bg-secondary text-secondary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Masonry Gallery */}
      <div className="container max-w-6xl mx-auto px-4 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeSection}-${activeContributor}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="columns-1 sm:columns-2 lg:columns-3 gap-4"
          >
            {filtered.map((photo, i) => (
              <PhotoCard
                key={`${photo.src}-${photo.contributor}-${i}`}
                src={photo.src}
                contributor={photo.contributor}
                section={photo.section}
                index={i}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground font-body">No photos in this category yet</p>
          </div>
        )}
      </div>

      {/* Upload CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <button className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-110 transition-transform duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </button>
      </motion.div>
    </div>
  );
};

export default Gallery;
