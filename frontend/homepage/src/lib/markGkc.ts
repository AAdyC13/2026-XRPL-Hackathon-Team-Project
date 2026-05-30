export function markGkcInHtml(html: string): string {
  return html
    .replace(/\bGKC\b/g, '<span class="gkc-mark">GKC</span>')
    .replace(
      /<div class="coin-ticker"><span class="gkc-mark">GKC<\/span><\/div>/g,
      '<div class="coin-ticker gkc-mark">GKC</div>',
    );
}
