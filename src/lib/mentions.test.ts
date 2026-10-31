import { findMentionedUser, mentionHandle, parseMentions } from '@/lib/mentions';

const ada = { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com' };
const bob = { id: 'u2', name: null, email: 'bob.smith@example.com' };
const members = [ada, bob];

describe('mentions', () => {
  it('builds handles from the name, or the email when there is no name', () => {
    expect(mentionHandle(ada)).toBe('adalovelace');
    expect(mentionHandle(bob)).toBe('bob.smith');
  });

  it('finds members by handle or email local part, case-insensitively', () => {
    expect(findMentionedUser('AdaLovelace', members)).toBe(ada);
    expect(findMentionedUser('ada', members)).toBe(ada);
    expect(findMentionedUser('bob.smith.', members)).toBe(bob);
    expect(findMentionedUser('carol', members)).toBeUndefined();
  });

  it('returns distinct mentioned team members and ignores strangers and emails', () => {
    const text = 'Hey @adalovelace and @bob.smith, also @ada again. Not @carol, not mail@example.com';
    expect(parseMentions(text, members)).toEqual([ada, bob]);
  });

  it('returns nothing when no one is mentioned', () => {
    expect(parseMentions('plain text', members)).toEqual([]);
  });
});
