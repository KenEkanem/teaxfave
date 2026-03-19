import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GatePage from "@/components/GatePage";
import Gallery from "@/components/Gallery";

const GUEST_STORAGE_KEY = "tee-fave-guest";

const Index = () => {
  const [guest, setGuest] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const storedGuest = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!storedGuest) {
      return;
    }

    try {
      setGuest(JSON.parse(storedGuest));
    } catch {
      window.localStorage.removeItem(GUEST_STORAGE_KEY);
    }
  }, []);

  const handleEnter = (name: string, email: string) => {
    const nextGuest = { name, email };
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(nextGuest));
    setGuest(nextGuest);
  };

  const handleLogout = () => {
    window.localStorage.removeItem(GUEST_STORAGE_KEY);
    setGuest(null);
  };

  return (
    <AnimatePresence mode="wait">
      {!guest ? (
        <motion.div
          key="gate"
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5 }}
        >
          <GatePage onEnter={handleEnter} />
        </motion.div>
      ) : (
        <motion.div
          key="gallery"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <Gallery user={guest} onLogout={handleLogout} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Index;
