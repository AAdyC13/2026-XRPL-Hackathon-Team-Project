import GkcMark from "./GkcMark";

function blockFooterLink(event: React.MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
}

export default function SiteFooter() {
  return (
    <footer>
      <div className="footer-logo">
        <span className="logo-abbr">CAC<span className="logo-accent">P</span></span>
        <span className="logo-full">校園AI算力租賃共享平台</span>
      </div>
      <ul className="footer-links">
        <li>
          <a href="#" className="footer-link-item" onClick={blockFooterLink}>
            關於平台
          </a>
        </li>
        <li>
          <a href="#" className="footer-link-item" onClick={blockFooterLink}>
            開發文件
          </a>
        </li>
        <li>
          <a href="#" className="footer-link-item" onClick={blockFooterLink}>
            <GkcMark /> 白皮書
          </a>
        </li>
        <li>
          <a href="#" className="footer-link-item" onClick={blockFooterLink}>
            XRPL
          </a>
        </li>
      </ul>
      <div className="footer-copy">Campus AI Computing Platform · 2026</div>
    </footer>
  );
}
