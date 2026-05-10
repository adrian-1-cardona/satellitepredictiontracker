export default function SpaceLayout({ children, densityVariant = "normal" }) {
  return (
    <div className="space-page space-layout">
      <div className="space-layout-content">{children}</div>
    </div>
  );
}
