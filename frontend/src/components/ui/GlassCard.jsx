import { motion } from "framer-motion";

export default function GlassCard({
  children,
  className = "",
  elevated = false,
  hoverEffect = true,
  onClick,
  ...props
}) {
  const cardClassName = ["glass-card", elevated ? "elevated" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.div
      className={cardClassName}
      onClick={onClick}
      whileHover={hoverEffect ? { scale: 1.015 } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}
