import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoaderCircle, Upload, Images } from "lucide-react";
import PhotoCard from "./PhotoCard";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "./ui/sonner";
import {
  deleteGuestPhoto,
  hasAppsScriptBackend,
  uploadGuestPhotos,
  type Guest,
} from "@/lib/apps-script";
import couple1 from "@/assets/couple-1.jpeg";
import couple2 from "@/assets/couple-2.jpeg";
import couple3 from "@/assets/couple-3.jpeg";
import couple4 from "@/assets/couple-4.jpeg";
import couple5 from "@/assets/couple-5.jpeg";

interface GalleryProps {
  user: Guest;
  onLogout: () => void;
}

const EVENT_SECTIONS = [
  "All",
  "Ceremony",
  "Couple Moments",
  "Family & Friends",
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
  ownerEmail?: string;
  uploaded?: boolean;
}

interface ContributorGroup {
  contributor: string;
  photos: Photo[];
}

const UPLOADED_PHOTOS_STORAGE_KEY = "tee-fave-uploaded-photos";

const INITIAL_PHOTOS: Photo[] = [];

const UPLOAD_SECTIONS = EVENT_SECTIONS.filter((section): section is Exclude<GallerySection, "All"> => section !== "All");
const HERO_IMAGES = [couple1, couple2, couple3, couple4, couple5];

const Gallery = ({ user, onLogout }: GalleryProps) => {
  const [photos, setPhotos] = useState<Photo[]>(() => {
    if (typeof window === "undefined") {
      return INITIAL_PHOTOS;
    }

    try {
      const storedPhotos = window.localStorage.getItem(UPLOADED_PHOTOS_STORAGE_KEY);
      if (!storedPhotos) {
        return INITIAL_PHOTOS;
      }

      const parsedPhotos = JSON.parse(storedPhotos) as Photo[];
      return [...parsedPhotos, ...INITIAL_PHOTOS];
    } catch {
      return INITIAL_PHOTOS;
    }
  });
  const [activeSection, setActiveSection] = useState<string>("All");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadSection, setUploadSection] = useState<Exclude<GallerySection, "All">>("Reception");
  const [coverIndex, setCoverIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const uploadedUrlsRef = useRef<string[]>([]);

  const filtered = useMemo(() => {
    return photos.filter((p) => {
      return activeSection === "All" || p.section === activeSection;
    });
  }, [activeSection, photos]);

  const contributorGroups = useMemo<ContributorGroup[]>(() => {
    if (activeSection !== "All") {
      return [];
    }

    const groups = filtered.reduce<Record<string, Photo[]>>((acc, photo) => {
      if (!acc[photo.contributor]) {
        acc[photo.contributor] = [];
      }
      acc[photo.contributor].push(photo);
      return acc;
    }, {});

    return Object.entries(groups)
      .map(([contributor, contributorPhotos]) => ({
        contributor,
        photos: contributorPhotos.sort((a, b) => a.section.localeCompare(b.section)),
      }))
      .sort((a, b) => {
        if (b.photos.length !== a.photos.length) {
          return b.photos.length - a.photos.length;
        }
        return a.contributor.localeCompare(b.contributor);
      });
  }, [activeSection, filtered]);

  const totalContributors = useMemo(
    () => new Set(photos.map((photo) => photo.contributor)).size,
    [photos],
  );

  const totalMoments = useMemo(
    () => new Set(photos.map((photo) => photo.section)).size,
    [photos],
  );

  useEffect(() => {
    setCoverIndex(0);
  }, []);

  useEffect(() => {
    if (HERO_IMAGES.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setCoverIndex((current) => (current + 1) % HERO_IMAGES.length);
    }, 4000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      uploadedUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    const uploadedPhotos = photos.filter((photo) => photo.uploaded);
    window.localStorage.setItem(UPLOADED_PHOTOS_STORAGE_KEY, JSON.stringify(uploadedPhotos));
  }, [photos]);
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(Array.from(event.target.files ?? []));
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      toast("Select at least one image");
      return;
    }

    setIsUploading(true);
    setUploadProgress(12);

    try {
      setUploadProgress(28);
      const uploadedPhotos = await uploadGuestPhotos({
        guest: user,
        section: uploadSection,
        files: selectedFiles,
      });
      setUploadProgress(76);

      const nextPhotos =
        uploadedPhotos && uploadedPhotos.length > 0
          ? uploadedPhotos
          : selectedFiles.map((file, index) => ({
              id: `${file.name}-${file.lastModified}-${index}`,
              src: URL.createObjectURL(file),
              contributor: user.name,
              section: uploadSection,
              ownerEmail: user.email,
              uploaded: true as const,
            }));

      if (!uploadedPhotos || uploadedPhotos.length === 0) {
        uploadedUrlsRef.current.push(...nextPhotos.map((photo) => photo.src));
      }

      setPhotos((current) => [...nextPhotos, ...current]);
      setSelectedFiles([]);
      setActiveSection("All");
      setUploadProgress(100);
      setIsUploadOpen(false);
      toast(
        hasAppsScriptBackend()
          ? `${nextPhotos.length} photo${nextPhotos.length > 1 ? "s" : ""} uploaded to Drive`
          : `${nextPhotos.length} photo${nextPhotos.length > 1 ? "s" : ""} added locally`,
      );
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : "Unable to upload photos.";
      toast(message);
    } finally {
      window.setTimeout(() => setUploadProgress(0), 250);
      setIsUploading(false);
    }
  };

  const canDeletePhoto = (photo: Photo) => {
    if (!photo.uploaded) {
      return false;
    }

    return photo.ownerEmail === user.email || (!photo.ownerEmail && photo.contributor === user.name);
  };

  const handleDeletePhoto = async (photo: Photo) => {
    if (!canDeletePhoto(photo)) {
      toast("You can only delete your own uploads");
      return;
    }

    const confirmed = window.confirm("Delete this uploaded photo?");
    if (!confirmed) {
      return;
    }

    setDeletingPhotoId(photo.id);

    try {
      if (hasAppsScriptBackend()) {
        await deleteGuestPhoto({
          guest: user,
          photoId: photo.id,
        });
      }

      if (photo.src.startsWith("blob:")) {
        URL.revokeObjectURL(photo.src);
        uploadedUrlsRef.current = uploadedUrlsRef.current.filter((url) => url !== photo.src);
      }

      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      toast("Photo deleted");
    } catch (deleteError) {
      const rawMessage =
        deleteError instanceof Error ? deleteError.message : "Unable to delete photo.";
      const message = rawMessage.includes("Unsupported action")
        ? "Delete is not enabled in Apps Script yet. Add the deletePhoto action to your backend."
        : rawMessage;
      toast(message);
    } finally {
      setDeletingPhotoId(null);
    }
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
              Welcome, {user.name}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              Logout
            </Button>
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
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Banner */}
      <div className="container mx-auto max-w-6xl px-4 pb-4 pt-8">
        <motion.div
          key={coverIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden rounded-[2rem] border border-white/40"
        >
          <img
            src={HERO_IMAGES[coverIndex]}
            alt="Tee and Fave pre-wedding moments"
            className="h-[320px] w-full object-cover md:h-[420px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/40 to-foreground/20" />
          <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col justify-end p-6 text-left text-white md:p-10">
            <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.28em] text-white/75">
              <Images className="h-4 w-4" />
              Wedding memories
            </div>
            <h2 className="max-w-2xl font-display text-3xl font-bold md:text-5xl">
              Our Wedding Gallery
            </h2>
            <p className="mt-3 max-w-xl font-body text-sm text-white/80 md:text-base">
              {photos.length > 0
                ? "A growing collection of the moments, people, and joy shared throughout Tee and Fave's celebration."
                : "Your gallery is ready. Share the first real moments from the celebration and they will appear here."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-full bg-white/14 px-4 py-2 text-xs font-body text-white backdrop-blur-md">
                {photos.length} total photos
              </div>
              <div className="rounded-full bg-white/14 px-4 py-2 text-xs font-body text-white backdrop-blur-md">
                {totalContributors} total contributors
              </div>
              <div className="rounded-full bg-white/14 px-4 py-2 text-xs font-body text-white backdrop-blur-md">
                {totalMoments} total moments
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
      </div>

      {/* Gallery */}
      <div className="container mx-auto max-w-6xl px-4 pb-12">
        {activeSection === "All" ? (
          <div className="space-y-8">
            {contributorGroups.map((group, groupIndex) => (
              <motion.section
                key={group.contributor}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: groupIndex * 0.05 }}
                className="glass-card rounded-[1.5rem] p-4 md:p-5"
              >
                <div className="mb-4 flex items-center gap-3">
                  <h3 className="font-display text-xl font-semibold text-foreground">
                    {group.contributor}
                  </h3>
                  <div className="h-px flex-1 bg-border/70" />
                  <p className="text-xs text-muted-foreground">
                    {group.photos.length} upload{group.photos.length > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {group.photos.map((photo, index) => (
                    <PhotoCard
                      key={photo.id}
                      src={photo.src}
                      contributor={photo.contributor}
                      section={photo.section}
                      index={index}
                      canDelete={canDeletePhoto(photo)}
                      isDeleting={deletingPhotoId === photo.id}
                      onDelete={() => handleDeletePhoto(photo)}
                    />
                  ))}
                </div>
              </motion.section>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
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
                  canDelete={canDeletePhoto(photo)}
                  isDeleting={deletingPhotoId === photo.id}
                  onDelete={() => handleDeletePhoto(photo)}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

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
                Pick images from your phone or laptop and upload them into your Drive folder.
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
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Sharing moment...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-1.5 bg-muted" />
                </div>
              )}
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
              Uploading as <span className="font-semibold text-foreground">{user.name}</span>{" "}
              <span className="text-xs">({user.email})</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {hasAppsScriptBackend()
                ? "Files will be sent to Google Drive through Apps Script."
                : "Apps Script URL not set. Uploads will stay in this browser only."}
            </p>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsUploadOpen(false)} disabled={isUploading}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-full" disabled={isUploading}>
                {isUploading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Add to gallery"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Gallery;
