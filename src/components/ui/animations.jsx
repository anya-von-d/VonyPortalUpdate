import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

// Animated Checkmark with circle
export function AnimatedCheckmark({
  size = "md",
  className,
  show = true,
  delay = 0
}) {
  const sizes = {
    sm: { container: "w-8 h-8", icon: "w-4 h-4", stroke: 2 },
    md: { container: "w-12 h-12", icon: "w-6 h-6", stroke: 2.5 },
    lg: { container: "w-16 h-16", icon: "w-8 h-8", stroke: 3 },
    xl: { container: "w-20 h-20", icon: "w-10 h-10", stroke: 3 },
  };

  const s = sizes[size] || sizes.md;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay
          }}
          className={cn(
            s.container,
            "rounded-full bg-[#35B276] flex items-center justify-center shadow-lg shadow-green-600/25",
            className
          )}
        >
          <motion.div
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: delay + 0.2, duration: 0.4 }}
          >
            <Check className={cn(s.icon, "text-white")} strokeWidth={s.stroke} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Count-up animation for numbers
export function CountUp({
  end,
  start = 0,
  duration = 1000,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
  delay = 0
}) {
  const [count, setCount] = useState(start);
  const countRef = useRef(start);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const animate = (timestamp) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const progress = timestamp - startTimeRef.current;
        const percentage = Math.min(progress / duration, 1);

        // Easing function (ease-out-expo)
        const eased = 1 - Math.pow(1 - percentage, 3);

        countRef.current = start + (end - start) * eased;
        setCount(countRef.current);

        if (percentage < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timeout);
  }, [end, start, duration, delay]);

  const displayValue = decimals > 0
    ? count.toFixed(decimals)
    : Math.round(count).toLocaleString();

  return (
    <span className={className}>
      {prefix}{displayValue}{suffix}
    </span>
  );
}

// Subtle confetti burst
export function ConfettiBurst({
  show = false,
  particleCount = 20,
  colors = ["#35B276", "#22c55e", "#4ade80", "#86efac"],
  className
}) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (show) {
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100 - 50,
        y: Math.random() * -100 - 50,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 4,
        delay: Math.random() * 0.2,
      }));
      setParticles(newParticles);

      // Clear particles after animation
      const timeout = setTimeout(() => setParticles([]), 1500);
      return () => clearTimeout(timeout);
    }
  }, [show]);

  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{
              x: "50%",
              y: "50%",
              scale: 0,
              rotate: 0,
              opacity: 1
            }}
            animate={{
              x: `calc(50% + ${particle.x}px)`,
              y: `calc(50% + ${particle.y}px)`,
              scale: 1,
              rotate: particle.rotation,
              opacity: 0
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.8 + Math.random() * 0.4,
              delay: particle.delay,
              ease: "easeOut"
            }}
            className="absolute"
            style={{
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Shimmer effect for loading states
export function Shimmer({ className }) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
        animate={{ x: ["0%", "200%"] }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "linear",
        }}
      />
    </div>
  );
}

// Enhanced skeleton with shimmer
export function SkeletonShimmer({ className, ...props }) {
  return (
    <div
      className={cn(
        "relative rounded-md bg-slate-200/70 overflow-hidden",
        className
      )}
      {...props}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent"
        animate={{ x: ["0%", "200%"] }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "linear",
        }}
      />
    </div>
  );
}

// Progress indicator with smooth animation
export function AnimatedProgress({
  value = 0,
  max = 100,
  className,
  showLabel = false,
  color = "bg-[#35B276]"
}) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Progress</span>
          <CountUp
            end={percentage}
            suffix="%"
            decimals={0}
            duration={600}
            className="font-medium text-slate-800"
          />
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// Card entrance animation wrapper
export function CardEntrance({
  children,
  delay = 0,
  className,
  direction = "up" // up, down, left, right
}) {
  const directions = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: "easeOut"
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Button with enhanced hover state
export function AnimatedButton({
  children,
  className,
  variant = "primary",
  ...props
}) {
  const variants = {
    primary: "bg-[#35B276] hover:bg-[#2d9a65] text-white shadow-lg shadow-green-600/20",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800",
    outline: "border-2 border-slate-200 hover:border-[#35B276] hover:text-[#35B276] bg-white",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn(
        "px-4 py-2 rounded-lg font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// Success state animation (checkmark + confetti)
export function SuccessAnimation({
  show = false,
  title = "Success!",
  subtitle,
  onComplete
}) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (show) {
      setShowConfetti(true);
      const timeout = setTimeout(() => {
        if (onComplete) onComplete();
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center py-8 relative"
        >
          <ConfettiBurst show={showConfetti} particleCount={30} />
          <AnimatedCheckmark size="xl" delay={0.1} />
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl font-bold text-slate-800 mt-4"
          >
            {title}
          </motion.h3>
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-slate-600 text-center mt-2"
            >
              {subtitle}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Transaction ID display with copy
export function TransactionId({ id, className }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2",
        className
      )}
    >
      <span className="text-xs text-slate-500">Transaction ID:</span>
      <code className="text-xs font-mono text-slate-700">{id.slice(0, 8)}...</code>
      <button
        onClick={handleCopy}
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-500" />
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2"/>
          </svg>
        )}
      </button>
    </motion.div>
  );
}

// Loading spinner
export function LoadingSpinner({ size = "md", className }) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-3",
    xl: "w-12 h-12 border-4",
  };

  return (
    <motion.div
      className={cn(
        sizes[size],
        "border-slate-200 border-t-[#35B276] rounded-full",
        className
      )}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );
}
