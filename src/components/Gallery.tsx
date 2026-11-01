import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, LoaderCircle, Upload, Images } from "lucide-react";
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
  listGalleryPhotos,
  refreshGalleryCache,
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
const RECEPTION_PROGRAM = [
  "Guests Arrival",
  "Introductions",
  "Entrance Of Parents",
  "Couple Grand Entrance",
  "Opening Prayer / Welcome",
  "Chairman's Opening Remark",
  "First Game",
  "Couple On The Dance Floor",
  "Dinner Served",
  "Speeches & Toast",
  "Gift Presentation / Souvenirs",
  "Vote Of Thanks",
  "Photography Session",
  "Open Dance Floor / Party",
];
const CHURCH_CEREMONY_PROGRAM = [
  "Arrival [Music] - Media",
  "Opening Prayer - Pastor Daniel Essien [1 min]",
  "Worship [Groom enters] - Sweet Incense [20 mins]",
  "Welcome the Bride - Pastor Emmanuel Obeten [5 mins]",
  "The Joining - Pastor Goodluck Opue [15 mins]",
  "Word - Pastor Aniekan Umoh [25 mins]",
  "The Communion - Pastor Anointed Enoh [10 mins]",
  "Blessing of the Union - Pastor Goodluck Opue [10 mins]",
  "Signing & Presentation of Marriage Certificate [10 mins]",
  "Offering - Pastor Uma Ukpai [5 mins]",
  "Photograph with Officiating Ministers - Pastor Emmanuel Obeten [3 mins]",
  "Announcement & Closing - Pastor Emmanuel Obeten [3 mins]",
];

const Gallery = ({ user, onLogout }: GalleryProps) => {
  const [photos, setPhotos] = useState<Photo[]>(() => {
    if (typeof window === "undefined") {
      return INITIAL_PHOTOS;
    }

    if (hasAppsScriptBackend()) {
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
  const [programmeType, setProgrammeType] = useState<"church" | "reception" | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadSection, setUploadSection] = useState<Exclude<GallerySection, "All"> | null>(null);
  const [coverIndex, setCoverIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCounter, setUploadCounter] = useState<{ currentFile: number; totalFiles: number } | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [isLoadingGallery, setIsLoadingGallery] = useState(hasAppsScriptBackend());
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
    if (hasAppsScriptBackend()) {
      return;
    }

    const uploadedPhotos = photos.filter((photo) => photo.uploaded);
    window.localStorage.setItem(UPLOADED_PHOTOS_STORAGE_KEY, JSON.stringify(uploadedPhotos));
  }, [photos]);

  useEffect(() => {
    if (!hasAppsScriptBackend()) {
      setIsLoadingGallery(false);
      return;
    }

    let cancelled = false;

    const loadPhotos = async () => {
      setIsLoadingGallery(true);

      try {
        const remotePhotos = await listGalleryPhotos();

        if (cancelled || !remotePhotos) {
          return;
        }

        setPhotos(remotePhotos);
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error ? loadError.message : "Unable to load gallery photos.";
          toast(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingGallery(false);
        }
      }
    };

    void loadPhotos();

    return () => {
      cancelled = true;
    };
  }, [user.email]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(Array.from(event.target.files ?? []));
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      toast("Select at least one image");
      return;
    }

    if (!uploadSection) {
      toast("Choose a category");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadCounter({
      currentFile: 1,
      totalFiles: selectedFiles.length,
    });

    try {
      const uploadedPhotos = await uploadGuestPhotos({
        guest: user,
        section: uploadSection,
        files: selectedFiles,
        onProgress: ({ currentFile, totalFiles, progress }) => {
          setUploadCounter({ currentFile, totalFiles });
          setUploadProgress(progress);
        },
      });

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
      } else {
        void refreshGalleryCache();
      }

      setPhotos((current) => [...nextPhotos, ...current]);
      setSelectedFiles([]);
      setUploadSection(null);
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
      window.setTimeout(() => setUploadCounter(null), 250);
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
        void refreshGalleryCache();
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
        <div className="container mx-auto flex max-w-6xl items-start justify-between gap-3 px-4 py-3 max-[430px]:gap-2 max-[430px]:px-3 sm:items-center sm:gap-4 sm:py-4">
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold max-[430px]:text-base sm:text-xl md:text-2xl">
              Fave <span className="text-gold-gradient text-script-ampersand">&amp;</span> Tea
            </h1>
            <p className="text-xs text-muted-foreground font-body">March 20, 2026</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 max-[430px]:gap-1.5 sm:gap-3">
            <span className="hidden text-sm font-body text-muted-foreground md:block">
              Welcome, {user.name}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="h-9 rounded-full px-3 text-muted-foreground hover:text-foreground"
            >
              Logout
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUploadOpen(true)}
              className="hidden h-9 rounded-full border-border/70 bg-background/70 sm:inline-flex"
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 sm:h-9 sm:w-9">
              <span className="text-primary font-body font-semibold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Banner */}
      <div className="container mx-auto max-w-6xl px-4 pb-4 pt-4 max-[430px]:px-3 sm:pt-6 md:pt-8">
        <motion.div
          key={coverIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden rounded-[1.5rem] border border-white/40 sm:rounded-[2rem]"
        >
          <img
            src={HERO_IMAGES[coverIndex]}
            alt="Fave & Tea pre-wedding moments"
            className="h-[235px] w-full object-cover object-top max-[430px]:h-[215px] sm:h-[320px] md:h-[420px] md:object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/40 to-foreground/20" />
          <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col justify-end p-4 text-left text-white max-[430px]:p-3 sm:p-6 md:p-10">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-white/75 max-[430px]:mb-2 max-[430px]:text-[9px] max-[430px]:tracking-[0.18em] sm:mb-4 sm:text-xs sm:tracking-[0.28em]">
              <Images className="h-4 w-4" />
              Wedding memories
            </div>
            <h2 className="max-w-2xl font-display text-2xl font-bold max-[430px]:text-xl sm:text-3xl md:text-5xl">
              Our Wedding Gallery
            </h2>
            <p className="mt-2 max-w-xl font-body text-xs leading-relaxed text-white/80 max-[430px]:mt-1.5 max-[430px]:text-[11px] sm:mt-3 sm:text-sm md:text-base">
              {photos.length > 0
                ? "A growing collection of the moments, people, and joy shared throughout Fave & Tea's celebration."
                : "Your gallery is ready. Share the first real moments from the celebration and they will appear here."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 max-[430px]:mt-3 max-[430px]:gap-1.5 sm:mt-6 sm:gap-3">
              <div className="rounded-full bg-white/14 px-3 py-2 text-[11px] font-body text-white backdrop-blur-md sm:px-4 sm:text-xs">
                {photos.length} total photos
              </div>
              <div className="rounded-full bg-white/14 px-3 py-2 text-[11px] font-body text-white backdrop-blur-md sm:px-4 sm:text-xs">
                {totalContributors} total contributors
              </div>
              <div className="rounded-full bg-white/14 px-3 py-2 text-[11px] font-body text-white backdrop-blur-md sm:px-4 sm:text-xs">
                {totalMoments} total moments
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Event Section Filters */}
      <div className="container mx-auto max-w-6xl px-4 py-3 max-[430px]:px-3 sm:py-4">
        <div className="mb-3 flex items-center justify-end">
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setProgrammeType("church")}
              className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-2 text-[11px] font-medium text-foreground shadow-md shadow-foreground/5 ring-1 ring-border/80 transition hover:bg-muted sm:px-4 sm:text-xs"
            >
              <CalendarDays className="h-4 w-4" />
              Order of Events - Church Ceremony
            </button>
            <button
              type="button"
              onClick={() => setProgrammeType("reception")}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-[11px] font-medium text-primary-foreground shadow-md shadow-primary/20 transition hover:brightness-105 sm:px-4 sm:text-xs"
            >
              <CalendarDays className="h-4 w-4" />
              Order of Events - Reception
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {EVENT_SECTIONS.map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-medium whitespace-nowrap transition-all duration-300 sm:px-4 sm:text-xs ${
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
      <div className="container mx-auto max-w-6xl px-4 pb-28 max-[430px]:px-3 sm:pb-16">
        {isLoadingGallery && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            Loading shared gallery...
          </div>
        )}

        {activeSection === "All" ? (
          <div className="space-y-8">
            {contributorGroups.map((group, groupIndex) => (
              <motion.section
                key={group.contributor}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: groupIndex * 0.05 }}
                className="glass-card rounded-[1.25rem] p-3.5 sm:rounded-[1.5rem] sm:p-4 md:p-5"
              >
                <div className="mb-3 flex items-center gap-2 sm:mb-4 sm:gap-3">
                  <h3 className="font-display text-lg font-semibold text-foreground sm:text-xl">
                    {group.contributor}
                  </h3>
                  <div className="h-px flex-1 bg-border/70" />
                  <p className="text-[11px] text-muted-foreground sm:text-xs">
                    {group.photos.length} upload{group.photos.length > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
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
              className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4"
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
            <p className="text-muted-foreground font-body">
              {isLoadingGallery ? "Loading photos..." : "No photos in this category yet"}
            </p>
          </div>
        )}
      </div>

      {/* Upload CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="fixed right-4 z-50 max-[430px]:right-3 sm:right-6"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5rem)" }}
      >
        <button
          type="button"
          onClick={() => {
            setSelectedFiles([]);
            setUploadSection(null);
            setIsUploadOpen(true);
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 transition-transform duration-300 hover:scale-110 max-[430px]:h-11 max-[430px]:w-11 sm:h-14 sm:w-14"
          aria-label="Upload photos"
        >
          <Upload className="h-5 w-5 max-[430px]:h-[18px] max-[430px]:w-[18px] sm:h-6 sm:w-6" />
        </button>
      </motion.div>

      <Dialog
        open={isUploadOpen}
        onOpenChange={(open) => {
          setIsUploadOpen(open);
          if (open) {
            setSelectedFiles([]);
            setUploadSection(null);
          }
        }}
      >
        <DialogContent className="overflow-hidden rounded-[1.5rem] border-white/40 bg-background/95 p-0 sm:max-w-xl sm:rounded-[1.75rem]">
          <form onSubmit={handleUpload} className="space-y-5 p-4 sm:space-y-6 sm:p-6">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="font-display text-xl sm:text-2xl">Upload memories</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
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
                className="h-auto rounded-2xl border-dashed border-primary/35 bg-primary/5 py-4 text-sm file:mr-3 file:rounded-full file:bg-primary/10 file:px-3 file:py-2 file:text-primary sm:file:mr-4 sm:file:px-4"
              />
              <p className="text-xs text-muted-foreground">
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} selected`
                  : "You can select one or more images."}
              </p>
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {uploadCounter
                        ? `Uploading ${uploadCounter.currentFile} of ${uploadCounter.totalFiles}`
                        : "Uploading..."}
                    </span>
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
                    className={`rounded-full px-3 py-2 text-[11px] font-medium transition-all duration-300 sm:px-4 sm:text-xs ${
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
                ? "Files Will Be Uploaded to a Google Drive"
                : "Apps Script URL not set. Uploads will stay in this browser only."}
            </p>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button type="button" variant="ghost" onClick={() => setIsUploadOpen(false)} disabled={isUploading} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" className="w-full rounded-full sm:w-auto" disabled={isUploading || !uploadSection}>
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

      <Dialog open={programmeType !== null} onOpenChange={(open) => setProgrammeType(open ? programmeType : null)}>
        <DialogContent className="max-h-[82vh] max-w-[92vw] overflow-hidden rounded-[1.35rem] border-white/40 bg-background/95 p-0 sm:max-w-xl sm:rounded-[1.5rem]">
          <div className="space-y-4 p-4 sm:p-5">
            <DialogHeader className="space-y-2 pr-8 text-left">
              <DialogTitle className="font-display text-lg sm:text-xl">
                {programmeType === "church"
                  ? "Order of Events - Church Ceremony"
                  : "Order of Events - Reception"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                {programmeType === "church"
                  ? "Church ceremony programme for the day."
                  : "Reception programme for the day."}
              </DialogDescription>
            </DialogHeader>

            <div className="glass-card max-h-[58vh] overflow-y-auto rounded-[1.1rem] p-3 sm:max-h-[60vh] sm:rounded-[1.25rem] sm:p-4">
              <div className="space-y-2">
                {(programmeType === "church" ? CHURCH_CEREMONY_PROGRAM : RECEPTION_PROGRAM).map((item, index) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 px-3 py-2.5"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                      {index + 1}
                    </div>
                    <p className="pt-1 text-sm text-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Gallery;
