import { useEffect, useRef } from "react";

const GRID = 52;
const CYAN = "rgba(0, 200, 255, 0.1)";
const CYAN_RGB = "0, 200, 255";
const AMBER_RGB = "245, 166, 35";

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  lifeMs: number;
  fadeStart: number;
  rgb: string;
  glow: number;
};

function targetSparkCount(w: number, h: number): number {
  return Math.max(18, Math.min(36, Math.floor((w * h) / 42_000)));
}

function randomLifeMs(): number {
  return (2.2 + Math.random() * 5.8) * 1000;
}

function spawnSpark(
  w: number,
  h: number,
  offsetX: number,
  offsetY: number,
): Spark {
  const edge = Math.floor(Math.random() * 4);
  const speed = 55 + Math.random() * 95;
  const cols = Math.ceil(w / GRID) + 1;
  const rows = Math.ceil(h / GRID) + 1;
  const col = Math.floor(Math.random() * cols);
  const row = Math.floor(Math.random() * rows);
  const margin = 16;

  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0;

  switch (edge) {
    case 0:
      x = col * GRID + offsetX;
      y = -margin;
      vy = speed;
      break;
    case 1:
      x = w + margin;
      y = row * GRID + offsetY;
      vx = -speed;
      break;
    case 2:
      x = col * GRID + offsetX;
      y = h + margin;
      vy = -speed;
      break;
    default:
      x = -margin;
      y = row * GRID + offsetY;
      vx = speed;
      break;
  }

  return {
    x,
    y,
    vx,
    vy,
    born: performance.now(),
    lifeMs: randomLifeMs(),
    fadeStart: 0.55 + Math.random() * 0.28,
    rgb: Math.random() > 0.78 ? AMBER_RGB : CYAN_RGB,
    glow: 10 + Math.random() * 8,
  };
}

function fillSparks(
  sparks: Spark[],
  w: number,
  h: number,
  offsetX: number,
  offsetY: number,
  count: number,
) {
  while (sparks.length < count) {
    sparks.push(spawnSpark(w, h, offsetX, offsetY));
  }
}

function sparkAlpha(ageMs: number, lifeMs: number, fadeStart: number): number {
  const t = ageMs / lifeMs;
  if (t < 0.06) return t / 0.06;
  if (t <= fadeStart) return 1;
  return Math.max(0, 1 - (t - fadeStart) / (1 - fadeStart));
}

export default function HeroGridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let visible = true;
    let time = 0;
    let w = 0;
    let h = 0;
    let sparks: Spark[] = [];
    let sparkTarget = 18;
    let lastFrame = performance.now();
    let gridOffsetX = 0;
    let gridOffsetY = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sparkTarget = targetSparkCount(w, h);
      sparks = [];
      fillSparks(sparks, w, h, gridOffsetX, gridOffsetY, sparkTarget);
    };

    const drawGrid = (offsetX: number, offsetY: number) => {
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 1;

      for (let x = -GRID + offsetX; x < w + GRID; x += GRID) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = -GRID + offsetY; y < h + GRID; y += GRID) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    };

    const updateSparks = (dtSec: number, now: number) => {
      const pad = 80;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx * dtSec;
        s.y += s.vy * dtSec;

        const age = now - s.born;
        const expired = age >= s.lifeMs;
        const outOfBounds =
          s.x < -pad || s.x > w + pad || s.y < -pad || s.y > h + pad;

        if (expired || (outOfBounds && age > s.lifeMs * s.fadeStart)) {
          sparks.splice(i, 1);
        }
      }
      fillSparks(sparks, w, h, gridOffsetX, gridOffsetY, sparkTarget);
    };

    const drawSparks = (now: number) => {
      for (const s of sparks) {
        const alpha = sparkAlpha(now - s.born, s.lifeMs, s.fadeStart);
        if (alpha <= 0) continue;

        const peak = 0.62 * alpha;
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.glow);
        grad.addColorStop(0, `rgba(${s.rgb}, ${peak})`);
        grad.addColorStop(0.45, `rgba(${s.rgb}, ${peak * 0.35})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.glow, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawVignette = () => {
      const g = ctx.createRadialGradient(
        w * 0.5,
        h * 0.45,
        0,
        w * 0.5,
        h * 0.45,
        Math.max(w, h) * 0.75,
      );
      g.addColorStop(0, "transparent");
      g.addColorStop(0.55, "transparent");
      g.addColorStop(1, "rgba(10, 20, 40, 0.55)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    };

    const frame = (now: number) => {
      const dtSec = Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;

      ctx.clearRect(0, 0, w, h);

      const drift = reduced.matches ? 0 : time;
      gridOffsetX = (drift * 0.35) % GRID;
      gridOffsetY = (drift * 0.25) % GRID;

      drawGrid(gridOffsetX, gridOffsetY);
      if (!reduced.matches) {
        updateSparks(dtSec, now);
        drawSparks(now);
      }
      drawVignette();

      time += 1;
      if (visible && !reduced.matches) raf = requestAnimationFrame(frame);
      else raf = 0;
    };

    const start = () => {
      lastFrame = performance.now();
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    resize();
    const parent = canvas.parentElement;
    const ro = parent ? new ResizeObserver(resize) : null;
    if (parent && ro) ro.observe(parent);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0.05 },
    );
    io.observe(canvas);

    const onMotionChange = () => {
      resize();
      if (!reduced.matches && visible) start();
      else if (reduced.matches) {
        time = 0;
        frame(performance.now());
        stop();
      }
    };
    reduced.addEventListener("change", onMotionChange);

    if (reduced.matches) {
      frame(performance.now());
    } else {
      start();
    }

    return () => {
      stop();
      ro?.disconnect();
      io.disconnect();
      reduced.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="hero-grid-canvas"
      aria-hidden="true"
    />
  );
}
