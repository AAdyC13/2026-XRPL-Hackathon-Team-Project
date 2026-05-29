import { appPath } from "../lib/appLinks";

export default function FooterCta() {
  return (
    <div id="footer-cta">
      <div className="footer-glow" />
      <div className="footer-inner">
        <div className="section-label reveal" style={{ justifyContent: "center", marginBottom: "1.5rem" }}>
          GET STARTED
        </div>
        <h2 className="footer-title reveal">
          連接你的
          <br />
          <span className="accent">Xaman 錢包</span>
        </h2>
        <p className="footer-sub reveal">
          非託管上鏈，3 秒完成 Trust Line 建立。
          <br />
          你的私鑰，永遠在你手上。
        </p>
        <div className="reveal">
          <a href={appPath("/login")} className="btn-connect">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            以 Xaman 連接錢包
          </a>
          <div className="footer-note">僅限合作院校學生 · XRPL Testnet</div>
        </div>
      </div>
    </div>
  );
}
