import * as vscode from 'vscode';
import { ContributionData } from './githubService';

const COLORS = {
  light: ['#0000001a', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
  dark: ['#ffffff08', '#0e4429', '#006b32', '#26a642', '#3ad454'],
};

export function isDarkTheme(): boolean {
  const kind = vscode.window.activeColorTheme.kind;
  return kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast;
}

export function getPalette(): string[] {
  return isDarkTheme() ? COLORS.dark : COLORS.light;
}

export function getLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Builds the heatmap SVG markup and matching legend swatches.
 * cellSize/cellGap let callers render a compact sidebar version or a
 * larger full-view version from the same logic.
 */
export function buildHeatmapSvg(
  data: ContributionData,
  cellSize: number,
  cellGap: number
): { svg: string; legendSwatches: string } {
  const step = cellSize + cellGap;
  const monthLabelHeight = cellSize + 10;
  const palette = getPalette();
  const labelColor = isDarkTheme() ? '#8b949e' : '#57606a';

  const monthLabels: { x: number; label: string }[] = [];
  let lastMonth = -1;
  data.weeks.forEach((week, wi) => {
    const firstDay = week.days[0];
    if (!firstDay) return;
    const month = new Date(firstDay.date).getMonth();
    if (month !== lastMonth) {
      monthLabels.push({
        x: wi * step,
        label: new Date(firstDay.date).toLocaleString('default', { month: 'short' }),
      });
      lastMonth = month;
    }
  });

  const svgWidth = data.weeks.length * step;
  const svgHeight = monthLabelHeight + 7 * step;

  const monthLabelsSvg = monthLabels
    .map(
      ({ x, label }) =>
        `<text x="${x}" y="12" font-size="${Math.max(10, cellSize)}" fill="${labelColor}" font-family="monospace">${escapeHtml(
          label
        )}</text>`
    )
    .join('');

  const cellsSvg = data.weeks
    .map((week, wi) =>
      week.days
        .map((day, di) => {
          const x = wi * step;
          const y = monthLabelHeight + di * step;
          const level = getLevel(day.count);
          const fill = palette[level];
          const tooltip =
            day.count === 0
              ? `No contributions on ${day.date}`
              : `${day.count} contribution${day.count === 1 ? '' : 's'} on ${day.date}`;
          return `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${fill}"><title>${escapeHtml(
            tooltip
          )}</title></rect>`;
        })
        .join('')
    )
    .join('');

  const svg = `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" class="calendar-svg">${monthLabelsSvg}${cellsSvg}</svg>`;

  const legendSwatches = palette
    .map((color) => `<div class="legend-swatch" style="background:${color}"></div>`)
    .join('');

  return { svg, legendSwatches };
}

export interface ContributionStats {
  total: number;
  longestStreak: number;
  currentStreak: number;
  yearsOnGithub: number;
}

/**
 * Computes total contributions, longest/current streaks (consecutive days
 * with count > 0), and account tenure from the fetched contribution data.
 */
export function computeStats(data: ContributionData): ContributionStats {
  const days = data.weeks.flatMap((w) => w.days);

  let longestStreak = 0;
  let running = 0;
  for (const day of days) {
    if (day.count > 0) {
      running++;
      longestStreak = Math.max(longestStreak, running);
    } else {
      running = 0;
    }
  }

  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  const joinDate = data.createdAt ? new Date(data.createdAt) : undefined;
  const yearsOnGithub = joinDate
    ? Math.max(
        0,
        Math.floor((Date.now() - joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      )
    : 0;

  return {
    total: data.totalContributions,
    longestStreak,
    currentStreak,
    yearsOnGithub,
  };
}

export function buildStatsFooter(stats: ContributionStats): string {
  const items: { value: string; label: string }[] = [
    { value: stats.total.toLocaleString(), label: 'Total Contributions' },
    { value: String(stats.longestStreak), label: 'Longest Streak' },
    { value: String(stats.currentStreak), label: 'Current Streak' },
    { value: `${stats.yearsOnGithub}y`, label: 'On GitHub' },
  ];

  return `<div class="stats-footer">${items
    .map(
      (item) =>
        `<div class="stats-item">
          <div class="stats-value">${item.value}</div>
          <div class="stats-label">${item.label}</div>
        </div>`
    )
    .join('')}</div>`;
}