export interface Exercise {
  id: string;
  createdAt: string;
  name: string;
  description: string;
  playersCount: 1 | 2 | 3 | 4;
  labels: string[];
  durationMinutes?: number;
  level?: 'debutant' | 'intermediaire' | 'avance';
  orientation?: 'simple' | 'double' | 'mixte';
  attentionPoints?: string;
  variantEasier?: string;
  variantHarder?: string;
  source?: string;
  photos?: string[];
}
