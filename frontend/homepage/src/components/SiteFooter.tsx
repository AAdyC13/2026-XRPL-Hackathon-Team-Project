export default function SiteFooter() {
  return (
    <footer>
      <div className="footer-logo">
        GRID<span>CORE</span>
      </div>
      <ul className="footer-links">
        <li>
          <a href="#">關於平台</a>
        </li>
        <li>
          <a href="#">開發文件</a>
        </li>
        <li>
          <a href="#">GKC 白皮書</a>
        </li>
        <li>
          <a href="#">XRPL</a>
        </li>
      </ul>
      <div className="footer-copy">Built on XRP Ledger · 2026</div>
    </footer>
  );
}
