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
          <span className="footer-title-lead">點擊進入</span>
          <span className="accent">算力市場</span>
        </h2>
        <p className="footer-sub reveal">
          使用 Xaman 錢包，3 秒完成 Trust Line 建立
          <br />
          帳號驗證後即可解鎖全部功能
        </p>
        <div className="reveal">
          <a href={appPath("/login")} className="btn-connect">
            立刻註冊
          </a>
          <div className="footer-note">僅限合作院校電子郵箱註冊</div>
        </div>
      </div>
    </div>
  );
}
