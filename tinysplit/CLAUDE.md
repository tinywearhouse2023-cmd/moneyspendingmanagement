# TinySplit · Claude Code Project Context

This file is the source of truth for the TinySplit project. Read it before making changes.

---

## 1. Vision

A cross-currency bill-splitting app optimized for **travel and group expenses across multiple countries and currencies**. Key user scenarios:

- A trip across Europe where receipts come in EUR, CHF, GBP, etc., need to settle in one currency at the end
- Splitting a dinner where some items were shared by subsets of the group, plus tax/tip
- Long-running groups (roommates) vs one-shot groups (a single trip)
- Quick settlement: friction-free clipboard copy of bank info to paste into a banking app

User context: bilingual Traditional Chinese / English, Taiwan-based, frequently in Europe. Tech-savvy, prefers no-fluff direct implementations over hand-holding.

---

## 2. Stack & Architecture

- **React 18** + **Vite** + **Tailwind 3** (utility classes + heavy inline-style use for the theme)
- **Lucide React** for icons
- **IndexedDB** for local persistence (wrapped to mimic the Claude artifact `window.storage` API for portability)
- **Anthropic Claude API** for receipt OCR — accessed via Vite dev proxy that injects the API key server-side (never exposed to the browser)
- **fawazahmed0/currency-api** for historical FX rates (free, no key, CDN-hosted, supports TWD + 200 other currencies)

### File layout

```
src/
├── main.jsx          React entry
├── index.css         Tailwind + global resets
├── App.jsx           ALL UI components + routing (~1600 lines)
├── theme.js          C (colors), fonts, CURRENCIES, fmt(), uid()
└── lib/
    ├── storage.js    IndexedDB key-value wrapper
    ├── db.js         App-specific load/save + receipt I/O
    ├── fx.js         Historical FX rate fetching
    ├── ocr.js        Receipt OCR via Claude API + JSON extraction
    ├── image.js      Canvas-based JPEG compression
    └── calc.js       calcExpenseShares / calcBalances / calcSettlements
```

**Why is `App.jsx` one big file?** It came over from a Claude artifact (single-file). Splitting screens into separate files is reasonable for v2; for now the single file is easier to grep and refactor. The pure logic is already extracted into `/lib`.

---

## 3. Data Model

Everything is stored under two IndexedDB keys (plus per-expense receipt keys):

```js
// tinysplit:v1
{
  contacts: [{
    id, name,
    bankCode,           // 3-digit Taiwan bank code, e.g. "822"
    bankName,           // "中國信託"
    accountNumber,      // digits only, spaces/dashes stripped
    note                // freeform — "LINE Pay / 街口"
  }],
  groups: [{
    id, name, createdAt, archived,
    currency,           // ISO 3-letter, the SETTLEMENT currency
    memberIds,          // refs to contacts.id
    expenses: [{
      id, title, payerId, createdAt,
      type,             // 'simple' | 'itemized'
      amount,           // total in expenseCurrency
      date,             // YYYY-MM-DD — consumption date (for FX lookup)
      expenseCurrency,  // ISO 3-letter, may differ from group.currency
      fxRate,           // multiplier from expenseCurrency to group.currency
      fxSource,         // 'auto' | 'manual'
      fxEffectiveDate,  // actual date the auto rate is from
      hasReceipt,       // bool — receipt image stored separately

      // simple mode:
      sharedWith: [memberId],

      // itemized mode:
      items: [{ id, name, price, sharedBy: [memberId] }],
      tax,              // in expenseCurrency
      service           // in expenseCurrency
    }]
  }]
}

// tinysplit:receipt:<expenseId> — data URL (base64 JPEG) per expense
```

### Normalization

`normalizeExpense` in `lib/calc.js` fills in defaults for older expenses (e.g. ones that pre-date the FX feature). Always called when loading from storage. If adding new expense fields, add their defaults here.

---

## 4. Feature Notes

### 4.1 Groups

- **Settlement currency** is locked at creation but editable via the group menu
- Changing currency does NOT recompute fxRate on existing expenses. User must hit Refresh on each expense (intentional: avoids surprise data mutation)
- Archived groups are hidden but not deleted
- Deleting a group also deletes all receipt images for its expenses

### 4.2 Expenses — two modes

**Simple** (`type: 'simple'`): one amount, evenly split among `sharedWith` members. Each share = `amount / sharedWith.length` in expense currency, then multiplied by `fxRate` for the group currency.

**Itemized** (`type: 'itemized'`): each item has its own `sharedBy` list. Tax + service are distributed across people **proportional to their item subtotal** — this is more fair than evenly splitting tax (someone who only had a coffee doesn't pay tax on someone else's steak).

Formula for itemized:
```
itemSubtotal[person] = sum over items they shared (item.price / item.sharedBy.length)
extra = tax + service
person_share = itemSubtotal[person] + extra * (itemSubtotal[person] / sum(itemSubtotal))
person_owes = person_share * fxRate    // → group currency
```

### 4.3 Receipt OCR

Calls `claude-sonnet-4-5` (configurable in `src/lib/ocr.js`) with the receipt image + a strict-format prompt.

**Prompt design (key points):**
- Strict JSON-only output (no markdown, no preamble)
- Multi-language tax/service keyword recognition (VAT, MwSt, TVA, IVA, BTW, Coperto, Servizio, 服務費, …)
- Date normalization with country-aware DD/MM vs MM/DD disambiguation
- Currency detection via symbol + language + address inference
- Aggressive item recognition (only return `[]` if image is truly not a receipt)

**JSON extraction:** robust extractor (`extractJSON`) handles:
1. Direct JSON
2. JSON wrapped in markdown code fences anywhere
3. JSON embedded in explanatory text — uses bracket matching to find first complete `{...}` block

If OCR fails, the debug panel in the UI shows the raw model response. Use that to refine the prompt.

### 4.4 FX rate fetching

`fetchFxRate(date, from, to)` in `lib/fx.js`:
- Returns `{ rate, effectiveDate }`
- In-memory cache keyed by `date_from_to` (no expiry — rates for past dates don't change)
- Tries `cdn.jsdelivr.net` first, falls back to `currency-api.pages.dev` (both serve the same data)
- If specific date 404s, falls back to `latest` (historical data only goes back to ~2024-03-12)
- Same-currency case returns `rate: 1` instantly

The user can manually override the auto rate — this is important because **public ECB middle rates are typically 1.5–2% better than what the bank actually charges on a credit card**. Power users should override with their actual statement rate.

### 4.5 Settlement

Greedy minimum-transaction matching in `calcSettlements`:
1. All balances rounded to currency precision (0 decimals for TWD/JPY/KRW, 2 for others)
2. Sort creditors descending, debtors ascending (by absolute amount)
3. Match largest pair, settle the smaller side, advance pointer
4. Continue until all balances within threshold

Produces near-optimal transaction count in O(n log n). Not provably minimal in pathological cases but close enough for normal groups (≤10 people).

### 4.6 Settlement payment UX

Three copy buttons per transfer row:
- **帳號** — just the account number (most-used when banking app already has bank selected)
- **金額** — just the amount
- **全部** — multi-line formatted block:
  ```
  中國信託(822)
  帳號：000000000000
  戶名：王小明
  金額：NT$ 350
  ```
  Most Taiwan banking apps auto-parse this when pasted into the transfer screen.

**No deep-linking to bank apps** — Taiwan banks don't publish stable URL schemes and don't accept external amount injection. Clipboard copy was the realistic compromise; do not re-attempt deep linking without strong evidence it would work reliably.

### 4.7 Bank info storage

Bank fields are all optional. If a contact is missing account info, the settlement row shows a yellow "未設定收款帳號 · 點此新增" prompt that opens the contact form pre-populated.

---

## 5. Conventions

### Visual

- Earth-tone palette (cream / brown / terracotta / dark green) — see `theme.js`
- **Display font** (numbers, titles): Georgia / Songti TC serif
- **Body font**: system font with PingFang / JhengHei fallback
- Tabular numerals (`fontVariantNumeric: 'tabular-nums'`) on all money figures
- Bottom-sheet modals for forms on mobile
- Pills for tabs and tag selectors
- Receipt-style dashed dividers in the settlement view
- Mobile-first layout (max-w-md container)

### Money formatting

Always go through `fmt(amount, currency)` from `theme.js`. It handles symbol + decimal count (zero decimals for TWD/JPY/KRW).

### IDs

`uid()` in `theme.js` — base36 timestamp + random suffix. Collision-resistant enough for this scale.

---

## 6. Known Limitations & Constraints

| Limitation | Why | Workaround |
|---|---|---|
| Single-device only | No backend yet | Manual export/import (future) |
| No real-time multi-user sync | Would need WebSocket + auth server | See "Future work" |
| No deep-link to bank apps | Taiwan banks don't expose stable schemes | Clipboard copy of formatted bank info |
| FX historical data starts ~2024-03-12 | API provider limitation | Falls back to latest rate for older dates |
| ECB middle rates ≠ credit card actual rates | Public data, not card-specific | Manual rate override per expense |
| Receipt OCR needs API key + network | Anthropic API | dev proxy hides key; production needs real backend |
| HEIC images may fail on older browsers | Canvas can't decode HEIC pre-iOS 13 | Fallback path uses raw data URL |

---

## 7. Future Work (prioritized)

1. **Multi-user invite + sync** — backend (Cloudflare Workers + D1, or Supabase realtime). Data model is ready; needs auth + sync layer.
2. **PWA install** — add manifest + service worker for offline use and Add to Home Screen
3. **Export to CSV / PDF report** — for trip retrospectives
4. **Group-level rate lock** — "force 1 EUR = 35 TWD for this entire trip" overrides per-expense FX
5. **Backup/restore data** — JSON export/import for migration between devices
6. **Receipt OCR retries with different models** — try Opus on Sonnet failure
7. **Itemized split percentages** — e.g. "Alice eats 40%, Bob 60%" instead of equal split
8. **Recurring expenses** — for ongoing groups (rent, utilities)
9. **OCR cost optimization** — use Haiku for receipts with clear structure, Sonnet for messy ones
10. **i18n** — currently zh-TW only; English would be straightforward

---

## 8. Conventions for Working on This Code

When adding features:

1. **Check data model first** (this file → §3). If adding fields, also add their defaults to `normalizeExpense`
2. **Keep pure logic in `/lib`**, UI in `App.jsx`
3. **All money math goes through `fmt()`** — don't manually format with `toLocaleString`
4. **Use the theme constants** — don't hardcode colors. Add to `theme.js` if needed
5. **Update this file** when adding non-trivial features or changing assumptions
6. **Money rounding**: use the `decimals` rule (0 for TWD/JPY/KRW, 2 for others) consistently
7. **Use the imported `storage`** — never call `window.storage` (won't work locally) or use `localStorage` directly (would split data across two systems)

### Don't do

- Don't add `fetch('https://api.anthropic.com/...')` directly. Use `/api/anthropic/...` (Vite proxy) so the API key stays server-side
- Don't store images inline in the main JSON blob. Use `tinysplit:receipt:<id>` keys via `saveReceipt`
- Don't attempt to deep-link to bank apps (it doesn't work reliably; clipboard copy is the answer)
- Don't auto-convert amounts when changing group currency — that surprises users. Show a warning instead

---

## 9. Origins

This project was developed iteratively in Claude.ai artifacts before being migrated to local Vite for ongoing Claude Code development. The artifact development covered:

- v1: basic 3-tab splitter (people / expenses / settlement)
- v2: rename to TinySplit, contacts with bank info, receipt OCR, item-level assignment, proportional tax/service
- v3: multi-language OCR, receipt image storage with viewer, currency support
- v4: per-expense date + currency, historical FX auto-conversion
- (this version): robust JSON extraction + debug panel for OCR failures

If something seems off in the codebase, the most likely cause is artifact-era code that wasn't fully adapted. Check the imports first — anything importing from `./lib/` should not have a local definition of the same thing.
