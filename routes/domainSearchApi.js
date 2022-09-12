const express = require('express');
const router = express.Router();
const axios = require('axios');
// const util = require('util');
const fs = require('fs');
const Queue = require('bull');
const {createBullBoard} = require('@bull-board/api');
const {BullAdapter} = require('@bull-board/api/bullAdapter');
const {ExpressAdapter} = require('@bull-board/express');
const {
    DomainSearch,
} = require('./utils/domainSearchUtils');


// ================== Set up Bull ==================
let REDIS_DB = 0;
if (process.env.PRODUCTION) {
    REDIS_DB = 1;
} else if (process.env.STAGING) {
    REDIS_DB = 2;
}

const domainSearchTask = new Queue(
    'Bulk Domain Search',
    // eslint-disable-next-line max-len
    {redis: {port: 6379, host: '127.0.0.1', db: REDIS_DB}, settings: {maxStalledCount: 3}, limiter: {max: 100, duration: 5}});

domainSearchTask.process('bulk_domain_search', 5, __dirname + '/tasks/domainSearch/bulkDomainSearchConsumer.js');
domainSearchTask.on('completed', (job, result) => {
    // fs.writeFileSync('domainsearchresult.json', JSON.stringify(result), 'utf-8');

    let returnUrl = 'http://localhost:8888/app/webhooks/bulk-domain-search/';

    if (process.env.PRODUCTION === 'true') {
        returnUrl = 'https://prospectss.com/app/webhooks/bulk-domain-search/';
    } else if (process.env.STAGING === 'true') {
        returnUrl = 'https://staging.prospectss.com/app/webhooks/bulk-domain-search/';
    }

    console.log(`Sending back results to ${returnUrl + result.recipient + '/'} ...`);

    axios.request({
        method: 'POST',
        url: returnUrl + result.recipient + '/',
        data: result,
    }).then((res) => {
        if (res.status === 200) {
            console.log(`Results sent to prospectss - ${result.userEmailId} - ${result.mongoDocumentId}`);
        } else {
            console.warn(`Failed to send results to prospectss - ${result.userEmailId} - ${result.mongoDocumentId}`);
        }
    }).catch((err) => {
        console.error(`${err.name} - ${err.message}`);
    });

    console.log(`Results sent to prospectss - ${result.userEmailId} - ${result.mongoDocumentId}`);
});
// Set up Bull Board UI
createBullBoard({
    queues: [new BullAdapter(domainSearchTask)],
    serverAdapter: new ExpressAdapter(),
});
// -------------------------------------------------

router.post('/single', async (req, res, next) => {
    /** @type {string} */
    try {
        let domain = req.body.domain;
        domain = domainCleaner(domain);
        const domainSearch = new DomainSearch(domain);
        /** @type {{domain: string, emails: string[]}} */
        const result = await domainSearch.getEmails();
        return res.status(200).send(result.emails);
    } catch (e) {
        console.error(`ERROR: ${e.name} - ${e.message}`);
        console.log('------------------------ FAILED REQUEST ------------------------');
        console.log(req.body);
        return res.status(500).send('Single domain search request failed. Check the logs');
    }
});

router.post('/bulk', async (req, res, next) => {
    /** @type {[string]} */
    let domains = req.body['domains'];
    console.log(domains);
    const mongoDocumentId = req.body['mongoDocumentId'];
    const userEmailId = req.body['userEmailId'];
    const recipient = req.body['for'];

    // Send back 400 response if domain data is empty or not present
    if (!domains) return res.status(400).send('Bad Request');

    // Clean all doamins
    domains = domains.map((domain) => {
        return domainCleaner(domain);
    });

    // Add task to the queue and start execution immediately
    domainSearchTask.add('bulk_domain_search', {
        domains: domains,
        mongoDocumentId: mongoDocumentId,
        userEmailId: userEmailId,
        recipient: recipient,
    });
    return res.status(200).send({message: 'Success'});
});

module.exports = router;
