<div align="center">
  <img src="media/screenshots/logo.png" alt="GitHub Contributions Calendar logo" width="96" height="96" />

  <h1>GitHub Contributions Calendar</h1>

  <p>
    A VS Code extension that shows your GitHub contribution heatmap right in
    the sidebar — no browser tab, no manual token, just your usual GitHub sign-in.
  </p>

  <p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=mrcodium.github-contributions-calendar">
    <img
      src="media/screenshots/install-from-marketplace.png"
      alt="VS Code"
      height="28"
      style="vertical-align: middle;"
    />
  </a>
</p>



<p align="center">
  <a href="https://github.com/abhijeetsinghrajput/github-contributions-calendar">
    <img alt="made by" src="https://img.shields.io/badge/made%20by-abhijeetsinghrajput-blueviolet?style=flat" />
  </a>
  <img alt="license" src="https://img.shields.io/badge/license-MIT-brightgreen?style=flat" />
  <img alt="GitHub stars" src="https://img.shields.io/github/stars/abhijeetsinghrajput/github-contributions-calendar?style=flat&color=blue" />
  <img alt="GitHub forks" src="https://img.shields.io/github/forks/abhijeetsinghrajput/github-contributions-calendar?style=flat&color=blue" />
  <img alt="VS Code Marketplace Installs" src="https://vsmarketplacebadges.dev/installs/mrcodium.github-contributions-calendar.svg?color=blue" />
  <img alt="VS Code Marketplace Rating" src="https://vsmarketplacebadges.dev/rating/mrcodium.github-contributions-calendar.svg?color=blue" />
</p>

<img src="media/screenshots/demo.gif" alt="GitHub Contributions Calendar logo" width="600"  />
</div>

<details>
<summary>Table of Contents</summary>

- [About](#-about)
- [Getting Started](#-getting-started)
- [Features](#-features)
- [Contributing](#-contributing)
- [How It Works](#how-it-works)
- [Development](#development)
- [Roadmap](#-roadmap)
- [Follow Me](#-follow-me)
- [Give A Star](#-give-a-star)
- [License](#-license)

</details>

## 📖 About

**GitHub Contributions Calendar** brings your GitHub profile's contribution
heatmap directly into VS Code. Sign in once with your GitHub account, and the
Activity Bar shows a live, scalable SVG heatmap of your last 12 months of
contributions — styled to match your current VS Code theme, light or dark.

Under the hood it uses VS Code's built-in GitHub authentication provider (so
there's no personal access token to create, copy, or manage) and queries
GitHub's own GraphQL contribution API, the same data source that powers the
heatmap on github.com.

![Contribution heatmap preview](media/screenshots/banner.png)

## ✨ Features

- 📅 Full contribution heatmap (last 12 months), scaled to fit your sidebar — no horizontal scrolling
- 🔐 Uses VS Code's built-in GitHub sign-in — no personal access token to create or paste
- 🌗 Matches your VS Code theme (light/dark), and updates live if you switch themes
- 🔄 One-click refresh, right in the view's title bar

## 🔧 Contributing

<img src="https://github.com/abhijeetsinghrajput.png" alt="abhijeetsinghrajput" width="64" height="64" style="border-radius:50%" />

Contributions are what make the open source community such an amazing place
to learn, inspire, and create. Any contributions you make are **greatly
appreciated**.

1. Fork the repo
2. Create a new branch (`git checkout -b improve-feature`)
3. Make your changes
4. Commit your changes (`git commit -am 'Improve feature'`)
5. Push to the branch (`git push origin improve-feature`)
6. Open a Pull Request

Please open an issue first to discuss what you'd like to change.

## How It Works

- Authentication uses `vscode.authentication.getSession('github', ...)` —
  VS Code's own GitHub sign-in flow. Your credentials never touch this
  extension directly; VS Code manages the session for you.
- Contribution data comes from GitHub's GraphQL API
  (`contributionsCollection.contributionCalendar`), the same data source
  that powers the heatmap on your GitHub profile.
- The heatmap is rendered as a single scalable SVG (with month labels),
  so it resizes cleanly with the sidebar instead of scrolling.
- Colors are theme-aware: a light and dark palette are picked based on
  your current VS Code color theme.

## Development

Want to modify or build this extension locally?

```bash
npm install
npm run build
```

Then press **F5** in VS Code (with this folder open as the workspace root)
to launch an "Extension Development Host" window with your changes loaded.

| Method          | Description                                  | Action          |
| --------------- | -------------------------------------------- | --------------- |
| 🔧 Manual Build | Bundle the extension into `out/extension.js` | `npm run build` |
| 📦 Package      | Produce an installable `.vsix` file          | `vsce package`  |

```bash
npm install -g @vscode/vsce   # if not already installed
npm run build
vsce package
```

Install the resulting `.vsix` locally via **Extensions: Install from
VSIX...** in the Command Palette, or publish it with `vsce publish`.

## 🗺️ Roadmap

- Cache the last fetched data (`context.globalState`) so the view isn't blank
  while refetching
- Add a status bar item showing today's contribution count
- Let the user view another GitHub username's calendar, not just their own

## 📡 Follow Me

<p>
  <a href="https://github.com/abhijeetsinghrajput"><img alt="GitHub" src="https://img.shields.io/badge/abhijeetsinghrajput-181717?logo=github&logoColor=white" /></a>
  <a href="https://linkedin.com/in/your-linkedin-handle"><img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-your--linkedin--handle-0A66C2?logo=linkedin&logoColor=white" /></a>
  <a href="https://youtube.com/@mrcodium"><img alt="YouTube" src="https://img.shields.io/badge/YouTube-%40mrcodium-FF0000?logo=youtube&logoColor=white" /></a>
</p>

## ⭐ Give A Star

If you found this project useful, give it a star to help more people discover it!

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
