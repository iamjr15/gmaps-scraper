/**
 * ----------------------------------------------------------------------------
 * This file contains extra helper functions and classes for Domain Search API.
 * ----------------------------------------------------------------------------
 */

const axios = require('axios');
const randomUseragent = require('random-useragent');

/** @classdesc Error class for NormalLink */
class NormalLinkError extends Error {
    /**
     * @param {string} message - Error message
     */
    constructor(message) {
        super(message);

        this.name = 'NormalLinkError';
        this.date = new Date();
    }
}

/** @classdesc Error class for FacebookTwitterDescription */
class FacebookTwitterDescriptionError extends Error {
    /**
     * @param {string} message - Error message
     */
    constructor(message) {
        super(message);

        this.name = 'FacebookTwitterDescriptionError';
        this.date = new Date();
    }
}

/** @classdesc Error class for ContactLinks */
class ContactLinksError extends Error {
    /**
     * @param {string} message - Error message
     */
    constructor(message) {
        super(message);

        this.name = 'ContactLinksError';
        this.date = new Date();
    }
}

/** @classdesc Error class for LinkedinResults */
class LinkedinResultsError extends Error {
    /**
     * @param {string} message - Error message
     */
    constructor(message) {
        super(message);

        this.name = 'LinkedinResultsError';
        this.date = new Date();
    }
}

/** @classdesc Error class for SiteDomainResults */
class SiteDomainResultsError extends Error {
    /**
     * @param {string} message - Error message
     */
    constructor(message) {
        super(message);

        this.name = 'SiteDomainResultsError';
        this.date = new Date();
    }
}

/**
 * Returns Google search result hyperlinks based on this domain.
 * @param {string} domain - The domain name recieved in request body (ex. draftss.com)
 * @return {Promise<[]>}
 */
async function getNormalLinks(domain) {
    const encodedDomain = encodeURIComponent(domain);
    const allLinks = [];

    // For google search rapidapi API
    const options = {
        method: 'GET',
        url: 'https://google-search3.p.rapidapi.com/api/v1/search/q=' + encodedDomain + '&num=30',
        headers: {
            'x-rapidapi-key': 'fe33def096msha6d8530c044409bp1e33e6jsnaf274ba048fa',
            'x-rapidapi-host': 'google-search3.p.rapidapi.com',
        },
    };

    try {
        let googleSearchResponse = await axios.request(options);
        // other api -> data.result['organic_results']
        let results = googleSearchResponse.data.results;
        results.forEach((result) => {
            allLinks.push(result.link);
        });

        // If it failed to fetch search results, try again
        if (allLinks.length === 0) {
            googleSearchResponse = await axios.request(options);
            results = googleSearchResponse.data.results;
            results.forEach((result) => {
                allLinks.push(result.link);
            });
        }
        return allLinks;
    } catch (e) {
        throw new NormalLinkError(e.message);
    }
}

/**
 * Fetches Twitter and Facebook query google search result descriptions
 * @param {string} domain - The domain name recieved in request body (ex. draftss.com)
 * @return {Promise<[]>}
 * @throws Error
 */
async function getFacebookTwitterDescriptions(domain) {
    const encodedDomain = encodeURIComponent(domain);
    const allDescriptions = [];
    const query = `email "@${encodedDomain}" site:twitter.com OR site:facebook.com`;

    // For google search rapidapi API
    const options = {
        method: 'GET',
        url: `https://google-search3.p.rapidapi.com/api/v1/search/q=${query}&num=30`,
        headers: {
            'x-rapidapi-key': 'fe33def096msha6d8530c044409bp1e33e6jsnaf274ba048fa',
            'x-rapidapi-host': 'google-search3.p.rapidapi.com',
        },
    };

    try {
        let googleSearchResponse = await axios.request(options);
        let results = googleSearchResponse.data.results;

        results.forEach((result) => {
            allDescriptions.push(result.description);
        });

        // If it failed to fetch search results, try again
        if (allDescriptions.length === 0) {
            googleSearchResponse = await axios.request(options);
            results = googleSearchResponse.data.results;
            results.forEach((result) => {
                allDescriptions.push(result.description);
            });
        }
        return allDescriptions;
    } catch (e) {
        throw new FacebookTwitterDescriptionError(e.message);
    }
}

/**
 * Returns google search result hyperlinks for contact search on this domain and company name
 * @param {string} domain - The domain name recieved in request body (ex. draftss.com)
 * @return {Promise<any[]>}
 * @throws Error
 */
async function getContactLinks(domain) {
    const encodedDomain = encodeURIComponent(domain);
    const query = `"about" "contact" "team" site:${encodedDomain}`;
    /** @type {*[]} */
    const allLinks = [];

    // For google search rapidapi API
    const options = {
        method: 'GET',
        url: `https://google-search3.p.rapidapi.com/api/v1/search/q=${query}&num=10`,
        headers: {
            'x-rapidapi-key': 'fe33def096msha6d8530c044409bp1e33e6jsnaf274ba048fa',
            'x-rapidapi-host': 'google-search3.p.rapidapi.com',
        },
    };

    try {
        let googleSearchResponse = await axios.request(options);
        let results = googleSearchResponse.data.results;
        results.forEach((result) => {
            allLinks.push(result.link);
        });

        // If it failed to fetch search results, try again
        if (allLinks.length === 0) {
            googleSearchResponse = await axios.request(options);
            results = googleSearchResponse.data.results;
            results.forEach((result) => {
                allLinks.push(result.link);
            });
        }
        return allLinks;
    } catch (e) {
        throw new ContactLinksError(e.message);
    }
}

/**
 * Fetches results (title, description) for linkedin profiles of people related to this domain. Also returns the
 * company name fetched through clearbit (or default).
 * @param {string} domain - The domain name recieved in request body (ex. draftss.com)
 * @return {Promise<{allResults: [{title: string, description: string}], companyName: string}>}
 * @throws Error
 */
async function getLinkedinResults(domain) {
    // Fwtch the company name
    let companyName;
    const clearbitResponse = await axios.get(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${domain}`);
    if (clearbitResponse.status === 200) {
        // Use company name in response
        if (clearbitResponse.data.length > 0) {
            companyName = clearbitResponse.data[0].name;
        } else {
            companyName = domain.replace('.com', '');
        }
    } else {
        // Default to domain
        companyName = domain.replace('.com', '');
    }

    const encodedDomain = encodeURIComponent(domain);
    // eslint-disable-next-line max-len
    const query = `"${companyName}" "@${encodedDomain}" "@gmail.com" OR "@outlook.com" OR "@hey.com" OR "@yahoo.com" OR "@hotmail.com" site:linkedin.com/in/`;
    const allResults = [];

    // For google search rapidapi API
    const options = {
        method: 'GET',
        url: `https://google-search3.p.rapidapi.com/api/v1/search/q=${query}&num=10`,
        headers: {
            'x-rapidapi-key': 'fe33def096msha6d8530c044409bp1e33e6jsnaf274ba048fa',
            'x-rapidapi-host': 'google-search3.p.rapidapi.com',
        },
    };

    try {
        let googleSearchResponse = await axios.request(options);
        let results = googleSearchResponse.data.results;
        results.forEach((result) => {
            allResults.push({
                title: result.title,
                description: result.description,
            });
        });

        // If it failed to fetch search results, try again
        if (allResults.length === 0) {
            googleSearchResponse = await axios.request(options);
            results = googleSearchResponse.data.results;
            results.forEach((result) => {
                allResults.push({
                    title: result.title,
                    description: result.description,
                });
            });
        }
        return {
            allResults: allResults,
            companyName: companyName,
        };
    } catch (e) {
        throw new LinkedinResultsError(e.message);
    }
}

/**
 * Returns Google search results (title, description) for search using webmail providers like @gmail.com
 * and a site filter site:domain.com. Also returns company name
 * @param {string} domain - The domain name recieved in request body (ex. draftss.com)
 * @return {Promise<{allResults:[{title: string, description: string}], companyName: string}>}
 * @throws Error
 */
async function getSiteDomainResults(domain) {
    let companyName;
    const clearbitResponse = await axios.get(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${domain}`);
    if (clearbitResponse.status === 200) {
        // Use company name in response
        if (clearbitResponse.data.length > 0) {
            companyName = clearbitResponse.data[0].name;
        } else {
            companyName = domain.replace('.com', '');
        }
    } else {
        // Default to domain
        companyName = domain.replace('.com', '');
    }

    const encodedDomain = encodeURIComponent(domain);
    // eslint-disable-next-line max-len
    const query = `email "@${encodedDomain}" site:${encodedDomain} OR site:twitter.com OR site:facebook.com`;
    const allResults = [];

    // For google search rapidapi API
    const options = {
        method: 'GET',
        url: `https://google-search3.p.rapidapi.com/api/v1/search/q=${query}&num=10`,
        headers: {
            'x-rapidapi-key': 'fe33def096msha6d8530c044409bp1e33e6jsnaf274ba048fa',
            'x-rapidapi-host': 'google-search3.p.rapidapi.com',
        },
    };

    try {
        let googleSearchResponse = await axios.request(options);
        let results = googleSearchResponse.data.results;
        results.forEach((result) => {
            allResults.push({
                title: result.title,
                description: result.description,
            });
        });

        // If it failed to fetch search results, try again
        if (allResults.length === 0) {
            googleSearchResponse = await axios.request(options);
            results = googleSearchResponse.data.results;
            results.forEach((result) => {
                allResults.push({
                    title: result.title,
                    description: result.description,
                });
            });
        }
        return {
            allResults: allResults,
            companyName: companyName,
        };
    } catch (e) {
        throw new SiteDomainResultsError(e.message);
    }
}

/** @classdesc This class is used to perform domain-search on provided domain. */
class DomainSearch {
    /** @param {string} domain */
    constructor(domain) {
        this.domain = domain;
        this.generalLinks = [];
        this.contactLinks = [];
        this.promises = []; // This will be used for Promise.all()
        this.allScrapedEmails = [];
        this.errorCount = 0;
        this.emailRegex = new RegExp(`[\\w.-]+@${domain}`, 'gi');
    }

    /**
     * This function returns all the emails that were found in an array. No arguments needed.
     * @throws Error
     * @return {Promise<{domain: string, emails: [string]}>}
     */
    async getEmails() {
        return new Promise(async (resolve, reject) => {
            console.log(`-------------------------- ${this.domain} --------------------------` );

            try {
                this.generalLinks = await getNormalLinks(this.domain);
                this.contactLinks = await getContactLinks(this.domain);
            } catch (e) {
                console.log(`ERROR: ${e.name} - ${e.message} | This module will be skipped` );
            }

            // Removing certain unwanted links
            this.generalLinks = this.generalLinks.filter((link) => {
                return !(link.includes('rocketreach.co') || link.includes('linkedin.com'));
            });

            this.generalLinks.forEach((link) => {
                console.log(`Working with ${link} ...` );
                const ua = randomUseragent.getRandomData();
                const customHeaders = {
                    'Folder': ua.folder ? ua.folder : undefined,
                    'Description': ua.description ? ua.description : undefined,
                    'User-Agent': ua.userAgent ? ua.userAgent : undefined,
                    'App-Codename': ua.appCodename ? ua.appCodename : undefined,
                    'App-Name': ua.appName ? ua.appName : undefined,
                    'App-Version': ua.appVersion ? ua.appVersion : undefined,
                    'Platform': ua.platform ? ua.platform : undefined,
                    'Vendor': ua.vendor ? ua.vendor : undefined,
                    'Vendor-Sub': ua.vendorSub ? ua.vendorSub : undefined,
                    'Browser-Name': ua.browserName ? ua.browserName : undefined,
                    'Browser-Major': ua.browserMajor ? ua.browserMajor : undefined,
                    'Browser-Version': ua.browserVersion ? ua.browserVersion : undefined,
                    'Device-Model': ua.deviceModel ? ua.deviceModel : undefined,
                    'Device-Type': ua.deviceType ? ua.deviceType : undefined,
                    'Device-Vendor': ua.deviceVendor ? ua.deviceVendor : undefined,
                    'Engine-Name': ua.engineName ? ua.engineName : undefined,
                    'Engine-Version': ua.engineVersion ? ua.engineVersion : undefined,
                    'Os-Name': ua.osName ? ua.osName : undefined,
                    'Os-Version': ua.osVersion ? ua.osVersion : undefined,
                    'Cpu-Architecture': ua.cpuArchitecture ? ua.cpuArchitecture : undefined,
                };
                Object.keys(customHeaders).forEach((key) => {
                    customHeaders[key] === undefined ? delete customHeaders[key] : {};
                });

                // ---------------------------> Scrape by visiting each general link <---------------------------
                this.promises.push(axios({
                    method: 'GET',
                    url: link,
                    timeout: 3000,
                    headers: customHeaders,
                }).then((response) => {
                    const emails = (response.data).match(this.emailRegex);
                    if (emails) {
                        console.log(`Got ${emails} from ${link}` );
                        this.allScrapedEmails.push(...emails);
                    }
                }).catch((err) => {
                    this.errorCount += 1;
                    console.log(`${link} failed! ${err.message}` );
                }));
            });

            this.contactLinks.forEach((link) => {
                console.log(`Working with ${link} ...` );
                const ua = randomUseragent.getRandomData();
                const customHeaders = {
                    'Folder': ua.folder ? ua.folder : undefined,
                    'Description': ua.description ? ua.description : undefined,
                    'User-Agent': ua.userAgent ? ua.userAgent : undefined,
                    'App-Codename': ua.appCodename ? ua.appCodename : undefined,
                    'App-Name': ua.appName ? ua.appName : undefined,
                    'App-Version': ua.appVersion ? ua.appVersion : undefined,
                    'Platform': ua.platform ? ua.platform : undefined,
                    'Vendor': ua.vendor ? ua.vendor : undefined,
                    'Vendor-Sub': ua.vendorSub ? ua.vendorSub : undefined,
                    'Browser-Name': ua.browserName ? ua.browserName : undefined,
                    'Browser-Major': ua.browserMajor ? ua.browserMajor : undefined,
                    'Browser-Version': ua.browserVersion ? ua.browserVersion : undefined,
                    'Device-Model': ua.deviceModel ? ua.deviceModel : undefined,
                    'Device-Type': ua.deviceType ? ua.deviceType : undefined,
                    'Device-Vendor': ua.deviceVendor ? ua.deviceVendor : undefined,
                    'Engine-Name': ua.engineName ? ua.engineName : undefined,
                    'Engine-Version': ua.engineVersion ? ua.engineVersion : undefined,
                    'Os-Name': ua.osName ? ua.osName : undefined,
                    'Os-Version': ua.osVersion ? ua.osVersion : undefined,
                    'Cpu-Architecture': ua.cpuArchitecture ? ua.cpuArchitecture : undefined,
                };
                Object.keys(customHeaders).forEach((key) => {
                    customHeaders[key] === undefined ? delete customHeaders[key] : {};
                });

                // ---------------------------> Scrape by visiting each contact link <---------------------------
                this.promises.push(axios.request({
                    method: 'GET',
                    url: link,
                    timeout: 3000,
                    headers: customHeaders,
                }).then((response) => {
                    const emails = (response.data).match(this.emailRegex);
                    if (emails) {
                        console.log(`Got ${emails} from ${link}` );
                        this.allScrapedEmails.push(...emails);
                    }
                }).catch((err) => {
                    this.errorCount += 1;
                    console.log(`${link} failed! ${err.message}` );
                }));
            });

            // --------------------------> Scrape each Linkedin result (title, description) <--------------------------
            this.promises.push(getLinkedinResults(this.domain).then((response) => {
                const allResults = response.allResults;
                const companyName = response.companyName;
                /** @type {RegExp} */
                const companyNameRegex = new RegExp(`${companyName}`, 'gi');
                /** @type {RegExp} */
                const allEmailRegex = new RegExp(
                    `[\\w.-]+@(([a-z.]*)?${this.domain}|gmail\\.com|outlook\\.com|hotmail\\.com|hey\\.com|yahoo\\.com)`,
                    'gi');
                /** @type {RegExp} */
                const domainEmailRegex = new RegExp(`[\\w.-]+@(([a-z.]{2,3})?${this.domain})`, 'gi');

                /** @type {[string]} */
                let emails; // Will hold the emails

                allResults.forEach((result) => {
                    try {
                        if (companyNameRegex.test(result.title)) {
                            // If title includes COMPANY NAME (case insensitive) then we can fetch both @gmail.com
                            // (and others) and @domain.com emails
                            emails = (result.description).match(allEmailRegex);
                            if (emails) {
                                console.log(`Got ${emails} from LINKEDIN RESULTS` );
                                this.allScrapedEmails.push(...emails);
                            }
                        } else {
                            // If there's no company name, only fetch @domain.com emails
                            emails = (result.description).match(domainEmailRegex);
                            if (emails) {
                                console.log(`Got ${emails} from LINKEDIN RESULTS` );
                                this.allScrapedEmails.push(...emails);
                            }
                        }
                    } catch (err) {
                        console.log(`ERROR: LinkedinResults - ${err.message} - Description: "${result.description}"`,
                        );
                    }
                });
            }).catch((err) => {
                this.errorCount += 1;
                console.log(`ERROR: ${err.name} - ${err.message}` );
            }));

            // -------------------------> Scrape each site domain result (title, description) <-------------------------
            this.promises.push(getSiteDomainResults(this.domain).then((response) => {
                const allResults = response.allResults;
                const companyName = response.companyName;
                /** @type {RegExp} */
                const companyNameRegex = new RegExp(`${companyName}`, 'gi');
                /** @type {RegExp} */
                const allEmailRegex = new RegExp(
                    `[\\w.-]+@(([a-z.]*)?${this.domain}|gmail\\.com|outlook\\.com|hotmail\\.com|hey\\.com|yahoo\\.com)`,
                    'gi');
                /** @type {RegExp} */
                const domainEmailRegex = new RegExp(`[\\w.-]+@(([a-z.]{2,3})?${this.domain})`, 'gi');
                /** @type {[string]} */
                let emails; // Will hold the emails

                allResults.forEach((result) => {
                    try {
                        if (companyNameRegex.test(result.title)) {
                            // If title includes COMPANY NAME (case insensitive) then we can fetch both @gmail.com
                            // (and others) and @domain.com emails
                            emails = (result.description).match(allEmailRegex);
                            if (emails) {
                                console.log(`Got ${emails} from SITE DOMAIN` );
                                this.allScrapedEmails.push(...emails);
                            }
                        } else {
                            // If there's no company name, only fetch @domain.com emails
                            emails = (result.description).match(domainEmailRegex);
                            if (emails) {
                                console.log(`Got ${emails} from SITE DOMAIN` );
                                this.allScrapedEmails.push(...emails);
                            }
                        }
                    } catch (err) {
                        console.log(`ERROR: SiteDomainResults - ${err.message} - Description: "${result.description}"`,
                            'dev.log');
                    }
                });
            }).catch((err) => {
                this.errorCount += 1;
                console.log(`ERROR: ${err.name} - ${err.message}` );
            }));

            // ---------------------------> Scrape twitter and facebook result descriptions <---------------------------
            // this.promises.push(getFacebookTwitterDescriptions(this.domain).then((twitterDescriptions) => {
            //     twitterDescriptions.forEach((desc) => {
            //         // Putting try...catch here so that any error doesn't stop this iterator
            //         try {
            //             const emails = desc.match(this.emailRegex);
            //             if (emails) {
            //                 console.log(`Got ${emails} from FACEBOOK-TWITTER search` );
            //                 this.allScrapedEmails.push(...emails);
            //             }
            //         } catch (err) {
            //             console.log(`ERROR: FacebookTwitterDescription - ${err.message} - Description: "${desc}"` );
            //         }
            //     });
            // }).catch((err) => {
            //     this.errorCount += 1;
            //     console.log(`ERROR: ${err.name} - ${err.message}` );
            // }));

            // ============================================ END OF SCRAPING ============================================
            // ==================================== wait for all processes to finish ===================================
            console.log('Waiting for all processes to finish...' );
            await Promise.all(this.promises);

            // Make sure all emails are in lower case
            this.allScrapedEmails = this.allScrapedEmails.map((email) => {
                return email.toLowerCase();
            });

            resolve({
                domain: this.domain,
                emails: [...new Set(this.allScrapedEmails)],
                errorCount: this.errorCount,
            });
        });
    }
}

module.exports = {
    DomainSearch: DomainSearch,
};
