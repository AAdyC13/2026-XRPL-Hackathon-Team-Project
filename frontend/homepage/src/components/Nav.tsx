import { appPath } from "../lib/appLinks";
import GkcMark from "./GkcMark";

export default function Nav() {
  return (
    <nav>
      <a href="/" className="logo">
        <span className="logo-abbr">CAC<span className="logo-accent">P</span></span>
        <span className="logo-full">校園AI算力租賃共享平台</span>
      </a>
      <ul>
        <li>
          <a href="#paths">平台介紹</a>
        </li>
        <li>
          <a href="#how">使用流程</a>
        </li>
        <li>
          <a href="#token">
            <GkcMark /> 代幣
          </a>
        </li>
        <li>
          <a href="#trustline">准入機制</a>
        </li>
        <li>
          <a href="#partners">合作院校與穩定供應方</a>
        </li>
      </ul>
      <a href={appPath("/login")} className="nav-cta">
        註冊/登入
      </a>
    </nav>
  );
}
