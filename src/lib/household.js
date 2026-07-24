import { supabase } from './supabase';

export async function ensureHousehold() {
  const { data, error } = await supabase.rpc('ensure_default_household');

  if (error) throw error;
  return data;
}

export async function loadHouseholdSummary() {
  const { data, error } = await supabase.rpc('get_my_household_summary');

  if (error) throw error;
  return data;
}

export async function createInviteCode() {
  const { data, error } = await supabase.rpc('create_household_invite');

  if (error) throw error;
  return data;
}

export async function joinHousehold(inviteCode) {
  const { data, error } = await supabase.rpc('join_household_by_code', {
    invite_code_input: inviteCode.trim().toUpperCase(),
  });

  if (error) throw error;
  return data;
}

export async function updateDisplayName(displayName) {
  const { data, error } = await supabase.rpc('update_household_display_name', {
    display_name_input: displayName.trim(),
  });

  if (error) throw error;
  return data;
}
