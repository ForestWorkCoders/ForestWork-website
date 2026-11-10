// server/discord/room-player.ts
import { getSupabase } from '../utils/supabase'

// /room open makes private threads (12); public threads (11) are accepted too
const THREAD_TYPES = [11, 12]

/**
 * Adds whoever used a roll command inside a TRPG room's main thread to that room's player list.
 * The database function ignores threads that aren't an active room, GMs, and players already listed.
 * A failure is logged and never stops the roll.
 */
export async function recordRoomPlayer(interaction: any): Promise<void> {
  if (!THREAD_TYPES.includes(interaction.channel?.type)) return

  const { error } = await getSupabase().schema('trpg').rpc('record_room_player', {
    p_main_thread_id: String(interaction.channel_id),
    p_player_id: String(interaction.member?.user?.id || interaction.user?.id)
  })
  if (error) console.error('[Room] record_room_player failed:', error.message)
}
