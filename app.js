// ═══════════════════════════════════════════════════════════
// APP.JS — 記帳 App 核心邏輯
// ═══════════════════════════════════════════════════════════
 
// ── Static Data ───────────────────────────────────────────
const DEFAULT_EXP_CATS = [
  {e:'🍜',n:'餐飲',subs:[{e:'🌅',n:'早餐'},{e:'☀️',n:'午餐'},{e:'🌙',n:'晚餐'},{e:'🧋',n:'飲料'},{e:'🍱',n:'外帶'},{e:'🥂',n:'聚餐'}]},
  {e:'🛍',n:'購物',subs:[{e:'👗',n:'服飾'},{e:'🧴',n:'日用品'},{e:'📱',n:'3C'},{e:'💄',n:'美妝'},{e:'📚',n:'書籍'},{e:'🛒',n:'超市'}]},
  {e:'🚗',n:'交通',subs:[{e:'🚇',n:'大眾運輸'},{e:'⛽',n:'油錢'},{e:'🅿️',n:'停車'},{e:'🚕',n:'計程車/Uber'},{e:'🛵',n:'機車'}]},
  {e:'🏠',n:'生活',subs:[{e:'🏡',n:'房租'},{e:'💡',n:'水電瓦斯'},{e:'📲',n:'電話費'},{e:'📺',n:'訂閱服務'},{e:'🔧',n:'維修'}]},
  {e:'🎮',n:'娛樂',subs:[{e:'🎬',n:'電影/展覽'},{e:'🏋️',n:'運動'},{e:'🎮',n:'遊戲'},{e:'🎵',n:'音樂/演唱會'},{e:'🎳',n:'休閒活動'}]},
  {e:'🏥',n:'醫療',subs:[{e:'🩺',n:'看診'},{e:'💊',n:'藥品'},{e:'🌿',n:'保健品'},{e:'🦷',n:'牙科'},{e:'👁',n:'眼科'}]},
  {e:'✈️',n:'旅遊',subs:[{e:'🎫',n:'機票'},{e:'🏨',n:'飯店/住宿'},{e:'🚌',n:'當地交通'},{e:'🎡',n:'景點門票'},{e:'🍽',n:'旅遊餐飲'},{e:'🎁',n:'伴手禮'}]},
  {e:'💡',n:'其他',subs:[{e:'💰',n:'其他'}]}
];
 
const DEFAULT_INC_CATS = [
  {e:'💼',n:'薪資',subs:[{e:'💰',n:'工資'},{e:'🎁',n:'獎金'},{e:'✈️',n:'出差津貼'},{e:'📈',n:'加班費'}]},
  {e:'📈',n:'投資',subs:[{e:'📊',n:'股票'},{e:'🏦',n:'基金/ETF'},{e:'💳',n:'利息'},{e:'🏠',n:'租金收入'}]},
  {e:'🎯',n:'兼職',subs:[{e:'💻',n:'Freelance'},{e:'🛒',n:'電商/拍賣'},{e:'🎨',n:'創作收入'},{e:'📝',n:'其他兼職'}]},
  {e:'🎀',n:'其他收入',subs:[{e:'🧧',n:'紅包'},{e:'💸',n:'退款'},{e:'🎊',n:'獎勵'},{e:'💡',n:'其他'}]}
];
 
const CURRENCIES = [
  {code:'TWD',sym:'NT$',flag:'🇹🇼',name:'新台幣'},
  {code:'USD',sym:'$',flag:'🇺🇸',name:'美元'},
  {code:'JPY',sym:'¥',flag:'🇯🇵',name:'日圓'},
  {code:'EUR',sym:'€',flag:'🇪🇺',name:'歐元'},
  {code:'GBP',sym:'£',flag:'🇬🇧',name:'英鎊'},
  {code:'KRW',sym:'₩',flag:'🇰🇷',name:'韓元'},
  {code:'HKD',sym:'HK$',flag:'🇭🇰',name:'港幣'},
  {code:'SGD',sym:'S$',flag:'🇸🇬',name:'新加坡元'},
  {code:'THB',sym:'฿',flag:'🇹🇭',name:'泰銖'},
  {code:'AUD',sym:'A$',flag:'🇦🇺',name:'澳幣'},
];
 
const PAYER_AVATARS = ['🙋','💑'];
const CHART_COLORS = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#C77DFF','#FF9A3C','#00C9A7','#F72585','#4CC9F0','#7B2D8B'];
 
// ── State ─────────────────────────────────────────────────
const State = {
  // Input
  amtStr: '', type: 'exp', selBig: null, selSub: null, selCard: null, selPayer: null, step: 1,
  dateOffset: 0, curCode: localStorage.getItem('lastCur') || 'TWD',
  rates: {}, twdManual: '',
  // Calendar picker
  calYear: 0, calMonth: 0,
  // Records
  recView: 'cal', recYear: new Date().getFullYear(), recMonth: new Date().getMonth(),
  recData: {}, selRecDay: null, searchQ: '',
  // Stats
  statsTab: 'overview', statsPeriod: 'month',
  statsCustomStart: null, statsCustomEnd: null,
  statsFilterType: 'all', statsFilterCat: null, statsFilterPayer: null,
  statsCache: null,
  // Offline queue
  offlineQueue: JSON.parse(localStorage.getItem('offlineQueue') || '[]'),
  // Charts
  charts: {},
  // Lock
  isLocked: false,
  // Budget
  budgets: JSON.parse(localStorage.getItem('budgets') || '{}'),
  // Fixed expenses
  fixedExpenses: JSON.parse(localStorage.getItem('fixedExpenses') || '[]'),
};
 
// ── Config ────────────────────────────────────────────────
const Config = {
  get scriptUrl() { return localStorage.getItem('su') || ''; },
  get sheetId() { return localStorage.getItem('sheetId') || ''; },
  get p1() { return localStorage.getItem('p1') || '自己'; },
  get p2() { return localStorage.getItem('p2') || '另一半'; },
  get cards() {
    try { return JSON.parse(localStorage.getItem('cardsData') || '[]'); } catch(e) { return []; }
  },
  get expCats() {
    try { return JSON.parse(localStorage.getItem('expCats') || 'null') || DEFAULT_EXP_CATS; } catch(e) { return DEFAULT_EXP_CATS; }
  },
  get incCats() {
    try { return JSON.parse(localStorage.getItem('incCats') || 'null') || DEFAULT_INC_CATS; } catch(e) { return DEFAULT_INC_CATS; }
  },
  get lockType() { return localStorage.getItem('lockType') || 'none'; },
  get lockSecret() { return localStorage.getItem('lockSecret') || ''; },
  get reminderTime() { return localStorage.getItem('reminderTime') || ''; },
};
 
// ── Category helpers ──────────────────────────────────────
function getCats() { return State.type === 'exp' ? Config.expCats : Config.incCats; }
 
// ── Init ──────────────────────────────────────────────────
function init() {
  updateDate();
  renderCurRow();
  fetchRates();
  renderCardChips();
  loadConfigUI();
  setupOfflineSync();
  setupReminder();
  checkLock();
  document.getElementById('twdInput').addEventListener('input', e => { State.twdManual = e.target.value; });
  document.getElementById('searchInput').addEventListener('input', e => {
    State.searchQ = e.target.value;
    document.getElementById('searchClear').style.display = State.searchQ ? 'block' : 'none';
    if (State.searchQ) setRecView('list');
    renderRecords();
  });
  updateRecMonthNav();
  renderRecCalendar();
}
 
// ── Type ──────────────────────────────────────────────────
function setType(t) {
  State.type = t;
  document.getElementById('tt-exp').classList.toggle('on', t === 'exp');
  document.getElementById('tt-inc').classList.toggle('on', t === 'inc');
  const big = document.getElementById('amtBig');
  big.classList.toggle('exp-col', t === 'exp');
  big.classList.toggle('inc-col', t === 'inc');
  State.selBig = null; State.selSub = null;
  document.getElementById('hd2').textContent = t === 'exp' ? '誰花的？' : '誰收到的？';
  document.getElementById('hd5').textContent = t === 'exp' ? '用哪張卡？' : '收到哪裡？';
  const c1 = document.getElementById('cta1');
  if (State.amtStr && parseInt(State.amtStr) > 0) c1.classList.remove('dim');
}
 
// ── Date ──────────────────────────────────────────────────
function getDateObj() { const d = new Date(); d.setDate(d.getDate() + State.dateOffset); return d; }
function shiftDate(n) { State.dateOffset += n; updateDate(); }
function updateDate() {
  const d = getDateObj();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const w = ['日','一','二','三','四','五','六'][d.getDay()];
  let lbl = `${mm}/${dd}（週${w}）`;
  if (State.dateOffset === 0) lbl = '今天  ' + lbl;
  else if (State.dateOffset === -1) lbl = '昨天  ' + lbl;
  document.getElementById('dateVal').textContent = lbl;
}
function getDateStr() {
  const d = getDateObj();
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}
 
// ── Calendar Picker ───────────────────────────────────────
function openCal() {
  const d = getDateObj();
  State.calYear = d.getFullYear(); State.calMonth = d.getMonth();
  renderCalPicker(); document.getElementById('calModal').classList.add('on');
}
function closeCal() { document.getElementById('calModal').classList.remove('on'); }
function calShiftMonth(n) {
  State.calMonth += n;
  if (State.calMonth > 11) { State.calMonth = 0; State.calYear++; }
  if (State.calMonth < 0) { State.calMonth = 11; State.calYear--; }
  renderCalPicker();
}
function renderCalPicker() {
  const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  document.getElementById('calMonthLbl').textContent = `${State.calYear}年 ${months[State.calMonth]}`;
  const today = new Date(), selD = getDateObj();
  const first = new Date(State.calYear, State.calMonth, 1);
  const last = new Date(State.calYear, State.calMonth + 1, 0);
  const startDow = first.getDay(); let html = '';
  const prevLast = new Date(State.calYear, State.calMonth, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) html += `<div class="cal-day other-month">${prevLast - i}</div>`;
  for (let day = 1; day <= last.getDate(); day++) {
    const d2 = new Date(State.calYear, State.calMonth, day);
    const isToday = d2.toDateString() === today.toDateString();
    const isSel = d2.toDateString() === selD.toDateString();
    let cls = 'cal-day'; if (isSel) cls += ' sel-day'; else if (isToday) cls += ' today';
    html += `<div class="${cls}" onclick="pickDay(${State.calYear},${State.calMonth},${day})">${day}</div>`;
  }
  const rem = 42 - (startDow + last.getDate());
  for (let i = 1; i <= rem; i++) html += `<div class="cal-day other-month">${i}</div>`;
  document.getElementById('calDays').innerHTML = html;
}
function pickDay(y, m, d) {
  const target = new Date(y, m, d), today = new Date(); today.setHours(0, 0, 0, 0);
  State.dateOffset = Math.round((target - today) / (1000 * 60 * 60 * 24));
  updateDate(); closeCal();
}
 
// ── Currency ──────────────────────────────────────────────
async function fetchRates() {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/TWD');
    const data = await res.json(); State.rates = data.rates || {};
  } catch(e) {
    State.rates = {USD:0.031,JPY:4.7,EUR:0.029,GBP:0.025,KRW:41.5,HKD:0.24,SGD:0.042,THB:1.11,AUD:0.048,TWD:1};
  }
  renderCurRow(); updateTWDRow();
}
function renderCurRow() {
  const cur = CURRENCIES.find(c => c.code === State.curCode) || CURRENCIES[0];
  let rateStr = '';
  if (State.curCode !== 'TWD' && State.rates[State.curCode])
    rateStr = `1${cur.code}≈NT$${(1/State.rates[State.curCode]).toFixed(2)}`;
  document.getElementById('curRow').innerHTML = `<div class="cur-chip" onclick="openCurModal()">${cur.flag} ${cur.code} ▾</div>${rateStr ? `<span class="rate-label">${rateStr}</span>` : ''}`;
  document.getElementById('curSym').textContent = cur.sym;
  updateTWDRow();
}
function updateTWDRow() {
  const tr = document.getElementById('twdRow'), ta = document.getElementById('twdAuto');
  if (State.curCode === 'TWD') { tr.style.display = 'none'; return; }
  tr.style.display = 'flex';
  if (State.amtStr && State.rates[State.curCode]) {
    const t = Math.round(parseFloat(State.amtStr) / State.rates[State.curCode]);
    if (!State.twdManual) ta.textContent = `≈ NT$${t.toLocaleString()}`;
  } else ta.textContent = '';
}
function openCurModal() { renderCurList(); document.getElementById('curModal').classList.add('on'); }
function closeCurModal() { document.getElementById('curModal').classList.remove('on'); }
function renderCurList() {
  document.getElementById('curList').innerHTML = CURRENCIES.map(c => {
    const isSel = c.code === State.curCode;
    let r = ''; if (c.code !== 'TWD' && State.rates[c.code]) r = `1${c.code} ≈ NT$${(1/State.rates[c.code]).toFixed(2)}`;
    return `<div class="cur-item${isSel?' sel':''}" onclick="selectCur('${c.code}')">
      <span class="cur-flag">${c.flag}</span>
      <div class="cur-info"><div class="cur-code">${c.code}</div><div class="cur-name">${c.name}</div></div>
      ${r ? `<span class="cur-rate">${r}</span>` : ''}<span class="cur-ck2">✓</span>
    </div>`;
  }).join('');
}
function selectCur(code) {
  State.curCode = code; localStorage.setItem('lastCur', code);
  State.twdManual = ''; document.getElementById('twdInput').value = '';
  renderCurRow(); closeCurModal();
}
 
// ── Numpad ────────────────────────────────────────────────
function kp(n) {
  if (State.amtStr.length >= 8) return;
  if (State.amtStr === '0') State.amtStr = n; else State.amtStr += n;
  updateAmt();
}
function kd() { State.amtStr = State.amtStr.slice(0, -1); updateAmt(); }
function updateAmt() {
  const el = document.getElementById('amtVal'), big = document.getElementById('amtBig');
  if (!State.amtStr) { el.textContent = '0'; big.classList.add('empty'); }
  else { el.textContent = Number(State.amtStr).toLocaleString('zh-TW'); big.classList.remove('empty'); }
  const cta = document.getElementById('cta1');
  if (State.amtStr && parseInt(State.amtStr) > 0) cta.classList.remove('dim'); else cta.classList.add('dim');
  updateTWDRow();
}
 
// ── Payer ─────────────────────────────────────────────────
function renderPayerGrid() {
  const names = [Config.p1, Config.p2];
  document.getElementById('payerGrid').innerHTML = names.map((n, i) => `
    <div class="payer-item${State.selPayer === i ? ' sel' : ''}" onclick="pickPayer(${i})">
      <span class="payer-avatar">${PAYER_AVATARS[i]}</span>
      <span class="payer-name">${n}</span>
    </div>`).join('');
}
function pickPayer(i) { State.selPayer = i; renderPayerGrid(); setTimeout(() => go(3), 280); }
 
// ── Big Grid ──────────────────────────────────────────────
function renderBigGrid() {
  const cats = getCats(), sc = State.type === 'exp' ? 'sel-red' : 'sel-grn';
  document.getElementById('bigGrid').innerHTML = cats.map((c, i) => `
    <div class="bc${State.selBig === i ? ' ' + sc : ''}" onclick="pickBig(${i})">
      <div class="bc-e">${c.e}</div><div class="bc-n">${c.n}</div>
    </div>`).join('');
}
function pickBig(i) {
  State.selBig = i; State.selSub = null; renderBigGrid();
  if (getCats()[i].subs.length === 1) { State.selSub = 0; setTimeout(() => go(5), 280); }
  else setTimeout(() => go(4), 280);
}
 
// ── Sub Grid ──────────────────────────────────────────────
function renderSubGrid() {
  if (State.selBig === null) return;
  const cat = getCats()[State.selBig];
  document.getElementById('hd4').textContent = `${cat.e} ${cat.n}`;
  const sc = State.type === 'exp' ? 'sel-red' : 'sel-grn';
  document.getElementById('subGrid').innerHTML = cat.subs.map((s, i) => `
    <div class="si${State.selSub === i ? ' ' + sc : ''}" onclick="pickSub(${i})">
      <span class="si-e">${s.e}</span><span class="si-n">${s.n}</span>
    </div>`).join('');
}
function pickSub(i) { State.selSub = i; renderSubGrid(); setTimeout(() => go(5), 280); }
 
// ── Cards ─────────────────────────────────────────────────
function renderCardChips() {
  const cards = Config.cards;
  if (!cards.length) {
    document.getElementById('cardList').innerHTML = '<div class="no-card-msg">請先在設定中新增卡片</div>';
    return;
  }
  document.getElementById('cardList').innerHTML = cards.map((c, i) => {
    const last5 = c.number ? c.number.replace(/\s/g,'').slice(-5) : '?????';
    const isSel = State.selCard === i;
    return `<div class="cr${isSel?' sel':''}" onclick="pickCard(${i})">
      <span class="cr-ic">${c.emoji||'💳'}</span>
      <div class="cr-info">
        <div class="cr-nm">${c.name}</div>
        <div class="cr-num">•••${last5}</div>
      </div>
      <span class="cr-ck">✓</span>
    </div>`;
  }).join('');
}
function pickCard(i) { State.selCard = i; renderCardChips(); setTimeout(() => go(6), 280); }
 
// ── Labels ────────────────────────────────────────────────
function amtLabel() {
  const cur = CURRENCIES.find(c => c.code === State.curCode);
  return (cur ? cur.sym : '$') + (parseInt(State.amtStr) || 0).toLocaleString('zh-TW');
}
function catLabel() {
  if (State.selBig === null) return '—';
  const c = getCats()[State.selBig];
  if (State.selSub !== null) return c.e + ' ' + c.subs[State.selSub].n;
  return c.e + ' ' + c.n;
}
function cardLabel() {
  if (State.selCard === null) return '—';
  const c = Config.cards[State.selCard];
  return c ? c.name : '—';
}
function cardLast5() {
  if (State.selCard === null) return '';
  const c = Config.cards[State.selCard];
  return c && c.number ? '•••' + c.number.replace(/\s/g,'').slice(-5) : '';
}
function payerLabel() {
  if (State.selPayer === null) return '—';
  return [Config.p1, Config.p2][State.selPayer];
}
function typeClass() { return State.type === 'exp' ? 'exp' : 'inc'; }
function getTWDAmount() {
  if (State.curCode === 'TWD') return parseInt(State.amtStr) || 0;
  if (State.twdManual) return parseInt(State.twdManual) || 0;
  if (State.rates[State.curCode]) return Math.round((parseInt(State.amtStr) || 0) / State.rates[State.curCode]);
  return parseInt(State.amtStr) || 0;
}
 
function infoPill(id, parts) {
  document.getElementById(id).innerHTML = `
    <div class="ip-amt ${typeClass()}">${amtLabel()}</div>
    <span class="ip-sep">·</span>
    <div class="ip-meta">${parts.join(' · ')}</div>`;
}
 
// ── Navigation ────────────────────────────────────────────
function go(n) {
  if (n === 2 && (!State.amtStr || parseInt(State.amtStr) <= 0)) return toast('請先輸入金額', 'err');
  const cur = document.getElementById('sp' + State.step);
  cur.classList.add('out'); cur.classList.remove('on');
  setTimeout(() => cur.classList.remove('out'), 260);
  document.getElementById('sp' + n).classList.add('on');
  State.step = n;
  if (n === 2) { renderPayerGrid(); infoPill('pill2', [getDateStr()]); }
  if (n === 3) { renderBigGrid(); infoPill('pill3', [getDateStr(), payerLabel()]); }
  if (n === 4) { renderSubGrid(); infoPill('pill4', [getDateStr(), payerLabel()]); }
  if (n === 5) { infoPill('pill5', [catLabel(), payerLabel()]); renderCardChips(); }
  if (n === 6) { renderConfirm(); }
}
 
function renderConfirm() {
  const twd = getTWDAmount(), isForeign = State.curCode !== 'TWD';
  const last5 = cardLast5();
  document.getElementById('cfCard').innerHTML = `
    <div class="cf-row"><span class="cf-lbl">類型</span><span class="cf-val ${typeClass()}">${State.type==='exp'?'💸 支出':'💚 收入'}</span></div>
    <div class="cf-row"><span class="cf-lbl">金額</span><span class="cf-val ${typeClass()}">${amtLabel()}</span></div>
    ${isForeign ? `<div class="cf-row"><span class="cf-lbl">台幣</span><span class="cf-val">NT$${twd.toLocaleString('zh-TW')}</span></div>` : ''}
    <div class="cf-row"><span class="cf-lbl">日期</span><span class="cf-val">${getDateStr()}</span></div>
    <div class="cf-row"><span class="cf-lbl">誰</span><span class="cf-val">${payerLabel()}</span></div>
    <div class="cf-row"><span class="cf-lbl">類別</span><span class="cf-val">${catLabel()}</span></div>
    <div class="cf-row"><span class="cf-lbl">${State.type==='exp'?'卡別':'帳戶'}</span><span class="cf-val">${cardLabel()}${last5?' <span style="color:var(--ink2);font-size:12px">'+last5+'</span>':''}</span></div>`;
}
 
// ── Submit ────────────────────────────────────────────────
async function doSubmit() {
  if (!Config.scriptUrl) return toast('請先設定 Script URL', 'err');
  const btn = document.getElementById('submitBtn');
  btn.textContent = '傳送中...'; btn.style.pointerEvents = 'none';
  const twd = getTWDAmount();
  const payload = {
    type: State.type, amount: parseInt(State.amtStr), currency: State.curCode,
    twdAmount: twd, card: cardLabel(), category: catLabel(),
    payer: payerLabel(), note: document.getElementById('noteIn').value.trim(),
    date: getDateStr()
  };
  const success = await sendToSheet(payload);
  if (success) {
    cacheRecord(payload);
    showSucc();
  } else {
    toast('已存入離線佇列，連線後自動同步', 'ok');
    queueOffline(payload);
    cacheRecord(payload);
    showSucc();
  }
  btn.textContent = '記錄這筆 ✓'; btn.style.pointerEvents = '';
}
 
async function sendToSheet(payload) {
  try {
    const res = await fetch(Config.scriptUrl, { method: 'POST', body: JSON.stringify(payload) });
    const data = await res.json();
    return data.success === true;
  } catch(e) { return false; }
}
 
function cacheRecord(payload) {
  const key = payload.date;
  if (!State.recData[key]) State.recData[key] = [];
  State.recData[key].unshift({ ...payload });
}
 
function showSucc() {
  document.getElementById('succIc').textContent = State.type === 'exp' ? '💸' : '💚';
  document.getElementById('succT').textContent = State.type === 'exp' ? '支出記錄成功！' : '收入記錄成功！';
  document.getElementById('succS').textContent = `${payerLabel()}  ·  ${catLabel()}`;
  const ov = document.getElementById('succOv'); ov.classList.add('on');
  setTimeout(() => { ov.classList.remove('on'); resetAll(); }, 1600);
}
 
function resetAll() {
  State.amtStr = ''; State.selBig = null; State.selSub = null;
  State.selCard = null; State.selPayer = null; State.dateOffset = 0; State.twdManual = '';
  document.getElementById('noteIn').value = '';
  document.getElementById('twdInput').value = '';
  updateAmt(); updateDate(); renderCardChips();
  document.getElementById('cta1').classList.add('dim');
  document.querySelectorAll('.sp').forEach(p => p.classList.remove('on', 'out'));
  document.getElementById('sp1').classList.add('on'); State.step = 1;
}
 
// ── Offline Queue ─────────────────────────────────────────
function queueOffline(payload) {
  State.offlineQueue.push({ ...payload, _queued: Date.now() });
  localStorage.setItem('offlineQueue', JSON.stringify(State.offlineQueue));
}
 
function setupOfflineSync() {
  window.addEventListener('online', flushOfflineQueue);
  if (navigator.onLine) flushOfflineQueue();
}
 
async function flushOfflineQueue() {
  if (!Config.scriptUrl || !State.offlineQueue.length) return;
  const remaining = [];
  for (const payload of State.offlineQueue) {
    const ok = await sendToSheet(payload);
    if (!ok) remaining.push(payload);
  }
  State.offlineQueue = remaining;
  localStorage.setItem('offlineQueue', JSON.stringify(remaining));
  if (remaining.length === 0 && State.offlineQueue.length > 0) toast('離線記錄已同步！', 'ok');
}
 
// ── Records Screen ────────────────────────────────────────
function setRecView(v) {
  State.recView = v;
  document.getElementById('rvt-cal').classList.toggle('on', v === 'cal');
  document.getElementById('rvt-list').classList.toggle('on', v === 'list');
  document.getElementById('rec-cal-view').style.display = v === 'cal' ? 'block' : 'none';
  document.getElementById('rec-list-view').style.display = v === 'list' ? 'block' : 'none';
  renderRecords();
}
 
function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').style.display = 'none';
  State.searchQ = ''; setRecView('cal'); renderRecords();
}
 
function shiftRecMonth(n) {
  State.recMonth += n;
  if (State.recMonth > 11) { State.recMonth = 0; State.recYear++; }
  if (State.recMonth < 0) { State.recMonth = 11; State.recYear--; }
  State.selRecDay = null;
  loadRecMonth();
}
 
async function loadRecMonth() {
  updateRecMonthNav();
  if (!Config.scriptUrl) { renderRecCalendar(); return; }
  try {
    const res = await fetch(`${Config.scriptUrl}?action=getMonthRecords&year=${State.recYear}&month=${State.recMonth + 1}`);
    const d = await res.json();
    State.recData = {};
    (d.records || []).forEach(r => {
      if (!State.recData[r.date]) State.recData[r.date] = [];
      State.recData[r.date].push(r);
    });
  } catch(e) {}
  renderRecCalendar();
  renderRecords();
  updateRecMonthNav();
}
 
function updateRecMonthNav() {
  const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  document.getElementById('recMonthLbl').textContent = `${State.recYear}年 ${months[State.recMonth]}`;
  let total = 0;
  Object.values(State.recData).forEach(recs => recs.forEach(r => {
    if (r.type === 'exp' || r.type === '支出') total += parseFloat(r.twdAmount) || 0;
  }));
  document.getElementById('recMonthSum').textContent = total > 0 ? '支出 $' + Math.round(total).toLocaleString('zh-TW') : '';
}
 
function renderRecCalendar() {
  const today = new Date();
  const first = new Date(State.recYear, State.recMonth, 1);
  const last = new Date(State.recYear, State.recMonth + 1, 0);
  const startDow = first.getDay(); let html = '';
  const prevLast = new Date(State.recYear, State.recMonth, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) html += `<div class="cv-day other-month"><div class="cv-d-num">${prevLast - i}</div></div>`;
  for (let day = 1; day <= last.getDate(); day++) {
    const d = new Date(State.recYear, State.recMonth, day);
    const dateKey = `${State.recYear}/${String(State.recMonth+1).padStart(2,'0')}/${String(day).padStart(2,'0')}`;
    const isToday = d.toDateString() === today.toDateString();
    const isSel = State.selRecDay === dateKey;
    const recs = State.recData[dateKey] || [];
    const hasExp = recs.some(r => r.type === 'exp' || r.type === '支出');
    const hasInc = recs.some(r => r.type === 'inc' || r.type === '收入');
    const total = recs.reduce((a, r) => (r.type==='exp'||r.type==='支出') ? a + (parseFloat(r.twdAmount)||0) : a, 0);
    let cls = 'cv-day' + (recs.length ? ' has-data' : '') + (isToday ? ' today' : '') + (isSel ? ' sel-day' : '');
    html += `<div class="${cls}" onclick="pickRecDay('${dateKey}')">
      <div class="cv-d-num">${day}</div>
      ${hasExp ? '<div class="cv-dot"></div>' : ''}
      ${hasInc ? '<div class="cv-dot inc"></div>' : ''}
      ${total > 0 ? `<div class="cv-day-amt">${total >= 10000 ? (total/1000).toFixed(0)+'k' : total.toLocaleString('zh-TW')}</div>` : ''}
    </div>`;
  }
  const rem = 42 - (startDow + last.getDate());
  for (let i = 1; i <= rem; i++) html += `<div class="cv-day other-month"><div class="cv-d-num">${i}</div></div>`;
  document.getElementById('cvDays').innerHTML = html;
  renderDayDetail();
}
 
function pickRecDay(dateKey) {
  State.selRecDay = State.selRecDay === dateKey ? null : dateKey;
  renderRecCalendar();
}
 
function renderDayDetail() {
  const wrap = document.getElementById('dayDetailWrap');
  if (!State.selRecDay || !(State.recData[State.selRecDay] || []).length) { wrap.innerHTML = ''; return; }
  const recs = State.recData[State.selRecDay] || [];
  const total = recs.reduce((a, r) => (r.type==='exp'||r.type==='支出') ? a + (parseFloat(r.twdAmount)||0) : a, 0);
  const parts = State.selRecDay.split('/');
  const dateLabel = `${parts[1]}月${parts[2]}日`;
  wrap.innerHTML = `<div class="day-detail">
    <div class="dd-header">
      <div class="dd-date">${dateLabel}</div>
      <div class="dd-total">${total > 0 ? '支出 $' + Math.round(total).toLocaleString('zh-TW') : ''}</div>
      <div class="dd-close" onclick="State.selRecDay=null;renderRecCalendar()">✕</div>
    </div>
    ${recs.map(r => recItemHTML(r)).join('')}
  </div>`;
}
 
function recItemHTML(r) {
  const isExp = r.type === 'exp' || r.type === '支出';
  const amt = parseFloat(r.twdAmount || r.amount) || 0;
  const cat = r.category || '';
  const emoji = cat.split(' ')[0] || '💰';
  return `<div class="rec-item">
    <div class="rec-item-icon">${emoji}</div>
    <div class="rec-item-info">
      <div class="rec-item-cat">${cat}</div>
      <div class="rec-item-sub">${[r.payer, r.card, r.note].filter(Boolean).join(' · ')}</div>
    </div>
    <div class="rec-item-amt ${isExp?'exp':'inc'}">${isExp?'-':'+'} NT$${Math.round(amt).toLocaleString('zh-TW')}</div>
  </div>`;
}
 
function renderRecords() {
  if (State.recView === 'list' || State.searchQ) renderRecList();
}
 
function renderRecList() {
  const container = document.getElementById('recListAll');
  let allRecs = [];
  Object.entries(State.recData).forEach(([date, recs]) => recs.forEach(r => allRecs.push({ ...r, date })));
  if (State.searchQ) {
    const q = State.searchQ.toLowerCase();
    allRecs = allRecs.filter(r =>
      (r.category||'').toLowerCase().includes(q) ||
      (r.note||'').toLowerCase().includes(q) ||
      String(r.twdAmount||r.amount||'').includes(q) ||
      (r.payer||'').toLowerCase().includes(q) ||
      (r.card||'').toLowerCase().includes(q)
    );
  }
  allRecs.sort((a, b) => b.date.localeCompare(a.date));
  if (!allRecs.length) { container.innerHTML = `<div class="no-rec">${State.searchQ?'找不到符合的記錄':'本月尚無記錄'}</div>`; return; }
  const byDate = {};
  allRecs.forEach(r => { if (!byDate[r.date]) byDate[r.date] = []; byDate[r.date].push(r); });
  container.innerHTML = Object.entries(byDate).sort((a,b)=>b[0].localeCompare(a[0])).map(([date, recs]) => {
    const parts = date.split('/');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
    const w = ['日','一','二','三','四','五','六'][d.getDay()];
    const lbl = `${parts[1]}/${parts[2]} 週${w}`;
    const total = recs.reduce((a,r)=>(r.type==='exp'||r.type==='支出')?a+(parseFloat(r.twdAmount)||0):a, 0);
    return `<div class="rec-date-group">
      <div class="rec-date-lbl">${lbl}<span>${total>0?'$'+Math.round(total).toLocaleString('zh-TW'):''}</span></div>
      ${recs.map(r=>recItemHTML(r)).join('')}
    </div>`;
  }).join('');
}
 
// ── Stats ─────────────────────────────────────────────────
function switchStatsTab(tab) {
  State.statsTab = tab;
  ['overview','trend','category','payer'].forEach(t => {
    document.getElementById('tab-' + t).style.display = t === tab ? 'block' : 'none';
    document.getElementById('stab-' + t).classList.toggle('on', t === tab);
  });
}
 
function switchStatsPeriod(p) {
  State.statsPeriod = p;
  ['month','year','period','filter'].forEach(x => document.getElementById('speriod-'+x).classList.toggle('on', x === p));
  if (p === 'period') { document.getElementById('periodPickerWrap').style.display = 'flex'; }
  else { document.getElementById('periodPickerWrap').style.display = 'none'; }
  if (p === 'filter') { document.getElementById('filterModal').classList.add('on'); }
  else { loadStats(); }
}
 
async function loadStats() {
  if (!Config.scriptUrl) return;
  document.getElementById('statsLoading').style.display = 'block';
  try {
    let url = Config.scriptUrl + '?action=getStats&period=' + State.statsPeriod;
    if (State.statsPeriod === 'period' && State.statsCustomStart && State.statsCustomEnd) {
      url += `&start=${State.statsCustomStart}&end=${State.statsCustomEnd}`;
    }
    if (State.statsPeriod === 'filter') {
      if (State.statsFilterType !== 'all') url += '&filterType=' + State.statsFilterType;
      if (State.statsFilterCat) url += '&filterCat=' + encodeURIComponent(State.statsFilterCat);
      if (State.statsFilterPayer) url += '&filterPayer=' + encodeURIComponent(State.statsFilterPayer);
    }
    const res = await fetch(url);
    const d = await res.json();
    State.statsCache = d;
    renderOverview(d); renderTrend(d); renderCategory(d); renderPayerTab(d);
  } catch(e) { toast('載入失敗', 'err'); }
  document.getElementById('statsLoading').style.display = 'none';
}
 
function calcDailyAvg(total, d) {
  if (!d || d <= 0) return 0;
  return Math.round(total / d);
}
 
function getPeriodDays() {
  const now = new Date();
  if (State.statsPeriod === 'month') return new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  if (State.statsPeriod === 'year') return 365;
  if (State.statsPeriod === 'period' && State.statsCustomStart && State.statsCustomEnd) {
    const s = new Date(State.statsCustomStart), e = new Date(State.statsCustomEnd);
    return Math.max(1, Math.round((e-s)/(1000*60*60*24))+1);
  }
  return 30;
}
 
function renderOverview(d) {
  const inc = d.totalIncome||0, exp = d.totalExpense||0, bal = inc - exp;
  const days = getPeriodDays();
  document.getElementById('sInc').textContent = '$' + inc.toLocaleString('zh-TW');
  document.getElementById('sIncCnt').textContent = `${d.incomeCount||0} 筆`;
  document.getElementById('sExp').textContent = '$' + exp.toLocaleString('zh-TW');
  document.getElementById('sExpCnt').textContent = `${d.expenseCount||0} 筆`;
  const balEl = document.getElementById('sBal');
  balEl.textContent = (bal>=0?'+':'') + '$' + Math.abs(bal).toLocaleString('zh-TW');
  balEl.className = 'bal-num ' + (bal>=0?'pos':'neg');
  document.getElementById('sBalSub').textContent = bal>=0?'本月結餘為正 💪':'本月支出大於收入';
  document.getElementById('sTotalExp').textContent = '合計: ' + exp.toLocaleString('zh-TW');
  document.getElementById('sAvgExp').textContent = '平均每天: ' + calcDailyAvg(exp, days).toLocaleString('zh-TW');
  destroyChart('barChart');
  const ctx = document.getElementById('barChart').getContext('2d');
  State.charts.barChart = new Chart(ctx, {
    type: 'bar',
    data: { labels:['收入','支出'], datasets:[{ data:[inc,exp], backgroundColor:['#6BCB77','#FF6B6B'], borderRadius:8, borderSkipped:false }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#888480'}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#888480',callback:v=>'$'+v.toLocaleString()}}} }
  });
  renderBarList('sCatBars', d.byCategory||{}, CHART_COLORS);
  renderBarList('sIncBars', d.byIncomeCat||{}, ['#6BCB77','#4CC9F0','#FFD93D','#C77DFF']);
}
 
function renderTrend(d) {
  const monthly = d.monthlyTrend || [];
  const labels = monthly.map(m => m.month);
  destroyChart('trendChart');
  const ctx1 = document.getElementById('trendChart').getContext('2d');
  State.charts.trendChart = new Chart(ctx1, {
    type: 'line',
    data: { labels, datasets:[{ label:'支出', data:monthly.map(m=>m.expense||0), borderColor:'#FF6B6B', backgroundColor:'rgba(255,107,107,0.15)', tension:0.4, fill:true, pointBackgroundColor:'#FF6B6B', pointRadius:5 }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{labels:{color:'#ccc'}}}, scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#888480'}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#888480',callback:v=>'$'+v.toLocaleString()}}} }
  });
  destroyChart('incExpChart');
  const ctx2 = document.getElementById('incExpChart').getContext('2d');
  State.charts.incExpChart = new Chart(ctx2, {
    type: 'bar',
    data: { labels, datasets:[
      { label:'收入', data:monthly.map(m=>m.income||0), backgroundColor:'#6BCB77', borderRadius:4 },
      { label:'支出', data:monthly.map(m=>m.expense||0), backgroundColor:'#FF6B6B', borderRadius:4 }
    ]},
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{labels:{color:'#ccc'}}}, scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#888480'}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#888480',callback:v=>'$'+v.toLocaleString()}}} }
  });
}
 
function renderCategory(d) {
  const cats = d.byCategory||{};
  const sorted = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const total = sorted.reduce((a,[,v])=>a+v,0)||1;
  destroyChart('pieChart');
  if (sorted.length) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    State.charts.pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels:sorted.map(([l])=>l), datasets:[{ data:sorted.map(([,v])=>v), backgroundColor:CHART_COLORS.slice(0,sorted.length), borderWidth:2, borderColor:'#181818' }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } } }
    });
  }
  // Legend as list (like Spendee)
  document.getElementById('pieChartLegend').innerHTML = sorted.map(([lbl,amt],i)=>`
    <div class="legend-row">
      <span class="legend-dot" style="background:${CHART_COLORS[i]}"></span>
      <span class="legend-lbl">${lbl}</span>
      <span class="legend-pct">${(amt/total*100).toFixed(1)}%</span>
      <span class="legend-amt">$${Math.round(amt).toLocaleString('zh-TW')}</span>
    </div>`).join('');
  const days = getPeriodDays();
  const expTotal = d.totalExpense||0;
  document.getElementById('catTotal').textContent = '合計: ' + expTotal.toLocaleString('zh-TW');
  document.getElementById('catAvg').textContent = '平均每天: ' + calcDailyAvg(expTotal,days).toLocaleString('zh-TW');
}
 
function renderPayerTab(d) {
  const byPayer = d.byPayer||{};
  const sorted = Object.entries(byPayer).sort((a,b)=>b[1]-a[1]);
  const payerColors = ['#FFD93D','#C77DFF','#4CC9F0','#6BCB77'];
  destroyChart('payerChart');
  if (sorted.length) {
    const ctx = document.getElementById('payerChart').getContext('2d');
    State.charts.payerChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels:sorted.map(([l])=>l), datasets:[{ data:sorted.map(([,v])=>v), backgroundColor:payerColors, borderWidth:2, borderColor:'#181818' }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } } }
    });
  }
  const total = sorted.reduce((a,[,v])=>a+v,0)||1;
  document.getElementById('payerLegend').innerHTML = sorted.map(([lbl,amt],i)=>`
    <div class="legend-row">
      <span class="legend-dot" style="background:${payerColors[i]}"></span>
      <span class="legend-lbl">${lbl}</span>
      <span class="legend-pct">${(amt/total*100).toFixed(1)}%</span>
      <span class="legend-amt">$${Math.round(amt).toLocaleString('zh-TW')}</span>
    </div>`).join('');
}
 
function renderBarList(id, obj, colors) {
  const el = document.getElementById(id);
  const sorted = Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const max = sorted[0]?.[1] || 1;
  if (!sorted.length) { el.innerHTML = '<div class="no-data">暫無資料</div>'; return; }
  el.innerHTML = sorted.map(([lbl,amt],i)=>`
    <div class="bar-row">
      <div class="bar-lbl">${lbl}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(amt/max*100).toFixed(0)}%;background:${colors[i%colors.length]}"></div></div>
      <div class="bar-val">$${Math.round(amt).toLocaleString('zh-TW')}</div>
    </div>`).join('');
}
 
function destroyChart(id) { if (State.charts[id]) { State.charts[id].destroy(); delete State.charts[id]; } }
 
// ── Filter Modal ──────────────────────────────────────────
function openFilterModal() { document.getElementById('filterModal').classList.add('on'); }
function closeFilterModal() { document.getElementById('filterModal').classList.remove('on'); }
function applyFilter() {
  State.statsFilterType = document.getElementById('fTypeAll').checked ? 'all' : (document.getElementById('fTypeExp').checked ? 'exp' : 'inc');
  State.statsFilterCat = document.getElementById('fCat').value || null;
  State.statsFilterPayer = document.getElementById('fPayer').value || null;
  closeFilterModal(); loadStats();
}
function clearFilter() {
  State.statsFilterType = 'all'; State.statsFilterCat = null; State.statsFilterPayer = null;
  document.getElementById('fTypeAll').checked = true;
  document.getElementById('fCat').value = '';
  document.getElementById('fPayer').value = '';
}
 
// ── Budget ────────────────────────────────────────────────
function saveBudget() {
  const monthly = parseInt(document.getElementById('budgetMonthly').value) || 0;
  State.budgets = { monthly };
  localStorage.setItem('budgets', JSON.stringify(State.budgets));
  toast('預算已儲存', 'ok');
}
 
// ── Fixed Expenses ────────────────────────────────────────
function addFixedExpense() {
  const name = document.getElementById('fixedName').value.trim();
  const amt = parseInt(document.getElementById('fixedAmt').value) || 0;
  const day = parseInt(document.getElementById('fixedDay').value) || 1;
  if (!name || !amt) return toast('請填寫名稱和金額', 'err');
  State.fixedExpenses.push({ name, amt, day, id: Date.now() });
  localStorage.setItem('fixedExpenses', JSON.stringify(State.fixedExpenses));
  renderFixedList();
  document.getElementById('fixedName').value = '';
  document.getElementById('fixedAmt').value = '';
  toast('固定支出已新增', 'ok');
}
function deleteFixed(id) {
  State.fixedExpenses = State.fixedExpenses.filter(f => f.id !== id);
  localStorage.setItem('fixedExpenses', JSON.stringify(State.fixedExpenses));
  renderFixedList();
}
function renderFixedList() {
  const el = document.getElementById('fixedList');
  if (!State.fixedExpenses.length) { el.innerHTML = '<div class="no-data">尚無固定支出</div>'; return; }
  el.innerHTML = State.fixedExpenses.map(f => `
    <div class="fixed-item">
      <div class="fixed-info"><div class="fixed-name">${f.name}</div><div class="fixed-meta">每月 ${f.day} 日</div></div>
      <div class="fixed-amt">NT$${f.amt.toLocaleString('zh-TW')}</div>
      <div class="fixed-del" onclick="deleteFixed(${f.id})">✕</div>
    </div>`).join('');
}
 
// ── Reminder ─────────────────────────────────────────────
function setupReminder() {
  const time = Config.reminderTime;
  if (!time || !('Notification' in window)) return;
  if (Notification.permission === 'granted') scheduleReminder(time);
}
function saveReminder() {
  const time = document.getElementById('reminderTime').value;
  localStorage.setItem('reminderTime', time);
  Notification.requestPermission().then(p => {
    if (p === 'granted') { scheduleReminder(time); toast('提醒已設定', 'ok'); }
    else toast('請允許通知權限', 'err');
  });
}
function scheduleReminder(time) {
  const [h, m] = time.split(':').map(Number);
  const now = new Date(), target = new Date();
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const delay = target - now;
  setTimeout(() => {
    new Notification('記帳提醒', { body: '別忘了記錄今天的支出！', icon: '💰' });
    setInterval(() => new Notification('記帳提醒', { body: '別忘了記錄今天的支出！' }), 24*60*60*1000);
  }, delay);
}
 
// ── Lock System ───────────────────────────────────────────
function checkLock() {
  if (Config.lockType === 'none') return;
  showLockScreen();
}
function showLockScreen() {
  State.isLocked = true;
  document.getElementById('lockScreen').style.display = 'flex';
}
function hideLockScreen() {
  State.isLocked = false;
  document.getElementById('lockScreen').style.display = 'none';
}
function tryUnlock() {
  const input = document.getElementById('lockInput').value;
  if (input === Config.lockSecret) { hideLockScreen(); document.getElementById('lockInput').value = ''; }
  else { toast('密碼錯誤', 'err'); document.getElementById('lockInput').value = ''; }
}
function setupLock() {
  const type = document.getElementById('lockTypeSelect').value;
  const secret = document.getElementById('lockSecretInput').value;
  if (type !== 'none' && !secret) return toast('請輸入密碼', 'err');
  localStorage.setItem('lockType', type);
  localStorage.setItem('lockSecret', secret);
  toast('鎖定已設定', 'ok');
}
 
// ── Credit Cards ──────────────────────────────────────────
function openAddCardModal() {
  document.getElementById('addCardModal').classList.add('on');
  document.getElementById('newCardName').value = '';
  document.getElementById('newCardNumber').value = '';
  document.getElementById('newCardExpiry').value = '';
  document.getElementById('newCardCVV').value = '';
  document.getElementById('newCardEmoji').value = '💳';
}
function closeAddCardModal() { document.getElementById('addCardModal').classList.remove('on'); }
 
function saveNewCard() {
  const name = document.getElementById('newCardName').value.trim();
  const number = document.getElementById('newCardNumber').value.replace(/\s/g,'');
  const expiry = document.getElementById('newCardExpiry').value.trim();
  const cvv = document.getElementById('newCardCVV').value.trim();
  const emoji = document.getElementById('newCardEmoji').value.trim() || '💳';
  if (!name || !number) return toast('請填寫卡片名稱和卡號', 'err');
  const cards = Config.cards;
  cards.push({ name, number: formatCardNumber(number), expiry, cvv: simpleEncrypt(cvv), emoji, id: Date.now() });
  localStorage.setItem('cardsData', JSON.stringify(cards));
  closeAddCardModal();
  renderCardsConfig();
  renderCardChips();
  toast('卡片已新增', 'ok');
}
 
function deleteCard(id) {
  const cards = Config.cards.filter(c => c.id !== id);
  localStorage.setItem('cardsData', JSON.stringify(cards));
  renderCardsConfig();
  renderCardChips();
}
 
function viewCard(id) {
  const cards = Config.cards;
  const card = cards.find(c => c.id === id);
  if (!card) return;
  // Prompt for unlock
  const pwd = prompt('請輸入密碼以查看卡片資訊：');
  if (pwd !== Config.lockSecret && Config.lockType !== 'none') return toast('密碼錯誤', 'err');
  showCardView(card);
}
 
function showCardView(card) {
  const cvv = simpleDecrypt(card.cvv || '');
  document.getElementById('cardViewModal').classList.add('on');
  document.getElementById('cardViewDisplay').innerHTML = `
    <div class="credit-card-visual">
      <div class="cc-chip">▪</div>
      <div class="cc-number">${card.number || '•••• •••• •••• ••••'}</div>
      <div class="cc-bottom">
        <div><div class="cc-label">持卡人</div><div class="cc-value">${card.name}</div></div>
        <div><div class="cc-label">有效期限</div><div class="cc-value">${card.expiry || '••/••'}</div></div>
        <div><div class="cc-label">CVV</div><div class="cc-value">${cvv || '•••'}</div></div>
      </div>
      <div class="cc-emoji">${card.emoji || '💳'}</div>
    </div>`;
}
function closeCardView() { document.getElementById('cardViewModal').classList.remove('on'); }
 
function renderCardsConfig() {
  const cards = Config.cards;
  const el = document.getElementById('cardsConfigList');
  if (!cards.length) { el.innerHTML = '<div class="no-data">尚無卡片</div>'; return; }
  el.innerHTML = cards.map(c => {
    const last4 = c.number ? c.number.replace(/\s/g,'').slice(-4) : '????';
    return `<div class="card-cfg-item">
      <span class="card-cfg-emoji">${c.emoji||'💳'}</span>
      <div class="card-cfg-info">
        <div class="card-cfg-name">${c.name}</div>
        <div class="card-cfg-num">•••• ${last4}</div>
      </div>
      <div class="card-cfg-actions">
        <span onclick="viewCard(${c.id})" class="card-cfg-btn">👁</span>
        <span onclick="deleteCard(${c.id})" class="card-cfg-btn del">✕</span>
      </div>
    </div>`;
  }).join('');
}
 
function formatCardNumber(n) {
  return n.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim();
}
 
// Simple XOR encrypt (not truly secure, but obfuscates CVV from casual view)
function simpleEncrypt(text) {
  const key = 'jzXkQ9m2';
  return btoa(text.split('').map((c,i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i%key.length))).join(''));
}
function simpleDecrypt(enc) {
  try {
    const key = 'jzXkQ9m2';
    const text = atob(enc);
    return text.split('').map((c,i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i%key.length))).join('');
  } catch(e) { return ''; }
}
 
// ── Category Editor ───────────────────────────────────────
function openCatEditor(type) {
  State._editingCatType = type;
  const cats = type === 'exp' ? Config.expCats : Config.incCats;
  renderCatEditorList(cats, type);
  document.getElementById('catEditorModal').classList.add('on');
  document.getElementById('catEditorTitle').textContent = type === 'exp' ? '編輯支出類別' : '編輯收入類別';
}
function closeCatEditor() { document.getElementById('catEditorModal').classList.remove('on'); }
function renderCatEditorList(cats, type) {
  document.getElementById('catEditorList').innerHTML = cats.map((c, i) => `
    <div class="cat-editor-item">
      <span class="ce-emoji">${c.e}</span>
      <span class="ce-name">${c.n}</span>
      <span class="ce-subs">${c.subs.length} 項細項</span>
      <span class="ce-edit" onclick="openSubEditor(${i})">✏️</span>
      <span class="ce-del" onclick="deleteCat(${i})">✕</span>
    </div>`).join('');
}
function deleteCat(i) {
  const type = State._editingCatType;
  const cats = type === 'exp' ? [...Config.expCats] : [...Config.incCats];
  cats.splice(i, 1);
  localStorage.setItem(type === 'exp' ? 'expCats' : 'incCats', JSON.stringify(cats));
  renderCatEditorList(cats, type);
}
function addCat() {
  const e = document.getElementById('newCatEmoji').value.trim() || '📦';
  const n = document.getElementById('newCatName').value.trim();
  if (!n) return toast('請輸入類別名稱', 'err');
  const type = State._editingCatType;
  const cats = type === 'exp' ? [...Config.expCats] : [...Config.incCats];
  cats.push({ e, n, subs: [{ e: '💰', n: n }] });
  localStorage.setItem(type === 'exp' ? 'expCats' : 'incCats', JSON.stringify(cats));
  renderCatEditorList(cats, type);
  document.getElementById('newCatEmoji').value = '';
  document.getElementById('newCatName').value = '';
}
function openSubEditor(catIdx) {
  State._editingCatIdx = catIdx;
  const type = State._editingCatType;
  const cats = type === 'exp' ? Config.expCats : Config.incCats;
  const cat = cats[catIdx];
  document.getElementById('subEditorTitle').textContent = `${cat.e} ${cat.n} 的細項`;
  renderSubEditorList(cat.subs, catIdx, type);
  document.getElementById('subEditorModal').classList.add('on');
}
function closeSubEditor() { document.getElementById('subEditorModal').classList.remove('on'); }
function renderSubEditorList(subs, catIdx, type) {
  document.getElementById('subEditorList').innerHTML = subs.map((s, i) => `
    <div class="cat-editor-item">
      <span class="ce-emoji">${s.e}</span>
      <span class="ce-name">${s.n}</span>
      <span class="ce-del" onclick="deleteSub(${catIdx},${i})">✕</span>
    </div>`).join('');
}
function deleteSub(catIdx, subIdx) {
  const type = State._editingCatType;
  const cats = JSON.parse(JSON.stringify(type === 'exp' ? Config.expCats : Config.incCats));
  cats[catIdx].subs.splice(subIdx, 1);
  localStorage.setItem(type === 'exp' ? 'expCats' : 'incCats', JSON.stringify(cats));
  renderSubEditorList(cats[catIdx].subs, catIdx, type);
}
function addSub() {
  const e = document.getElementById('newSubEmoji').value.trim() || '▪';
  const n = document.getElementById('newSubName').value.trim();
  if (!n) return toast('請輸入細項名稱', 'err');
  const type = State._editingCatType;
  const catIdx = State._editingCatIdx;
  const cats = JSON.parse(JSON.stringify(type === 'exp' ? Config.expCats : Config.incCats));
  cats[catIdx].subs.push({ e, n });
  localStorage.setItem(type === 'exp' ? 'expCats' : 'incCats', JSON.stringify(cats));
  renderSubEditorList(cats[catIdx].subs, catIdx, type);
  document.getElementById('newSubEmoji').value = '';
  document.getElementById('newSubName').value = '';
}
 
// ── Config UI ─────────────────────────────────────────────
function loadConfigUI() {
  document.getElementById('cfgUrl').value = Config.scriptUrl;
  document.getElementById('cfgP1').value = Config.p1;
  document.getElementById('cfgP2').value = Config.p2;
  document.getElementById('budgetMonthly').value = State.budgets.monthly || '';
  document.getElementById('reminderTime').value = Config.reminderTime;
  renderCardsConfig();
  renderFixedList();
}
function saveUrl() {
  const u = document.getElementById('cfgUrl').value.trim();
  if (!u.startsWith('https://script.google.com')) return toast('URL 格式不對', 'err');
  localStorage.setItem('su', u); toast('網址已儲存', 'ok');
}
function savePayerNames() {
  localStorage.setItem('p1', document.getElementById('cfgP1').value.trim() || '自己');
  localStorage.setItem('p2', document.getElementById('cfgP2').value.trim() || '另一半');
  toast('名稱已儲存', 'ok');
}
 
// ── Screen Switch ─────────────────────────────────────────
function switchScr(name) {
  document.querySelectorAll('.scr').forEach(s => s.classList.remove('on'));
  document.getElementById('scr-' + name).classList.add('on');
  document.querySelectorAll('.nb').forEach((b,i) => b.classList.toggle('on', ['inp','rec','stats','cfg'][i] === name));
  if (name === 'stats') loadStats();
  if (name === 'rec') { loadRecMonth(); renderRecCalendar(); }
  if (name === 'cfg') { loadConfigUI(); }
}
 
// ── Toast ─────────────────────────────────────────────────
let _toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = 'toast on' + (type ? ' ' + type : '');
  clearTimeout(_toastTimer); _toastTimer = setTimeout(() => el.classList.remove('on'), 2500);
}
