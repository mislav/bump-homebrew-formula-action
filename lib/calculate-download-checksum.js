"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const crypto_1 = require("crypto");
const https_1 = require("https");
function stream(url, headers, cb) {
    return new Promise((resolve, reject) => {
        https_1.get(url, { headers }, res => {
            if (res.statusCode && res.statusCode > 300) {
                throw new Error(`HTTP ${res.statusCode}: ${url}`);
            }
            res.on('data', d => cb(d));
            res.on('end', () => resolve());
        }).on('error', err => reject(err));
    });
}
async function resolveDownload(api, url) {
    if (url.hostname == 'github.com') {
        const archive = url.pathname.match(/^\/([^/]+)\/([^/]+)\/archive\/([^/]+)(\.tar\.gz|\.zip)$/);
        if (archive != null) {
            const [, owner, repo, ref, ext] = archive;
            const res = await api.repos.getArchiveLink({
                owner,
                repo,
                archive_format: ext == '.zip' ? 'zipball' : 'tarball',
                ref,
                request: {
                    redirect: 'manual',
                },
            });
            const loc = 'location' in res.headers ? res.headers['location'] : '';
            // HACK: removing "legacy" from the codeload URL ensures that we get the
            // same archive file as web download. Otherwise, the downloaded archive
            // contains resolved commit SHA instead of the tag name in directory path.
            return new url_1.URL(loc.replace('/legacy.', '/'));
        }
        const release = url.pathname.match(/^\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/(.+)$/);
        if (release != null) {
            const [, owner, repo, tag, path] = release;
            const res = await api.repos.getReleaseByTag({ owner, repo, tag });
            const asset = res.data.assets.find(a => a.name == path);
            if (asset == null) {
                throw new Error(`could not find asset '${path}' in '${tag}' release`);
            }
            const assetRes = await api.request(asset.url, {
                headers: { accept: 'application/octet-stream' },
                request: { redirect: 'manual' },
            });
            const loc = 'location' in assetRes.headers ? assetRes.headers['location'] : '';
            return new url_1.URL(loc);
        }
    }
    return url;
}
async function default_1(api, url, algorithm) {
    const downloadUrl = await resolveDownload(api, new url_1.URL(url));
    const requestHeaders = { accept: 'application/octet-stream' };
    const hash = crypto_1.createHash(algorithm);
    await stream(downloadUrl, requestHeaders, chunk => hash.update(chunk));
    return hash.digest('hex');
}
exports.default = default_1;
