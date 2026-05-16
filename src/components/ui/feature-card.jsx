import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const cardVariants = {
  offscreen: { y: 30, opacity: 0 },
  onscreen: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", bounce: 0.4, duration: 0.8 },
  },
};

const FeatureCard = React.forwardRef(({ className, title, description, children, ...props }, ref) => (
  <motion.div
    ref={ref}
    initial="offscreen"
    whileInView="onscreen"
    viewport={{ once: true, amount: 0.3 }}
    variants={cardVariants}
    className={cn(
      "relative flex w-full flex-col overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md md:p-8",
      className
    )}
    {...props}
  >
    <div className="flex-grow">
      <h3 className="text-xl font-semibold text-card-foreground">{title}</h3>
      {description && <p className="mt-2 text-muted-foreground">{description}</p>}
    </div>
    <div className="mt-6">{children}</div>
  </motion.div>
));

FeatureCard.displayName = "FeatureCard";

export { FeatureCard };
