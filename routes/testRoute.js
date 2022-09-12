const express = require('express');
const router = express.Router();
const axios = require('axios');
const BluebirdPromise = require('bluebird');

router.get('/basic', (req, res) => {
    res.send({
        status: 200,
        message: 'Basic test passed!',
    });
});

router.get('/concurrent-requests', async (req, res) => {
    /** @type {[string]} */
    const urls = [];
    for (let i = 0; i < 20; i++) {
        urls.push('https://www.whatsapp.com/');
    }

    await BluebirdPromise.map(urls, (url, index) => {
        return axios.get(url);
    },
    {concurrency: 5},
    ).each((content) => {
        console.log(content.status);
    });

    console.log('All Done!');
    return res.status(200).send('OK');
});

module.exports = router;
