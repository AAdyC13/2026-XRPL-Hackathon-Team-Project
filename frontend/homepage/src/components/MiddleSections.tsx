import middleHtml from "../content-middle.html?raw";

export default function MiddleSections() {
  return <div dangerouslySetInnerHTML={{ __html: middleHtml }} />;
}
