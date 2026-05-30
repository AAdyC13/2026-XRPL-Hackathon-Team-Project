export type Partner = {
  id: string;
  name: string;
  nameLines: [string, string];
  logoSrc?: string;
  logoText?: string;
  url?: string;
};

/** 合作院校與供應方 — 換 logo / 名稱 / 連結時改這裡即可 */
export const partners: Partner[] = [
  {
    id: "nkust",
    name: "國立高雄科技大學",
    nameLines: ["國立高雄", "科技大學"],
    logoSrc: "https://i.ibb.co/8ykZ4k0/partner-nkust-logo.png",
    url: "https://www.nkust.edu.tw/",
  },
  {
    id: "ncku",
    name: "國立成功大學",
    nameLines: ["國立成功", "大學"],
    logoSrc: "https://i.ibb.co/MkxPH1JH/partner-ncku-logo.png",
    url: "https://www.ncku.edu.tw/",
  },
  {
    id: "nsysu",
    name: "國立中山大學",
    nameLines: ["國立中山", "大學"],
    logoSrc: "https://i.ibb.co/yBMxw5TJ/partner-nsysu-logo.png",
    url: "https://www.nsysu.edu.tw/",
  },
  {
    id: "isu",
    name: "義守大學",
    nameLines: ["義守", "大學"],
    logoSrc: "https://i.ibb.co/TBy7hBNm/partner-isu-logo.webp",
    url: "https://www.isu.edu.tw/",
  },
  {
    id: "kmu",
    name: "高雄醫學大學",
    nameLines: ["高雄醫學", "大學"],
    logoSrc: "https://i.ibb.co/fVSv9Lbg/partner-kmu-logo.png",
    url: "https://www.kmu.edu.tw/",
  },
  {
    id: "lab",
    name: "簽約實驗室供應方",
    nameLines: ["簽約實驗室", "供應方"],
    logoText: "LAB+",
  },
];

export const PARTNER_NAV_DELAY_MS = 120;
