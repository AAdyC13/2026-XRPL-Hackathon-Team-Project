import middleHtml from "../content-middle.html?raw";
import { markGkcInHtml } from "../lib/markGkc";

export default function MiddleSections() {
  return (
    <div
      className="middle-sections"
      dangerouslySetInnerHTML={{ __html: markGkcInHtml(middleHtml) }}
    />
  );
}
