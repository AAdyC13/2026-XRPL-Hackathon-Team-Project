import { useEffect } from "react";

const ONLINE_MIN = 80;
const ONLINE_MAX = 110;

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

/** 依當下時間在 80–110 取得初始值 */
function seedOnlineUsersFromTime(): number {
  const t = new Date();
  const secondsOfDay =
    t.getHours() * 3600 + t.getMinutes() * 60 + t.getSeconds();
  return ONLINE_MIN + (secondsOfDay % (ONLINE_MAX - ONLINE_MIN + 1));
}

function randomOnlineTickDelayMs(): number {
  return 3000 + Math.random() * 7000;
}

function randomOnlineDelta(): number {
  const amount = Math.random() < 0.5 ? 1 : 2;
  const sign = Math.random() < 0.5 ? -1 : 1;
  return amount * sign;
}

function pulseStatNum(el: HTMLElement) {
  el.classList.remove("stat-num--pulse");
  void el.offsetWidth;
  el.classList.add("stat-num--pulse");
  el.addEventListener(
    "animationend",
    () => el.classList.remove("stat-num--pulse"),
    { once: true },
  );
}

function startOnlineUsersCounter(el: HTMLElement): () => void {
  let value = seedOnlineUsersFromTime();
  el.textContent = String(value);

  let timeoutId = 0;

  const tick = () => {
    const next = Math.max(
      ONLINE_MIN,
      Math.min(ONLINE_MAX, value + randomOnlineDelta()),
    );
    if (next !== value) {
      value = next;
      el.textContent = String(value);
      pulseStatNum(el);
    }
    timeoutId = window.setTimeout(tick, randomOnlineTickDelayMs());
  };

  timeoutId = window.setTimeout(tick, randomOnlineTickDelayMs());

  return () => window.clearTimeout(timeoutId);
}

export function useHeroCounters() {
  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return;

    let stopOnlineCounter: (() => void) | undefined;

    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const stat1 = document.getElementById("stat1");
        const stat2 = document.getElementById("stat2");
        const stat3 = document.getElementById("stat3");
        if (stat1) stopOnlineCounter = startOnlineUsersCounter(stat1);
        if (stat2) setTimeout(() => animateCounter(stat2, 50000, "+"), 900);
        if (stat3) setTimeout(() => animateCounter(stat3, 5), 1000);
        heroObserver.disconnect();
      });
    });

    heroObserver.observe(hero);
    return () => {
      heroObserver.disconnect();
      stopOnlineCounter?.();
    };
  }, []);
}
