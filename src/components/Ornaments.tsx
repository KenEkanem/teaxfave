interface SparklePosition {
  top: string;
  left: string;
  size: number;
  delay: number;
}

const HERO_SPARKLES: SparklePosition[] = [
  { top: "14%", left: "42%", size: 14, delay: 0 },
  { top: "22%", left: "52%", size: 9, delay: 1.2 },
  { top: "30%", left: "47%", size: 18, delay: 2.4 },
  { top: "62%", left: "8%", size: 12, delay: 0.6 },
  { top: "76%", left: "22%", size: 16, delay: 1.8 },
  { top: "84%", left: "78%", size: 11, delay: 3 },
  { top: "70%", left: "90%", size: 15, delay: 0.9 },
  { top: "18%", left: "88%", size: 10, delay: 2.1 },
];

const PAGE_SPARKLES: SparklePosition[] = [
  { top: "8%", left: "6%", size: 10, delay: 0 },
  { top: "18%", left: "94%", size: 12, delay: 1.5 },
  { top: "38%", left: "3%", size: 8, delay: 2.8 },
  { top: "52%", left: "96%", size: 11, delay: 0.7 },
  { top: "68%", left: "5%", size: 13, delay: 2 },
  { top: "86%", left: "92%", size: 9, delay: 3.3 },
];

const Sparkles = ({ positions }: { positions: SparklePosition[] }) => (
  <>
    {positions.map((sparkle) => (
      <svg
        key={`${sparkle.top}-${sparkle.left}`}
        width={sparkle.size}
        height={sparkle.size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className="animate-twinkle absolute"
        style={{ top: sparkle.top, left: sparkle.left, animationDelay: `${sparkle.delay}s` }}
      >
        <path d="M12 0C12.6 7.2 16.8 11.4 24 12C16.8 12.6 12.6 16.8 12 24C11.4 16.8 7.2 12.6 0 12C7.2 11.4 11.4 7.2 12 0Z" />
      </svg>
    ))}
  </>
);

// Thin flowing curves; pathLength="1" lets .animate-line-draw draw them in.
const FlowingLines = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 1440 900"
    preserveAspectRatio="none"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
    className={`absolute inset-0 h-full w-full ${className}`}
  >
    <path
      pathLength={1}
      className="animate-line-draw"
      d="M560 -20C600 120 760 170 880 120C1000 70 1100 40 1180 110C1260 180 1210 260 1300 250C1380 240 1420 190 1460 160"
    />
    <path
      pathLength={1}
      className="animate-line-draw"
      style={{ animationDelay: "0.6s" }}
      d="M1460 560C1360 600 1320 700 1360 780C1400 860 1300 900 1180 880C1080 864 1020 920 980 940"
    />
    <path
      pathLength={1}
      className="animate-line-draw"
      style={{ animationDelay: "1.2s" }}
      d="M-20 380C80 360 150 420 140 520C130 620 210 700 330 690C430 682 470 760 450 920"
    />
  </svg>
);

/** White line art and sparkles laid over a photo. */
export const PhotoOrnaments = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden text-white/80">
    <FlowingLines className="opacity-70" />
    <Sparkles positions={HERO_SPARKLES} />
  </div>
);

/** Soft blush glow with faint gold sparkles behind the page content. */
export const PageBackground = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
    <div className="absolute -right-40 top-1/4 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,hsla(24,70%,85%,0.35),transparent_65%)]" />
    <div className="absolute -left-48 bottom-0 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,hsla(43,76%,80%,0.3),transparent_65%)]" />
    <div className="absolute inset-0 text-primary/40">
      <Sparkles positions={PAGE_SPARKLES} />
    </div>
  </div>
);
