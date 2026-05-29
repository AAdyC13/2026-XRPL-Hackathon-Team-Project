import { useEffect } from "react";

function animateCounter(
  el: HTMLElement,
  target: number,
  suffix = "",
  duration = 2000,
) {
  let start = 0;
  const step = target / (duration / 16);
  const timer = window.setInterval(() => {
    start += step;
    if (start >= target) {
      el.textContent = target.toLocaleString() + suffix;
      window.clearInterval(timer);
    } else {
      el.textContent = Math.floor(start).toLocaleString() + suffix;
    }
  }, 16);
}

export function useHeroCounters() {
  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return;

    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const stat1 = document.getElementById("stat1");
        const stat2 = document.getElementById("stat2");
        const stat3 = document.getElementById("stat3");
        if (stat1) setTimeout(() => animateCounter(stat1, 128, "+"), 800);
        if (stat2) setTimeout(() => animateCounter(stat2, 50000, "+"), 900);
        if (stat3) setTimeout(() => animateCounter(stat3, 5), 1000);
        heroObserver.disconnect();
      });
    });

    heroObserver.observe(hero);
    return () => heroObserver.disconnect();
  }, []);
}
