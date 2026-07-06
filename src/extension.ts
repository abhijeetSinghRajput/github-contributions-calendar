import * as vscode from 'vscode';
import { ContributionsViewProvider } from './contributionsViewProvider';
import { ContributionsPanel } from './contributionsPanel';
import { ContributionData } from './githubService';

export function activate(context: vscode.ExtensionContext) {
  const provider = new ContributionsViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ContributionsViewProvider.viewType, provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('githubContributions.refresh', () => provider.refresh(true))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('githubContributions.signIn', () => provider.refresh(true))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'githubContributions.openFullView',
      (initialData?: ContributionData) => ContributionsPanel.createOrShow(context.extensionUri, initialData)
    )
  );

  // Keep the view in sync if the user signs in/out of GitHub elsewhere in VS Code.
  context.subscriptions.push(
    vscode.authentication.onDidChangeSessions((e) => {
      if (e.provider.id === 'github') {
        provider.refresh(false);
      }
    })
  );
}

export function deactivate() {}