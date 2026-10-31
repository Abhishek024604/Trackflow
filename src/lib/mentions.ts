// @mention parsing (CMP-006 mention-parser). Mentions resolve only against team members;
// a handle that matches nobody in the team is ignored (no error, no highlight).

export interface MentionableUser {
  id: string;
  name: string | null;
  email: string;
}

const MENTION_PATTERN = /(^|[^\w@])@([\w][\w.-]*)/g;

function emailLocalPart(email: string): string {
  return email.split('@')[0].toLowerCase();
}

/** The handle inserted by autocomplete: the name without spaces, or the email's local part. */
export function mentionHandle(user: MentionableUser): string {
  const fromName = user.name?.replace(/\s+/g, '').toLowerCase();
  return fromName || emailLocalPart(user.email);
}

/** Resolves a handle (without "@") to a team member, by handle or email local part. */
export function findMentionedUser<T extends MentionableUser>(handle: string, members: T[]): T | undefined {
  const wanted = handle.replace(/[.-]+$/, '').toLowerCase();
  if (!wanted) return undefined;
  return (
    members.find((m) => mentionHandle(m) === wanted) ??
    members.find((m) => emailLocalPart(m.email) === wanted)
  );
}

/** Returns the distinct team members mentioned in the text, in order of first mention. */
export function parseMentions<T extends MentionableUser>(text: string, members: T[]): T[] {
  const found: T[] = [];
  const seen = new Set<string>();
  for (const match of Array.from(text.matchAll(MENTION_PATTERN))) {
    const user = findMentionedUser(match[2], members);
    if (user && !seen.has(user.id)) {
      seen.add(user.id);
      found.push(user);
    }
  }
  return found;
}
