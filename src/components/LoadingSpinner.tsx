import { cn } from "@/lib/utils";

/** Blade spinner — 12 radial fades. Use for inline / small contexts. */
export function LoadingSpinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("relative inline-block", className)}
      style={{ width: "1em", height: "1em", fontSize: 28 }}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: "0.4629em",
            bottom: 0,
            width: "0.074em",
            height: "0.2777em",
            borderRadius: "0.0555em",
            backgroundColor: "transparent",
            transformOrigin: "center -0.2222em",
            transform: `rotate(${i * 30}deg)`,
            animation: `devant-blade-fade 1s ${(i * 0.0833).toFixed(3)}s infinite linear`,
          }}
        />
      ))}
      <style>{`
        @keyframes devant-blade-fade {
          0%   { background-color: #69717d; }
          100% { background-color: transparent; }
        }
      `}</style>
    </span>
  );
}

/** Square grid spinner — 3×3 staggered opacity. Use for full-section / page loading panels. */
export function GridSpinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  const delays = [0, 75, 150, 225, 300, 375, 450, 525, 600];
  const offsets = [
    [-25, -25], [-25, -5], [-25, 15],
    [-5,  -25], [-5,  -5], [-5,  15],
    [15,  -25], [15,  -5], [15,  15],
  ];
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("relative inline-block", className)}
      style={{ width: 40, height: 40 }}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            top: "50%",
            left: "50%",
            marginTop: offsets[i][0],
            marginLeft: offsets[i][1],
            background: "currentColor",
            opacity: 0,
            animation: `devant-sq-fade 675ms ease-in-out ${delays[i]}ms infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes devant-sq-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </span>
  );
}
