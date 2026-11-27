/** Accounts that exist only in the disposable e2e database. */
export const E2E_USERS = {
  admin: {
    email: 'admin@e2e.test',
    name: 'E2E Admin',
    role: 'admin',
    password: 'e2e-admin-password-123',
    byline: undefined,
  },
  editor: {
    email: 'editor@e2e.test',
    name: 'E2E Editor',
    role: 'editor',
    password: 'e2e-editor-password-123',
    byline: 'the-editors',
  },
  author: {
    email: 'author@e2e.test',
    name: 'E2E Author',
    role: 'author',
    password: 'e2e-author-password-123',
    byline: 'farzana-akter',
  },
} as const;
