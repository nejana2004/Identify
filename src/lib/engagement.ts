import { supabase } from '@/lib/supabaseClient';

export type VoteTargetType = 'thread' | 'reply';
export type SaveTargetType = 'thread' | 'card';
export type VoteValue = 1 | -1;

const voteConfig: Record<VoteTargetType, { table: 'threads' | 'thread_replies'; upvoteField: string; downvoteField: string; scoreField: string }> = {
  thread: { table: 'threads', upvoteField: 'upvote_count', downvoteField: 'downvote_count', scoreField: 'vote_score' },
  reply: { table: 'thread_replies', upvoteField: 'upvote_count', downvoteField: 'downvote_count', scoreField: 'vote_score' },
};

const saveConfig: Record<SaveTargetType, { table: 'threads' | 'product_cards'; saveField: string }> = {
  thread: { table: 'threads', saveField: 'save_count' },
  card: { table: 'product_cards', saveField: 'save_count' },
};

export async function incrementCardClick(cardId: string) {
  const { data, error } = await supabase
    .from('product_cards')
    .select('click_count')
    .eq('id', cardId)
    .single();

  if (error || !data) {
    return { error: error || new Error('Card not found') };
  }

  return supabase
    .from('product_cards')
    .update({ click_count: (data.click_count || 0) + 1, updated_at: new Date().toISOString() })
    .eq('id', cardId);
}

export async function getVotesForUser(userId: string, targetType: VoteTargetType, targetIds: string[]) {
  if (targetIds.length === 0) return [] as Array<{ target_id: string; vote_value: VoteValue }>;

  const { data } = await supabase
    .from('content_votes')
    .select('target_id, vote_value')
    .eq('user_id', userId)
    .eq('target_type', targetType)
    .in('target_id', targetIds);

  return (data || []) as Array<{ target_id: string; vote_value: VoteValue }>;
}

export async function setVoteForTarget(userId: string, targetType: VoteTargetType, targetId: string, nextValue: VoteValue) {
  const config = voteConfig[targetType];
  const { data: existing } = await supabase
    .from('content_votes')
    .select('id, vote_value')
    .eq('user_id', userId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle();

  const { data: target } = await supabase
    .from(config.table)
    .select(`id, ${config.upvoteField}, ${config.downvoteField}, ${config.scoreField}`)
    .eq('id', targetId)
    .single();

  if (!target) {
    throw new Error('Target not found.');
  }

  let upvoteCount = target[config.upvoteField] || 0;
  let downvoteCount = target[config.downvoteField] || 0;
  let voteScore = target[config.scoreField] || 0;

  if (existing?.vote_value === nextValue) {
    await supabase.from('content_votes').delete().eq('id', existing.id);
    if (nextValue === 1) upvoteCount -= 1;
    if (nextValue === -1) downvoteCount -= 1;
    voteScore -= nextValue;
  } else if (existing) {
    await supabase.from('content_votes').update({ vote_value: nextValue, updated_at: new Date().toISOString() }).eq('id', existing.id);
    if (existing.vote_value === 1) upvoteCount -= 1;
    if (existing.vote_value === -1) downvoteCount -= 1;
    if (nextValue === 1) upvoteCount += 1;
    if (nextValue === -1) downvoteCount += 1;
    voteScore += nextValue - existing.vote_value;
  } else {
    await supabase.from('content_votes').insert({ user_id: userId, target_type: targetType, target_id: targetId, vote_value: nextValue });
    if (nextValue === 1) upvoteCount += 1;
    if (nextValue === -1) downvoteCount += 1;
    voteScore += nextValue;
  }

  await supabase
    .from(config.table)
    .update({
      [config.upvoteField]: Math.max(0, upvoteCount),
      [config.downvoteField]: Math.max(0, downvoteCount),
      [config.scoreField]: voteScore,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetId);

  return {
    upvoteCount: Math.max(0, upvoteCount),
    downvoteCount: Math.max(0, downvoteCount),
    voteScore,
    activeVote: existing?.vote_value === nextValue ? 0 : nextValue,
  };
}

export async function getSavesForUser(userId: string, targetType: SaveTargetType, targetIds: string[]) {
  if (targetIds.length === 0) return [] as Array<{ target_id: string }>;

  const { data } = await supabase
    .from('content_saves')
    .select('target_id')
    .eq('user_id', userId)
    .eq('target_type', targetType)
    .in('target_id', targetIds);

  return (data || []) as Array<{ target_id: string }>;
}

export async function toggleSaveForTarget(userId: string, targetType: SaveTargetType, targetId: string) {
  const config = saveConfig[targetType];
  const { data: existing } = await supabase
    .from('content_saves')
    .select('id')
    .eq('user_id', userId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle();

  const { data: target } = await supabase
    .from(config.table)
    .select(`id, ${config.saveField}`)
    .eq('id', targetId)
    .single();

  if (!target) {
    throw new Error('Target not found.');
  }

  let saveCount = target[config.saveField] || 0;
  let saved = false;

  if (existing) {
    await supabase.from('content_saves').delete().eq('id', existing.id);
    saveCount = Math.max(0, saveCount - 1);
  } else {
    await supabase.from('content_saves').insert({ user_id: userId, target_type: targetType, target_id: targetId });
    saveCount += 1;
    saved = true;
  }

  await supabase
    .from(config.table)
    .update({ [config.saveField]: saveCount, updated_at: new Date().toISOString() })
    .eq('id', targetId);

  return { saveCount, saved };
}
