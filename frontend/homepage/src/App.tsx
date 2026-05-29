import FooterCta from "./components/FooterCta";
import Hero from "./components/Hero";
import MiddleSections from "./components/MiddleSections";
import Nav from "./components/Nav";
import SiteFooter from "./components/SiteFooter";
import { useHeroCounters } from "./hooks/useHeroCounters";
import { useScrollReveal } from "./hooks/useScrollReveal";

export default function App() {
  useScrollReveal();
  useHeroCounters();

  return (
    <>
      <Nav />
      <Hero />
      <div className="section-divider" />
      <MiddleSections />
      <div className="section-divider" />
      <FooterCta />
      <SiteFooter />
    </>
  );
}
