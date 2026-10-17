// =====================================================================
//  STUDY QUESTION BANK  (the engine is in 38-study.js)
//  Rows are [min level 6-8, topic, question, answer, other accepted answers joined by "|", short explanation, wrong choices joined by "|"].
//  Only the first four are required. Questions are written for middle grades (6-8) from the topics of the KAAC middle grades curriculum;
//  they are original wording, not copied from any test. Topic "ky" marks Kentucky questions (they also get their own button).
//  Each subject lives in its own 37x-study-<subject>.js file and calls studyAdd(). A question's id is its subject plus its position among that
//  subject's rows, so only ever append new rows to a file: never reorder or delete (saves refer to the ids).
// =====================================================================
const STUDY_BANK = [];
const STUDY_COUNT = {};
function studyAdd(subject, rows) {
  rows.forEach(function (r) {
    STUDY_COUNT[subject] = (STUDY_COUNT[subject] || 0) + 1;
    STUDY_BANK.push({
      id: subject + STUDY_COUNT[subject], s: subject, g: r[0], t: r[1], q: r[2], a: r[3],
      alt: r[4] ? r[4].split('|') : [], x: r[5] || '', wrong: r[6] ? r[6].split('|') : []
    });
  });
}
