/** 內嵌 HTML：圓圈 G + 槓 + KC，供 content-middle 字串替換 */
export const GKC_INLINE_HTML =
  '<span class="gkc-term" role="text" aria-label="GKC"><span class="gkc-glyph" aria-hidden="true"><span class="gkc-glyph-circle"><span class="gkc-glyph-letter">G</span><span class="gkc-glyph-bar"></span></span></span><span class="gkc-suffix" aria-hidden="true">KC</span></span>';

export function enrichGkcTerms(html: string): string {
  return html.replace(/GKC/g, GKC_INLINE_HTML);
}
