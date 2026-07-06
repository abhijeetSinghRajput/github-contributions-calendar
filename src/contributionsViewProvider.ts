import * as vscode from 'vscode';
import { fetchContributions, getGitHubSession, ContributionData } from './githubService';
import { buildHeatmapSvg, computeStats, buildStatsFooter, escapeHtml } from './heatmapRenderer';

const DISCONNECTED_KEY = 'githubContributions.disconnected';
const CACHE_KEY = 'githubContributions.cachedData';

export class ContributionsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'githubContributions.calendarView';

  private view?: vscode.WebviewView;
  private lastData?: ContributionData;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly context: vscode.ExtensionContext
  ) {
    vscode.window.onDidChangeActiveColorTheme(() => {
      if (this.lastData) {
        this.renderCalendar(this.lastData);
      }
    });
  }

  private isDisconnected(): boolean {
    return this.context.globalState.get<boolean>(DISCONNECTED_KEY, false);
  }

  private async setDisconnected(value: boolean) {
    await this.context.globalState.update(DISCONNECTED_KEY, value);
  }

  private getCachedData(): ContributionData | undefined {
    return this.context.globalState.get<ContributionData>(CACHE_KEY);
  }

  private async setCachedData(data: ContributionData | undefined) {
    await this.context.globalState.update(CACHE_KEY, data);
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
      } else if (message.type === 'disconnect') {
        vscode.commands.executeCommand('githubContributions.disconnect');
      } else if (message.type === 'manageAccess') {
        vscode.commands.executeCommand('workbench.action.showAccountsMenu');
      }
    });

    const cached = !this.isDisconnected() ? this.getCachedData() : undefined;
    if (cached) {
      // Render last-known data immediately - no loading spinner - then quietly
      // check for anything newer in the background.
      this.lastData = cached;
      this.renderCalendar(cached);
      this.refresh(false, true);
    } else {
      this.renderLoading();
      this.refresh(false);
    }
  }

  public async refresh(createIfNone: boolean = true, silent: boolean = false) {
    if (!this.view) {
      return;
    }

    if (createIfNone) {
      // An explicit user action (Sign in / Refresh) always takes precedence
      // over a previous disconnect.
      await this.setDisconnected(false);
    } else if (this.isDisconnected()) {
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

  /**
   * Clears this extension's local view AND its on-disk cache, and stops it
   * from silently reconnecting on the next reload. This does NOT revoke the
   * underlying GitHub session in VS Code - that session is shared across
   * extensions, and only VS Code's own Accounts menu can revoke it. We make
   * that distinction explicit to the user rather than implying we logged
   * them out entirely.
   */
  public async disconnect() {
    const confirmed = await vscode.window.showWarningMessage(
      'Disconnect GitHub Contributions Calendar?',
      {
        modal: true,
        detail:
          "This clears the extension's local view and cached data. It does not sign you out of GitHub in VS Code - your session may still be used by other extensions. To fully revoke this extension's access, use VS Code's Accounts menu afterward.",
      },
      'Disconnect'
    );

    if (confirmed !== 'Disconnect') {
      return;
    }

    this.lastData = undefined;
    await this.setDisconnected(true);
    await this.setCachedData(undefined);
    this.renderSignedOut();
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
        <div class="header-actions">
          <button id="expandBtn" class="icon" title="Open full view">⛶</button>
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