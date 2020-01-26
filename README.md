# Automerge javascript action
This Action will automerge PR once the PR is labeled 'automerge' and the brach protection rules are satisfied if any
Read more on JS actions <a href=https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-a-javascript-action>here</a>

## Inputs

### `GITHUB_TOKEN`

**Required** To be passed via `"${{ secrets.GITHUB_TOKEN }}"`.
Check how to add secrets <a href=https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets>here</a>

### `AUTOMERGE`
The automerge label which the script will be looking for.
Defaults to `automerge`

### `MERGE_METHOD`
The method for merging which the script will be looking for.
Defaults to `squash`

### `LABEL`
The label for blocking merge even if it is good to merge.
Defaults to `squash`

## Outputs


## Example usage
### Copy the workflow code into a .github/workflows/main.yml

```
name: automerge
on:
  pull_request:
    types:
      - labeled
      - unlabeled
      - synchronize
      - opened
      - edited
      - ready_for_review
      - reopened
      - unlocked
  pull_request_review:
    types:
      - submitted
  status: {}
jobs:
  automerge:
    runs-on: self-hosted
    name: automerge-bot
    steps:
      - name: automerge
        uses: "Instawork/automerge-action-js@master"
        with:
          GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
          AUTOMERGE: automerge
          MERGE_METHOD: squash
        env:
          ACTIONS_STEP_DEBUG: true
```
