// =====================================================================
//  STUDY QUESTION BANK  (the engine is in 38-study.js)
//  Rows are [min level 6-8, topic, question, answer, other accepted answers joined by "|", short explanation, wrong choices joined by "|"].
//  Only the first four are required. At the moment the bank holds only the 2024 KAAC district test in 37f-study-kaac.js (added with KAAC's written
//  permission); the owner removed the questions that were written for the first version. Add more only from sources the owner has permission for.
//  Each file calls studyAdd(subject, rows, idKey). A question's id is idKey (default: the subject) plus its position among that key's rows, so only ever
//  append new rows to a file: never reorder or delete (saves refer to the ids). Topic "ky" marks Kentucky questions (they get their own button when there are any).
// =====================================================================
const STUDY_BANK = [];
const STUDY_COUNT = {};
function studyAdd(subject, rows, idKey) {
  const key = idKey || subject;
  rows.forEach(function (r) {
    STUDY_COUNT[key] = (STUDY_COUNT[key] || 0) + 1;
    STUDY_BANK.push({
      id: key + STUDY_COUNT[key], s: subject, g: r[0], t: r[1], q: r[2], a: r[3],
      alt: r[4] ? r[4].split('|') : [], x: r[5] || '', wrong: r[6] ? r[6].split('|') : []
    });
  });
}
