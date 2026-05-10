import EarthGlobe from "../3d/EarthGlobe.jsx";
import "./HeroStage.css";

/**
 * Full-viewport hero backdrop with a true-black space environment behind the
 * animated Earth globe. It is decorative (`aria-hidden`) so assistive tech can
 * skip straight to the foreground content.
 */
export default function HeroStage() {
  return (
    <div className="hero-stage" aria-hidden="true">
      <EarthGlobe className="hero-globe" />
    </div>
  );
}
