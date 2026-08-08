export interface SampleMotif {
  name: string;
  svg: string;
}

export const SAMPLE_MOTIFS: SampleMotif[] = [
  {
    name: 'Royal Crown Motif',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><path d="M15 70 L25 35 L40 50 L50 25 L60 50 L75 35 L85 70 Z M20 75 L80 75 A5 5 0 0 1 80 82 L20 82 A5 5 0 0 1 20 75 Z" fill="#121214" stroke="#121214" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    name: 'Infinity Knot Symbol',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><path d="M30 50 C15 30 15 70 30 50 C45 30 55 70 70 50 C85 30 85 70 70 50 C55 30 45 70 30 50 Z" fill="none" stroke="#121214" stroke-width="6" stroke-linecap="round"/></svg>`,
  },
  {
    name: 'Minimalist Heart Silhouette',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><path d="M50 82 C50 82 18 58 18 36 C18 22 28 16 38 20 C45 23 50 30 50 30 C50 30 55 23 62 20 C72 16 82 22 82 36 C82 58 50 82 50 82 Z" fill="#121214" stroke="#121214" stroke-width="2" stroke-linejoin="round"/></svg>`,
  },
  {
    name: 'Lotus Flower Emblem',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><path d="M50 20 C40 40 30 65 50 80 C70 65 60 40 50 20 Z M50 80 C25 65 10 50 20 35 C35 35 45 55 50 80 Z M50 80 C75 65 90 50 80 35 C65 35 55 55 50 80 Z" fill="#121214"/></svg>`,
  },
];
