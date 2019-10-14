"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const edit_github_blob_1 = __importDefault(require("./edit-github-blob"));
const replace_formula_fields_1 = __importDefault(require("./replace-formula-fields"));
const calculate_download_checksum_1 = __importDefault(require("./calculate-download-checksum"));
function tarballForRelease(tagName) {
    const { owner, repo } = github_1.context.repo;
    return `https://github.com/${owner}/${repo}/archive/${tagName}.tar.gz`;
}
const run = async () => {
    const token = process.env.COMMITTER_TOKEN || '';
    const apiClient = new github_1.GitHub(token);
    const [owner, repo] = core_1.getInput('homebrew-tap', { required: true }).split('/');
    const formulaName = core_1.getInput('formula-name', { required: true });
    const branch = core_1.getInput('base-branch');
    const filePath = `Formula/${formulaName}.rb`;
    const tagName = github_1.context.ref.replace('refs/tags/', '');
    const downloadUrl = core_1.getInput('download-url') || tarballForRelease(tagName);
    const replacements = new Map();
    replacements.set('url', downloadUrl.toString());
    replacements.set('sha256', await calculate_download_checksum_1.default(apiClient, downloadUrl, 'sha256'));
    const commitMessage = `${formulaName} ${tagName}

Created by https://github.com/mislav/bump-homebrew-formula-action`;
    await edit_github_blob_1.default({
        apiClient,
        owner,
        repo,
        branch,
        filePath,
        commitMessage,
        replace(oldContent) {
            return replace_formula_fields_1.default(oldContent, replacements);
        },
    });
};
run().catch(error => {
    core_1.setFailed(error.toString());
});
