const BluebirdPromise = require('bluebird');
const {DomainSearch} = require('../../utils/domainSearchUtils');
const {performance} = require('perf_hooks');

module.exports = async (job) => {
    const startTime = performance.now();

    const userEmailId = job.data.userEmailId;
    const mongoDocumentId = job.data.mongoDocumentId;
    /** @type {[string]} */
    const domainArray = job.data.domains;
    /** @type {[{'domain': string, emails: [string]}]} */
    const finalResults = [];
    let progress = 0;
    const totalDomains = domainArray.length;
    /** @type number */
    let erroredDomainCount = 0;

    await BluebirdPromise.map(domainArray, (domainName) => {
        const ds = new DomainSearch(domainName);
        return ds.getEmails();
    }, {
        concurrency: 50,
    }).each((result) => {
        finalResults.push(result);
        progress += 1;
        job.progress(Math.round((progress/totalDomains) * 100));
    }).catch((err) => {
        erroredDomainCount += 1;
        console.error(`${err.name}: ${err.message}`);
    });

    // This completes the task and returns the data
    console.log(performance.now() - startTime);
    return Promise.resolve({
        finalResults: finalResults,
        mongoDocumentId: mongoDocumentId,
        userEmailId: userEmailId,
        timeTaken: performance.now() - startTime, // milliseconds
        numberOfDomains: domainArray.length,
        erroredDomainCount: erroredDomainCount,
        recipient: job.data.recipient,
    });
};
