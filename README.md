# GitHub Contributions Calendar

A VS Code extension that shows your GitHub contribution heatmap in a sidebar
panel, just like the one on your GitHub profile.

## Features

- Full contribution heatmap (last 12 months) in the Activity Bar
- Uses VS Code's built-in GitHub sign-in — no manual token needed
- Refresh button in the view title bar
- Auto-refreshes when you sign in/out of GitHub elsewhere in VS Code

## Getting started (development)

```bash
npm install
npm run build
```

Then press **F5** in VS Code (with this folder open as the workspace root).
This launches an "Extension Development Host" window with the extension loaded.

Click the GitHub Contributions icon in the Activity Bar, then "Sign in to GitHub"
when prompted. VS Code will open the standard GitHub OAuth flow in your browser.

## How it works

- `src/githubService.ts` — calls `vscode.authentication.getSession('github', ...)`
  to get an OAuth token, then queries GitHub's GraphQL API
  (`contributionsCollection.contributionCalendar`) for the day-by-day counts
  and colors GitHub itself would use.
- `src/contributionsViewProvider.ts` — implements `WebviewViewProvider` and
  renders the heatmap as a grid of `<div>`s, styled with VS Code theme
  variables so it matches light/dark themes.
- `media/main.js` / `media/main.css` — webview client script and styles.

## Packaging

```bash
npm install -g @vscode/vsce   # if not already installed
npm run build
vsce package
```

This produces a `.vsix` file you can install locally via
**Extensions: Install from VSIX...** in the Command Palette, or publish to
the Marketplace with `vsce publish`.

## Possible next steps

- Cache the last fetched data (`context.globalState`) so the view isn't blank
  while refetching
- Add a status bar item showing today's contribution count
- Let the user view another GitHub username's calendar, not just their own
- Add month labels above the grid
