// db.js — App-specific persistence layer.
//
// Main app state goes under tinysplit:v1 (single JSON blob, fast to load).
// Each receipt image is stored separately under tinysplit:receipt:<expenseId>
// so the main blob stays small.

import { storage } from './storage';
import { normalizeExpense } from './calc';

const STORAGE_KEY = 'tinysplit:v1';
const RECEIPT_KEY = (id) => `tinysplit:receipt:${id}`;

export async function loadData() {
  try {
    const r = await storage.get(STORAGE_KEY);
    if (r?.value) {
      const d = JSON.parse(r.value);
      return {
        contacts: d.contacts || [],
        groups: (d.groups || []).map((g) => ({
          ...g,
          currency: g.currency || 'TWD',
          expenses: (g.expenses || []).map((e) => normalizeExpense(e, g.currency)),
        })),
      };
    }
  } catch (e) {
    console.error('loadData', e);
  }
  return { contacts: [], groups: [] };
}

export async function saveData(data) {
  try {
    await storage.set(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('saveData', e);
  }
}

export async function saveReceipt(id, dataUrl) {
  try {
    await storage.set(RECEIPT_KEY(id), dataUrl);
  } catch (e) {
    console.error('saveReceipt', e);
  }
}

export async function loadReceipt(id) {
  try {
    const r = await storage.get(RECEIPT_KEY(id));
    return r?.value || null;
  } catch {
    return null;
  }
}

export async function deleteReceipt(id) {
  try {
    await storage.delete(RECEIPT_KEY(id));
  } catch {
    /* ignore */
  }
}
