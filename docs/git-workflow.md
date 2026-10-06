# Git Workflow

## Branches

`main` is the stable branch.

Feature work uses focused branches:

```text
feat/bootstrap
feat/database-schema
feat/articles-api
feat/homepage
feat/localization
```

## Rules

- Never develop directly on `main`.

- One issue per focused branch.

- Keep commits small and meaningful.

- Review `git diff` before committing.

- Never commit secrets.

- Open pull requests for completed work.

- Prefer normal merges/rebases over rewriting shared history.

## Commit style

Use conventional, readable messages such as:

```text
chore: bootstrap newsroom workspace
feat(api): add article endpoint
feat(web): build article page
fix(api): reject unpublished articles
docs: update architecture
```

## Normal workflow

```text
main
 ↓
feature branch
 ↓
implementation
 ↓
tests / quality checks
 ↓
review diff
 ↓
commit
 ↓
push
 ↓
pull request
 ↓
merge
```
