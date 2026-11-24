// Browser-safe fuzzy matching for forgiving title search.

export function normalize(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
}

export function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** 0..1 similarity between what the user typed and a title (prefix-aware). */
export function similarity(query: string, title: string) {
  const q = normalize(query), t = normalize(title);
  if (!q || !t) return 0;
  if (t === q) return 1;
  if (t.startsWith(q)) return 0.95;
  // Compare against the title's beginning of the same length, so "spidermen" ~ "spiderman: no way home".
  const head = t.slice(0, Math.max(q.length, 1));
  const best = Math.min(levenshtein(q, head), levenshtein(q, t));
  const score = 1 - best / Math.max(q.length, 1);
  return Math.max(0, t.includes(q) ? Math.max(score, 0.85) : score * 0.9);
}

/** Spelling variants to retry when the exact query finds little. */
export function queryVariants(query: string): string[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, " ");
  const out = new Set<string>();
  const words = q.split(" ");
  const swap = (s: string) => s
    .replace(/men\b/g, "man").replace(/ph/g, "f").replace(/([a-z])\1/g, "$1")
    .replace(/ie\b/g, "y").replace(/z/g, "s");
  out.add(swap(q));
  // "spiderman" -> "spider man"
  const joined = q.replace(/[\s-]/g, "");
  for (const suffix of ["man", "men", "woman", "verse", "wars", "ville"]) {
    const i = joined.lastIndexOf(suffix);
    if (i > 2) out.add(`${joined.slice(0, i)} ${suffix === "men" ? "man" : suffix}`);
  }
  if (q.includes(" ") || q.includes("-")) out.add(joined);
  if (words.length > 1) out.add(words.slice(0, -1).join(" "));
  if (words.length === 1 && q.length >= 4) out.add(q.slice(0, Math.max(3, Math.ceil(q.length * 0.7))));
  if (words.length > 1) out.add(words.map(w => w.slice(0, Math.max(3, Math.ceil(w.length * 0.7)))).join(" "));
  out.delete(q);
  return [...out].filter(v => v.length >= 2).slice(0, 4);
}

export function rankByMatch<T extends { title: string }>(query: string, items: T[], popularity: (t: T) => number = () => 0) {
  return items
    .map((item, i) => ({ item, s: similarity(query, item.title), i }))
    .sort((a, b) => (b.s - a.s) || (popularity(b.item) - popularity(a.item)) || a.i - b.i)
    .map(x => x.item);
}
