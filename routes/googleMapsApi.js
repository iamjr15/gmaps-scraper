const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');

// const RETRY_MAX_ATTEMPTS = 10;

// const TIME_OUT = 30000;
const INITIAL_PAGE_LOADING_TIME_OUT = 60000;
const JSON_PARSE_MAX_ATTEMPT = 100000;
// const WAIT_FOR_TIMEOUT_REPEAT = 500;

const LAUNCHING_OPTIONS = {
    // executablePath: '/usr/bin/brave-browser', // '/usr/bin/microsoft-edge', //
    userDataDir: './tmp/userDataDir',
    ignoreDefaultArgs: false,
    args: [
        // Disables the sandbox for all process types that are normally sandboxed.
        '--no-sandbox',
        // Disable the setuid sandbox (Linux only).
        '--disable-setuid-sandbox',
        // The /dev/shm partition is too small in certain VM environments, causing Chrome to fail or crash
        // (see http://crbug.com/715363). Use this flag to work-around this issue (a temporary directory will
        // always be used to create anonymous shared memory files).
        '--disable-dev-shm-usage',
        // Disable gpu-accelerated 2d canvas.
        '--disable-accelerated-2d-canvas',
        // Skip First Run tasks, whether or not it's actually the First Run. Overridden by kForceFirstRun.
        // This does not drop the First Run sentinel and thus doesn't prevent first run from occuring the next
        // time chrome is launched without this flag.
        '--no-first-run',
        // Disables the use of a zygote process for forking child processes. Instead, child processes will be forked
        // and exec'd directly. Note that --no-sandbox should also be used together with this flag because the
        // sandbox needs the zygote to work.
        '--no-zygote',
        // Runs the renderer and plugins in the same process as the browser.
        '--single-process',
        // Disables GPU hardware acceleration. If software renderer is not in place, then the GPU process won't launch.
        '--disable-gpu',
        '--autoplay-policy=user-gesture-required',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-default-apps',
        '--disable-domain-reliability',
        '--disable-extensions',
        '--disable-features=AudioServiceOutOfProcess',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-notifications',
        '--disable-offer-store-unmasked-wallet-cards',
        '--disable-popup-blocking',
        '--disable-print-preview',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-speech-api',
        '--disable-sync',
        '--hide-scrollbars',
        '--ignore-gpu-blacklist',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-pings',
        '--password-store=basic',
        '--use-gl=swiftshader',
        '--use-mock-keychain',
        '--use-mock-ui',
        '--use-mock-device-management',
        '--use-mock-system-profiles',
        '--use-mock-url-loader',
        '--use-mock-certificate-verifier',
        '--use-mock-ui-for-media-stream',
        '--window-size=600,600',
    ],
    headless: true,
};

// const NEXT_PAGE_BUTTON_SELECTOR = '*[aria-label*=\'Next page\'] img';
// const RESULT_PAGE_INFO_SELECTOR = '[aria-label*=\'Showing result\'] span span';
// const LOADING_OVERLAY_SELECTOR = '[class*=\'section-refresh-overlay-visible\']';
// const NO_RESULT_SECTION_SELECTOR = '[class*=\'section-no-result\']';

// let currPage = '1-20';
let allData = [];
// let parsingCurrentPage = false;

const removeNonASCIIChars = (text) => {
    text = text.replace(/[^\x00-\x7F]/g, '');
    text = text.replace(/[\u{0080}-\u{FFFF}]/gu, '');
    return text;
};

const removeSocialMediaLink = (website) => {
    if (!website) {
        return '';
    }
    const socialMediaLinks = [
        'facebook',
        'youtube',
        'whatsapp',
        'wechat',
        'instagram',
        'imqq',
        'tumblr',
        'qzone.qq',
        'tiktok',
        'weibo',
        'twitter',
        'reddit',
        'tieba.baidu',
        'linkedin',
        'viber',
        'snapchat',
        'pinterest',
        'line.me',
        'telegram',
        'medium',
        'google.com',
        'business.site',
        'indiamart.com',
        'blogspot.com',
        'justdial.com',
        'tradeindia.com',
        'wixsite.com',
        'goo.gl',
        'bit.ly',
        'godaddy.site',
        'yolasite.com',
    ];
    for (const _link of socialMediaLinks) {
        if (website[0].includes(_link)) {
            return '';
        }
    }
    return website;
};

const parsePosition = (errorMsg) => {
    let position = '';
    for (
        let i = errorMsg.indexOf('at position') + 12;
        i < errorMsg.length;
        i++
    ) {
        if (
            errorMsg[i] === ' ' ||
            errorMsg[i] === '\n' ||
            errorMsg[i] === '\t' ||
            errorMsg[i] === '.'
        ) {
            break;
        }
        position += errorMsg[i];
    }
    position = parseInt(position);
    return position;
};

const parseJson = (text) => {
    let jsonData = null;
    let attempt = 0;
    // Try to parse the JSON data
    while (true) {
        attempt++;
        // If Max attemp limit exceed return null, Couldn't parse data
        if (attempt === JSON_PARSE_MAX_ATTEMPT) {
            break;
        }
        try {
            jsonData = JSON.parse(text);
            break;
        } catch (err) {
            let anyChange = false;
            // If JSON string has some error try to resolve that
            console.log(`Trying to resolve ==> ${err.message}`);
            if (err instanceof SyntaxError) {
                if (err.message.includes('at position')) {
                    const position = parsePosition(err.message);
                    if (text[position] === ',') {
                        let currPos = position - 1;
                        while (true) {
                            if (
                                text[currPos] === ' ' ||
                                text[currPos] === ',' ||
                                text[currPos] === 'n' ||
                                text[currPos] === 'u' ||
                                text[currPos] === 'l'
                            ) {
                                text =
                                    text.slice(0, currPos) +
                                    text.slice(currPos + 1);
                                anyChange = true;
                            } else {
                                break;
                            }
                            currPos--;
                        }
                    } else if (position > 0 && text[position - 1] === '"') {
                        text =
                            text.slice(0, position - 1) +
                            '\'' +
                            text.slice(position);
                        let _pos = position;
                        while (text[_pos] !== '"') {
                            _pos++;
                        }
                        text = text.slice(0, _pos) + '\'' + text.slice(_pos + 1);
                        anyChange = true;
                    } else {
                        text =
                            text.slice(0, position) + text.slice(position + 1);
                        anyChange = true;
                    }
                }
            }
            if (!anyChange) {
                console.log('Couldn\'t resolve the error. Skipping this data.');
                break;
            }
        }
    }

    return jsonData;
};

const parseData = (dataList) => {
    for (let i = 0; i < 20; i++) {
        let placeName = '';
        let rating = '';
        let noOfReviews = '';
        let category = '';
        let shortBio = '';
        let address = '';
        let website = '';
        let phoneNo = '';

        try {
            placeName = dataList[0][1][i + 1][14][11];
        } catch (err) {
        }

        try {
            rating = dataList[0][1][i + 1][14][4][7];
        } catch (err) {
        }

        try {
            noOfReviews = dataList[0][1][i + 1][14][4][8];
        } catch (err) {
        }

        try {
            if (typeof dataList[0][1][i + 1][14][13] === 'object') {
                category = dataList[0][1][i + 1][14][13][0];
            } else {
                category = dataList[0][1][i + 1][14][13];
            }
        } catch (err) {
        }

        try {
            shortBio = dataList[0][1][i + 1][14][32][1][1];
        } catch (err) {
        }

        try {
            address = dataList[0][1][i + 1][14][2].join(' ');
        } catch (err) {
        }

        try {
            if (
                dataList[0][1][i + 1][14][7][1] &&
                dataList[0][1][i + 1][14][7][0]
            ) {
                website = [
                    dataList[0][1][i + 1][14][7][1],
                    dataList[0][1][i + 1][14][7][0],
                ];
            } else if (
                dataList[0][1][i + 1][14][7][1] ||
                dataList[0][1][i + 1][14][7][0]
            ) {
                if (dataList[0][1][i + 1][14][7][1]) {
                    website = dataList[0][1][i + 1][14][7][1];
                } else {
                    website = dataList[0][1][i + 1][14][7][0];
                }
            }
        } catch (err) {
        }

        try {
            if (dataList[0][1][i + 1][14][178][0][0]) {
                phoneNo = dataList[0][1][i + 1][14][178][0][0];
            } else {
                phoneNo = dataList[0][1][i + 1][14][178][0][3];
            }
        } catch (err) {
        }

        if (placeName.length > 0) {
            placeName = removeNonASCIIChars(placeName);
            category = removeNonASCIIChars(category);
            shortBio = removeNonASCIIChars(shortBio);
            address = removeNonASCIIChars(address);
            website = removeSocialMediaLink(website);
            const data = {
                placeName,
                rating,
                noOfReviews,
                category,
                shortBio,
                address,
                website,
                phoneNo,
            };

            allData.push(data);
        }
    }
};

// let debugCount = 0;
/*
const traverseToTheLastPage = async (page) => {
    while (true) {
        // Wait until the overlay disappeared
        await page
            .waitForSelector(LOADING_OVERLAY_SELECTOR, {
                visible: false,
                hidden: true,
                timeout: TIME_OUT,
            })
            .catch(() => {
            });

        let currPageResultSeries;
        let lastPage = false;
        let attempt = 0;

        while (true) {
            attempt++;
            let loopBreak = false;

            // Check if it is no more results page
            await page
                .waitForSelector(NO_RESULT_SECTION_SELECTOR, {
                    timeout: WAIT_FOR_TIMEOUT_REPEAT,
                })
                .then(() => {
                    console.log('This is no result page');
                    lastPage = true;
                    loopBreak = true;
                })
                .catch(() => {
                });

            // Get current page results info
            // await page.screenshot({path: `sample_calls/debug-screenshot-${debugCount++}.png`});
            await page
                .$$eval(RESULT_PAGE_INFO_SELECTOR, (elements) => {
                    return elements[0].innerText + '-' + elements[1].innerText;
                })
                .then((val) => {
                    currPageResultSeries = val;
                    loopBreak = true;
                })
                .catch((err) => {
                    console.error(`${err.name}: ${err.message}`);
                });

            if (loopBreak) {
                break;
            }

            if (attempt >= RETRY_MAX_ATTEMPTS) {
                lastPage = true;
                break;
            }
        }

        if (lastPage) {
            break;
        }

        if (currPageResultSeries) {
            currPage = currPageResultSeries;
            const serialNo = currPageResultSeries.split('-');
            if (parseInt(serialNo[1]) - parseInt(serialNo[0]) < 19) {
                lastPage = true;
            }
        }

        if (parsingCurrentPage && currPageResultSeries != currPage) {
            continue;
        }

        await page
            .waitForSelector(NEXT_PAGE_BUTTON_SELECTOR, {
                timeout: TIME_OUT,
            })
            .catch(() => {
            });

        // Click on the next page button
        attempt = 0;
        while (true) {
            attempt++;
            let loopBreak = false;

            await page.
                evaluate((NEXT_PAGE_BUTTON_SELECTOR) => {
                    document.querySelectorAll(NEXT_PAGE_BUTTON_SELECTOR)[0].parentElement.disabled = false;
                    document.querySelectorAll(NEXT_PAGE_BUTTON_SELECTOR)[0].parentElement
                        .classList.remove('hV1iCc-disabled');
                }, NEXT_PAGE_BUTTON_SELECTOR);

            await page
                .waitForSelector(NEXT_PAGE_BUTTON_SELECTOR, {
                    timeout: WAIT_FOR_TIMEOUT_REPEAT,
                })
                .catch(() => {
                });

            await page
                .click(NEXT_PAGE_BUTTON_SELECTOR, { delay: 100 })
                .then(() => {
                    parsingCurrentPage = true;
                    loopBreak = true;
                })
                .catch((err) => {
                    console.error(`${err.name}: ${err.message}`);
                });

            if (loopBreak) {
                break;
            }

            if (attempt > RETRY_MAX_ATTEMPTS) {
                lastPage = true;
                break;
            }
        }

        if (lastPage) {
            break;
        }
    }
};
*/
const cleanAndParseDataForInitialData = (initialData) => {
    console.log(`Parsing articles...`);
    try {
        initialData = JSON.parse(initialData);
        console.log('Saving...');
        if (initialData) {
            parseData(initialData['dataList']);
        }
    } catch (err) {
        initialData = initialData.replace(/\\n/g, '');
        initialData = initialData.replace(/\\/g, '');
        // initialData = initialData.replace(/null/g, '""');

        initialData = parseJson(initialData);
        console.log('Saving...');
        if (initialData) {
            parseData(initialData['dataList']);
        }
    }
};

const cleanAndParseData = (text, response) => {
    console.log(`Parsing articles...`);
    // parsingCurrentPage = false;
    try {
        text = JSON.parse(text);
        console.log('Saving...');
        if (text) {
            parseData(text['dataList']);
        }
    } catch (err) {
        text = text.slice(18);
        text = text.slice(0, -6);
        text = '{"dataList":' + text;
        text = text.replace(/\\n/g, '');
        text = text.replace(/\\/g, '');
        // text = text.replace(/null/g, '""');
        const urlIndex = text.indexOf(response.url().replace(/&/g, 'u0026'));
        let lastSquareBracketIndex = -1;
        for (let i = urlIndex; i >= 0; i--) {
            if (text[i] === ']') {
                lastSquareBracketIndex = i;
                break;
            }
        }
        text = text.slice(0, lastSquareBracketIndex - text.length + 1);
        text += '}';

        text = parseJson(text);
        console.log('Saving...');
        if (text) {
            parseData(text['dataList']);
        }
    }
};

// ============================================================================
// ----------------------- MAIN ROUTER CODE STARTS HERE -----------------------
// ============================================================================

router.post('/', async (req, res) => {
    const location = req.body['location'];
    const business = req.body['business'];
    const resultLimit = req.body['limit'];

    console.log(`Using location => ${location}`);
    console.log(`Using business => ${business}`);
    console.log(`Using result limit => ${resultLimit} results`);

    if (!(location && business)) {
        return res
            .status(400)
            .send('Bad Request. One or more parameters are missing');
    }

    allData = [];
    // currPage = '1-20';

    const url = `https://www.google.com/maps/search/${business}+in+${location}/?hl=en-US`;

    console.log('Launching browser...');

    const browser = await puppeteer.launch(LAUNCHING_OPTIONS);

    // close the browser after 2 minutes
    setTimeout(() => {
        browser.close();
    }, 2 * 60 * 1000);

    const page = await browser.newPage();
    await page.setViewport({width: 400, height: 580});
    // turns request interceptor on
    await page.setRequestInterception(true);

    // if the page makes a  request to a resource type of image or stylesheet then abort that request
    page.on('request', (request) => {
        if (request.resourceType() === 'image') {
            request.abort();
        } else {
            request.continue();
        }
    });

    page.on('response', (response) => {
        const params = new URL(response.url()).searchParams;
        if (params.get('tch') != null && params.get('ech') != null) {
            response.text().then((text) => {
                cleanAndParseData(text, response);
            });
        }
    });

    console.log(`Opening... ${url}`);

    await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: INITIAL_PAGE_LOADING_TIME_OUT,
    });

    console.log('Scraping started...');

    const SCROLLABLE_SECTION = '[role="feed"]';

    await page.waitForSelector(SCROLLABLE_SECTION);

    const ARTICLE_SECTION = '[role="article"]';

    await page.waitForSelector(ARTICLE_SECTION);

    console.log('Scrolling...');

    await page.evaluate((SCROLLABLE_SECTION) => {
        // keep scrolling at intervals of 3 seconds
        const scrollInterval = setInterval(() => {
            const scrollableSection = document.querySelector(SCROLLABLE_SECTION);
            scrollableSection.scrollTo({
                top: scrollableSection.scrollHeight,
                behavior: 'smooth',
            });
            console.log('Scrolled...');
            // wait for the page to load
            endpageSpan = document.querySelector('span.HlvSq');
            if (endpageSpan) {
                clearInterval(scrollInterval);
            }
        }, 3000);
    }, SCROLLABLE_SECTION);

    await page.waitForSelector('span.HlvSq', {
        timeout: 0,
    });

    const initialData = await page.evaluate(() => {
        return (
            '{"dataList":' +
            window['APP_INITIALIZATION_STATE'][3][2].slice(5) +
            '}'
        );
    });

    cleanAndParseDataForInitialData(initialData);

    // await traverseToTheLastPage(page);

    await browser.close();

    // Apply the result limit if not 0
    if (resultLimit !== 0 && allData.length > resultLimit) {
        console.log('Applying result limit');
        allData = allData.slice(0, resultLimit);
    }

    const result = {
        totalPlaces: allData.length,
        places: allData,
    };

    res.send(result);
});

module.exports = router;
