// import axios from "axios"
// import cheerio from "cheerio"
//import express, { response } from "express"
//import puppeteer  from "puppeteer"
// import puppeteerExtra  from "puppeteer-extra"
// import pluginStealth   from "puppeteer-extra-plugin-stealth"
// import https from "https"
// import dotenv from "dotenv"

// if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
//     import chrome from "chrome-aws-lambda"
//     import puppeteer from "puppeteer-core"
//   } else {
//     puppeteer = require("puppeteer");
//   }

const express = require("express");
const puppeteerExtra = require("puppeteer-extra");
const pluginStealth = require("puppeteer-extra-plugin-stealth");
const https = require("https");
const dotenv = require("dotenv");

const randomUseragent = require('random-useragent');
const random_useragent = randomUseragent.getRandom();
const useragent_standard = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36';
const userAgent = random_useragent || useragent_standard;
console.log('userAgent: ', userAgent);

const isProduct = 1;

let chrome = {};
let puppeteer;
let options = {};

if (isProduct) {
  chrome = require("chrome-aws-lambda");
  puppeteer = require("puppeteer-core");
} else {
  puppeteer = require("puppeteer");
}

// if (isProduct) {
//     options = {
//       args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
//       defaultViewport: chrome.defaultViewport,
//       executablePath: await chrome.executablePath,
//       headless: true,
//       ignoreHTTPSErrors: true,
//     };
// }else{
//     options = {
//         args: [],
//         headless: true,
//     };
// }


dotenv.config();

const PORT = process.env.PORT || 5000
const app = express()
app.use(express.json());

const baseUrl = 'https://www.zillow.com/homes'

// Welcome route
app.get('/', async (req, res) => {
    res.send('Welcome to Zillow Scraper API!');
});

// Get zip code details
//app.get('/zillow/:zpid', async (req, res, next) => {
app.get('/properties/v2/list-for-sale/', async (req, res, next) => {
    // const { limit } = req.params;
    // const { address_parm } = req.params;
    let address_parm = [], properties = [];
    var sdata = "", west = "", east = "", south = "", north = "";
    if(req.query.city && req.query.state_code){
        const address_city = req.query.city;
        const address_state = req.query.state_code;
        address_parm = `${address_city}-${address_state}`;
    }else if(req.query.zipcode){
        const address_zipcode = req.query.zipcode;
        address_parm = address_zipcode;
    }
    if (isProduct) {
        options = {
        args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
        defaultViewport: chrome.defaultViewport,
        executablePath: await chrome.executablePath,
        headless: true,
        ignoreHTTPSErrors: true,
          };
      }else{
          options = {
              args: [],
              headless: true,
          };
      }

    try {
        console.log(`Getting Zillow data`);

        (async() =>{
            // Get GPS coordinates from Google Map API
            function httprequest(address_value) {
                return new Promise((resolve, reject) => {
                    const options = {
                        "hostname": "maps.googleapis.com",
                        "port": null,
                        "path": `/maps/api/geocode/json?address=${address_value}&key=${process.env.GOOGLE_API_KEY}`,
                        method: 'GET'
                    };
                    const req = https.request(options, (res) => {
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                            return reject(new Error('statusCode=' + res.statusCode));
                        }
                        var body = [];
                        res.on('data', function(chunk) {
                            body.push(chunk);
                        });
                        res.on('end', function() {
                            try {
                                body = JSON.parse(Buffer.concat(body).toString());
                            } catch(e) {
                                reject(e);
                            }
                            resolve(body);
                        });
                    });
                    req.on('error', (e) => {
                    reject(e.message);
                    });
                    // send the request
                req.end();
                });
            }
            httprequest().then((data) => {
                const response = {
                    statusCode: 200,
                    body: JSON.stringify(data),
                };
                return response;
            });
            sdata = await httprequest(address_parm);
            west = sdata.results[0].geometry.viewport.southwest.lng;
            east = sdata.results[0].geometry.viewport.northeast.lng;
            south = sdata.results[0].geometry.viewport.southwest.lat;
            north = sdata.results[0].geometry.viewport.northeast.lat;
            console.log("address_parm, west, east, south, north", address_parm, west, east, south, north);
            
            // https://github.com/cobalt-intelligence/fetch-requests-from-puppeteer
            // const params = {
            //     "pagination": {},
            //     "usersSearchTerm": address_parm,
            //     mapBounds: {
            //         "west": west,
            //         "east": east,
            //         "south": south,
            //         "north": north
            //     },
            //     "mapZoom": 18,
            //     "isMapVisible": false,
            //     "filterState": {
            //         "isAllHomes": {"value": false},
            //         "price":{"max":300000}
            //     //     "isForSaleForeclosure": {"value": false},
            //     //     "isMultiFamily": {"value": false},
            //     //     "isApartment":{"value":false},
            //     //     "isTownhouse":{"value":true},
            //     //     "isCondo":{"value":false},
            //     //     "isAuction": {"value": false},
            //     //     "isNewConstruction": {"value": true},
            //     //     "isForRent": {"value": false},
            //     //     "isLotLand": {"value": false},
            //     //     "isManufactured": {"value": false},
            //     //     "isForSaleByOwner": {"value": true},
            //     //     "isComingSoon": {"value": true},
            //     //     "isForSaleByAgent": {"value": false},
            //     //     "sortSelection": {
            //     //         "value": "globalrelevanceex"
            //     //     },
            //     //     "price":{"min":0,"max":200000},
            //     //   //  "monthlyPayment":{"min":0},
            //     //     "beds": { "min": 3 },
            //     },
            //     "isListVisible": true
            // };
            const params = {
                "pagination":{},
                "usersSearchTerm":"21076",
                "mapBounds":{
                    "west": west,
                    "east": east,
                    "south": south,
                    "north": north
                },
                "regionSelection":[{"regionId":66764,"regionType":7}],
                "isMapVisible":true,
                "filterState":{
                    "sortSelection":{"value":req.query.sort},   // pricea: low -> high, priced: high -> low
                    "isAllHomes":{"value":true},
                    "price":{"min":req.query.price_min,"max":req.query.price_max},
                    "beds":{"min":req.query.beds_min, "max":req.query.beds_max},
                    "baths":{"min":req.query.baths_min, "max":req.query.baths_max},
                    "sqft":{"min":req.query.sqft_min,"max":req.query.sqft_max},
                    "lotSize":{"min":req.query.lotSize_min,"max":req.query.lotSize_max},
                    "built":{"min":req.query.yearbuilt_min, "max":req.query.yearbuilt_max}
                },
                "isListVisible":true,
                "mapZoom":15
            };
            console.log('params', params);
            const wants = {
                "cat1": ["listResults", "mapResults"], "cat2": ["total"]
            };

            // Puppeteer
            puppeteerExtra.use(pluginStealth());
           // const browser = await puppeteerExtra.launch({
            // const browser = await puppeteer.launch({
            //     args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
            //     defaultViewport: chrome.defaultViewport || process.env.CHROME_EXECUTABLE_PATH,
            //     executablePath: await chrome.executablePath,
            //     headless: true,
            //     ignoreHTTPSErrors: true,
            // });
            const browser = await puppeteer.launch(options);
            const page = await browser.newPage();
            var url = `${baseUrl}/${address_parm}`;
            console.log(url);
            await page.setUserAgent(userAgent);
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            await page.setViewport({
                width: 1200,
                height: 800
            });
            //await page.waitForTimeout (1000);
            // const json: any = await page.evaluate(async (params, wants) => {
            const json  = await page.evaluate(async (params, wants) => {
                return await new Promise(async (resolve, reject) => {
                    const response = await fetch(`https://www.zillow.com/search/GetSearchPageState.htm?searchQueryState=${encodeURIComponent(JSON.stringify(params))}&wants=${encodeURIComponent(JSON.stringify(wants))}&requestId=6`, {
                            "headers": {
                            "accept": "*/*",
                            "accept-language": "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7",
                            "cache-control": "no-cache",
                            "pragma": "no-cache",
                            "sec-ch-ua": "\" Not;A Brand\";v=\"99\", \"Google Chrome\";v=\"97\", \"Chromium\";v=\"97\"",
                            "sec-ch-ua-mobile": "?0",
                            "sec-ch-ua-platform": "\"Windows\"",
                            "sec-fetch-dest": "empty",
                            "sec-fetch-mode": "cors",
                            "sec-fetch-site": "same-origin"
                        },
                        "referrerPolicy": "unsafe-url",
                        "body": null,
                        "method": "GET",
                        "mode": "cors",
                        "credentials": "include"
                    });
                    const json = await response.json();
                    console.log('json', json);

                    return resolve(json);
                });
            }, params, wants);
            let mapResults = json?.cat1?.searchResults?.mapResults;
            //console.log('map results', mapResults[22], mapResults?.length);
            console.log(mapResults?.length, "property found");
            let limit = 0;
            if(mapResults?.length > req.query.limit )
                limit = mapResults?.length;
            else limit = req.query.limit;
            for(let index = 0; index < limit; index++)
            {
                properties.push(index, mapResults[index]);
                //console.log('map results', mapResults[index]);
            }
            res.json(properties);

            //await page.screenshot({path: "image.png"});
            await page.close();
            await browser.close();
        })();
    } catch (error) {
        res.json(error);
        console.log(`Error`);
    }
});

// app.get('/zillow/:zpid', async (req, res, next) => {
app.get('/properties/v2/detail', async (req, res, next) => {
    const zpid = req.query.property_id;
    let properties_detail = [];
    const zpid_url = `https://www.zillow.com/homedetails/${zpid}_zpid/`;

    if (isProduct) {
      options = {
        // args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
        //defaultViewport: chrome.defaultViewport,
        args: [...chrome.args, "--hide-scrollbars", "--disable-web-security", '--window-size=1200,800'],
        executablePath: await chrome.executablePath,
        headless: true,
        ignoreHTTPSErrors: true,
      };
    }else{
        options = {
            args: ['--window-size=1200,800'],
            headless: true,
        };
    }

    (async() =>{
    // Puppeteer
       // puppeteerExtra.use(pluginStealth());
        //const browser = await puppeteerExtra.launch({
        // const browser = await puppeteer.launch({
        //     headless: false, 
        //     // executablePath: puppeteer.executablePath(),
        //     // executablePath : "/usr/bin/chromium-browser",
        //     args: ['--no-sandbox'], // This was important. Can't remember why
        // });
        const browser = await puppeteer.launch(options);
        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });
        await page.setUserAgent(userAgent);
        await page.goto(zpid_url);

        let quotes = await page.evaluate(() => {
            let quotes = document.body.querySelector('script[id="hdpApolloPreloadedData"]').textContent;
            return quotes;
        });

        let quotes_all = JSON.parse(quotes);
        let apiCache = JSON.parse(quotes_all.apiCache);
        let property_data = apiCache[`ForSaleShopperPlatformFullRenderQuery{\"zpid\":${zpid},\"contactFormRenderParameter\":{\"zpid\":${zpid},\"platform\":\"desktop\",\"isDoubleScroll\":true}}`].property;
        //console.log(property_data);

        properties_detail.push(property_data);
        res.json(properties_detail);

        await page.close();
        await browser.close();
    })();

});



app.get("/api", async (req, res) => {
   let options = {};
  
    if (isProduct) {
        options = {
            args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
            defaultViewport: chrome.defaultViewport,
            executablePath: await chrome.executablePath,
            headless: true,
            ignoreHTTPSErrors: true,
        };
      }else{
          options = {
              args: [],
              headless: true,
          };
      }
  
    try {
      let browser = await puppeteer.launch(options);
  
      let page = await browser.newPage();
      await page.goto("https://www.google.com");
      res.send(await page.title());
    } catch (err) {
      console.error(err);
      return null;
    }
  });


  app.get('/image', async (req, res) => {

    if (isProduct) {
        options = {
          args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
          defaultViewport: chrome.defaultViewport,
          //args: [...chrome.args, "--hide-scrollbars", "--disable-web-security", '--window-size=1200,800'],
          executablePath: await chrome.executablePath,
          headless: true,
          ignoreHTTPSErrors: true,
        };
      }else{
          options = {
              args: ['--window-size=1200,800'],
              headless: true,
          };
      }

    try {
    //   const browser = await puppeteer.connect({
    //       browserWSEndpoint: 'wss://chrome.browserless.io?token=da549f5d-deea-4389-9fca-f088af72b3a1' 
    //   });
      
      const browser = await puppeteer.launch(options);
      // The rest of your script remains the same
      const page = await browser.newPage();
      await page.setUserAgent(userAgent);
      await page.goto('https://www.zillow.com/homedetails/36923545_zpid/', { waitUntil: 'domcontentloaded' });
  
      const screenshot = await page.screenshot();
  
      res.end(screenshot, 'binary');
      browser.close();
    } catch (error) {
      if (!res.headersSent) {
        res.status(400).send(error.message);
      }
    }
  });

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

module.exports = app;
