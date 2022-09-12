const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
// domains is an array of 100+ domain names for testing
const domains = require('../sample_calls/test_domains.json');

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin());

router.post('/', async (req, res) => {
    // allQueries is an array
    let allQueries = req.body.queries;
    const numberOfResults = req.body.numberOfResults;
    const finalResults = [];

    await puppeteer.launch({
        // 139.162.133.134:24005
        // http://qnfcloln:CkW0rvSGEHrE8ew8_country-UnitedStates@proxy.proxy-cheap.com:31112
        args: [
            '--proxy-server=proxy.proxy-cheap.com:31112',
            '--incognito',
        ],
        ignoreHTTPSErrors: true,
        headless: true,
    }).then(async (browser) => {
        // We'll be storing all the page promises in here to wait for all the pages to finish processing
        const promises = [];

        // Use the test domains in test_domains.json file if corresponding environment variable has been set.
        if (process.env.USE_TEST_DOMAINS) {
            console.info('Using test domains/queries');
            allQueries = domains.slice(0, 20);
        }

        if (process.env.VERBOSE_OUTPUT) {
            console.log('**************** Using these queries **************** ');
            console.log(allQueries);
        }

        allQueries.forEach((query) => {
            if (process.env.VERBOSE_OUTPUT) console.log('Using query => ' + query);
            promises.push(browser.newPage().then(async (page) => {
                await page.authenticate({
                    username: 'qnfcloln',
                    password: 'CkW0rvSGEHrE8ew8_country-UnitedStates',
                });
                // Fetch the results
                const links = await getAllSearchResultLinks(
                    page,
                    query,
                    numberOfResults,
                );

                if (process.env.VERBOSE_OUTPUT) {
                    console.log('Result for query: ' + query);
                    console.log(links);
                }

                // Add the links to the final results for sending back
                finalResults.push({
                    query: query,
                    status: 200,
                    links: links,
                });
            }).catch((error) => {
                console.error(`Error while loading page for query ${query}: ${error.name}: ${error.message}`);
                finalResults.push({
                    query: query,
                    status: 500,
                    error: {
                        name: error.name,
                        message: error.message,
                    },
                    links: [],
                });
            }));
        });

        await Promise.all(promises);
        await browser.close();
        res.send({
            status_code: 200,
            results: finalResults,
        });
    }).catch((error) => {
        console.error(`Error while launching puppeteer: ${error.name}: ${error.message}`);
        res.send({
            status_code: 500,
            message: 'Internal Error',
        });
    });
});

// ============================== HELPER FUNCTIONS ==============================

/**
 * Use google search query string to go to google search results. Fetch all the links from there.
 * @param page - Puppeteer Page instance
 * @param searchQuery - The string to search for uisng google
 * @param numberOfResults - Total number of google search results that should be returned
 * @return {Promise<Array<string>>}
 */
async function getAllSearchResultLinks(page, searchQuery, numberOfResults) {
    const links = [];
    const sitelinks = [];

    // Not sure if waitUntil will slow down the program
    await page.goto(`http://www.google.com/search?q=${searchQuery}&num=${numberOfResults}&btnG=Search`,
        {waitUntil: 'networkidle2'}); // timeout is in ms

    // Clear cookies
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');

    // Every result in google search result has the following structure:
    // <a href="..." ...>...<h3>ResultText</h3>...</a>
    // In order to fetch all the results, we fetch all the parent anchor elements of h3 elements on the result page.
    const allLinks = await page.$x('//h3/..');
    const allSiteLinks = await page.$x('//a[contains(@class, \'l\')]');
    for (const link of allLinks) {
        const hrefUrl = await (await link.getProperty('href')).jsonValue();
        const title = await (await (await link.$('h3')).getProperty('innerText')).jsonValue();
        // Don't allow null values and urls from webcache.googleusercontent.com or google.com to enter the array
        if (
            hrefUrl &&
          !hrefUrl.includes('google.com') &&
          !hrefUrl.includes('webcache.googleusercontent.com')) {
            links.push({
                title: title,
                url: hrefUrl,
            });
        }
    }
    for (const link of allSiteLinks) {
        const hrefUrl = await (await link.getProperty('href')).jsonValue();
        const title = await (await link.getProperty('innerHTML')).jsonValue();
        // Don't allow null values and urls from webcache.googleusercontent.com or google.com to enter the array
        if (hrefUrl &&
          !hrefUrl.includes('google.com') &&
          !hrefUrl.includes('webcache.googleusercontent.com')) {
            sitelinks.push({
                title: title,
                url: hrefUrl,
            });
        }
    }

    // If there are site links present, Add them after the first entry in allLinks array.
    if (sitelinks.length > 0) {
        links.splice(1, 0, ...sitelinks);
    }

    return links;
}

module.exports = router;
