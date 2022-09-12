const axios = require('axios');
const fs = require('fs');
console.log('Running...');
axios
    .post('http://localhost:3000/api/v1/gmapscraper', {
        business: 'pub',
        location: 'london',
        limit: 5,
    })
    .then((result) => {
        console.log(result.data.totalPlaces);
        console.log(result.data.places);

        if (!fs.existsSync('scraped')) {
            fs.mkdirSync('scraped');
        }

        fs.writeFileSync(
            `./scraped/scraped${Date.now()}.json`,
            JSON.stringify(result.data, null, 2),
        );
    })
    .catch((err) => {
        console.log(err.message);
    });
