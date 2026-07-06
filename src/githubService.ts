import * as vscode from 'vscode';

export interface ContributionDay {
  date: string;
  count: number;
  color: string;
}

export interface ContributionWeek {
  days: ContributionDay[];
}

export interface ContributionData {
  username: string;
  totalContributions: number;
  weeks: ContributionWeek[];
  createdAt: string;
}

const QUERY = `
query($userName: String!) {
  user(login: $userName) {
    createdAt
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
            color
          }
        }
      }
    }
  }
}
`;

/**
 * Uses VS Code's built-in GitHub authentication provider.
 * No manual token creation needed - this opens the native
 * "Sign in with GitHub" flow and securely stores the resulting session.
 */
export async function getGitHubSession(
  createIfNone: boolean
): Promise<vscode.AuthenticationSession | undefined> {
  try {
    return await vscode.authentication.getSession('github', ['read:user'], {
      createIfNone,
    });
  } catch {
    return undefined;
  }
}

export async function fetchContributions(
  session: vscode.AuthenticationSession
): Promise<ContributionData> {
  const username = session.account.label;

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'vscode-github-contributions-extension',
    },
    body: JSON.stringify({ query: QUERY, variables: { userName: username } }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as any;

  if (json.errors?.length) {
    throw new Error(json.errors.map((e: any) => e.message).join('; '));
  }

  const user = json.data?.user;
  const calendar = user?.contributionsCollection?.contributionCalendar;
  if (!calendar) {
    throw new Error('No contribution data returned for this account.');
  }

  const weeks: ContributionWeek[] = calendar.weeks.map((w: any) => ({
    days: w.contributionDays.map((d: any) => ({
      date: d.date,
      count: d.contributionCount,
      color: d.color,
    })),
  }));

  return {
    username,
    totalContributions: calendar.totalContributions,
    weeks,
    createdAt: user.createdAt,
  };
}