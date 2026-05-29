# TinySplit

跨幣別分帳 App，支援多語言收據自動辨識、歷史匯率自動換算、最少筆數結算、聯絡人匯款資訊一鍵複製。

## 快速開始

```bash
# 安裝
npm install

# 設定 API 金鑰
cp .env.example .env
# 編輯 .env，填入 ANTHROPIC_API_KEY=sk-ant-...

# 開發伺服器
npm run dev
```

開啟 http://localhost:5173

## 功能

- 群組管理（一次性或長期），含封存／刪除
- 聯絡人含銀行帳戶資訊
- 兩種分擔模式：總額平分 / 品項分擔（每個品項獨立勾選誰吃）
- 稅金與服務費按個人小計比例分攤
- 拍收據多語言辨識（中、英、德、法、義、西、日、韓…）
- 收據圖片永久保留，可全螢幕檢視
- 每筆支出記消費日期 + 幣別，自動拉當日歷史匯率
- 群組設定結算幣別，所有跨幣別支出自動換算
- 結算頁顯示最少筆數轉帳方案 + 一鍵複製帳號/金額/完整資訊

## 架構

| 檔案 | 說明 |
|---|---|
| `src/App.jsx` | 所有 UI 元件與路由 |
| `src/theme.js` | 顏色、字體、幣別、`fmt()` |
| `src/lib/storage.js` | IndexedDB 封裝（mimics Claude artifact API） |
| `src/lib/db.js` | App-specific 載入/儲存邏輯 + 收據圖片 |
| `src/lib/fx.js` | 歷史匯率（雙 CDN fallback） |
| `src/lib/ocr.js` | 收據辨識 + 穩健 JSON 解析 |
| `src/lib/image.js` | 圖片壓縮 |
| `src/lib/calc.js` | 攤分 / 結算演算法 |
| `vite.config.js` | Vite 設定 + Anthropic API proxy |

完整專案脈絡看 `CLAUDE.md`。

## 安全性

- API 金鑰透過 Vite dev server proxy 注入，**不會暴露給瀏覽器**
- 所有資料儲存於本機 IndexedDB，無外部傳輸（除了收據 OCR）
- 收據 OCR 透過 Anthropic API，僅在拍收據時送出該張圖片
- 匯率資料透過公開 CDN（fawazahmed0/currency-api），無個資

## 生產部署

目前 Vite proxy 僅在 dev mode 運作。要部署到生產環境，需要：
1. 自建後端代理 Anthropic API 呼叫（Node/Cloudflare Worker/Vercel Function）
2. 或改成讓使用者輸入自己的 API key（存 IndexedDB，警告 dev-only）

詳見 `CLAUDE.md` 的「Future Work」段落。
