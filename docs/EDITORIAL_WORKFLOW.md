# Editorial workflow

## Roles

|                                      | Admin | Editor |              Author               |
| ------------------------------------ | :---: | :----: | :-------------------------------: |
| Create articles                      |   ✓   |   ✓    | ✓ (always under their own byline) |
| Edit any article                     |   ✓   |   ✓    |          own drafts only          |
| Submit for review / withdraw         |   ✓   |   ✓    |             own work              |
| Publish, unpublish, archive, restore |   ✓   |   ✓    |                 ✗                 |
| Feature on front page                |   ✓   |   ✓    |                 ✗                 |
| Delete (non-published only)          |   ✓   |   ✓    |            own drafts             |
| Sections, bylines, tags              |   ✓   |   ✓    |                 ✗                 |
| Upload media / edit own media        |   ✓   |   ✓    |                 ✓                 |

Authors cannot see other people's work in the CMS at all (it returns 404, not 403, to avoid
confirming existence). Rules live in `apps/web/src/server/content/workflow.ts` and are enforced on
the server for every action.

Accounts are created only from the command line (`pnpm user:create`). There is no public sign-up
and, as yet, no user-management screen.

## Statuses

```text
          submit            publish
  draft ─────────► review ─────────► published
    ▲  ◄───────────  │                 │   │
    │    withdraw    │ publish         │   │ archive
    │                └──────────►──────┘   ▼
    │◄────────── unpublish ────────────  archived
    └────────────── restore ─────────────────┘
```

- **Publish** requires body text, sets `published_at` the first time, and makes the article live
  immediately.
- **Unpublish** returns it to draft; it disappears from every public surface on the next request.
- An author's article is locked while in review; they can withdraw it to keep editing.
- Editing a published article records an "Updated" date.
- Saving and changing status happen in one transaction: "Publish" on the edit screen saves the
  current text _and_ publishes it.

## Writing in the CMS

- **Headline** generates the slug until you edit the slug yourself. Changing a published slug
  breaks existing links (no redirects yet).
- **Body** supports paragraphs, H2–H4, bold, italic, links (http/https/mailto), quotes, lists and
  section breaks. Anything else is refused by the server.
- **Excerpt** is used on listings when there is no dek; **SEO title/description** default to the
  headline and dek.
- **Preview** renders the last _saved_ version in the public layout, behind login.
- If someone else saves the article after you opened it, your save is refused with a message
  instead of silently overwriting their work. Reload and reapply your edits.
- There is no autosave. The editor warns before leaving with unsaved changes.

## Content standards for the demo seed

The seeded articles and contributor profiles are fictional and labelled as such on every page
(`site.demoNotice` in `src/config/site.ts`). They contain no sources, quotes or statistics.
Remove them (or start from an empty database) and set `demoNotice: false` before launch.
