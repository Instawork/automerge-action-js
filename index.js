const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');

function getPullRequestFromContext() {
  if (!context.payload) {
    return undefined;
  }

  if (context.payload.pull_request && context.payload.pull_request.number) {
    // pull_request event
    return context.payload.pull_request.number;
  }

  if (!context.payload.check_suite || !context.payload.check_suite.pull_requests) {
    return undefined;
  }

  // check_suite event
  for (const pullRequest of context.payload.check_suite.pull_requests) {
    if (pullRequest.number) {
      return pullRequest.number;
    }
  }

  return undefined;
}

function pullRequestHasLabel(pullRequestResponseData, labelName) {
  if (!pullRequestResponseData.labels) {
    return false;
  }

  const res = pullRequestResponseData.labels.filter((label) => label.name === labelName);

  return res.length > 0;
}

const run = async () => {

  const { owner, repo } = context.repo;
  core.debug(`repository: ${owner}/${repo}`);

  const pull_number = getPullRequestFromContext();
  if (!pull_number) {
    core.warning('Could not get pull request information from context');
    return;
  }
  core.info(`pull request number: ${pull_number}`);

  const token = core.getInput('GITHUB_TOKEN', { require: true });
  const automergeLabel = core.getInput('AUTOMERGE') != ''?core.getInput('AUTOMERGE'): 'automerge';
  const blockLabel = core.getInput('LABEL') != ''?core.getInput('LABEL'): '';
  const mergeMethod = core.getInput('MERGE_METHOD') != ''? core.getInput('MERGE_METHOD'):'squash';
  const github = new GitHub(token);


  core.info(`auto merge label is ${automergeLabel}`);
  core.info(`auto merge label is ${blockLabel}`);
  core.info(`auto merge label is ${mergeMethod}`);

  const pullRequestResponse = await github.pulls.get({
    owner,
    repo,
    pull_number,
  });

  core.info(JSON.stringify(pullRequestResponse));

  const pullRequestResponseStatus = pullRequestResponse.status || undefined;
  const pullRequestResponseData = pullRequestResponse.data || {};

  core.info(JSON.stringify(pullRequestResponseStatus));
  core.info(JSON.stringify(pullRequestResponseData));

  if (pullRequestResponseStatus !== 200 || Object.entries(pullRequestResponseData).length === 0) {
    throw new Error('Could not get pull request information from API');
  }
  core.info(`retrieved data for pull request #${pull_number}`);

  if (!pullRequestHasLabel(pullRequestResponseData, automergeLabel)) {
    core.info(`label found ${pullRequestResponseData}`);
    core.warning('Pull request does not have the automerge label');
    return;
  }

  if (pullRequestHasLabel(pullRequestResponseData, blockLabel)) {
    core.warning('Pull request has the work-in-progress label');
    return;
  }

  core.info(`pull request mergeable: ${pullRequestResponseData.mergeable}`);
  core.info(`pull request merged: ${pullRequestResponseData.merged}`);
  core.info(`pull request state: ${pullRequestResponseData.state}`);
  if (
    pullRequestResponseData.state !== 'open'
    || pullRequestResponseData.mergeable !== true
    || pullRequestResponseData.merged !== false
  ) {
    core.warning('Pull Request is not in a mergeable state');
    return;
  }

  try {
    core.info(`Trying to merge #${pull_number}`);

    const commit_title = `${pullRequestResponseData.title} (#${pull_number})`;
    const commit_message = pullRequestResponseData.body.replace(/(## PR Checklist[\w\W\s\S]*)/gm, '').trim();

    core.info(`commit_title is ${commit_title}`);
    core.info(`commit_message is ${commit_message}`);
    core.info(`owner is ${owner}`);
    core.info(`repo is ${repo}`);
    core.info(`pull_number is ${pull_number}`);
    core.info(`mergeMethod is ${mergeMethod}`);

     const pullRequestMergeResponse = await github.pulls.merge({
      owner,
      repo,
      pull_number,
      commit_title,
      commit_message,
      merge_method: mergeMethod,
    });


    if (pullRequestMergeResponse.status !== 200) {
      core.info(`failed with status`);
      core.info(pullRequestMergeResponse.status);
      core.warning(pullRequestMergeResponse.data.message);
      return;
    }

    core.info(pullRequestMergeResponse.data.message);

  } catch (e) {
    core.warning(e.message);
  }
};

run().catch((error) => {
  core.setFailed(`An unexpected error occurred: ${error}, ${error.stack}.`);
});
