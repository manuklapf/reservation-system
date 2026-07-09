import { supabase } from '@/lib/supabase'

/** Persists a table's color to the database. Returns whether the write succeeded. */
export async function updateTableColor(
  tableId: string,
  color: string
): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase
      .from('tables')
      .update({ color })
      .eq('id', tableId)
    if (error) {
      console.error('Error saving table color:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Error saving table color:', err)
    return false
  }
}
