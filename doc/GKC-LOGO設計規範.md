# GKC 標誌設計規範

> 高科幣（Gaoke Coin）代號 **GKC** 之視覺識別。本文件為獨立 LOGO 規範，供首頁、Dashboard、文件與對外素材統一引用。

---

## 1. 標誌構成

| 項目 | 規範 |
|------|------|
| 內容 | 僅 **G · K · C** 三個大寫字母，不附加圖形符號 |
| 語意 | GKC = 高科幣（Gaoke Coin）之鏈上代號 |
| 禁止 | 不得改字序、不得小寫、不得與其他字母連寫成新詞 |

---

## 2. 字型

| 屬性 | 值 |
|------|-----|
| `font-family` | `"Orbitron", monospace` |
| 內文／UI 標記 | `font-weight: 700` |
| 大型展示（如代幣 ticker） | `font-weight: 900` |
| 字距 | 預設 `letter-spacing: 0.04em`；區塊標籤內可用 `0.12em` |

---

## 3. 色彩體系

| 代號 | 色名 | HEX | 用途 |
|------|------|-----|------|
| **A** | 琥珀橙 | `#DF690A` | 漸層上段（品牌暖色） |
| **B** | 靛藍 | `#2B3E8C` | 漸層中段（銜接過渡） |
| **C** | 海藍 | `#0067A0` | 漸層下段（科技／鏈上） |

CSS 變數（已寫入首頁 `:root`）：

```css
--gkc-a: #df690a;
--gkc-b: #2b3e8c;
--gkc-c: #0067a0;
```

---

## 4. 填色：垂直漸層

三字母作為**同一字標**套用**由上至下**的線性漸層；G、K、C 共享同一漸層座標系（以整段「GKC」外框高度為準，而非逐字獨立填色）。

### 色帶比例

| 區段 | 色 | 佔整體高度 |
|------|-----|------------|
| 上段 | A `#DF690A` | **40%** |
| 中段 | B `#2B3E8C` | **10%** |
| 下段 | C `#0067A0` | **50%** |

### CSS 漸層定義

```css
--gkc-mark-fill: linear-gradient(
  to bottom,
  var(--gkc-a) 0%,
  var(--gkc-a) 40%,
  var(--gkc-b) 40%,
  var(--gkc-b) 50%,
  var(--gkc-c) 50%,
  var(--gkc-c) 100%
);
```

### 文字裁切填色

```css
.gkc-mark {
  background: var(--gkc-mark-fill);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
```

---

## 5. 背景對比：深色 vs 淺色

### 淺色背景

- **不加**外框／描邊
- 適用區塊：`#paths`、`#how`、`#trustline`、`#partners` 等淺色中段（背景約 `#F4F7FC`）

### 深色背景

- 三字母外圍加 **白色描邊**，提升可讀性
- 建議：`-webkit-text-stroke: 0.04em #fff` + `paint-order: stroke fill`（描邊在填色之下）
- 適用區塊：`#hero`、`nav`、`footer`、`#token` 等深色區

```css
#hero .gkc-mark,
nav .gkc-mark,
footer .gkc-mark,
#token .gkc-mark {
  -webkit-text-stroke: 0.04em #fff;
  paint-order: stroke fill;
}
```

---

## 6. 實作對照（首頁）

| 機制 | 路徑 |
|------|------|
| React 元件 | `frontend/homepage/src/components/GkcMark.tsx` |
| HTML 自動標記 | `frontend/homepage/src/lib/markGkc.ts` |
| 樣式 | `frontend/homepage/src/index.css` → `.gkc-mark` |

HTML 內容中的獨立詞 `GKC` 會被包成 `<span class="gkc-mark">GKC</span>`；代幣大標使用 `class="coin-ticker gkc-mark"`。

---

## 7. 使用規範

1. **一律**以 `<GkcMark />` 或 `.gkc-mark` 呈現，勿手寫純文字後自行上色。
2. 勿在 GKC 前後加圖示、emoji 或舊版 SVG 圓形 G 標。
3. 深／淺背景描邊由**父層區塊** CSS 控制，新增頁面時請對照第 5 節選擇是否加白框。
4. 印刷或簡報可匯出為向量字稿：Orbitron Bold／Black + 上述三色垂直漸層；深色底稿加 1pt 白色描邊。

---

## 8. 修訂紀錄

| 日期 | 說明 |
|------|------|
| 2026-05-30 | 初版：取消 SVG 符號，改為 GKC 三色垂直漸層字標 |
