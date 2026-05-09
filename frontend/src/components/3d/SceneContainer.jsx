export default function SceneContainer({
  children,
  className = "",
  ariaHidden = true,
  ...props
}) {
  return (
    <div
      aria-hidden={ariaHidden}
      className={`scene-container ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
