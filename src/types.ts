export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description: string;
  url: string;
  stateName: string;
  assignee: string | null;
  labels: string[];
  completedAt: string; // ISO
}

export interface ReleaseTheme {
  heading: string;
  summary: string;
  issueIdentifiers: string[]; // the Linear identifiers (e.g. "ENG-123") this theme claims to cover
}

export interface ReleaseDraft {
  intro: string;
  themes: ReleaseTheme[];
}

/** What a theme looks like after every claimed identifier has been checked against the real set. */
export interface VerifiedTheme {
  heading: string;
  summary: string;
  issues: LinearIssue[]; // only the identifiers that were actually in the completed batch
  droppedIdentifiers: string[]; // claimed by the model, not found in the batch, removed
}
