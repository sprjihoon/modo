import type { SupabaseClient } from '@supabase/supabase-js'
import { ActionType } from '@/lib/types/action-log'

type Actor = {
  id: string
  name?: string | null
  role?: string | null
}

/**
 * API 라우트용 action_logs 기록 헬퍼.
 * 클라이언트 LogService와 동일한 스키마(actor_*, metadata, timestamp)를 쓴다.
 */
export async function logActionServer(
  supabase: SupabaseClient,
  params: {
    actor: Actor
    actionType: ActionType
    targetId?: string | null
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  try {
    const { error } = await supabase.from('action_logs').insert({
      actor_id: params.actor.id,
      actor_name: params.actor.name ?? null,
      actor_role: params.actor.role ?? null,
      action_type: params.actionType,
      target_id: params.targetId ?? null,
      metadata: params.metadata ?? {},
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.warn('logActionServer insert failed:', error.message)
    }
  } catch (e) {
    console.warn('logActionServer error (ignored):', e)
  }
}

/** auth 세션에서 public.users 프로필을 조회해 로그를 남긴다. */
export async function logActionForSession(
  supabase: SupabaseClient,
  params: {
    actionType: ActionType
    targetId?: string | null
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return

    const { data: user } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('auth_id', session.user.id)
      .maybeSingle()

    if (!user) return

    await logActionServer(supabase, {
      actor: user,
      actionType: params.actionType,
      targetId: params.targetId,
      metadata: params.metadata,
    })
  } catch (e) {
    console.warn('logActionForSession error (ignored):', e)
  }
}
