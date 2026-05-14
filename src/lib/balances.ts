/**
 * Pure helpers for splitting expenses and computing balances.
 *
 * Amounts are stored as numbers in IDR (no decimals expected, but the math
 * here treats them as plain numbers and rounds to whole rupiah at the end).
 */

import type { SplitMethod } from "@/types/database";

export interface SplitInput {
  memberId: string;
  /** equal: 1 or 0 to include/exclude. exact: rupiah. percent: 0-100. shares: integer share count. */
  value: number;
}

export interface SplitResult {
  memberId: string;
  amount: number;
}

/**
 * Compute per-member rupiah amounts given a method, total, and inputs.
 * The last included member absorbs rounding so the total always matches `amount`.
 */
export function computeSplits(
  method: SplitMethod,
  amount: number,
  inputs: SplitInput[]
): SplitResult[] {
  if (amount <= 0 || inputs.length === 0) {
    return inputs.map((i) => ({ memberId: i.memberId, amount: 0 }));
  }

  const result: SplitResult[] = [];

  if (method === "equal") {
    const included = inputs.filter((i) => i.value > 0);
    if (included.length === 0) return inputs.map((i) => ({ memberId: i.memberId, amount: 0 }));
    const per = Math.round(amount / included.length);
    let running = 0;
    included.forEach((i, idx) => {
      const a = idx === included.length - 1 ? amount - running : per;
      running += a;
      result.push({ memberId: i.memberId, amount: a });
    });
    // members with value 0 → 0
    inputs.filter((i) => !(i.value > 0)).forEach((i) => result.push({ memberId: i.memberId, amount: 0 }));
    return result;
  }

  if (method === "exact") {
    return inputs.map((i) => ({ memberId: i.memberId, amount: Math.round(i.value) }));
  }

  if (method === "percent") {
    let running = 0;
    inputs.forEach((i, idx) => {
      const a = idx === inputs.length - 1
        ? amount - running
        : Math.round((amount * i.value) / 100);
      running += a;
      result.push({ memberId: i.memberId, amount: a });
    });
    return result;
  }

  // shares
  const totalShares = inputs.reduce((s, i) => s + Math.max(0, i.value), 0);
  if (totalShares <= 0) return inputs.map((i) => ({ memberId: i.memberId, amount: 0 }));
  let running = 0;
  inputs.forEach((i, idx) => {
    const a = idx === inputs.length - 1
      ? amount - running
      : Math.round((amount * Math.max(0, i.value)) / totalShares);
    running += a;
    result.push({ memberId: i.memberId, amount: a });
  });
  return result;
}

export interface BalanceLine {
  memberId: string;
  /** positive = owed to this member, negative = this member owes */
  net: number;
}

export interface ExpenseForBalance {
  amount: number;
  paidByMemberId: string;
  splits: { memberId: string; amount: number }[];
}

export function computeBalances(expenses: ExpenseForBalance[]): Map<string, number> {
  const balance = new Map<string, number>();
  for (const e of expenses) {
    balance.set(e.paidByMemberId, (balance.get(e.paidByMemberId) ?? 0) + e.amount);
    for (const s of e.splits) {
      balance.set(s.memberId, (balance.get(s.memberId) ?? 0) - s.amount);
    }
  }
  return balance;
}

export interface Settlement {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

/**
 * Greedy "minimum transfers" settlement. Not optimal for adversarial cases
 * but produces clean, intuitive results for typical group expenses.
 */
export function settle(balances: Map<string, number>): Settlement[] {
  const debtors: { id: string; amt: number }[] = [];
  const creditors: { id: string; amt: number }[] = [];
  for (const [id, amt] of balances) {
    const rounded = Math.round(amt);
    if (rounded < 0) debtors.push({ id, amt: -rounded });
    else if (rounded > 0) creditors.push({ id, amt: rounded });
  }
  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);

  const out: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    if (pay > 0) {
      out.push({ fromMemberId: debtors[i].id, toMemberId: creditors[j].id, amount: pay });
      debtors[i].amt -= pay;
      creditors[j].amt -= pay;
    }
    if (debtors[i].amt === 0) i++;
    if (creditors[j].amt === 0) j++;
  }
  return out;
}
