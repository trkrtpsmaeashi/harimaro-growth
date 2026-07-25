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

export async function createInviteCode(memberRole = 'editor') {
  const { data, error } = await supabase.rpc('create_household_invite', {
    invite_role_input: memberRole,
  });

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


export async function loadHouseholdMembers() {
  const { data, error } = await supabase.rpc('get_my_household_members');

  if (error) throw error;
  return data || [];
}


export async function removeHouseholdMember(userId) {
  const { data, error } = await supabase.rpc('remove_household_member', {
    target_user_id: userId,
  });

  if (error) throw error;
  return data;
}

export async function changeHouseholdMemberRole(userId, role) {
  const { data, error } = await supabase.rpc('change_household_member_role', {
    target_user_id: userId,
    new_role: role,
  });

  if (error) throw error;
  return data;
}


export async function deleteMyAccount(confirmText) {
  const { data, error } = await supabase.rpc('delete_my_harimaro_account', {
    confirmation_text: confirmText,
  });

  if (error) throw error;
  return data;
}
