// calc.js — Settlement calculations.
//
// All money math lives here. Currency conversion happens via per-expense
// fxRate multiplied into shares, so calcBalances returns balances in the
// group's settlement currency directly.

import { ZERO_DECIMAL } from '../theme';

export function normalizeExpense(e, groupCurrency) {
  return {
    ...e,
    expenseCurrency: e.expenseCurrency || groupCurrency || 'TWD',
    fxRate: e.fxRate || 1,
    fxSource: e.fxSource || 'auto',
    fxEffectiveDate: e.fxEffectiveDate || null,
    date: e.date || new Date(e.createdAt || Date.now()).toISOString().slice(0, 10),
  };
}

// Returns { memberId: amountOwed_in_group_currency } for one expense.
// Does not subtract the payer's payment — that happens in calcBalances.
export function calcExpenseShares(expense, memberIds) {
  const rate = expense.fxRate || 1;
  const result = Object.fromEntries(memberIds.map((id) => [id, 0]));

  if (expense.type === 'simple') {
    const sharers = expense.sharedWith.filter((id) => result[id] !== undefined);
    if (sharers.length === 0) return result;
    const share = (expense.amount * rate) / sharers.length;
    sharers.forEach((id) => {
      result[id] += share;
    });
    return result;
  }

  // Itemized: each item has its own sharers, tax+service split proportionally
  // by each person's item subtotal.
  const subtotalPer = Object.fromEntries(memberIds.map((id) => [id, 0]));
  let itemsTotal = 0;
  for (const item of expense.items) {
    const sharers = item.sharedBy.filter((id) => result[id] !== undefined);
    if (sharers.length === 0) continue;
    const per = item.price / sharers.length;
    sharers.forEach((id) => {
      subtotalPer[id] += per;
    });
    itemsTotal += item.price;
  }
  const extra = (expense.tax || 0) + (expense.service || 0);
  for (const id of memberIds) {
    let val = subtotalPer[id];
    if (itemsTotal > 0 && extra > 0) val += extra * (subtotalPer[id] / itemsTotal);
    result[id] = val * rate;
  }
  return result;
}

// Returns { memberId: netBalance } in group currency.
// Positive = others owe them, negative = they owe.
export function calcBalances(group) {
  const map = Object.fromEntries(group.memberIds.map((id) => [id, 0]));
  for (const exp of group.expenses) {
    if (map[exp.payerId] === undefined) continue;
    map[exp.payerId] += exp.amount * (exp.fxRate || 1);
    const shares = calcExpenseShares(exp, group.memberIds);
    for (const id of group.memberIds) map[id] -= shares[id];
  }
  return map;
}

// Greedy minimum-transaction settlement.
// Matches largest creditor with largest debtor repeatedly until balanced.
// O(n log n) and produces near-optimal transaction count.
export function calcSettlements(balances, currency) {
  const decimals = ZERO_DECIMAL.has(currency) ? 0 : 2;
  const mul = decimals === 0 ? 1 : 100;
  const threshold = decimals === 0 ? 0.5 : 0.005;
  const round = (n) => Math.round(n * mul) / mul;

  const arr = Object.entries(balances).map(([id, amount]) => ({ id, amount: round(amount) }));
  const creditors = arr.filter((d) => d.amount > threshold).map((d) => ({ ...d })).sort((a, b) => b.amount - a.amount);
  const debtors = arr.filter((d) => d.amount < -threshold).map((d) => ({ ...d })).sort((a, b) => a.amount - b.amount);

  const result = [];
  let i = 0;
  let j = 0;
  while (i < creditors.length && j < debtors.length) {
    const settle = round(Math.min(creditors[i].amount, -debtors[j].amount));
    result.push({ fromId: debtors[j].id, toId: creditors[i].id, amount: settle });
    creditors[i].amount = round(creditors[i].amount - settle);
    debtors[j].amount = round(debtors[j].amount + settle);
    if (creditors[i].amount < threshold) i++;
    if (debtors[j].amount > -threshold) j++;
  }
  return result;
}

export const groupTotalConverted = (g) =>
  g.expenses.reduce((s, e) => s + (e.amount || 0) * (e.fxRate || 1), 0);
