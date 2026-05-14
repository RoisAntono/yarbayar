import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-only data layer. All functions assume RLS is in place — they will
 * return only rows the authed user can see. Each helper throws if Supabase
 * returns an error so pages can use error.tsx to display friendly fallbacks.
 */

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function getProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, currency")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface GroupSummary {
  id: string;
  name: string;
  emoji: string | null;
  member_count: number;
  total_spent: number;
  /** signed: positive = others owe me, negative = I owe */
  my_net: number;
  last_activity: string | null;
}

export async function getMyGroupsWithSummary(): Promise<GroupSummary[]> {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];
  const uid = user.user.id;

  // Pull groups visible to user (owner OR member via profile_id)
  const { data: groups, error } = await supabase
    .from("groups")
    .select("id, name, emoji, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!groups || groups.length === 0) return [];

  const ids = groups.map((g) => g.id);

  const [membersRes, expensesRes, splitsRes] = await Promise.all([
    supabase
      .from("group_members")
      .select("id, group_id, profile_id, display_name")
      .in("group_id", ids),
    supabase
      .from("expenses")
      .select("id, group_id, paid_by_member_id, amount, spent_at")
      .in("group_id", ids),
    supabase
      .from("expense_splits")
      .select("expense_id, member_id, amount"),
  ]);
  if (membersRes.error) throw membersRes.error;
  if (expensesRes.error) throw expensesRes.error;
  if (splitsRes.error) throw splitsRes.error;

  const members = membersRes.data ?? [];
  const expenses = expensesRes.data ?? [];
  const splits = splitsRes.data ?? [];

  // Find my member-id in each group (the row where profile_id == uid)
  const myMemberByGroup = new Map<string, string>();
  for (const m of members) {
    if (m.profile_id === uid) myMemberByGroup.set(m.group_id, m.id);
  }

  // Index splits by expense
  const splitsByExpense = new Map<string, typeof splits>();
  for (const s of splits) {
    const arr = splitsByExpense.get(s.expense_id) ?? [];
    arr.push(s);
    splitsByExpense.set(s.expense_id, arr);
  }

  return groups.map((g) => {
    const groupExpenses = expenses.filter((e) => e.group_id === g.id);
    const groupMembers = members.filter((m) => m.group_id === g.id);
    const total = groupExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const lastActivity = groupExpenses
      .map((e) => e.spent_at)
      .sort()
      .at(-1) ?? null;

    let myNet = 0;
    const myMember = myMemberByGroup.get(g.id);
    if (myMember) {
      for (const e of groupExpenses) {
        if (e.paid_by_member_id === myMember) myNet += Number(e.amount);
        const myShare = (splitsByExpense.get(e.id) ?? []).find(
          (s) => s.member_id === myMember
        );
        if (myShare) myNet -= Number(myShare.amount);
      }
    }

    return {
      id: g.id,
      name: g.name,
      emoji: g.emoji,
      member_count: groupMembers.length,
      total_spent: total,
      my_net: Math.round(myNet),
      last_activity: lastActivity,
    } satisfies GroupSummary;
  });
}

export interface GroupDetail {
  id: string;
  name: string;
  emoji: string | null;
  owner_id: string;
  members: { id: string; display_name: string; profile_id: string | null }[];
  expenses: ExpenseWithSplits[];
}

export interface ExpenseWithSplits {
  id: string;
  group_id: string;
  title: string;
  notes: string | null;
  amount: number;
  spent_at: string;
  receipt_url: string | null;
  paid_by_member_id: string;
  split_method: "equal" | "exact" | "percent" | "shares";
  splits: { member_id: string; amount: number }[];
}

export async function getGroupDetail(groupId: string): Promise<GroupDetail | null> {
  const supabase = await createClient();
  const [groupRes, membersRes, expensesRes] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, emoji, owner_id")
      .eq("id", groupId)
      .maybeSingle(),
    supabase
      .from("group_members")
      .select("id, display_name, profile_id")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true }),
    supabase
      .from("expenses")
      .select(
        "id, group_id, title, notes, amount, spent_at, receipt_url, paid_by_member_id, split_method"
      )
      .eq("group_id", groupId)
      .order("spent_at", { ascending: false }),
  ]);
  if (groupRes.error) throw groupRes.error;
  if (!groupRes.data) return null;
  if (membersRes.error) throw membersRes.error;
  if (expensesRes.error) throw expensesRes.error;

  const expenses = expensesRes.data ?? [];
  let splitsByExpense = new Map<string, { member_id: string; amount: number }[]>();
  if (expenses.length > 0) {
    const { data: splits, error } = await supabase
      .from("expense_splits")
      .select("expense_id, member_id, amount")
      .in(
        "expense_id",
        expenses.map((e) => e.id)
      );
    if (error) throw error;
    splitsByExpense = (splits ?? []).reduce((map, s) => {
      const arr = map.get(s.expense_id) ?? [];
      arr.push({ member_id: s.member_id, amount: Number(s.amount) });
      map.set(s.expense_id, arr);
      return map;
    }, new Map<string, { member_id: string; amount: number }[]>());
  }

  return {
    ...groupRes.data,
    members: membersRes.data ?? [],
    expenses: expenses.map((e) => ({
      ...e,
      amount: Number(e.amount),
      splits: splitsByExpense.get(e.id) ?? [],
    })),
  };
}

export interface RecentExpense {
  id: string;
  group_id: string;
  title: string;
  amount: number;
  spent_at: string;
  paid_by_member_id: string;
  receipt_url: string | null;
  group_name: string;
  group_emoji: string | null;
}

export async function getRecentExpenses(limit = 30): Promise<RecentExpense[]> {
  const supabase = await createClient();
  const [expRes, groupsRes] = await Promise.all([
    supabase
      .from("expenses")
      .select(
        "id, group_id, title, amount, spent_at, paid_by_member_id, receipt_url"
      )
      .order("spent_at", { ascending: false })
      .limit(limit),
    supabase.from("groups").select("id, name, emoji"),
  ]);
  if (expRes.error) throw expRes.error;
  if (groupsRes.error) throw groupsRes.error;

  const groupMap = new Map((groupsRes.data ?? []).map((g) => [g.id, g]));
  return (expRes.data ?? []).map((e) => {
    const g = groupMap.get(e.group_id);
    return {
      id: e.id,
      group_id: e.group_id,
      title: e.title,
      amount: Number(e.amount),
      spent_at: e.spent_at,
      paid_by_member_id: e.paid_by_member_id,
      receipt_url: e.receipt_url,
      group_name: g?.name ?? "",
      group_emoji: g?.emoji ?? null,
    };
  });
}
