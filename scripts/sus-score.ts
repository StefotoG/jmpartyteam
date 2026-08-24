/**
 * Scores a System Usability Scale study.
 *
 * Reads docs/experiments/sus-responses.csv, one row per participant, columns q1..q10 with
 * answers on the standard 1–5 agreement scale. Odd-numbered items are positively worded and
 * even-numbered ones negatively worded, which is what makes the alternating scoring below
 * necessary rather than arbitrary.
 *
 * Run: npm run sus
 * Verify the arithmetic without participants: npm run sus -- --self-test
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const RESPONSES =
  process.argv.find((arg) => arg.endsWith('.csv')) ??
  join(process.cwd(), 'docs', 'experiments', 'sus-responses.csv');

/** Bangor, Kortum & Miller (2009), the adjective scale attached to SUS ranges. */
const ADJECTIVES: [number, string][] = [
  [85, 'best imaginable'],
  [73, 'excellent'],
  [52, 'good'],
  [39, 'ok'],
  [25, 'poor'],
  [0, 'worst imaginable'],
];

/** Sauro's benchmark: the mean SUS score across some 500 studies. */
const INDUSTRY_MEAN = 68;

export function scoreParticipant(answers: number[]): number {
  if (answers.length !== 10) {
    throw new Error(`Expected 10 answers, received ${answers.length}`);
  }
  if (answers.some((a) => !Number.isInteger(a) || a < 1 || a > 5)) {
    throw new Error(`Answers must be integers 1–5, received ${answers.join(', ')}`);
  }

  const contributions = answers.map((answer, index) =>
    index % 2 === 0 ? answer - 1 : 5 - answer
  );

  return contributions.reduce((sum, value) => sum + value, 0) * 2.5;
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function sampleStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const average = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - average) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function adjective(score: number): string {
  return ADJECTIVES.find(([threshold]) => score >= threshold)![1];
}

function parse(csv: string): { id: string; answers: number[] }[] {
  const [header, ...lines] = csv
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  if (!header) throw new Error('The responses file is empty.');

  const columns = header.split(',').map((c) => c.trim());
  const questionIndexes = Array.from({ length: 10 }, (_, i) => columns.indexOf(`q${i + 1}`));

  if (questionIndexes.some((i) => i === -1)) {
    throw new Error('The header must contain q1 through q10.');
  }
  const idIndex = columns.indexOf('participant');

  return lines.map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    return {
      id: idIndex === -1 ? '?' : cells[idIndex],
      answers: questionIndexes.map((i) => Number(cells[i])),
    };
  });
}

/** Checks the scoring against the two responses whose scores are known by definition. */
function selfTest() {
  const allBest = [5, 1, 5, 1, 5, 1, 5, 1, 5, 1];
  const allWorst = [1, 5, 1, 5, 1, 5, 1, 5, 1, 5];
  const neutral = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3];

  const cases: [string, number[], number][] = [
    ['strongest possible agreement', allBest, 100],
    ['strongest possible disagreement', allWorst, 0],
    ['neutral throughout', neutral, 50],
  ];

  let failures = 0;
  for (const [label, answers, expected] of cases) {
    const actual = scoreParticipant(answers);
    const ok = actual === expected;
    if (!ok) failures++;
    console.log(`${ok ? 'pass' : 'FAIL'}  ${label}: expected ${expected}, got ${actual}`);
  }

  console.log(failures ? `\n${failures} failure(s).` : '\nScoring is correct.');
  process.exit(failures ? 1 : 0);
}

async function main() {
  if (process.argv.includes('--self-test')) return selfTest();

  const csv = await readFile(RESPONSES, 'utf8').catch(() => null);
  if (csv === null) {
    console.error(`No responses at ${RESPONSES}.`);
    process.exit(1);
  }

  const participants = parse(csv);
  if (participants.length === 0) {
    console.log('The responses file has a header but no participants yet.');
    return;
  }

  const scores = participants.map((p) => scoreParticipant(p.answers));
  const average = mean(scores);
  const sd = sampleStdDev(scores);
  // Normal approximation; with fewer than about 12 participants report it as indicative.
  const margin = 1.96 * (sd / Math.sqrt(scores.length));

  console.table(
    participants.map((p, i) => ({
      participant: p.id,
      score: scores[i],
      rating: adjective(scores[i]),
    }))
  );

  console.log('');
  console.log(`participants     ${scores.length}`);
  console.log(`mean SUS         ${average.toFixed(1)}  (${adjective(average)})`);
  console.log(`std deviation    ${sd.toFixed(1)}`);
  console.log(`95% CI           ${(average - margin).toFixed(1)} – ${(average + margin).toFixed(1)}`);
  console.log(`range            ${Math.min(...scores)} – ${Math.max(...scores)}`);
  console.log(`vs benchmark     ${(average - INDUSTRY_MEAN >= 0 ? '+' : '')}${(average - INDUSTRY_MEAN).toFixed(1)} against the industry mean of ${INDUSTRY_MEAN}`);

  if (scores.length < 12) {
    console.log('\nFewer than 12 participants: report the interval as indicative, not conclusive.');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
