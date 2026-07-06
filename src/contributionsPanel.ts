import * as vscode from 'vscode';
import { fetchContributions, getGitHubSession, ContributionData } from './githubService';
import { buildHeatmapSvg, computeStats, buildStatsFooter, escapeHtml } from './heatmapRenderer';

const DISCONNECTED_KEY = 'githubContributions.disconnected';
const CACHE_KEY = 'githubContributions.cachedData';

export class ContributionsPanel {
  private static current: ContributionsPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private lastData?: ContributionData;
  private readonly disposables: vscode.Disposable[] = [];

  public static async createOrShow(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    initialData?: ContributionData
  ) {
    if (ContributionsPanel.current) {
      ContributionsPanel.current.panel.reveal(vscode.ViewColumn.Active);
      if (initialData) {
        ContributionsPanel.current.lastData = initialData;
        ContributionsPanel.current.renderCalendar(initialData);
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'githubContributions.fullView',
      'GitHub Contributions',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
        retainContextWhenHidden: true,
      }
    );

    ContributionsPanel.current = new ContributionsPanel(panel, extensionUri, context, initialData);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly context: vscode.ExtensionContext,
    initialData?: ContributionData
  ) {
    this.panel = panel;

    this.disposables.push(
      this.panel.onDidDispose(() => {
        ContributionsPanel.current = undefined;
        this.disposables.forEach((d) => d.dispose());
      })
    );

    this.disposables.push(
      this.panel.webview.onDidReceiveMessage((message) => {
        if (message.type === 'refresh') {
          this.refresh(true);
        } else if (message.type === 'signIn') {
          this.refresh(true);
        } else if (message.type === 'disconnect') {
          vscode.commands.executeCommand('githubContributions.disconnect');
        } else if (message.type === 'manageAccess') {
          vscode.commands.executeCommand('workbench.action.showAccountsMenu');
        }
      })
    );

    this.disposables.push(
      vscode.window.onDidChangeActiveColorTheme(() => {
        if (this.lastData) {
          this.renderCalendar(this.lastData);
        }
      })
    );

    const cached = initialData ?? (!this.isDisconnected() ? this.getCachedData() : undefined);
    if (cached) {
      this.lastData = cached;
      this.renderCalendar(cached);
      this.refresh(false, true);
    } else {
      this.renderLoading();
      this.refresh(false);
    }
  }

  private isDisconnected(): boolean {
    return this.context.globalState.get<boolean>(DISCONNECTED_KEY, false);
  }

  private getCachedData(): ContributionData | undefined {
    return this.context.globalState.get<ContributionData>(CACHE_KEY);
  }

  private async setCachedData(data: ContributionData | undefined) {
    await this.context.globalState.update(CACHE_KEY, data);
  }

  private async refresh(createIfNone: boolean, silent: boolean = false) {
    if (!createIfNone && this.isDisconnected()) {
      if (!silent) {
        this.renderSignedOut();
      }
      return;
    }

    const session = await getGitHubSession(createIfNone);
    if (!session) {
      if (!silent) {
        this.renderSignedOut();
      }
      return;
    }

    if (!silent) {
      this.renderLoading();
    }

    try {
      const data = await fetchContributions(session);
      this.lastData = data;
      await this.setCachedData(data);
      this.renderCalendar(data);
    } catch (err: any) {
      if (!silent) {
        this.renderError(err?.message ?? String(err));
      }
      // Silent background refresh failures keep showing the cached data
      // rather than replacing a working view with an error.
    }
  }

  private html(body: string): string {
    const webview = this.panel.webview;
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
<body class="full-view">
  ${body}
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }

  private renderLoading() {
    this.panel.webview.html = this.html(`<div class="state"><p>Loading contributions…</p></div>`);
  }

  private renderSignedOut() {
    this.panel.webview.html = this.html(`
      <div class="state">
        <p>Sign in to GitHub to see your contribution calendar.</p>
        <button id="signInBtn">Sign in to GitHub</button>
      </div>
    `);
  }

  private renderError(message: string) {
    this.panel.webview.html = this.html(`
      <div class="state">
        <p class="error">Couldn't load contributions: ${escapeHtml(message)}</p>
        <button id="refreshBtn">Try again</button>
      </div>
    `);
  }

  private renderCalendar(data: ContributionData) {
    const { svg, legendSwatches } = buildHeatmapSvg(data, 14, 4);
    const stats = computeStats(data);

    this.panel.webview.html = this.html(`
      <div class="header">
        <span class="total">${data.totalContributions} contributions in the last year</span>
        <div class="header-actions">
          <button id="refreshBtn" class="icon" title="Refresh">↻</button>
          <button id="disconnectBtn" class="icon" title="Disconnect GitHub">✕</button>
        </div>
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