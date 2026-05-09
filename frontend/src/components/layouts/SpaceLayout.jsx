import Starfield from "../3d/Starfield.jsx";

export default function SpaceLayout({ children, densityVariant = "normal" }) {
  return (
    <div className="space-page space-layout">
      <Starfield className="space-backdrop" densityVariant={densityVariant} />
      <div className="space-horizon dashboard" aria-hidden="true" />
      <div className="space-layout-content">{children}</div>
    </div>
  );
}
