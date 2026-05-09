export default function GlobePanel({ children }) {
  return (
    <section className="globe-panel" aria-label="Globe workspace">
      <div className="globe-panel-shell">{children}</div>
    </section>
  );
}
