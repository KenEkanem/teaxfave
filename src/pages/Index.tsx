import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GatePage from "@/components/GatePage";
import Gallery from "@/components/Gallery";

const Index = () => {
  const [guest, setGuest] = useState<{ name: string; email: string } | null>(null);

  const handleEnter = (name: string, email: string) => {
    setGuest({ name, email });
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
          <Gallery userName={guest.name} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Index;
