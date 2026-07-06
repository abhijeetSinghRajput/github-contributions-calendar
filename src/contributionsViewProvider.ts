import * as vscode from 'vscode';
import { fetchContributions, getGitHubSession, ContributionData } from './githubService';
import { buildHeatmapSvg, computeStats, buildStatsFooter, escapeHtml } from './heatmapRenderer';

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
      } else if (message.type === 'expand') {
        vscode.commands.executeCommand('githubContributions.openFullView', this.lastData);
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

    const { svg, legendSwatches } = buildHeatmapSvg(data, 10, 3);
    const stats = computeStats(data);

    this.view.webview.html = this.html(`
      <div class="header">
        <span class="total">${data.totalContributions} contributions in the last year</span>
        <button id="expandBtn" class="icon" title="Open full view">⛶</button>
      </div>
      ${svg}
      <div class="legend">
        <span>Less</span>
        ${legendSwatches}
        <span>More</span>
      </div>
      ${buildStatsFooter(stats)}
    `);
  }
}