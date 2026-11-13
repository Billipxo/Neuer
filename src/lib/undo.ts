/** Gelöschte Zeile zum Wiederherstellen vorbereiten: gleicher Inhalt und Zeitstempel, aber ohne ID und Besitzer */
export function withoutIdentity<T extends object>(row: T): Omit<T, 'id' | 'user_id'> {
  const { id: _id, user_id: _user, ...rest } = row as T & { id?: unknown; user_id?: unknown }
  return rest as Omit<T, 'id' | 'user_id'>
}
