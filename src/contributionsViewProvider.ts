import * as vscode from 'vscode';
import { fetchContributions, getGitHubSession, ContributionData } from './githubService';

const CELL_SIZE = 10;
const CELL_GAP = 3;
const STEP = CELL_SIZE + CELL_GAP;
const MONTH_LABEL_HEIGHT = 20;

const COLORS = {
  light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  dark: ["#252527", "#0e4429", "#006b32", "#26a642", "#3ad454"],
};

function getPalette(): string[] {
  const kind = vscode.window.activeColorTheme.kind;
  const isDark =
    kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast;
  return isDark ? COLORS.dark : COLORS.light;
}

function isDarkTheme(): boolean {
  const kind = vscode.window.activeColorTheme.kind;
  return kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast;
}

function getLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

export class ContributionsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'githubContributions.calendarView';

  private view?: vscode.WebviewView;
  private lastData?: ContributionData;

  constructor(private readonly extensionUri: vscode.Uri) {
    vscode.window.onDidChangeActiveColorTheme(() => {
      if (this.lastData) {
        this.renderCalendar(this.lastData);
      }
    });
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
    };

    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.type === 'signIn') {
        vscode.commands.executeCommand('githubContributions.signIn');
      } else if (message.type === 'refresh') {
        vscode.commands.executeCommand('githubContributions.refresh');
      }
    });

    this.renderLoading();
    this.refresh(false);
  }

  public async refresh(createIfNone: boolean = true) {
    if (!this.view) {
      return;
    }

    const session = await getGitHubSession(createIfNone);
    if (!session) {
      this.renderSignedOut();
      return;
    }

    this.renderLoading();

    try {
      const data = await fetchContributions(session);
      this.lastData = data;
      this.renderCalendar(data);
    } catch (err: any) {
      this.renderError(err?.message ?? String(err));
    }
  }

  private html(body: string): string {
    const webview = this.view!.webview;
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'main.css')
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'main.js')
    );
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource}; script-src ${webview.cspSource};">
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  ${body}
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }

  private renderLoading() {
    if (!this.view) return;
    this.view.webview.html = this.html(`<div class="state"><p>Loading contributions…</p></div>`);
  }

  private renderSignedOut() {
    if (!this.view) return;
    this.view.webview.html = this.html(`
      <div class="state">
        <p>Sign in to GitHub to see your contribution calendar.</p>
        <button id="signInBtn">Sign in to GitHub</button>
      </div>
    `);
  }

  private renderError(message: string) {
    if (!this.view) return;
    this.view.webview.html = this.html(`
      <div class="state">
        <p class="error">Couldn't load contributions: ${escapeHtml(message)}</p>
        <button id="refreshBtn">Try again</button>
      </div>
    `);
  }

  private renderCalendar(data: ContributionData) {
    if (!this.view) return;

    const palette = getPalette();
    const labelColor = isDarkTheme() ? '#8b949e' : '#57606a';

    // Month labels: emit a label whenever the month changes going into a new week column.
    const monthLabels: { x: number; label: string }[] = [];
    let lastMonth = -1;
    data.weeks.forEach((week, wi) => {
      const firstDay = week.days[0];
      if (!firstDay) return;
      const month = new Date(firstDay.date).getMonth();
      if (month !== lastMonth) {
        monthLabels.push({
          x: wi * STEP,
          label: new Date(firstDay.date).toLocaleString('default', { month: 'short' }),
        });
        lastMonth = month;
      }
    });

    const svgWidth = data.weeks.length * STEP;
    const svgHeight = MONTH_LABEL_HEIGHT + 7 * STEP;

    const monthLabelsSvg = monthLabels
      .map(
        ({ x, label }) =>
          `<text x="${x}" y="12" font-size="10" fill="${labelColor}" font-family="monospace">${escapeHtml(label)}</text>`
      )
      .join('');

    const cellsSvg = data.weeks
      .map((week, wi) =>
        week.days
          .map((day, di) => {
            const x = wi * STEP;
            const y = MONTH_LABEL_HEIGHT + di * STEP;
            const level = getLevel(day.count);
            const fill = palette[level];
            const tooltip =
              day.count === 0
                ? `No contributions on ${day.date}`
                : `${day.count} contribution${day.count === 1 ? '' : 's'} on ${day.date}`;
            return `<rect x="${x}" y="${y}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="2" fill="${fill}"><title>${escapeHtml(tooltip)}</title></rect>`;
          })
          .join('')
      )
      .join('');

    const legendHtml = palette
      .map((color) => `<div class="legend-swatch" style="background:${color}"></div>`)
      .join('');

    this.view.webview.html = this.html(`
      <div class="header">
        <span class="total">${data.totalContributions} contributions in the last year</span>
        <button id="refreshBtn" title="Refresh">↻</button>
      </div>
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" class="calendar-svg">
        ${monthLabelsSvg}
        ${cellsSvg}
      </svg>
      <div class="legend">
        <span>Less</span>
        ${legendHtml}
        <span>More</span>
      </div>
    `);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}