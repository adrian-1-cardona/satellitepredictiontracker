import EarthGlobe from "../3d/EarthGlobe.jsx";
import Starfield from "../3d/Starfield.jsx";
import "./HeroStage.css";

/**
 * Full-viewport hero backdrop that layers the starfield behind the animated
 * Earth globe. It is purely decorative (`aria-hidden`) so assistive tech can
 * skip straight to the foreground content.
 */
export default function HeroStage() {
  return (
    <div className="hero-stage" aria-hidden="true">
      <Starfield className="hero-starfield" densityVariant="dense" />
      <EarthGlobe className="hero-globe" />
    </div>
  );
}
