import { useState } from "react";
import { motion } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import coupleImg from "@/assets/gate-screen.jpeg";
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-6 sm:px-6 sm:py-10">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={coupleImg}
          alt="Fave & Tea"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/40 via-foreground/20 to-foreground/60" />
      </div>

      {/* Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-card-strong rounded-[1.5rem] p-5 text-center sm:p-7 md:rounded-[2rem] md:p-10">
          {/* Names */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <p className="mb-2 text-xs font-body uppercase tracking-[0.24em] text-muted-foreground sm:mb-3 sm:text-sm sm:tracking-[0.3em]">
              Welcome to
            </p>
            <h1 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl">
              Fave{" "}
              <span className="text-gold-gradient text-script-ampersand">&amp;</span>{" "}
              Tea
            </h1>
            <p className="mt-2 font-display text-base italic text-muted-foreground sm:mt-3 sm:text-lg">
              March 20th, 2026
            </p>
            <div className="mx-auto mb-5 mt-4 h-px w-14 bg-primary sm:mb-6 sm:mt-5 sm:w-16" />
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mb-5 px-2 text-sm font-body text-muted-foreground sm:mb-6"
          >
            Share your moments from our special day
          </motion.p>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            onSubmit={handleSubmit}
            className="space-y-3.5 sm:space-y-4"
          >
            <input
              type="text"
              placeholder="Your Name (optional if returning)"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 sm:py-3.5"
            />
            <input
              type="email"
              placeholder="Your Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 sm:py-3.5"
            />
            {error && (
              <p className="text-destructive text-xs font-body">{error}</p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold tracking-wide text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:brightness-110 sm:py-3.5"
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
            className="mt-4 px-2 text-xs font-body leading-relaxed text-muted-foreground sm:mt-5"
          >
            Returning guests can enter just their email to restore their session
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};

export default GatePage;
