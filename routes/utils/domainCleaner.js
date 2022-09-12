const psl = require('psl');

/**
 * Returns the cleaned up domain part (with or without subdomain) from given url
 * @param {string} url - ex. https://www.draftss.com/about
 * @param {boolean} keepSubdomain - If false returns domain along with subdomain (ex. blog.abc.com) otherwise
 * removes it (ex. abc.com).
 * @default false
 * @return {string}
 */
function domainCleaner(url, keepSubdomain=true) {
    const httpRegex = new RegExp('^(((http(s)?:\/\/)(www\\.)?)|(www\\.))', 'gi');

    // ----------- STAGE 1: Remove the protocol from url
    let cleanedDomain = url.replace(httpRegex, '');

    // ----------- STAGE 2: Remove any path from the url
    cleanedDomain = cleanedDomain.split('/')[0];

    // ----------- STAGE 3: Remove the subdomain if needed
    if (keepSubdomain) {
        cleanedDomain = psl.get(cleanedDomain) || '';
    }

    return cleanedDomain;
}

module.exports = {
    domainCleaner: domainCleaner,
};

