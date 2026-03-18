import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Images } from "lucide-react";
import PhotoCard from "./PhotoCard";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "./ui/sonner";
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

type GallerySection = (typeof EVENT_SECTIONS)[number];

interface Photo {
  id: string;
  src: string;
  contributor: string;
  section: Exclude<GallerySection, "All">;
  uploaded?: boolean;
}

const INITIAL_PHOTOS: Photo[] = [
  { id: "1", src: couple1, contributor: "Steve David", section: "Getting Ready" },
  { id: "2", src: couple2, contributor: "Steve David", section: "The Vows" },
  { id: "3", src: couple3, contributor: "Miracle", section: "The Party" },
  { id: "4", src: couple4, contributor: "Promise", section: "First Dance" },
  { id: "5", src: couple5, contributor: "Steve David", section: "Reception" },
  { id: "6", src: couple1, contributor: "Miracle", section: "The Party" },
  { id: "7", src: couple3, contributor: "Promise", section: "Getting Ready" },
  { id: "8", src: couple4, contributor: "Steve David", section: "The Vows" },
  { id: "9", src: couple5, contributor: "Miracle", section: "Reception" },
  { id: "10", src: couple2, contributor: "Promise", section: "First Dance" },
];

const UPLOAD_SECTIONS = EVENT_SECTIONS.filter((section): section is Exclude<GallerySection, "All"> => section !== "All");

const Gallery = ({ userName }: GalleryProps) => {
  const [photos, setPhotos] = useState(INITIAL_PHOTOS);
  const [activeSection, setActiveSection] = useState<string>("All");
  const [activeContributor, setActiveContributor] = useState<string>("All");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadSection, setUploadSection] = useState<Exclude<GallerySection, "All">>("Reception");
  const [coverIndex, setCoverIndex] = useState(0);
  const uploadedUrlsRef = useRef<string[]>([]);

  const contributors = useMemo(
    () => ["All", ...Array.from(new Set(photos.map((p) => p.contributor)))],
    [photos]
  );

  const filtered = useMemo(() => {
    return photos.filter((p) => {
      const matchSection = activeSection === "All" || p.section === activeSection;
      const matchContributor = activeContributor === "All" || p.contributor === activeContributor;
      return matchSection && matchContributor;
    });
  }, [activeSection, activeContributor, photos]);

  useEffect(() => {
    setCoverIndex(0);
  }, [activeSection, activeContributor, photos.length]);

  useEffect(() => {
    if (filtered.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setCoverIndex((current) => (current + 1) % filtered.length);
    }, 4500);

    return () => window.clearInterval(interval);
  }, [filtered]);

  useEffect(() => {
    return () => {
      uploadedUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const coverPhoto = filtered[coverIndex] ?? photos[0];

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(Array.from(event.target.files ?? []));
  };

  const handleUpload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      toast("Select at least one image");
      return;
    }

    const nextPhotos = selectedFiles.map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}`,
      src: URL.createObjectURL(file),
      contributor: userName,
      section: uploadSection,
      uploaded: true,
    }));

    uploadedUrlsRef.current.push(...nextPhotos.map((photo) => photo.src));
    setPhotos((current) => [...nextPhotos, ...current]);
    setSelectedFiles([]);
    setActiveSection("All");
    setActiveContributor("All");
    setIsUploadOpen(false);
    toast(`${nextPhotos.length} photo${nextPhotos.length > 1 ? "s" : ""} added to the gallery`);
  };

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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUploadOpen(true)}
              className="hidden rounded-full border-border/70 bg-background/70 sm:inline-flex"
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-body font-semibold text-sm">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Banner */}
      <div className="container mx-auto max-w-6xl px-4 pb-4 pt-8">
        <motion.div
          key={coverPhoto?.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden rounded-[2rem] border border-white/40"
        >
          <img
            src={coverPhoto?.src}
            alt="Gallery cover"
            className="h-[320px] w-full object-cover md:h-[420px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/40 to-foreground/20" />
          <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col justify-end p-6 text-left text-white md:p-10">
            <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.28em] text-white/75">
              <Images className="h-4 w-4" />
              Dynamic cover
            </div>
            <h2 className="max-w-2xl font-display text-3xl font-bold md:text-5xl">
              Our Wedding Gallery
            </h2>
            <p className="mt-3 max-w-xl font-body text-sm text-white/80 md:text-base">
              The cover now rotates through the photos in your current view, including anything uploaded from a phone or laptop.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-full bg-white/14 px-4 py-2 text-xs font-body text-white backdrop-blur-md">
                {filtered.length} visible memories
              </div>
              <div className="rounded-full bg-white/14 px-4 py-2 text-xs font-body text-white backdrop-blur-md">
                Current: {coverPhoto?.section}
              </div>
              <div className="rounded-full bg-white/14 px-4 py-2 text-xs font-body text-white backdrop-blur-md">
                By {coverPhoto?.contributor}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

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
      <div className="container mx-auto max-w-6xl px-4 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeSection}-${activeContributor}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
            {filtered.map((photo, i) => (
              <PhotoCard
                key={photo.id}
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
        <button
          type="button"
          onClick={() => setIsUploadOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 transition-transform duration-300 hover:scale-110"
          aria-label="Upload photos"
        >
          <Upload className="h-6 w-6" />
        </button>
      </motion.div>

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="overflow-hidden rounded-[1.75rem] border-white/40 bg-background/95 p-0 sm:max-w-xl">
          <form onSubmit={handleUpload} className="space-y-6 p-6">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="font-display text-2xl">Upload memories</DialogTitle>
              <DialogDescription>
                Pick images from your phone or laptop and add them straight into the gallery view.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground" htmlFor="photo-upload">
                Choose images
              </label>
              <Input
                id="photo-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="h-auto rounded-2xl border-dashed border-primary/35 bg-primary/5 py-4 file:mr-4 file:rounded-full file:bg-primary/10 file:px-4 file:py-2 file:text-primary"
              />
              <p className="text-xs text-muted-foreground">
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} selected`
                  : "You can select one or more images."}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Add these photos to</p>
              <div className="flex flex-wrap gap-2">
                {UPLOAD_SECTIONS.map((section) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => setUploadSection(section)}
                    className={`rounded-full px-4 py-2 text-xs font-medium transition-all duration-300 ${
                      uploadSection === section
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "glass-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {section}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
              Uploading as <span className="font-semibold text-foreground">{userName}</span>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-full">
                Add to gallery
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Gallery;
