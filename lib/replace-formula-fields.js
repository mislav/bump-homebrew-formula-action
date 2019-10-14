"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function escape(value, char) {
    return value.replace(new RegExp(`\\${char}`, 'g'), `\\${char}`);
}
// TODO: abort if replacing "url"/"version" fields would result in a downgrade
function default_1(oldContent, replacements) {
    let newContent = oldContent;
    for (const [field, value] of replacements) {
        newContent = newContent.replace(new RegExp(`^(\\s*)${field} +(['"])[^'"]+['"]`, 'm'), (_, sp, q) => `${sp}${field} ${q}${escape(value, q)}${q}`);
    }
    return newContent;
}
exports.default = default_1;
