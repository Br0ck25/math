// =====================================================================
//  STUDY: subjects and the one validator for study questions.
//  Included in BOTH the browser script and the Worker (see scripts/build.mjs), after econ.js.
//  A question is { s: subject id, q: question, a: answer, alt: [other accepted answers], wrong: [wrong choices for multiple choice] }.
// =====================================================================
const STUDY_SUBJECTS = [
  { id: 'social', icon: '🌎', label: 'Social studies' },
  { id: 'science', icon: '🔬', label: 'Science' },
  { id: 'lang', icon: '📚', label: 'Language arts' },
  { id: 'arts', icon: '🎨', label: 'Arts & humanities' },
  { id: 'math', icon: '🧮', label: 'Math facts' },
  { id: 'other', icon: '⭐', label: 'Other' }
];

// Trimmed text of 1..max characters with single spaces and no control characters, or null. (The text is only ever shown through escHtml.)
function studyText(v, max) {
  if (typeof v !== 'string') return null;
  const t = v.replace(/\s+/g, ' ').trim();
  return t && t.length <= max && !/[\u0000-\u001f\u007f]/.test(t) ? t : null;
}
// A clean question, or null when it is not valid. Used on the parent's phone, on the Worker and on the child's device (never trust the cloud).
function cleanStudyQ(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const L = ECON.study.parent;
  const q = studyText(raw.q, L.qMax), a = studyText(raw.a, L.aMax);
  if (!q || q.length < 3 || !a) return null;
  const list = function (v, skip) {
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v) || v.length > L.extras + 2) return null;
    const out = [];
    for (let i = 0; i < v.length; i++) {
      if (typeof v[i] === 'string' && !v[i].trim()) continue;                       // blank boxes are ignored
      const t = studyText(v[i], L.aMax);
      if (!t) return null;
      const low = t.toLowerCase();
      if (skip.indexOf(low) === -1 && out.map(function (x) { return x.toLowerCase(); }).indexOf(low) === -1) out.push(t);
    }
    return out.length > L.extras ? null : out;
  };
  const alt = list(raw.alt, [a.toLowerCase()]);
  if (!alt) return null;
  const wrong = list(raw.wrong, [a.toLowerCase()].concat(alt.map(function (x) { return x.toLowerCase(); })));
  if (!wrong) return null;
  return { s: STUDY_SUBJECTS.some(function (x) { return x.id === raw.s; }) ? raw.s : 'other', q: q, a: a, alt: alt, wrong: wrong };
}
