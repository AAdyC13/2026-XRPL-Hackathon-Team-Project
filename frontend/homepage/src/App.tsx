import FooterCta from "./components/FooterCta";
import Hero from "./components/Hero";
import MiddleSections from "./components/MiddleSections";
import Nav from "./components/Nav";
import PartnersSection from "./components/PartnersSection";
import SiteFooter from "./components/SiteFooter";
import { useHeroCounters } from "./hooks/useHeroCounters";
import { useMobileCollapse } from "./hooks/useMobileCollapse";
import { useScrollReveal } from "./hooks/useScrollReveal";

export default function App() {
  useScrollReveal();
  useMobileCollapse();
  useHeroCounters();

  return (
    <>
      <Nav />
      <Hero />
      <MiddleSections />
      <div className="section-divider" />
      <PartnersSection />
      <div className="section-divider" />
      <FooterCta />
      <SiteFooter />
    </>
  );
}
