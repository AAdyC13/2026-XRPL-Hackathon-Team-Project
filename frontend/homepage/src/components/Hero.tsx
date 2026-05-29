import { appPath } from "../lib/appLinks";

export default function Hero() {
  return (
    <section id="hero">
      <div className="grid-bg" />
      <div className="hero-glow" />
      <div className="hero-glow-amber" />

      <div className="hero-label">XRPL · RWA · 校園算力市場</div>

      <h1 className="hero-title">
        校園閒置算力
        <span className="line2">重新定價</span>
      </h1>

      <p className="hero-sub">
        連接校園內的閒置 GPU 與真實算力需求，以高科幣（GKC）作為算力憑證，在 XRPL 鏈上完成透明、非託管的結算。
      </p>

      <div className="hero-ctas">
        <a href={appPath("/register")} className="btn-primary">
          我要買算力
        </a>
        <a href={appPath("/nodes")} className="btn-secondary">
          我要賣算力
        </a>
      </div>

      <div className="hero-stats">
        <div className="stat">
          <span className="stat-num" id="stat1">
            0
          </span>
          <span className="stat-label">上鏈節點</span>
        </div>
        <div className="stat">
          <span className="stat-num" id="stat2">
            0
          </span>
          <span className="stat-label">GKC 流通量</span>
        </div>
        <div className="stat">
          <span className="stat-num" id="stat3">
            0
          </span>
          <span className="stat-label">合作院校</span>
        </div>
      </div>
    </section>
  );
}
