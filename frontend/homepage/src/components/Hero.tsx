import GkcMark from "./GkcMark";
import HeroGridCanvas from "./HeroGridCanvas";

function scrollToFlow(cls: "buy" | "sell") {
  const el = document.querySelector<HTMLElement>(`.flow-header.${cls}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
}

export default function Hero() {
  return (
    <section id="hero">
      <HeroGridCanvas />
      <div className="hero-glow" />
      <div className="hero-glow-amber" />

      <div className="hero-label">XRPL · RWA · 校園算力市場</div>

      <h1 className="hero-title">
        校園閒置算力
        <span className="line2">重新定價</span>
      </h1>

      <p className="hero-sub">
        連接校園內的閒置 GPU 與真實算力需求，以
        <span className="gkc-phrase">
          高科幣（<GkcMark />）
        </span>
        作為算力憑證，在 XRPL 鏈上完成透明、非託管的結算。
      </p>

      <div className="hero-ctas">
        <button className="btn-primary" onClick={() => scrollToFlow("buy")}>
          我要買算力
        </button>
        <button className="btn-secondary" onClick={() => scrollToFlow("sell")}>
          我要賣算力
        </button>
      </div>

      <div className="hero-stats-wrap">
        <span className="demo-badge">DEMO DATA</span>
        <div className="hero-stats">
          <div className="stat">
            <span className="stat-num" id="stat1">0</span>
            <span className="stat-label">在線用戶</span>
          </div>
          <div className="stat">
            <span className="stat-num" id="stat2">0</span>
            <span className="stat-label">
              <GkcMark /> 流通量
            </span>
          </div>
          <div className="stat">
            <span className="stat-num" id="stat3">0</span>
            <span className="stat-label">合作院校</span>
          </div>
        </div>
      </div>

    </section>
  );
}
