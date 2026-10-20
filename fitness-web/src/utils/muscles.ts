import type { MuscleGroup } from '../api/types';

/** Individual muscles shown on the body map; each belongs to one exercise muscle group. */
export interface MusclePart {
  id: string;
  name: string;
  latin: string;
  group: MuscleGroup;
}

export const MUSCLE_PARTS: MusclePart[] = [
  { id: 'pectorals', name: 'Döş əzələsi', latin: 'Pectoralis major', group: 'chest' },
  { id: 'deltoids', name: 'Deltaşəkilli əzələ', latin: 'Deltoideus', group: 'shoulders' },
  { id: 'traps', name: 'Trapesvari əzələ', latin: 'Trapezius', group: 'back' },
  { id: 'lats', name: 'Enli kürək əzələsi', latin: 'Latissimus dorsi', group: 'back' },
  { id: 'lower_back', name: 'Bel əzələləri', latin: 'Erector spinae', group: 'back' },
  { id: 'biceps', name: 'Biseps', latin: 'Biceps brachii', group: 'arms' },
  { id: 'triceps', name: 'Triseps', latin: 'Triceps brachii', group: 'arms' },
  { id: 'forearms', name: 'Bazuönü əzələləri', latin: 'Antebrachium', group: 'arms' },
  { id: 'abs', name: 'Qarın düz əzələsi', latin: 'Rectus abdominis', group: 'core' },
  { id: 'obliques', name: 'Çəp qarın əzələləri', latin: 'Obliquus externus', group: 'core' },
  { id: 'glutes', name: 'Sağrı əzələləri', latin: 'Gluteus maximus', group: 'legs' },
  { id: 'quads', name: 'Bud dördbaşlı əzələsi', latin: 'Quadriceps femoris', group: 'legs' },
  { id: 'hamstrings', name: 'Budun arxa əzələləri', latin: 'Hamstrings', group: 'legs' },
  { id: 'adductors', name: 'Yaxınlaşdırıcı əzələlər', latin: 'Adductores', group: 'legs' },
  { id: 'calves', name: 'Baldır əzələsi', latin: 'Gastrocnemius', group: 'legs' },
  { id: 'tibialis', name: 'Qabaq qamış əzələsi', latin: 'Tibialis anterior', group: 'legs' },
];

/** Groups that exist on the body (cardio / full body are not tied to one muscle). */
export const BODY_GROUPS: MuscleGroup[] = ['chest', 'shoulders', 'back', 'arms', 'core', 'legs'];

export const musclePart = (id?: string | null) => MUSCLE_PARTS.find((m) => m.id === id);

export const exercisesUrl = (group: MuscleGroup, partId?: string) =>
  `/exercises?muscle=${group}${partId ? `&focus=${partId}` : ''}`;
