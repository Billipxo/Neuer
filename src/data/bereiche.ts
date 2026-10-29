import { THEMA_IDS, type Bereich } from '../types';

// Alle JSON-Dateien aus src/data/bereiche werden beim Bauen eingebunden – sortiert wie die Themen,
// innerhalb eines Themas in der Reihenfolge der Datei.
const module = import.meta.glob<{ default: Bereich[] }>('./bereiche/*.json', { eager: true });

export const BEREICHE: Bereich[] = Object.values(module)
  .flatMap((m) => m.default)
  .sort((a, b) => THEMA_IDS.indexOf(a.thema) - THEMA_IDS.indexOf(b.thema));
