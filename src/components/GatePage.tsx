import { useState } from "react";
import { motion } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import coupleImg from "@/assets/couple-3.jpeg";
import { hasAppsScriptBackend, registerGuest, restoreGuestByEmail } from "@/lib/apps-script";

interface GatePageProps {
  onEnter: (name: string, email: string) => void;
}

const GatePage = ({ onEnter }: GatePageProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email");
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    setIsSubmitting(true);

    try {
      if (trimmedName) {
        const guest = await registerGuest({ name: trimmedName, email: trimmedEmail });
        toast(hasAppsScriptBackend() ? "Registration saved" : "Registration saved locally");
        onEnter(guest.name, guest.email);
      } else if (hasAppsScriptBackend()) {
        const guest = await restoreGuestByEmail(trimmedEmail);
        toast("Session restored");
        onEnter(guest.name, guest.email);
      } else {
        setError("Enter your name to create a local session");
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unable to register right now.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={coupleImg}
          alt="Fave x Tea"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/40 via-foreground/20 to-foreground/60" />
      </div>

      {/* Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass-card-strong rounded-2xl p-8 md:p-10 text-center">
          {/* Names */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <p className="text-muted-foreground font-body text-sm tracking-[0.3em] uppercase mb-3">
              Welcome to
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-tight">
              Fave{" "}
              <span className="text-gold-gradient">x</span>{" "}
              Tea
            </h1>
            <p className="mt-3 font-display text-lg italic text-muted-foreground">
              March 20th, 2026
            </p>
            <div className="w-16 h-px bg-primary mx-auto mt-5 mb-6" />
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-muted-foreground font-body text-sm mb-6"
          >
            Share your moments from our special day
          </motion.p>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <input
              type="text"
              placeholder="Your Name (optional if returning)"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
            <input
              type="email"
              placeholder="Your Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
            {error && (
              <p className="text-destructive text-xs font-body">{error}</p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-body font-semibold text-sm tracking-wide hover:brightness-110 transition-all duration-300 shadow-lg shadow-primary/20"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Registering...
                </span>
              ) : (
                "Enter the Celebration"
              )}
            </button>
          </motion.form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="text-muted-foreground text-xs font-body mt-5"
          >
            Returning guests can enter just their email to restore their session
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};

export default GatePage;
