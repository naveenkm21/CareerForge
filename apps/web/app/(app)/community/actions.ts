'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createBattle, finishBattle, getBattle, setFollow } from '@careerforge/db';
import { requireActor } from '@/lib/session';

export async function followAction(targetId: string, follow: boolean) {
  const actor = await requireActor();
  await setFollow(actor.id, targetId, follow);
  revalidatePath('/community');
}

export async function createBattleAction(formData: FormData) {
  const actor = await requireActor();
  const opponentId = String(formData.get('opponent') ?? '');
  const skillId = String(formData.get('skill') ?? '');
  if (!opponentId || !skillId) redirect('/community/battles?error=missing');
  const battle = await createBattle(actor.id, opponentId, skillId);
  redirect(`/community/battles/${battle.id}`);
}

export async function finishBattleAction(battleId: string) {
  const actor = await requireActor();
  const b = await getBattle(battleId, actor.id);
  if (!b) redirect('/community/battles');
  await finishBattle(battleId, actor.id);
  revalidatePath(`/community/battles/${battleId}`);
  revalidatePath('/dashboard');
}
