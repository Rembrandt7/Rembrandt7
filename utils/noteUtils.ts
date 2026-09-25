import { Note } from '../types';

export const normalizeAndDeduplicateNotes = (rawNotes: any[]): Note[] => {
  if (!rawNotes || !Array.isArray(rawNotes)) return [];

  const seen = new Set<string>();
  const cleanNotes: Note[] = [];

  rawNotes.forEach((n, idx) => {
    if (!n) return;
    const id = String(n.id || `note-recovered-${idx}`);
    if (seen.has(id)) return;
    seen.add(id);

    // Normalize category to one of the 4 system categories
    const rawCat = (n.category || '').toLowerCase();
    let category: 'estudios' | 'trabajo' | 'compras' | 'notas' = 'notas';

    if (['estudios', 'estudiar', 'investigacion', 'estudio'].includes(rawCat)) {
      category = 'estudios';
    } else if (['trabajo', 'work', 'laboral'].includes(rawCat)) {
      category = 'trabajo';
    } else if (['compras', 'super', 'shopping'].includes(rawCat)) {
      category = 'compras';
    } else {
      category = 'notas';
    }

    const title = (n.title || '').trim();
    const text = (n.text || '').trim();

    // Ensure neither title nor text is completely blank if the other has content
    const finalTitle = title || (text.length > 50 ? text.substring(0, 50) + '...' : text);
    const finalText = text || title || '';

    cleanNotes.push({
      ...n,
      id,
      category,
      title: finalTitle,
      text: finalText,
      completed: !!n.completed,
      progress: typeof n.progress === 'number' ? n.progress : 0,
      link: n.link || '',
      quantity: n.quantity || '',
      startDate: n.startDate || ''
    });
  });

  return cleanNotes;
};
