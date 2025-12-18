/**
 * Maps database errors to user-friendly Slovak messages
 * Prevents exposure of internal database structure
 */
export function mapDatabaseError(error: unknown): string {
  const message = (error as any)?.message?.toLowerCase() || '';
  
  if (message.includes('duplicate')) {
    return 'Tento záznam už existuje.';
  }
  if (message.includes('foreign key')) {
    return 'Neplatná relácia dát.';
  }
  if (message.includes('not null') || message.includes('violates not-null')) {
    return 'Vyžadované pole chýba.';
  }
  if (message.includes('permission denied') || message.includes('row-level security')) {
    return 'Nemáte oprávnenie na túto akciu.';
  }
  if (message.includes('unique constraint')) {
    return 'Tento záznam už existuje.';
  }
  if (message.includes('check constraint')) {
    return 'Neplatná hodnota.';
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'Požiadavka trvala príliš dlho. Skúste to znova.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Chyba siete. Skontrolujte pripojenie.';
  }
  if (message.includes('invalid') && message.includes('email')) {
    return 'Neplatná emailová adresa.';
  }
  if (message.includes('invalid') && message.includes('password')) {
    return 'Neplatné heslo.';
  }
  if (message.includes('banned') || message.includes('suspended')) {
    return 'Váš účet bol pozastavený.';
  }
  
  // Generic fallback - don't expose internal details
  return 'Vyskytla sa chyba. Skúste to prosím znova.';
}
