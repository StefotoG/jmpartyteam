/**
 * Renders the experiment results as SVG figures for the thesis.
 *
 * SVG rather than PNG because the figures stay sharp at any size in the printed
 * document, and the axes are computed from the data rather than hand-drawn.
 *
 * Run: npm run experiment:charts
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const RESULTS = join(process.cwd(), 'docs', 'experiments', 'concurrency.json');
const OUT_DIR = join(process.cwd(), 'docs', 'experiments');

const COLOURS: Record<string, string> = {
  naive: '#c0392b',
  'constraint-noretry': '#e08e0b',
  constraint: '#2e6da4',
  advisory: '#1f8a5f',
};

const WIDTH = 760;
const HEIGHT = 420;
const MARGIN = { top: 56, right: 190, bottom: 56, left: 72 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

interface RunResult {
  strategy: string;
  concurrency: number;
  accepted: number;
  errored: number;
  violations: number;
  p95: number;
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function frame(title: string, subtitle: string, body: string, legend: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="Inter, Helvetica, Arial, sans-serif">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
  <text x="${MARGIN.left}" y="26" font-size="15" font-weight="700" fill="#14161a">${escapeText(title)}</text>
  <text x="${MARGIN.left}" y="44" font-size="11.5" fill="#5a626e">${escapeText(subtitle)}</text>
  <g transform="translate(${MARGIN.left},${MARGIN.top})">
${body}
  </g>
${legend}
</svg>
`;
}

function legendBlock(strategies: string[]): string {
  const x = WIDTH - MARGIN.right + 24;
  const items = strategies.map((strategy, i) => {
    const y = MARGIN.top + 8 + i * 22;
    return `  <rect x="${x}" y="${y - 9}" width="11" height="11" rx="2" fill="${COLOURS[strategy]}"/>
  <text x="${x + 18}" y="${y}" font-size="11.5" fill="#14161a">${escapeText(strategy)}</text>`;
  });
  return items.join('\n');
}

function xPositions(levels: number[]): number[] {
  const band = PLOT_W / levels.length;
  return levels.map((_, i) => i * band + band / 2);
}

function violationsChart(results: RunResult[], strategies: string[], levels: number[]): string {
  const totals = new Map<string, number>();
  let max = 0;

  for (const strategy of strategies) {
    for (const level of levels) {
      const total = results
        .filter((r) => r.strategy === strategy && r.concurrency === level)
        .reduce((sum, r) => sum + r.violations, 0);
      totals.set(`${strategy}:${level}`, total);
      max = Math.max(max, total);
    }
  }

  const scale = (value: number) => PLOT_H - (value / (max || 1)) * PLOT_H;
  const band = PLOT_W / levels.length;
  const barW = Math.min(26, (band - 16) / strategies.length);
  const parts: string[] = [];

  for (let tick = 0; tick <= 4; tick++) {
    const value = (max / 4) * tick;
    const y = scale(value);
    parts.push(
      `    <line x1="0" y1="${y.toFixed(1)}" x2="${PLOT_W}" y2="${y.toFixed(1)}" stroke="#e2e6ec"/>`,
      `    <text x="-10" y="${(y + 4).toFixed(1)}" font-size="10.5" fill="#5a626e" text-anchor="end">${Math.round(value)}</text>`
    );
  }

  levels.forEach((level, levelIndex) => {
    const centre = levelIndex * band + band / 2;
    const groupW = barW * strategies.length;

    strategies.forEach((strategy, strategyIndex) => {
      const total = totals.get(`${strategy}:${level}`) ?? 0;
      const x = centre - groupW / 2 + strategyIndex * barW;
      const y = scale(total);
      parts.push(
        `    <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(barW - 2).toFixed(1)}" height="${(PLOT_H - y).toFixed(1)}" fill="${COLOURS[strategy]}"/>`
      );
      if (total > 0) {
        parts.push(
          `    <text x="${(x + barW / 2 - 1).toFixed(1)}" y="${(y - 5).toFixed(1)}" font-size="10" fill="#14161a" text-anchor="middle">${total}</text>`
        );
      }
    });

    parts.push(
      `    <text x="${centre.toFixed(1)}" y="${PLOT_H + 20}" font-size="11.5" fill="#14161a" text-anchor="middle">n = ${level}</text>`
    );
  });

  parts.push(
    `    <line x1="0" y1="${PLOT_H}" x2="${PLOT_W}" y2="${PLOT_H}" stroke="#8b93a1"/>`,
    `    <text transform="translate(-52,${PLOT_H / 2}) rotate(-90)" font-size="11" fill="#5a626e" text-anchor="middle">overlapping allocations</text>`,
    `    <text x="${PLOT_W / 2}" y="${PLOT_H + 42}" font-size="11" fill="#5a626e" text-anchor="middle">concurrent attempts on one contested slot</text>`
  );

  return parts.join('\n');
}

function latencyChart(results: RunResult[], strategies: string[], levels: number[]): string {
  const medians = new Map<string, number>();
  const worst = new Map<string, number>();
  let max = 1;

  for (const strategy of strategies) {
    for (const level of levels) {
      const runs = results.filter((r) => r.strategy === strategy && r.concurrency === level);
      const p95s = runs.map((r) => r.p95);
      medians.set(`${strategy}:${level}`, median(p95s));
      worst.set(`${strategy}:${level}`, Math.max(...p95s));
      max = Math.max(max, ...p95s);
    }
  }

  const minLog = 0; // 1 ms
  const maxLog = Math.ceil(Math.log10(max));
  const scale = (value: number) => {
    const clamped = Math.max(1, value);
    return PLOT_H - ((Math.log10(clamped) - minLog) / (maxLog - minLog)) * PLOT_H;
  };

  const xs = xPositions(levels);
  const parts: string[] = [];

  for (let exponent = minLog; exponent <= maxLog; exponent++) {
    const value = 10 ** exponent;
    const y = scale(value);
    const label = value >= 1000 ? `${value / 1000} s` : `${value} ms`;
    parts.push(
      `    <line x1="0" y1="${y.toFixed(1)}" x2="${PLOT_W}" y2="${y.toFixed(1)}" stroke="#e2e6ec"/>`,
      `    <text x="-10" y="${(y + 4).toFixed(1)}" font-size="10.5" fill="#5a626e" text-anchor="end">${label}</text>`
    );
  }

  for (const series of [medians, worst]) {
    const isWorst = series === worst;

    for (const strategy of strategies) {
      const points = levels.map((level, i) => {
        const value = series.get(`${strategy}:${level}`) ?? 0;
        return `${xs[i].toFixed(1)},${scale(value).toFixed(1)}`;
      });

      parts.push(
        `    <polyline points="${points.join(' ')}" fill="none" stroke="${COLOURS[strategy]}"` +
          ` stroke-width="${isWorst ? 2.5 : 1.5}"${isWorst ? '' : ' stroke-dasharray="4 3"'}` +
          ` stroke-linejoin="round"/>`
      );

      if (isWorst) {
        levels.forEach((level, i) => {
          const value = series.get(`${strategy}:${level}`) ?? 0;
          parts.push(
            `    <circle cx="${xs[i].toFixed(1)}" cy="${scale(value).toFixed(1)}" r="3.5" fill="${COLOURS[strategy]}"/>`
          );
        });
      }
    }
  }

  levels.forEach((level, i) => {
    parts.push(
      `    <text x="${xs[i].toFixed(1)}" y="${PLOT_H + 20}" font-size="11.5" fill="#14161a" text-anchor="middle">n = ${level}</text>`
    );
  });

  parts.push(
    `    <line x1="0" y1="${PLOT_H}" x2="${PLOT_W}" y2="${PLOT_H}" stroke="#8b93a1"/>`,
    `    <text transform="translate(-52,${PLOT_H / 2}) rotate(-90)" font-size="11" fill="#5a626e" text-anchor="middle">p95 latency, log scale</text>`,
    `    <text x="${PLOT_W / 2}" y="${PLOT_H + 42}" font-size="11" fill="#5a626e" text-anchor="middle">concurrent attempts on one contested slot</text>`
  );

  return parts.join('\n');
}

async function main() {
  const raw = JSON.parse(await readFile(RESULTS, 'utf8')) as { results: RunResult[] };
  const results = raw.results;

  const strategies = [...new Set(results.map((r) => r.strategy))];
  const levels = [...new Set(results.map((r) => r.concurrency))].sort((a, b) => a - b);
  const legend = legendBlock(strategies);
  const runsPerCell = results.filter(
    (r) => r.strategy === strategies[0] && r.concurrency === levels[0]
  ).length;

  await mkdir(OUT_DIR, { recursive: true });

  await writeFile(
    join(OUT_DIR, 'fig-correctness.svg'),
    frame(
      'Double-booking under concurrency',
      `Overlapping allocations admitted for one resource, totalled over ${runsPerCell} runs per cell. Correct is zero.`,
      violationsChart(results, strategies, levels),
      legend
    ),
    'utf8'
  );

  await writeFile(
    join(OUT_DIR, 'fig-latency.svg'),
    frame(
      'Correctness is cheap on average and expensive in the tail',
      `p95 latency over ${runsPerCell} runs per cell: solid is the worst run, dashed the median. Logarithmic axis.`,
      latencyChart(results, strategies, levels),
      legend
    ),
    'utf8'
  );

  console.log(`Wrote fig-correctness.svg and fig-latency.svg to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
