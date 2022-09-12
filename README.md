# Setup Instructions:

1. Clone the Project  ```git clone https://gitlab.com/aminmemon/linode-puppeteer-api.git```
2. Go into the directory and run ```npm install```
3. Run ```npm start```
4. Then, on an API client, use the following curl command to make an API request: ```curl -X POST http://localhost:3000/api/v1/gmapscraper -d '{"business": "library", "location": "mumbai"}' -H "Content-Type: application/json"```
