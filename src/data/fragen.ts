import type { Frage } from '../types';

// Alle JSON-Dateien aus src/data/fragen werden beim Bauen eingebunden.
const module = import.meta.glob<{ default: Frage[] }>('./fragen/*.json', { eager: true });

export const MITGELIEFERTE_FRAGEN: Frage[] = Object.values(module).flatMap((m) => m.default);
