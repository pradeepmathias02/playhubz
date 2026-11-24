// Shared rating vocabulary so every surface (community meter, profile badges,
// counters) shows the same label and colour for the same vote.
export type Rating = 1 | 2 | 3;

export const RATING_LABELS: Record<Rating, string> = {
  1: "Timepass",
  2: "Good",
  3: "Perfect",
};

export const RATING_COLORS: Record<Rating, string> = {
  1: "hsl(0 84% 60%)", // red
  2: "hsl(142 71% 45%)", // green
  3: "hsl(270 80% 60%)", // purple
};

export function ratingOf(value: number): Rating {
  return value === 2 || value === 3 ? (value as Rating) : 1;
}

export function ratingColor(value: number): string {
  return RATING_COLORS[ratingOf(value)];
}

export function ratingLabel(value: number): string {
  return RATING_LABELS[ratingOf(value)];
}
