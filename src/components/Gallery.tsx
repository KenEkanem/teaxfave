import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, LoaderCircle, LogOut, Upload } from "lucide-react";
import PhotoCard from "./PhotoCard";
import PhotoGrid from "./PhotoGrid";
import { PageBackground, PhotoOrnaments } from "./Ornaments";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
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
const GALLERY_CACHE_STORAGE_KEY = "tee-fave-gallery-cache";

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

// The last shared gallery this browser saw, so repeat visits draw instantly
// while the fresh list loads in the background.
function readCachedGallery() {
  try {
    const cachedPhotos = JSON.parse(window.localStorage.getItem(GALLERY_CACHE_STORAGE_KEY) ?? "null");
    return Array.isArray(cachedPhotos) && cachedPhotos.length > 0 ? (cachedPhotos as Photo[]) : null;
  } catch {
    return null;
  }
}

const Gallery = ({ user, onLogout }: GalleryProps) => {
  const [photos, setPhotos] = useState<Photo[]>(() => {
    if (typeof window === "undefined") {
      return INITIAL_PHOTOS;
    }

    if (hasAppsScriptBackend()) {
      return readCachedGallery() ?? INITIAL_PHOTOS;
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
  const [isScrolled, setIsScrolled] = useState(false);
  const gallerySectionRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCounter, setUploadCounter] = useState<{ currentFile: number; totalFiles: number } | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [isLoadingGallery, setIsLoadingGallery] = useState(
    () => hasAppsScriptBackend() && typeof window !== "undefined" && !readCachedGallery(),
  );
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
    const onScroll = () => setIsScrolled(window.scrollY > 40);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
      if (photos.length > 0) {
        try {
          window.localStorage.setItem(GALLERY_CACHE_STORAGE_KEY, JSON.stringify(photos));
        } catch {
          // Storage full or blocked; the gallery still works, it just won't draw instantly next time.
        }
      }
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

  const renderPhotoCard = (photo: Photo, index: number) => (
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
  );

  return (
    <div className="relative isolate min-h-screen">
      <PageBackground />
      <div className="relative z-10">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,border-color] duration-500 ${
          isScrolled ? "border-b border-border/60 bg-background/85 shadow-sm backdrop-blur-xl" : "border-b border-transparent"
        }`}
      >
        <div className="container mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 max-[430px]:px-3 sm:py-4">
          <div className="min-w-0">
            <h1 className="font-display text-lg font-semibold tracking-wide text-foreground max-[430px]:text-base sm:text-xl md:text-2xl">
              Fave <span className="text-gold-gradient text-script-ampersand">&amp;</span> Tea
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-body text-foreground/70 md:block">
              Welcome, <span className="text-foreground">{user.name}</span>
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  className="gold-shimmer flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:h-10 sm:w-10"
                  aria-label="Open profile menu"
                >
                  {user.name.charAt(0).toUpperCase()}
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="w-56 rounded-2xl border-primary/20 bg-popover/95 p-1.5 backdrop-blur-xl"
              >
                <DropdownMenuLabel className="px-2.5 py-2 font-normal">
                  <p className="truncate font-display text-base text-foreground">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-primary/15" />
                <DropdownMenuItem
                  onSelect={onLogout}
                  className="cursor-pointer gap-2 rounded-xl px-2.5 py-2 text-sm focus:bg-primary/15 focus:text-foreground"
                >
                  <LogOut className="h-4 w-4 text-primary" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative h-[100svh] min-h-[600px] overflow-hidden bg-background">
        <AnimatePresence initial={false}>
          <motion.img
            key={coverIndex}
            src={HERO_IMAGES[coverIndex]}
            alt="Fave & Tea pre-wedding moments"
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 1.2 }, scale: { duration: 6, ease: "easeOut" } }}
            className="absolute inset-0 h-full w-full object-cover object-top md:object-[25%_center]"
          />
        </AnimatePresence>

        {/* Photo melts into cream: downward on phones, to the right on wider screens. */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent via-35% to-background to-[72%] md:hidden" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-transparent from-25% via-background/80 via-[52%] to-background to-[70%] md:block" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background/70 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_30%,hsla(24,80%,88%,0.55),transparent_60%)]" />

        <PhotoOrnaments />

        <div className="container relative mx-auto flex h-full max-w-6xl items-end px-4 pb-20 max-[430px]:px-3 md:items-center md:pb-0">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full text-center md:ml-auto md:w-[46%] md:text-left"
          >
            <div className="flex items-center justify-center gap-3 text-[11px] font-medium uppercase tracking-[0.3em] text-foreground/60 md:justify-start sm:text-xs">
              <span className="h-px w-8 bg-primary/60" />
              20 March 2026
              <span className="h-px w-8 bg-primary/60" />
            </div>
            <p className="mt-5 font-display text-2xl italic text-foreground/70 sm:text-3xl">Our wedding gallery</p>
            <h2 className="mt-1 font-display text-5xl font-medium leading-[1.05] text-foreground sm:text-6xl lg:text-7xl">
              Fave <span className="text-gold-gradient text-script-ampersand">&amp;</span> Tea
            </h2>
            <p className="mx-auto mt-5 max-w-md font-body text-sm leading-relaxed text-foreground/65 md:mx-0 sm:text-base">
              {photos.length > 0
                ? "Every smile, every dance, every quiet glance, shared by the people who were there."
                : "Your gallery is ready. Share the first moments from the celebration and they will appear here."}
            </p>
            <p className="mt-4 text-xs tracking-wide text-foreground/50">
              {photos.length} photos · {totalContributors} contributors · {totalMoments} moments
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <button
                type="button"
                onClick={() => gallerySectionRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="rounded-full bg-foreground/85 px-7 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-background shadow-lg shadow-foreground/10 transition hover:-translate-y-0.5 hover:bg-foreground"
              >
                View gallery
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFiles([]);
                  setUploadSection(null);
                  setIsUploadOpen(true);
                }}
                className="rounded-full border border-foreground/25 bg-background/60 px-7 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-foreground backdrop-blur transition hover:-translate-y-0.5 hover:border-primary hover:text-primary"
              >
                Share photos
              </button>
            </div>
          </motion.div>
        </div>

        {HERO_IMAGES.length > 1 && (
          <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2">
            {HERO_IMAGES.map((image, index) => (
              <button
                key={image}
                type="button"
                onClick={() => setCoverIndex(index)}
                className={`h-2 rounded-full transition-all duration-500 ${
                  index === coverIndex ? "w-6 bg-foreground/60" : "w-2 bg-foreground/25 hover:bg-foreground/40"
                }`}
                aria-label={`Show photo ${index + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Event Section Filters */}
      <div
        ref={gallerySectionRef}
        className="container mx-auto max-w-6xl scroll-mt-20 px-4 pb-3 pt-10 max-[430px]:px-3 sm:pb-4 sm:pt-14"
      >
        <div className="mb-3 flex items-center justify-end">
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setProgrammeType("church")}
              className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-medium text-foreground transition hover:border-primary/40 hover:text-primary sm:px-4 sm:text-xs"
            >
              <CalendarDays className="h-4 w-4" />
              Order of Events - Church Ceremony
            </button>
            <button
              type="button"
              onClick={() => setProgrammeType("reception")}
              className="gold-shimmer inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold transition hover:brightness-110 sm:px-4 sm:text-xs"
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
                  ? "gold-shimmer font-semibold"
                  : "glass-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
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
                  <div className="h-px flex-1 bg-gradient-to-r from-primary/50 via-primary/15 to-transparent" />
                  <p className="text-[11px] text-muted-foreground sm:text-xs">
                    {group.photos.length} upload{group.photos.length > 1 ? "s" : ""}
                  </p>
                </div>

                <PhotoGrid photos={group.photos} renderPhoto={renderPhotoCard} />
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
            >
              <PhotoGrid photos={filtered} renderPhoto={renderPhotoCard} />
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
          className="group relative flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-300 hover:scale-110 active:scale-95 sm:h-16 sm:w-16"
          aria-label="Upload photos"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/30 [animation-duration:2.4s] motion-reduce:hidden" />
          <span className="gold-shimmer absolute inset-0 rounded-full" />
          <Upload className="relative z-10 h-6 w-6 text-primary-foreground transition-transform duration-300 group-hover:-translate-y-0.5 sm:h-7 sm:w-7" />
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
                    className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-background/50 px-3 py-2.5"
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
    </div>
  );
};

export default Gallery;
