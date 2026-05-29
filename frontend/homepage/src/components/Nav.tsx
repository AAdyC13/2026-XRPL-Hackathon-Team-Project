import { appPath } from "../lib/appLinks";

export default function Nav() {
  return (
    <nav>
      <a href="/" className="logo">
        GRID<span>CORE</span>
      </a>
      <ul>
        <li>
          <a href="#paths">平台介紹</a>
        </li>
        <li>
          <a href="#how">使用流程</a>
        </li>
        <li>
          <a href="#token">GKC 代幣</a>
        </li>
        <li>
          <a href="#trustline">准入機制</a>
        </li>
      </ul>
      <a href={appPath("/login")} className="nav-cta">
        連接錢包
      </a>
    </nav>
  );
}
