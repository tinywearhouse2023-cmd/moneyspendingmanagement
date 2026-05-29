import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, X, Trash2, Users, Receipt, Calculator, ArrowRight, Check,
  ChevronLeft, ChevronDown, Camera, Upload, Edit, Copy, CheckCheck, Archive,
  MoreHorizontal, CreditCard, UserPlus, Loader2, ScanLine, Wallet,
  ArchiveRestore, RefreshCw, AlertCircle, Image as ImageIcon, ZoomIn,
  Globe, Calendar, TrendingUp,
} from 'lucide-react';

import {
  C, FONT_DISPLAY, FONT_BODY,
  CURRENCIES, ZERO_DECIMAL, CURRENCY_ORDER,
  uid, todayStr, getCurrency, fmt,
} from './theme';

import { loadData, saveData, saveReceipt, loadReceipt, deleteReceipt } from './lib/db';
import { fetchFxRate } from './lib/fx';
import { ocrReceipt } from './lib/ocr';
import { compressImage, dataUrlToParts } from './lib/image';
import { calcBalances, calcSettlements, groupTotalConverted } from './lib/calc';

/* =========================================================
   Main App
   ========================================================= */
export default function TinySplit() {
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [nav, setNav] = useState([{ screen: 'groups' }]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      const d = await loadData();
      setContacts(d.contacts);
      setGroups(d.groups);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveData({ contacts, groups });
  }, [contacts, groups, loaded]);

  const current = nav[nav.length - 1];
  const push = (screen, params = {}) => setNav([...nav, { screen, params }]);
  const pop = () => setNav(nav.length > 1 ? nav.slice(0, -1) : nav);
  const reset = (screen, params = {}) => setNav([{ screen, params }]);
  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1800); };

  const upsertContact = (c) => {
    if (c.id && contacts.some(x => x.id === c.id)) {
      setContacts(contacts.map(x => x.id === c.id ? { ...x, ...c } : x));
    } else {
      setContacts([...contacts, { ...c, id: c.id || uid() }]);
    }
  };
  const removeContact = (id) => {
    if (groups.some(g => g.memberIds.includes(id) && !g.archived)) {
      flash('此聯絡人在使用中群組裡，無法刪除');
      return;
    }
    setContacts(contacts.filter(c => c.id !== id));
    flash('已刪除');
  };

  const createGroup = (name, memberIds, currency = 'TWD') => {
    const g = { id: uid(), name, createdAt: Date.now(), archived: false, currency, memberIds, expenses: [] };
    setGroups([g, ...groups]);
    return g.id;
  };
  const updateGroup = (id, patch) => {
    setGroups(groups.map(g => g.id === id ? { ...g, ...patch } : g));
  };
  const removeGroup = (id) => {
    const g = groups.find(x => x.id === id);
    if (g) g.expenses.forEach(e => deleteReceipt(e.id));
    setGroups(groups.filter(g => g.id !== id));
    flash('已刪除群組');
  };
  const archiveGroup = (id, archived) => {
    updateGroup(id, { archived });
    flash(archived ? '已封存' : '已還原');
  };

  const upsertExpense = (groupId, exp) => {
    const g = groups.find(x => x.id === groupId);
    if (!g) return;
    if (!exp.id) exp.id = uid();
    const exists = g.expenses.some(e => e.id === exp.id);
    const newExp = { ...exp, createdAt: exp.createdAt || Date.now() };
    const newExpenses = exists
      ? g.expenses.map(e => e.id === exp.id ? newExp : e)
      : [newExp, ...g.expenses];
    updateGroup(groupId, { expenses: newExpenses });
  };
  const removeExpense = (groupId, expId) => {
    const g = groups.find(x => x.id === groupId);
    if (!g) return;
    deleteReceipt(expId);
    updateGroup(groupId, { expenses: g.expenses.filter(e => e.id !== expId) });
  };

  const ctx = {
    contacts, groups, push, pop, reset, flash,
    upsertContact, removeContact, createGroup, updateGroup, removeGroup, archiveGroup,
    upsertExpense, removeExpense,
  };

  if (!loaded) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" style={{ color: C.muted }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full" style={{
      background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bg2} 100%)`,
      fontFamily: FONT_BODY, color: C.text
    }}>
      <div className="max-w-md mx-auto pb-24 relative">
        {current.screen === 'groups' && <GroupsScreen ctx={ctx} />}
        {current.screen === 'group' && <GroupScreen ctx={ctx} params={current.params} />}
        {current.screen === 'expense' && <ExpenseScreen ctx={ctx} params={current.params} />}
        {current.screen === 'scan' && <ScanScreen ctx={ctx} params={current.params} />}
        {current.screen === 'contacts' && <ContactsScreen ctx={ctx} />}
        {current.screen === 'contact' && <ContactFormScreen ctx={ctx} params={current.params} />}

        {(current.screen === 'groups' || current.screen === 'contacts') && (
          <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto px-5 pb-4 pt-2" style={{
            background: `linear-gradient(180deg, transparent 0%, ${C.bg2} 50%)`
          }}>
            <div className="flex rounded-full p-1" style={{
              background: C.card, border: `1px solid ${C.border}`,
              boxShadow: '0 4px 16px rgba(61,40,23,0.1)'
            }}>
              {[
                { id: 'groups', label: '群組', icon: Receipt },
                { id: 'contacts', label: '聯絡人', icon: Users },
              ].map(t => {
                const Icon = t.icon;
                const active = current.screen === t.id;
                return (
                  <button key={t.id} onClick={() => reset(t.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm transition-all"
                    style={{
                      background: active ? C.primary : 'transparent',
                      color: active ? C.primaryText : C.subtle,
                      fontWeight: active ? 600 : 500,
                    }}>
                    <Icon size={15} strokeWidth={active ? 2.5 : 2} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-24 inset-x-0 flex justify-center pointer-events-none z-50">
          <div className="px-4 py-2 rounded-full text-sm" style={{
            background: C.primary, color: C.primaryText,
            boxShadow: '0 4px 12px rgba(61,40,23,0.3)'
          }}>{toast}</div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Header
   ========================================================= */
function Header({ title, subtitle, onBack, action }) {
  return (
    <header className="px-5 pt-8 pb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {onBack && (
            <button onClick={onBack} className="p-1 -ml-1 mt-1" style={{ color: C.subtle }}>
              <ChevronLeft size={22} />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="truncate" style={{
              fontFamily: FONT_DISPLAY, fontSize: '1.65rem', fontWeight: 700,
              letterSpacing: '-0.02em', color: C.text, lineHeight: 1.2
            }}>{title}</h1>
            {subtitle && <p className="text-xs mt-1" style={{ color: C.muted }}>{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
    </header>
  );
}

/* =========================================================
   Groups Screen
   ========================================================= */
function GroupsScreen({ ctx }) {
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);

  const active = ctx.groups.filter(g => !g.archived);
  const archived = ctx.groups.filter(g => g.archived);
  const list = showArchived ? archived : active;

  return (
    <>
      <Header
        title="TinySplit"
        subtitle="跨幣別分帳 · 自動匯率 · 一鍵結算"
        action={
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold transition-transform active:scale-95"
            style={{ background: C.primary, color: C.primaryText }}>
            <Plus size={14} strokeWidth={2.5} /> 新群組
          </button>
        }
      />

      <div className="px-5">
        <div className="flex gap-2 mb-4">
          <Pill active={!showArchived} onClick={() => setShowArchived(false)}>使用中 · {active.length}</Pill>
          <Pill active={showArchived} onClick={() => setShowArchived(true)}>封存 · {archived.length}</Pill>
        </div>

        {list.length === 0 ? (
          <EmptyState icon={Receipt} title={showArchived ? '沒有封存的群組' : '還沒有群組'}
            text={showArchived ? null : '點右上「新群組」開始第一次分帳。'} />
        ) : (
          <ul className="space-y-3">
            {list.map(g => {
              const total = groupTotalConverted(g);
              const currencies = new Set(g.expenses.map(e => e.expenseCurrency || g.currency));
              const isMulti = currencies.size > 1;
              return (
                <li key={g.id} onClick={() => ctx.push('group', { groupId: g.id })}
                  className="rounded-xl p-4 cursor-pointer transition-transform active:scale-[0.99]"
                  style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold truncate" style={{ color: C.text }}>{g.name}</div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                          background: C.bg2, color: C.subtle, fontFamily: FONT_DISPLAY, fontWeight: 600
                        }}>{getCurrency(g.currency).symbol}</span>
                        {isMulti && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5" style={{
                            background: 'rgba(58,90,122,0.12)', color: C.info, fontWeight: 600
                          }}>
                            <Globe size={9} /> 多幣別
                          </span>
                        )}
                      </div>
                      <div className="text-xs mt-1" style={{ color: C.muted }}>
                        {g.memberIds.length} 人 · {g.expenses.length} 筆支出
                      </div>
                    </div>
                    <div className="text-right">
                      <div style={{
                        fontFamily: FONT_DISPLAY, fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums', color: C.text
                      }}>{fmt(total, g.currency)}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: C.muted }}>
                        {new Date(g.createdAt).toLocaleDateString('zh-TW')}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {creating && <NewGroupModal ctx={ctx} onClose={() => setCreating(false)} />}
    </>
  );
}

function NewGroupModal({ ctx, onClose }) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('TWD');
  const [selected, setSelected] = useState([]);
  const [addingContact, setAddingContact] = useState(false);
  const [quickName, setQuickName] = useState('');

  const submit = () => {
    if (!name.trim()) { ctx.flash('請輸入群組名稱'); return; }
    if (selected.length < 1) { ctx.flash('至少選擇一位成員'); return; }
    const id = ctx.createGroup(name.trim(), selected, currency);
    onClose();
    ctx.push('group', { groupId: id });
  };

  const quickAdd = () => {
    const n = quickName.trim();
    if (!n) return;
    const newC = { id: uid(), name: n, bankCode: '', bankName: '', accountNumber: '', note: '' };
    ctx.upsertContact(newC);
    setSelected([...selected, newC.id]);
    setQuickName('');
    setAddingContact(false);
  };

  return (
    <BottomSheet onClose={onClose} title="新群組">
      <Label>群組名稱</Label>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：歐洲秋遊、週末聚餐" autoFocus />

      <div className="mt-5">
        <Label>結算幣別</Label>
        <p className="text-[11px] mb-2" style={{ color: C.muted }}>
          所有支出最終會自動換算成這個幣別結算
        </p>
        <CurrencyPicker value={currency} onChange={setCurrency} />
      </div>

      <div className="flex items-center justify-between mt-5 mb-2">
        <Label className="mb-0">成員 ({selected.length})</Label>
        <button onClick={() => setAddingContact(!addingContact)}
          className="text-xs flex items-center gap-1" style={{ color: C.accent }}>
          <UserPlus size={12} /> 新增聯絡人
        </button>
      </div>

      {addingContact && (
        <div className="flex gap-2 mb-3">
          <Input value={quickName} onChange={(e) => setQuickName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && quickAdd()} placeholder="姓名" autoFocus />
          <button onClick={quickAdd} className="px-3 rounded-lg" style={{ background: C.primary, color: C.primaryText }}>
            <Check size={16} />
          </button>
        </div>
      )}

      {ctx.contacts.length === 0 ? (
        <p className="text-xs py-4 text-center" style={{ color: C.muted }}>
          還沒有聯絡人，先「新增聯絡人」加入成員
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {ctx.contacts.map(c => {
            const on = selected.includes(c.id);
            return (
              <button key={c.id}
                onClick={() => setSelected(on ? selected.filter(x => x !== c.id) : [...selected, c.id])}
                className="px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5"
                style={{
                  background: on ? C.primary : C.card, color: on ? C.primaryText : C.subtle,
                  border: `1px solid ${C.border}`, fontWeight: on ? 600 : 500
                }}>
                {on && <Check size={12} strokeWidth={3} />}
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      <button onClick={submit} className="mt-6 w-full py-3 rounded-xl font-semibold"
        style={{ background: C.primary, color: C.primaryText }}>建立群組</button>
    </BottomSheet>
  );
}

function EditGroupModal({ ctx, group, onClose }) {
  const [name, setName] = useState(group.name);
  const [currency, setCurrency] = useState(group.currency || 'TWD');

  const submit = () => {
    if (!name.trim()) { ctx.flash('請輸入群組名稱'); return; }
    ctx.updateGroup(group.id, { name: name.trim(), currency });
    ctx.flash('已更新');
    onClose();
  };

  return (
    <BottomSheet onClose={onClose} title="編輯群組">
      <Label>群組名稱</Label>
      <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <div className="mt-5">
        <Label>結算幣別</Label>
        <CurrencyPicker value={currency} onChange={setCurrency} />
        {currency !== (group.currency || 'TWD') && (
          <div className="text-xs mt-2 px-1" style={{ color: C.warn }}>
            ⚠️ 變更結算幣別後，現有支出的匯率不會自動重新計算。建議到每筆支出按「重新整理」更新匯率。
          </div>
        )}
      </div>
      <button onClick={submit} className="mt-6 w-full py-3 rounded-xl font-semibold"
        style={{ background: C.primary, color: C.primaryText }}>儲存變更</button>
    </BottomSheet>
  );
}

/* =========================================================
   Currency Picker
   ========================================================= */
function CurrencyPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CURRENCY_ORDER.map(code => {
        const cur = CURRENCIES[code];
        const on = value === code;
        return (
          <button key={code} onClick={() => onChange(code)}
            className="px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5"
            style={{
              background: on ? C.primary : C.card,
              color: on ? C.primaryText : C.subtle,
              border: `1px solid ${on ? C.primary : C.border}`,
              fontWeight: on ? 600 : 500
            }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, minWidth: '1.4rem' }}>{cur.symbol}</span>
            {code}
          </button>
        );
      })}
    </div>
  );
}

function CurrencyButton({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const cur = getCurrency(value);
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full px-3 py-2.5 rounded-lg flex items-center justify-between"
        style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }}>
        <span className="flex items-center gap-2">
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>{cur.symbol}</span>
          <span>{value}</span>
          <span style={{ color: C.muted, fontSize: '0.85rem' }}>· {cur.name}</span>
        </span>
        <ChevronDown size={16} style={{ color: C.muted }} />
      </button>
      {open && (
        <BottomSheet onClose={() => setOpen(false)} title={label || '選擇幣別'}>
          <CurrencyPicker value={value} onChange={(v) => { onChange(v); setOpen(false); }} />
        </BottomSheet>
      )}
    </>
  );
}

/* =========================================================
   Group Detail Screen
   ========================================================= */
function GroupScreen({ ctx, params }) {
  const group = ctx.groups.find(g => g.id === params.groupId);
  const [tab, setTab] = useState('expenses');
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  if (!group) {
    return <div className="p-8 text-center" style={{ color: C.muted }}>群組不存在</div>;
  }
  const total = groupTotalConverted(group);
  const contactById = (id) => ctx.contacts.find(c => c.id === id);

  return (
    <>
      <Header
        title={group.name}
        subtitle={`${group.memberIds.length} 人 · 結算 ${getCurrency(group.currency).name} · 總計 ${fmt(total, group.currency)}`}
        onBack={() => ctx.pop()}
        action={
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2" style={{ color: C.subtle }}>
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-10 w-44 rounded-xl py-1 z-20" style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  boxShadow: '0 8px 24px rgba(61,40,23,0.15)'
                }}>
                  <MenuItem onClick={() => { setMenuOpen(false); setEditing(true); }}>
                    <Edit size={14} />編輯群組
                  </MenuItem>
                  <MenuItem onClick={() => { setMenuOpen(false); ctx.archiveGroup(group.id, !group.archived); ctx.pop(); }}>
                    {group.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                    {group.archived ? '還原群組' : '封存群組'}
                  </MenuItem>
                  <MenuItem onClick={() => {
                    setMenuOpen(false);
                    if (confirm(`刪除「${group.name}」？相關收據圖片也會一併刪除，無法復原。`)) {
                      ctx.removeGroup(group.id);
                      ctx.pop();
                    }
                  }} danger><Trash2 size={14} />刪除群組</MenuItem>
                </div>
              </>
            )}
          </div>
        }
      />

      <div className="px-5">
        <div className="flex gap-2 mb-4">
          <Pill active={tab === 'expenses'} onClick={() => setTab('expenses')}>支出 · {group.expenses.length}</Pill>
          <Pill active={tab === 'settlement'} onClick={() => setTab('settlement')}>結算</Pill>
        </div>

        {tab === 'expenses' && (
          <>
            <div className="flex gap-2 mb-4">
              <button onClick={() => ctx.push('scan', { groupId: group.id })}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-transform active:scale-[0.98]"
                style={{ background: C.primary, color: C.primaryText }}>
                <ScanLine size={16} /> 拍收據
              </button>
              <button onClick={() => ctx.push('expense', { groupId: group.id })}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-transform active:scale-[0.98]"
                style={{ background: C.card, color: C.text, border: `1px solid ${C.border}` }}>
                <Edit size={16} /> 手動輸入
              </button>
            </div>

            {group.expenses.length === 0 ? (
              <EmptyState icon={Receipt} title="還沒有任何支出" text="拍張收據或手動輸入第一筆。" />
            ) : (
              <ul className="space-y-3">
                {group.expenses.map(exp => {
                  const payer = contactById(exp.payerId);
                  const expCur = exp.expenseCurrency || group.currency;
                  const isMulti = expCur !== group.currency;
                  return (
                    <li key={exp.id}
                      onClick={() => ctx.push('expense', { groupId: group.id, expenseId: exp.id })}
                      className="rounded-xl p-4 cursor-pointer transition-transform active:scale-[0.99]"
                      style={{ background: C.card, border: `1px solid ${C.border}` }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div className="font-semibold truncate" style={{ color: C.text }}>{exp.title}</div>
                            {exp.hasReceipt && <ImageIcon size={11} style={{ color: C.muted, flexShrink: 0 }} />}
                          </div>
                          <div className="text-xs mt-1" style={{ color: C.muted }}>
                            <span style={{ color: C.accent, fontWeight: 600 }}>{payer?.name || '?'}</span>
                            {' '}付款 · {exp.date} · {exp.type === 'itemized' ? `${exp.items.length} 品項` : `${exp.sharedWith.length} 人`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div style={{
                            fontFamily: FONT_DISPLAY, fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums', color: C.text
                          }}>{fmt(exp.amount, expCur)}</div>
                          {isMulti && (
                            <div className="text-[10px] mt-0.5" style={{
                              color: C.muted, fontVariantNumeric: 'tabular-nums'
                            }}>
                              ≈ {fmt(exp.amount * (exp.fxRate || 1), group.currency)}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {tab === 'settlement' && <SettlementView ctx={ctx} group={group} />}
      </div>

      {editing && <EditGroupModal ctx={ctx} group={group} onClose={() => setEditing(false)} />}
    </>
  );
}

/* =========================================================
   Settlement View
   ========================================================= */
function SettlementView({ ctx, group }) {
  const balances = useMemo(() => calcBalances(group), [group]);
  const settlements = useMemo(() => calcSettlements(balances, group.currency), [balances, group.currency]);
  const contactById = (id) => ctx.contacts.find(c => c.id === id);

  if (group.expenses.length === 0) {
    return <EmptyState icon={Calculator} title="尚無支出" text="新增支出後即可自動計算結算方案。" />;
  }

  return (
    <div className="rounded-xl p-5" style={{
      background: C.card, border: `1px solid ${C.border}`,
      boxShadow: '0 4px 16px rgba(61,40,23,0.06)'
    }}>
      <div className="text-center pb-4 mb-4" style={{ borderBottom: `2px dashed ${C.border}` }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: '0.7rem', letterSpacing: '0.3em', color: C.muted }}>
          ── SETTLEMENT · {group.currency} ──
        </div>
        <div className="mt-1 text-xs" style={{ color: C.muted }}>
          僅需 <span style={{ color: C.text, fontWeight: 700 }}>{settlements.length}</span> 筆轉帳即可結清
        </div>
      </div>

      {settlements.length === 0 ? (
        <div className="text-center py-6" style={{ color: C.muted }}>
          <Check className="mx-auto mb-2" size={28} strokeWidth={1.5} />
          <div className="text-sm">所有人已平衡</div>
        </div>
      ) : (
        <ul className="space-y-2">
          {settlements.map((s, i) => {
            const from = contactById(s.fromId);
            const to = contactById(s.toId);
            return (
              <li key={i} className="rounded-lg p-3" style={{ background: C.bg }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm" style={{ color: C.accent }}>{from?.name}</span>
                  <ArrowRight size={12} style={{ color: C.muted }} />
                  <span className="font-semibold text-sm" style={{ color: C.positive }}>{to?.name}</span>
                  <span className="ml-auto" style={{
                    fontFamily: FONT_DISPLAY, fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums', color: C.text
                  }}>{fmt(s.amount, group.currency)}</span>
                </div>
                <PayActions to={to} amount={s.amount} currency={group.currency} flash={ctx.flash}
                  onEditBank={() => ctx.push('contact', { contactId: to.id })} />
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5 pt-4" style={{ borderTop: `2px dashed ${C.border}` }}>
        <div className="text-[10px] tracking-widest uppercase mb-2" style={{ color: C.muted }}>個人結餘</div>
        <ul className="space-y-1">
          {group.memberIds.map(id => {
            const c = contactById(id);
            const decimals = ZERO_DECIMAL.has(group.currency) ? 0 : 2;
            const bal = decimals === 0 ? Math.round(balances[id] || 0) : Math.round((balances[id] || 0) * 100) / 100;
            const isPos = bal > 0.005;
            const isNeg = bal < -0.005;
            return (
              <li key={id} className="flex justify-between text-sm">
                <span style={{ color: C.text }}>{c?.name || '?'}</span>
                <span style={{
                  fontVariantNumeric: 'tabular-nums',
                  color: isPos ? C.positive : isNeg ? C.accent : C.muted,
                  fontWeight: 600
                }}>
                  {isPos && '+'}{isNeg && '-'}{fmt(Math.abs(bal), group.currency)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function PayActions({ to, amount, currency, flash, onEditBank }) {
  const hasInfo = to?.accountNumber;
  const [copied, setCopied] = useState(null);

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      flash(`已複製${label}`);
      setTimeout(() => setCopied(null), 1500);
    } catch { flash('複製失敗'); }
  };

  if (!hasInfo) {
    return (
      <button onClick={onEditBank}
        className="w-full text-xs py-2 rounded-md flex items-center justify-center gap-1"
        style={{ color: C.warn, background: 'rgba(168,117,21,0.08)' }}>
        <AlertCircle size={12} /> 未設定收款帳號 · 點此新增
      </button>
    );
  }

  const fullInfo = `${to.bankName || ''}${to.bankCode ? `(${to.bankCode})` : ''}\n帳號：${to.accountNumber}\n戶名：${to.name}\n金額：${fmt(amount, currency)}`;

  return (
    <div>
      <div className="text-[11px] mb-2 px-1" style={{ color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
        {to.bankCode && <span style={{ color: C.text, fontWeight: 600 }}>{to.bankCode}</span>}
        {to.bankName && <> · {to.bankName}</>}
        <> · {to.accountNumber}</>
      </div>
      <div className="flex gap-1.5">
        <button onClick={() => copyText(to.accountNumber, '帳號')}
          className="flex-1 text-xs py-2 rounded-md flex items-center justify-center gap-1 font-semibold"
          style={{ background: C.bg2, color: C.text }}>
          {copied === '帳號' ? <CheckCheck size={12} /> : <Copy size={12} />} 帳號
        </button>
        <button onClick={() => copyText(amount.toString(), '金額')}
          className="flex-1 text-xs py-2 rounded-md flex items-center justify-center gap-1 font-semibold"
          style={{ background: C.bg2, color: C.text }}>
          {copied === '金額' ? <CheckCheck size={12} /> : <Copy size={12} />} 金額
        </button>
        <button onClick={() => copyText(fullInfo, '完整資訊')}
          className="flex-1 text-xs py-2 rounded-md flex items-center justify-center gap-1 font-semibold"
          style={{ background: C.primary, color: C.primaryText }}>
          {copied === '完整資訊' ? <CheckCheck size={12} /> : <Wallet size={12} />} 全部
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   FX Section (in expense form)
   ========================================================= */
function FxSection({
  expenseCurrency, groupCurrency, fxRate, fxStatus, fxEffectiveDate,
  amount, onManualRate, onRefresh
}) {
  if (expenseCurrency === groupCurrency) return null;

  const decimals = ZERO_DECIMAL.has(groupCurrency) ? 0 : 2;
  const converted = (parseFloat(amount) || 0) * (fxRate || 1);

  return (
    <div className="rounded-lg p-3" style={{
      background: 'rgba(58,90,122,0.06)', border: `1px solid rgba(58,90,122,0.25)`
    }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-widest flex items-center gap-1" style={{ color: C.info }}>
          <TrendingUp size={11} /> 匯率轉換
        </div>
        <button onClick={onRefresh}
          className="p-1 rounded-md transition-transform active:scale-90"
          style={{ color: C.info }}>
          <RefreshCw size={13} />
        </button>
      </div>

      {fxStatus === 'loading' && (
        <div className="py-3 flex items-center justify-center gap-2 text-xs" style={{ color: C.muted }}>
          <Loader2 size={14} className="animate-spin" /> 查詢當日匯率中…
        </div>
      )}

      {fxStatus === 'error' && (
        <div>
          <p className="text-xs mb-2" style={{ color: C.accent }}>無法取得自動匯率，請手動輸入</p>
          <div className="flex items-center gap-1.5 text-sm">
            <span style={{ color: C.muted }}>1 {expenseCurrency} =</span>
            <input type="number" inputMode="decimal" step="0.0001"
              value={fxRate}
              onChange={(e) => onManualRate(parseFloat(e.target.value) || 0)}
              className="w-24 px-2 py-1.5 rounded-md text-sm outline-none text-center"
              style={{
                background: C.card, border: `1px solid ${C.border}`, color: C.text,
                fontFamily: FONT_DISPLAY, fontWeight: 600, fontVariantNumeric: 'tabular-nums'
              }} />
            <span style={{ color: C.muted }}>{groupCurrency}</span>
          </div>
        </div>
      )}

      {(fxStatus === 'auto' || fxStatus === 'manual') && (
        <>
          <div className="flex items-center gap-1.5 text-sm mb-1.5">
            <span style={{ color: C.muted }}>1 {expenseCurrency} =</span>
            <input type="number" inputMode="decimal" step="0.0001"
              value={fxRate}
              onChange={(e) => onManualRate(parseFloat(e.target.value) || 0)}
              className="w-24 px-2 py-1.5 rounded-md text-sm outline-none text-center"
              style={{
                background: C.card, border: `1px solid ${C.border}`, color: C.text,
                fontFamily: FONT_DISPLAY, fontWeight: 600, fontVariantNumeric: 'tabular-nums'
              }} />
            <span style={{ color: C.muted }}>{groupCurrency}</span>
          </div>
          <div className="text-[10px] mb-2" style={{ color: C.muted }}>
            {fxStatus === 'auto'
              ? `自動 · ${fxEffectiveDate || '查無日期'} 公定匯率`
              : '手動輸入'}
          </div>
          <div className="pt-2 flex items-center justify-between text-sm" style={{ borderTop: `1px dashed ${C.border}` }}>
            <span style={{ color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
              {fmt(parseFloat(amount) || 0, expenseCurrency)}
            </span>
            <ArrowRight size={12} style={{ color: C.muted }} />
            <span style={{ color: C.text, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontFamily: FONT_DISPLAY }}>
              {fmt(converted, groupCurrency)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   Expense Form Screen
   ========================================================= */
function ExpenseScreen({ ctx, params }) {
  const group = ctx.groups.find(g => g.id === params.groupId);
  const existing = params.expenseId ? group?.expenses.find(e => e.id === params.expenseId) : null;
  const prefilled = params.prefilled || null;
  const groupCurrency = group?.currency || 'TWD';

  const [title, setTitle] = useState(existing?.title || prefilled?.title || '');
  const [payerId, setPayerId] = useState(existing?.payerId || group?.memberIds[0] || '');
  const [type, setType] = useState(existing?.type || (prefilled?.items?.length ? 'itemized' : 'simple'));
  const [date, setDate] = useState(existing?.date || prefilled?.date || todayStr());
  const [expenseCurrency, setExpenseCurrency] = useState(
    existing?.expenseCurrency || prefilled?.currency || groupCurrency
  );
  const [amount, setAmount] = useState(existing?.amount?.toString() || prefilled?.total?.toString() || '');
  const [sharedWith, setSharedWith] = useState(existing?.sharedWith || group?.memberIds || []);
  const [items, setItems] = useState(
    existing?.items?.length ? existing.items :
    prefilled?.items?.length ? prefilled.items.map(it => ({ id: uid(), name: it.name, price: it.price, sharedBy: group?.memberIds || [] }))
    : []
  );
  const [tax, setTax] = useState((existing?.tax ?? prefilled?.tax ?? 0).toString());
  const [service, setService] = useState((existing?.service ?? prefilled?.service ?? 0).toString());

  // FX state
  const [fxRate, setFxRate] = useState(existing?.fxRate || 1);
  const [fxStatus, setFxStatus] = useState('same');
  const [fxEffectiveDate, setFxEffectiveDate] = useState(existing?.fxEffectiveDate || null);
  const [refreshKey, setRefreshKey] = useState(0);
  const skipFirstFx = useRef(!!existing);

  // Receipt state
  const [receiptDataUrl, setReceiptDataUrl] = useState(params.receiptDataUrl || null);
  const [showViewer, setShowViewer] = useState(false);
  const [receiptLoaded, setReceiptLoaded] = useState(!existing?.hasReceipt);
  const receiptInputRef = useRef(null);

  useEffect(() => {
    if (existing?.hasReceipt && !receiptDataUrl) {
      loadReceipt(existing.id).then(url => {
        if (url) setReceiptDataUrl(url);
        setReceiptLoaded(true);
      });
    }
  }, []);

  // FX fetching: react to date + currency changes
  useEffect(() => {
    if (expenseCurrency === groupCurrency) {
      setFxRate(1);
      setFxStatus('same');
      return;
    }

    // Skip auto-fetch on first render of an existing expense (use saved rate)
    if (skipFirstFx.current) {
      skipFirstFx.current = false;
      setFxStatus(existing?.fxSource === 'manual' ? 'manual' : 'auto');
      return;
    }

    let cancelled = false;
    setFxStatus('loading');
    fetchFxRate(date, expenseCurrency, groupCurrency)
      .then(({ rate, effectiveDate }) => {
        if (cancelled) return;
        setFxRate(Math.round(rate * 10000) / 10000);
        setFxEffectiveDate(effectiveDate);
        setFxStatus('auto');
      })
      .catch(() => {
        if (cancelled) return;
        setFxStatus('error');
      });
    return () => { cancelled = true; };
  }, [date, expenseCurrency, groupCurrency, refreshKey]);

  if (!group) return null;
  const members = group.memberIds.map(id => ctx.contacts.find(c => c.id === id)).filter(Boolean);
  const decimals = ZERO_DECIMAL.has(expenseCurrency) ? 0 : 2;

  const addItem = () => setItems([...items, { id: uid(), name: '', price: 0, sharedBy: group.memberIds }]);
  const updateItem = (id, patch) => setItems(items.map(it => it.id === id ? { ...it, ...patch } : it));
  const removeItem = (id) => setItems(items.filter(it => it.id !== id));

  const computedTotal = useMemo(() => {
    if (type === 'simple') return parseFloat(amount) || 0;
    const sum = items.reduce((s, it) => s + (parseFloat(it.price) || 0), 0);
    return sum + (parseFloat(tax) || 0) + (parseFloat(service) || 0);
  }, [type, amount, items, tax, service]);

  const handleReceiptUpload = async (file) => {
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      setReceiptDataUrl(dataUrl);
      ctx.flash('收據已加入');
    } catch {
      ctx.flash('圖片處理失敗');
    }
  };

  const submit = async () => {
    if (!title.trim()) { ctx.flash('請輸入支出名稱'); return; }
    if (!payerId) { ctx.flash('請選擇付款人'); return; }
    if (!fxRate || fxRate <= 0) { ctx.flash('請輸入有效匯率'); return; }
    const expenseId = existing?.id || uid();
    let payload;
    if (type === 'simple') {
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) { ctx.flash('請輸入有效金額'); return; }
      if (sharedWith.length === 0) { ctx.flash('至少選擇一位分擔者'); return; }
      payload = {
        id: expenseId, title: title.trim(), amount: amt, payerId,
        type: 'simple', sharedWith, items: [], tax: 0, service: 0,
        date, expenseCurrency,
        fxRate, fxSource: fxStatus === 'manual' ? 'manual' : 'auto', fxEffectiveDate,
        hasReceipt: !!receiptDataUrl,
        createdAt: existing?.createdAt,
      };
    } else {
      const cleanItems = items.filter(it => it.name.trim() && (parseFloat(it.price) > 0));
      if (cleanItems.length === 0) { ctx.flash('至少新增一個品項'); return; }
      if (cleanItems.some(it => it.sharedBy.length === 0)) { ctx.flash('每個品項至少要有一位分擔者'); return; }
      payload = {
        id: expenseId, title: title.trim(), amount: computedTotal, payerId,
        type: 'itemized',
        items: cleanItems.map(it => ({ ...it, price: parseFloat(it.price) })),
        sharedWith: [], tax: parseFloat(tax) || 0, service: parseFloat(service) || 0,
        date, expenseCurrency,
        fxRate, fxSource: fxStatus === 'manual' ? 'manual' : 'auto', fxEffectiveDate,
        hasReceipt: !!receiptDataUrl,
        createdAt: existing?.createdAt,
      };
    }
    ctx.upsertExpense(group.id, payload);
    if (receiptDataUrl) await saveReceipt(expenseId, receiptDataUrl);
    else if (existing?.hasReceipt) await deleteReceipt(expenseId);
    ctx.pop();
    ctx.flash(existing ? '已更新' : '已新增');
  };

  return (
    <>
      <Header
        title={existing ? '編輯支出' : '新增支出'}
        subtitle={`${group.name} · 結算 ${groupCurrency}`}
        onBack={() => ctx.pop()}
        action={existing && (
          <button onClick={() => {
            if (confirm('刪除這筆支出？相關收據圖片也會一併刪除。')) { ctx.removeExpense(group.id, existing.id); ctx.pop(); }
          }} className="p-2" style={{ color: C.accent }}><Trash2 size={16} /></button>
        )}
      />

      <div className="px-5 space-y-4">
        {/* Receipt */}
        <div>
          <Label>收據照片{receiptDataUrl ? '' : '（選填）'}</Label>
          {receiptDataUrl ? (
            <div className="relative rounded-lg overflow-hidden" style={{ border: `1px solid ${C.border}`, background: '#000' }}>
              <img src={receiptDataUrl} alt="receipt"
                className="w-full max-h-56 object-contain cursor-pointer"
                onClick={() => setShowViewer(true)} />
              <div className="absolute top-2 right-2 flex gap-1.5">
                <button onClick={() => setShowViewer(true)}
                  className="p-2 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                  <ZoomIn size={14} />
                </button>
                <button onClick={() => setReceiptDataUrl(null)}
                  className="p-2 rounded-full"
                  style={{ background: 'rgba(156,58,47,0.85)', color: '#fff' }}>
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : !receiptLoaded ? (
            <div className="py-4 text-center" style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: '0.5rem' }}>
              <Loader2 size={16} className="mx-auto animate-spin" style={{ color: C.muted }} />
            </div>
          ) : (
            <button onClick={() => receiptInputRef.current?.click()}
              className="w-full py-3 rounded-lg flex items-center justify-center gap-2 text-sm"
              style={{ background: C.card, border: `1px dashed ${C.border}`, color: C.muted }}>
              <ImageIcon size={14} /> 加入收據照片
            </button>
          )}
          <input ref={receiptInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => handleReceiptUpload(e.target.files?.[0])} />
        </div>

        {/* Title */}
        <div>
          <Label>項目名稱</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：晚餐、計程車" />
        </div>

        {/* Date + Currency row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label><Calendar size={10} className="inline mr-1" />消費日期</Label>
            <input type="date" value={date} max={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg outline-none"
              style={{
                background: C.card, border: `1px solid ${C.border}`, color: C.text,
                fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: '0.95rem'
              }} />
          </div>
          <div>
            <Label>消費幣別</Label>
            <CurrencyButton value={expenseCurrency} onChange={setExpenseCurrency} label="消費幣別" />
          </div>
        </div>

        {/* Payer */}
        <div>
          <Label>付款人</Label>
          <div className="flex flex-wrap gap-2">
            {members.map(m => (
              <button key={m.id} onClick={() => setPayerId(m.id)}
                className="px-3 py-1.5 rounded-full text-sm"
                style={{
                  background: payerId === m.id ? C.primary : C.card,
                  color: payerId === m.id ? C.primaryText : C.subtle,
                  border: `1px solid ${C.border}`, fontWeight: payerId === m.id ? 600 : 500
                }}>{m.name}</button>
            ))}
          </div>
        </div>

        {/* Type toggle */}
        <div>
          <div className="flex rounded-lg p-0.5" style={{ background: C.bg2 }}>
            {[
              { id: 'simple', label: '總額平分', icon: Calculator },
              { id: 'itemized', label: '品項分擔', icon: Receipt }
            ].map(t => {
              const Icon = t.icon;
              const on = type === t.id;
              return (
                <button key={t.id} onClick={() => setType(t.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs transition-all"
                  style={{
                    background: on ? C.card : 'transparent', color: on ? C.text : C.muted,
                    fontWeight: on ? 600 : 500, boxShadow: on ? '0 1px 3px rgba(61,40,23,0.1)' : 'none'
                  }}>
                  <Icon size={12} /> {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {type === 'simple' && (
          <>
            <div>
              <Label>金額 ({getCurrency(expenseCurrency).symbol} {expenseCurrency})</Label>
              <Input type="number" inputMode="decimal" step={decimals === 0 ? '1' : '0.01'}
                value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" mono />
            </div>

            <FxSection
              expenseCurrency={expenseCurrency} groupCurrency={groupCurrency}
              fxRate={fxRate} fxStatus={fxStatus} fxEffectiveDate={fxEffectiveDate}
              amount={amount}
              onManualRate={(r) => { setFxRate(r); setFxStatus('manual'); }}
              onRefresh={() => setRefreshKey(k => k + 1)}
            />

            <div>
              <div className="flex items-center justify-between">
                <Label className="mb-0">分擔者 ({sharedWith.length})</Label>
                <button onClick={() => setSharedWith(sharedWith.length === members.length ? [] : members.map(m => m.id))}
                  className="text-[11px] underline mb-1.5" style={{ color: C.accent }}>
                  {sharedWith.length === members.length ? '全部取消' : '全選'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {members.map(m => {
                  const on = sharedWith.includes(m.id);
                  return (
                    <button key={m.id}
                      onClick={() => setSharedWith(on ? sharedWith.filter(x => x !== m.id) : [...sharedWith, m.id])}
                      className="px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5"
                      style={{
                        background: on ? C.accent : C.card, color: on ? C.primaryText : C.subtle,
                        border: `1px solid ${C.border}`, fontWeight: on ? 600 : 500
                      }}>
                      {on && <Check size={12} strokeWidth={3} />}
                      {m.name}
                    </button>
                  );
                })}
              </div>
              {amount && sharedWith.length > 0 && (
                <div className="mt-2 text-xs" style={{ color: C.muted }}>
                  每人 <span style={{ color: C.text, fontWeight: 600 }}>
                    {fmt((parseFloat(amount) || 0) / sharedWith.length, expenseCurrency)}
                  </span>
                  {expenseCurrency !== groupCurrency && (
                    <> ≈ <span style={{ color: C.info, fontWeight: 600 }}>
                      {fmt((parseFloat(amount) || 0) * fxRate / sharedWith.length, groupCurrency)}
                    </span></>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {type === 'itemized' && (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="mb-0">品項 ({items.length}) · {expenseCurrency}</Label>
                <button onClick={addItem} className="text-xs flex items-center gap-1" style={{ color: C.accent }}>
                  <Plus size={12} /> 新增品項
                </button>
              </div>
              {items.length === 0 ? (
                <div className="text-xs py-6 text-center rounded-lg"
                  style={{ background: C.card, border: `1px dashed ${C.border}`, color: C.muted }}>
                  點「新增品項」開始
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((it, idx) => (
                    <ItemRow key={it.id} item={it} index={idx} members={members} decimals={decimals}
                      onChange={(p) => updateItem(it.id, p)} onRemove={() => removeItem(it.id)} />
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>稅金</Label>
                <Input type="number" inputMode="decimal" step={decimals === 0 ? '1' : '0.01'}
                  value={tax} onChange={(e) => setTax(e.target.value)} placeholder="0" mono />
              </div>
              <div>
                <Label>服務費</Label>
                <Input type="number" inputMode="decimal" step={decimals === 0 ? '1' : '0.01'}
                  value={service} onChange={(e) => setService(e.target.value)} placeholder="0" mono />
              </div>
            </div>
            <div className="text-xs px-1" style={{ color: C.muted }}>
              稅金與服務費依每人品項小計按比例分攤
            </div>

            <div className="rounded-lg p-3" style={{ background: C.bg2 }}>
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase tracking-widest" style={{ color: C.muted }}>合計</span>
                <span style={{
                  fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '1.1rem',
                  fontVariantNumeric: 'tabular-nums', color: C.text
                }}>{fmt(computedTotal, expenseCurrency)}</span>
              </div>
              {expenseCurrency !== groupCurrency && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>結算幣別</span>
                  <span style={{
                    fontFamily: FONT_DISPLAY, fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums', color: C.info
                  }}>≈ {fmt(computedTotal * fxRate, groupCurrency)}</span>
                </div>
              )}
            </div>

            <FxSection
              expenseCurrency={expenseCurrency} groupCurrency={groupCurrency}
              fxRate={fxRate} fxStatus={fxStatus} fxEffectiveDate={fxEffectiveDate}
              amount={computedTotal}
              onManualRate={(r) => { setFxRate(r); setFxStatus('manual'); }}
              onRefresh={() => setRefreshKey(k => k + 1)}
            />
          </>
        )}

        <button onClick={submit} className="w-full py-3 rounded-xl font-semibold mt-2"
          style={{ background: C.primary, color: C.primaryText }}>
          {existing ? '儲存變更' : '新增支出'}
        </button>
      </div>

      {showViewer && receiptDataUrl && (
        <ReceiptViewer src={receiptDataUrl} onClose={() => setShowViewer(false)} />
      )}
    </>
  );
}

function ItemRow({ item, index, members, decimals, onChange, onRemove }) {
  return (
    <li className="rounded-lg p-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div className="flex gap-2 mb-2">
        <input value={item.name} onChange={(e) => onChange({ name: e.target.value })}
          placeholder={`品項 ${index + 1}`}
          className="flex-1 px-2 py-1.5 rounded-md text-sm outline-none"
          style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
        <input type="number" inputMode="decimal" step={decimals === 0 ? '1' : '0.01'}
          value={item.price}
          onChange={(e) => onChange({ price: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
          placeholder="價格"
          className="w-24 px-2 py-1.5 rounded-md text-sm outline-none text-right"
          style={{
            background: C.bg, border: `1px solid ${C.border}`, color: C.text,
            fontVariantNumeric: 'tabular-nums', fontFamily: FONT_DISPLAY, fontWeight: 600
          }} />
        <button onClick={onRemove} className="p-1.5" style={{ color: C.accent }}>
          <X size={14} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        <button onClick={() => onChange({ sharedBy: item.sharedBy.length === members.length ? [] : members.map(m => m.id) })}
          className="text-[10px] underline pr-2" style={{ color: C.muted }}>
          {item.sharedBy.length === members.length ? '清空' : '全選'}
        </button>
        {members.map(m => {
          const on = item.sharedBy.includes(m.id);
          return (
            <button key={m.id}
              onClick={() => onChange({ sharedBy: on ? item.sharedBy.filter(x => x !== m.id) : [...item.sharedBy, m.id] })}
              className="px-2 py-0.5 rounded-full text-xs"
              style={{
                background: on ? C.accent : C.bg, color: on ? C.primaryText : C.subtle,
                border: `1px solid ${on ? C.accent : C.border}`, fontWeight: on ? 600 : 500
              }}>{m.name}</button>
          );
        })}
      </div>
    </li>
  );
}

/* =========================================================
   Receipt Viewer (lightbox)
   ========================================================= */
function ReceiptViewer({ src, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }} onClick={onClose}>
      <button className="absolute top-6 right-6 p-2.5 rounded-full z-10"
        style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
        onClick={onClose}>
        <X size={20} />
      </button>
      <img src={src} alt="receipt"
        className="max-w-full max-h-full object-contain"
        style={{ padding: '1rem' }}
        onClick={(e) => e.stopPropagation()} />
      <div className="absolute bottom-6 inset-x-0 text-center text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
        點任意處關閉
      </div>
    </div>
  );
}

/* =========================================================
   Scan Screen
   ========================================================= */
function ScanScreen({ ctx, params }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [rawResponse, setRawResponse] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setStatus('processing');
    setError('');
    setRawResponse('');
    setShowRaw(false);
    let dataUrl = null;
    try {
      dataUrl = await compressImage(file);
      setPreview(dataUrl);
      const { data, mediaType } = dataUrlToParts(dataUrl);
      const { parsed, raw } = await ocrReceipt(data, mediaType);
      setRawResponse(raw);

      const items = (parsed.items || [])
        .map(i => ({ name: String(i.name || '').trim(), price: parseFloat(i.price) || 0 }))
        .filter(i => i.price > 0 && i.name);
      const total = parseFloat(parsed.total) || 0;
      const hasAnything = items.length > 0 || total > 0 || parsed.currency || parsed.merchant;

      if (!hasAnything) {
        setError('收據資訊不足，可能照片模糊、反光或非收據。試試更清楚的照片，或直接改用手動輸入（收據照片會保留）');
        setStatus('error');
        return;
      }

      ctx.pop();
      ctx.push('expense', {
        groupId: params.groupId,
        prefilled: {
          title: parsed.merchant || '收據',
          items,
          tax: parseFloat(parsed.tax) || 0,
          service: parseFloat(parsed.service) || 0,
          total,
          currency: parsed.currency || null,
          date: parsed.date || null,
        },
        receiptDataUrl: dataUrl,
      });
    } catch (e) {
      console.error(e);
      if (e.raw) setRawResponse(e.raw);
      setError(e.message || '辨識失敗，請重試或改用手動輸入');
      setStatus('error');
    }
  };

  const goManual = () => {
    ctx.pop();
    ctx.push('expense', {
      groupId: params.groupId,
      receiptDataUrl: preview,  // preserve image even on manual fallback
    });
  };

  return (
    <>
      <Header title="拍收據辨識" subtitle="多語言 · 自動辨識日期與幣別" onBack={() => ctx.pop()} />

      <div className="px-5">
        {status === 'idle' && (
          <div className="space-y-4">
            <div className="rounded-xl p-6 text-center" style={{
              background: C.card, border: `2px dashed ${C.border}`
            }}>
              <Globe size={32} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: C.muted }} />
              <p className="text-sm mb-1" style={{ color: C.text, fontWeight: 600 }}>多語言收據自動辨識</p>
              <p className="text-xs" style={{ color: C.muted }}>
                自動分辨品項、稅金（VAT/MwSt/TVA）、服務費、日期與幣別
              </p>
            </div>

            <input ref={cameraRef} type="file" accept="image/*" capture="environment"
              className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            <input ref={fileRef} type="file" accept="image/*"
              className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />

            <button onClick={() => cameraRef.current?.click()}
              className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              style={{ background: C.primary, color: C.primaryText }}>
              <Camera size={16} /> 開啟相機
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              style={{ background: C.card, color: C.text, border: `1px solid ${C.border}` }}>
              <Upload size={16} /> 從相簿選擇
            </button>

            <p className="text-xs text-center pt-2" style={{ color: C.muted }}>
              辨識完成後自動拉當日匯率轉換，原始照片會保留
            </p>
          </div>
        )}

        {status === 'processing' && (
          <div className="rounded-xl p-8 text-center" style={{
            background: C.card, border: `1px solid ${C.border}`
          }}>
            {preview && (
              <img src={preview} alt="receipt" className="max-h-48 mx-auto rounded-lg mb-4"
                style={{ border: `1px solid ${C.border}` }} />
            )}
            <Loader2 size={28} className="mx-auto mb-3 animate-spin" style={{ color: C.primary }} />
            <p className="text-sm font-semibold" style={{ color: C.text }}>辨識中…</p>
            <p className="text-xs mt-1" style={{ color: C.muted }}>解析品項、稅金、日期與幣別</p>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-xl p-5" style={{
            background: C.card, border: `1px solid ${C.accent}`
          }}>
            <AlertCircle size={26} className="mx-auto mb-3" style={{ color: C.accent }} />
            <p className="text-sm mb-4 text-center" style={{ color: C.text, whiteSpace: 'pre-wrap' }}>{error}</p>
            <div className="flex gap-2 mb-3">
              <button onClick={() => { setStatus('idle'); setError(''); setPreview(null); setRawResponse(''); }}
                className="flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ background: C.bg2, color: C.text }}>
                <RefreshCw size={12} className="inline mr-1" /> 重試
              </button>
              <button onClick={goManual}
                className="flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ background: C.primary, color: C.primaryText }}>
                改手動輸入
              </button>
            </div>
            {rawResponse && (
              <div className="mt-3 pt-3" style={{ borderTop: `1px dashed ${C.border}` }}>
                <button onClick={() => setShowRaw(!showRaw)}
                  className="text-[11px] flex items-center gap-1 mx-auto" style={{ color: C.muted }}>
                  <ChevronDown size={11} style={{ transform: showRaw ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  {showRaw ? '隱藏' : '查看'}模型實際回應（除錯）
                </button>
                {showRaw && (
                  <pre className="text-[10px] text-left mt-2 p-3 rounded overflow-auto max-h-48"
                    style={{
                      background: C.bg, color: C.subtle,
                      fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                    }}>
                    {rawResponse}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* =========================================================
   Contacts
   ========================================================= */
function ContactsScreen({ ctx }) {
  return (
    <>
      <Header
        title="聯絡人"
        subtitle={`${ctx.contacts.length} 位 · 含匯款資訊一鍵複製`}
        action={
          <button onClick={() => ctx.push('contact', {})}
            className="flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold transition-transform active:scale-95"
            style={{ background: C.primary, color: C.primaryText }}>
            <Plus size={14} strokeWidth={2.5} /> 新增
          </button>
        }
      />

      <div className="px-5">
        {ctx.contacts.length === 0 ? (
          <EmptyState icon={Users} title="還沒有聯絡人"
            text="新增聯絡人並儲存帳號資訊，結算時就能一鍵複製匯款。" />
        ) : (
          <ul className="space-y-2">
            {ctx.contacts.map(c => (
              <li key={c.id} onClick={() => ctx.push('contact', { contactId: c.id })}
                className="rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-transform"
                style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                  style={{ background: C.primary, color: C.primaryText, fontFamily: FONT_DISPLAY }}>
                  {c.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate" style={{ color: C.text }}>{c.name}</div>
                  <div className="text-xs mt-0.5 truncate" style={{ color: C.muted }}>
                    {c.accountNumber
                      ? `${c.bankName || c.bankCode || '銀行'} · ${c.accountNumber}`
                      : <span style={{ color: C.warn }}>尚未設定帳號</span>}
                  </div>
                </div>
                {c.accountNumber && <CreditCard size={14} style={{ color: C.muted }} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function ContactFormScreen({ ctx, params }) {
  const existing = params.contactId ? ctx.contacts.find(c => c.id === params.contactId) : null;
  const [name, setName] = useState(existing?.name || '');
  const [bankCode, setBankCode] = useState(existing?.bankCode || '');
  const [bankName, setBankName] = useState(existing?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(existing?.accountNumber || '');
  const [note, setNote] = useState(existing?.note || '');

  const submit = () => {
    if (!name.trim()) { ctx.flash('請輸入姓名'); return; }
    ctx.upsertContact({
      id: existing?.id, name: name.trim(),
      bankCode: bankCode.trim(), bankName: bankName.trim(),
      accountNumber: accountNumber.trim().replace(/\s|-/g, ''),
      note: note.trim()
    });
    ctx.pop();
    ctx.flash(existing ? '已更新' : '已新增');
  };

  return (
    <>
      <Header
        title={existing ? '編輯聯絡人' : '新增聯絡人'}
        onBack={() => ctx.pop()}
        action={existing && (
          <button onClick={() => {
            if (confirm(`刪除「${existing.name}」？`)) { ctx.removeContact(existing.id); ctx.pop(); }
          }} className="p-2" style={{ color: C.accent }}><Trash2 size={16} /></button>
        )}
      />
      <div className="px-5 space-y-4">
        <div>
          <Label>姓名</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：王小明" autoFocus />
        </div>

        <div className="pt-2 mt-2" style={{ borderTop: `1px dashed ${C.border}` }}>
          <div className="text-[11px] uppercase tracking-widest mb-3" style={{ color: C.muted }}>
            匯款資訊（選填）
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Label>銀行代碼</Label>
              <Input value={bankCode} onChange={(e) => setBankCode(e.target.value)} placeholder="822" mono inputMode="numeric" />
            </div>
            <div className="col-span-2">
              <Label>銀行名稱</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="中國信託" />
            </div>
          </div>
          <div className="mt-3">
            <Label>帳號</Label>
            <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="000000000000" mono inputMode="numeric" />
          </div>
          <div className="mt-3">
            <Label>備註</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="例：LINE Pay、街口…" />
          </div>
        </div>

        <button onClick={submit} className="w-full py-3 rounded-xl font-semibold mt-2"
          style={{ background: C.primary, color: C.primaryText }}>
          {existing ? '儲存變更' : '新增聯絡人'}
        </button>
      </div>
    </>
  );
}

/* =========================================================
   UI primitives
   ========================================================= */
function Pill({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs transition-all"
      style={{
        background: active ? C.primary : C.card,
        color: active ? C.primaryText : C.subtle,
        border: `1px solid ${active ? C.primary : C.border}`,
        fontWeight: active ? 600 : 500
      }}>{children}</button>
  );
}

function Label({ children, className = '' }) {
  return (
    <div className={`text-[11px] uppercase tracking-widest mb-1.5 ${className}`} style={{ color: C.muted }}>
      {children}
    </div>
  );
}

function Input({ mono, ...props }) {
  return (
    <input {...props}
      className="w-full px-3 py-2.5 rounded-lg outline-none transition-colors"
      style={{
        background: C.card, border: `1px solid ${C.border}`, color: C.text,
        fontFamily: mono ? FONT_DISPLAY : FONT_BODY,
        fontVariantNumeric: mono ? 'tabular-nums' : 'normal',
        fontWeight: mono ? 600 : 400, fontSize: mono ? '1.05rem' : '0.95rem'
      }} />
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="text-center py-12 rounded-xl" style={{
      background: C.card, border: `1px dashed ${C.border}`
    }}>
      <Icon className="mx-auto mb-3" size={28} strokeWidth={1.5} style={{ color: C.muted }} />
      <div className="font-semibold mb-1" style={{ color: C.text }}>{title}</div>
      {text && <div className="text-xs px-6" style={{ color: C.muted }}>{text}</div>}
    </div>
  );
}

function BottomSheet({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center"
      style={{ background: 'rgba(42,37,32,0.5)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
        style={{ background: C.bg }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.25rem', fontWeight: 700, color: C.text }}>
            {title}
          </h3>
          <button onClick={onClose} style={{ color: C.muted }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MenuItem({ children, onClick, danger }) {
  return (
    <button onClick={onClick}
      className="w-full px-3 py-2 flex items-center gap-2 text-sm text-left"
      style={{ color: danger ? C.accent : C.text }}>
      {children}
    </button>
  );
}
