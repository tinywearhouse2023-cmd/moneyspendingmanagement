// ocr.js — Receipt OCR via Anthropic Claude API.
//
// Calls /api/anthropic/v1/messages which is proxied by Vite to
// api.anthropic.com with the ANTHROPIC_API_KEY header injected server-side
// (see vite.config.js). The API key is never exposed to the browser.
//
// The model is asked to return strict JSON. We use a tolerant extractor
// (extractJSON) that handles markdown code fences and text-wrapped JSON
// in case the model adds explanatory text.

const MODEL = 'claude-sonnet-4-5-20250929';
// Alternates: 'claude-sonnet-4-20250514', 'claude-opus-4-5', 'claude-haiku-4-5'

const OCR_PROMPT = `任務：辨識這張收據並回傳 JSON。

⚠️ 嚴格規則：你的回應必須**只有**一個 JSON 物件，前後不可有任何文字、說明、markdown code fence (\`\`\`) 或標點符號。直接以 { 開頭，以 } 結尾。

格式：
{
  "items": [{"name": "保留原文的品項名稱", "price": 數字}],
  "tax": 數字,
  "service": 數字,
  "total": 數字,
  "currency": "ISO 三碼，如 TWD/EUR/USD/JPY/GBP/CHF",
  "merchant": "店家名稱或空字串",
  "date": "YYYY-MM-DD 格式消費日期，無法辨識填空字串"
}

收據可能來自任何國家、任何語言（中、英、德、法、義、西、日、韓、葡、荷、北歐語等）。請積極辨識：

1. 品項名稱保留原文，不翻譯
2. price 為該行的最終金額（已含數量），如 "Café x2 €5,00" → 5.00
3. 看到「品項描述 ... 金額」的行就視為一個 item，即使品項名稱模糊也填入
4. 以下不要當成 item：
   - 稅金 (tax)：VAT, MwSt., USt., TVA, IVA, BTW, MOMS, GST, 營業稅, 消費稅
   - 服務費 (service)：Service, Servizio, Coperto, Bedienung, Tip, 服務費, 開瓶費
   - 折扣：Discount, Rabatt, Sconto — 從對應品項扣除
   - 小計 (Subtotal/Zwischensumme) — 不是 item
5. total 為收據最終付款金額（含稅含服務費）
6. currency 判斷：符號 €→EUR, £→GBP, ¥→JPY/CNY, $→USD/TWD/HKD…；無符號時依語言與地址推測
7. 數字格式：阿拉伯數字、小數點用 ".", 不加千分位逗號。歐式 "5,00" → 5.00
8. date 正規化為 YYYY-MM-DD：
   - "05.03.2024" → "2024-03-05" (歐式 DD.MM.YYYY)
   - "05/03/2024" 歐洲收據視為 DD/MM/YYYY；美國收據視為 MM/DD/YYYY
   - "March 5, 2024" → "2024-03-05"
9. 只有當整張圖完全無任何收據資訊時才回傳 items: []。其他欄位無法辨識則填 0 或空字串`;

// Robust JSON extraction: strips markdown fences anywhere, finds the first
// complete {...} block using bracket matching, and parses it.
export function extractJSON(text) {
  let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* fall through to bracket matching */
  }

  const start = cleaned.indexOf('{');
  if (start === -1) throw new Error('回應中找不到 JSON 物件');

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\') {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1));
    }
  }
  throw new Error('JSON 未完整關閉');
}

export async function ocrReceipt(base64Data, mediaType) {
  const res = await fetch('/api/anthropic/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2500,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
            { type: 'text', text: OCR_PROMPT },
          ],
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error?.message || `API 錯誤 (${res.status})`);
    err.raw = JSON.stringify(data, null, 2);
    throw err;
  }

  const text = data.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('')
    .trim();

  try {
    return { parsed: extractJSON(text), raw: text };
  } catch (e) {
    const err = new Error(`JSON 解析失敗：${e.message}`);
    err.raw = text;
    throw err;
  }
}
