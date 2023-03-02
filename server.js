const fetch = require("node-fetch");
var axios = require("axios").default;
const express = require("express");
const fs = require("fs");
const cors = require("cors");
API_KEY = "a69a29600548ceab5d864959e44ed285";
const request = require("request-promise");
const port = process.env.PORT || 8080;
const app = express();
app.use(cors({ origin: true }));
const cheerio = require("cheerio");
const amazonSearch = "site:amazon.com";
const HttpsProxyAgent = require("https-proxy-agent");
const https = require("https");
const Timeout = (time) => {
  let controller = new AbortController();
  setTimeout(() => controller.abort(), time * 1000);
  return controller;
};
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const key = fs.readFileSync(
  "/home/ec2-user/ShoppingExtensionBackendServer/private.key"
);
const cert = fs.readFileSync(
  "/home/ec2-user/ShoppingExtensionBackendServer/certificate.crt"
);

function createEbayAffiliate(url) {
  const ALink =
    url.split("google.com/url?url=")[1].split("&")[0] +
    "?mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=5338967868&customid=&toolid=10001&mkevt=1";
  return ALink;
}

function createAmazonAffiliate(url, countrycode) {
  var ALink;
  if (countrycode == "se") ALink = url + "?linkCode=ll1&tag=priceopediase-21";
  else ALink = url + "?linkCode=ll1&tag=priceopedia-20";
  return ALink;
}

async function aliScrape(api_url, arg) {
  const body =
    api_url == "search/"
      ? JSON.stringify({
          text: arg,
          currency: "USD",
          locale: "en_US",
          sort: "BEST_MATCH",
          page: 1,
        })
      : {};
  console.log(body);
  const data = await fetch("https://api.zapiex.com/v3/" + api_url, {
    method: "POST", // or 'PUT'
    headers: {
      "X-API-KEY": "FYYgSZKfmN84giSZtYidA8mgvq1BzVHb3ze8rdbo",
      "Content-Type": "application/json",
    },
    body: body,
  });

  const jsonData = await data.json();
  console.log(jsonData);
  return jsonData.data.items;
}
async function aliScrapeImage(imageURL) {
  const body = JSON.stringify({
    type: "URL",
    image: imageURL,
  });

  const data = await fetch("https://api.zapiex.com/v3/image/upload", {
    method: "POST", // or 'PUT'
    headers: {
      "X-API-KEY": "FYYgSZKfmN84giSZtYidA8mgvq1BzVHb3ze8rdbo",
      "Content-Type": "application/json",
    },
    body: body,
  });
  const jsonDataUpload = await data.json();
  console.log(jsonDataUpload);
  const bodyProducts = JSON.stringify({
    uploadKey: jsonDataUpload.data.uploadKey,
    currency: "USD",
    locale: "en_US",
    sort: "BEST_MATCH",
    filter: "AUTO",
  });
  const dataProducts = await fetch("https://api.zapiex.com/v3/image/search/", {
    method: "POST", // or 'PUT'
    headers: {
      "X-API-KEY": "FYYgSZKfmN84giSZtYidA8mgvq1BzVHb3ze8rdbo",
      "Content-Type": "application/json",
    },
    body: bodyProducts,
  });
  const jsonDataProducts = await dataProducts.json();
  return jsonDataProducts.data.items;
}

function getTagContent(source, tag, tag2 = "", end = '"') {
  const tagStart =
    source.indexOf(tag) != -1
      ? source.indexOf(tag) + tag.length
      : source.indexOf(tag2) + tag2.length;

  const content = source
    .substr(tagStart, source.indexOf(end, tagStart + 2) - tagStart)
    .replace(/="/, "")
    .replace(/"/, "")
    .replace(/&#39;/g, "'");
  return content;
}
function getAtr(content, startTag, endTag, before = false) {
  const start =
    before == false
      ? content.indexOf(startTag) + startTag.length
      : content.indexOf(startTag);
  const end = content.indexOf(endTag, start);
  const text = content.substr(start, end - start);
  return text;
}

function trimResults(content) {
  return content.replace(/&amp;/g, "&").trim();
}

const ccToAmazonUrl = {
  se: ".se",
  us: ".com",
  au: ".com.au",
  be: ".com.be",
  br: ".com.br",
  eg: ".eg",
  fr: ".fr",
  ae: ".ae",
  in: ".in",
  it: ".it",
  jp: ".co.jp",
  ca: ".ca",
  cn: ".cn",
  mx: ".com.mx",
  nl: ".nl",
  pl: ".pl",
  sa: ".sa",
  sg: ".sg",
  es: ".es",
  tr: ".com.tr",
  gb: ".co.uk",
  de: ".de",
};

class Amazon {
  async search(searchTerm, iproyal) {
    let amazonBase = "https://www.amazon.com";
    var startTime = performance.now();
    if (ccToAmazonUrl.hasOwnProperty(iproyal.countrycode))
      amazonBase = "https://www.amazon" + ccToAmazonUrl[iproyal.countrycode];

    const urlSearch =
      amazonBase +
      "/s/query?crid=13SPPARWRY39R&dc=&k=" +
      searchTerm +
      "&page=1&qid=" +
      Math.round(Date.now() / 1000).toString() +
      "&ref=sr_pg_1";
    console.log(urlSearch);
    const optionsSearch = {
      method: "POST",
      url:
        "http://api.scraperapi.com/?api_key=" +
        API_KEY +
        "&url=" +
        urlSearch +
        "&country_code=us&keep_headers=true",
      timeout: 10000,
      // headers: headerSearch,
    };
    var response;
    for (let index = 0; index < 7; index++) {
      try {
        if (iproyal.use) {
          console.log("IProyal");
          const proxyAgent = new HttpsProxyAgent(
            "http://jorgeDynamite:78428621_country-" +
              iproyal.countrycode +
              "@geo.iproyal.com:12321"
          );
          response = await fetch(urlSearch, {
            signal: Timeout(20).signal,
            agent: proxyAgent,

            headers: {
              "User-agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36",
            },
          });
          response = await response.text();
        } else {
          console.log("scraper api");
          response = await request(optionsSearch);
        }
        break;
      } catch (error) {
        console.log(error);
        var endTime = performance.now();
        console.log(`Call canceled at ${(endTime - startTime) / 1000} seconds`);
      }
    }

    var nProducts = [];
    var nProductsData = [];
    const products = response.split('"dispatch"');
    console.log(products[1]);

    for (var i = 0; i < products.length; i++) {
      if (products[i].includes("a-offscreen")) {
        nProducts.push(products[i]);
      }
    }
    for (var i = 0; i < nProducts.length; i++) {
      const title = trimResults(getAtr(nProducts[i], 'alt=\\"', '\\"'));
      const img = trimResults(getAtr(nProducts[i], 'srcset=\\"', " "));
      const price = trimResults(getAtr(nProducts[i], '"a-offscreen\\">', "<"));
      const asin = trimResults(getAtr(nProducts[i], '"asin" : "', '",'));
      const link = createAmazonAffiliate(
        amazonBase + "/dp/" + asin + "/",
        iproyal.countrycode
      );

      const review = trimResults(
        getAtr(nProducts[i], '"a-icon-alt\\">', "<").trim().split(" ")[0]
      ).replace(/,/g, ".");

      var reviewAmount = "";
      if (nProducts[i].includes('a-size-base s-underline-text\\">')) {
        reviewAmount = getAtr(
          nProducts[i],
          'a-size-base s-underline-text\\">',
          "<"
        );
      }
      if (
        nProducts[i].includes(
          "a-size-base puis-light-weight-text s-link-centralized-style"
        )
      ) {
        var reviewAmount = getAtr(
          nProducts[i],
          'a-size-base puis-light-weight-text s-link-centralized-style\\">',
          "<"
        );
      }
      if (!link.includes("/dp//"))
        nProductsData.push({
          title: title,
          img: img,
          price: price,
          link: link,
          review: review,
          reviewAmount: reviewAmount,
        });
    }
    console.log(nProductsData);
    var endTime = performance.now();
    console.log(`Final time ${(endTime - startTime) / 1000} seconds`);
    return nProductsData;
  }
  async findProduct(asin) {
    console.log(asin);
    if (asin == "") {
      console.log("null value");
      return null;
    }

    const urlProduct =
      "https://www.amazon.com/gp/aod/ajax/ref=dp_aod_ALL_mbc?asin=" +
      asin +
      "&pageno=1&_=" +
      Math.round(Date.now() / 1000).toString();

    const optionsProduct = {
      method: "GET",
      url:
        "http://api.scraperapi.com/?api_key=" +
        API_KEY +
        "&url=" +
        urlProduct +
        "&country_code=us",
      timeout: 10000,
    };
    var response;
    for (let index = 0; index < 7; index++) {
      try {
        response = await request(optionsProduct);
        break;
      } catch (error) {}
    }
    let Product = {};
    const title = trimResults(
      getAtr(response, 'class="aod-asin-title-text-class">', "<").replace(
        /&amp;/g,
        "&"
      )
    );
    const img = trimResults(getAtr(response, 'src="', '"'));
    const price = trimResults(getAtr(response, 'class="a-offscreen">', "<"));
    const link = "https://www.amazon.com/dp/" + asin + "/";
    Product = {
      title: title,
      img: img,
      price: price,
      link: link,
    };

    console.log(Product);
    return Product;
  }
}
const Amazon_ = new Amazon();
class SearchGoogle {
  googleProductGetImage(response, product) {
    const imageLinks = response.substr(
      response.indexOf("var _u='https://encrypted")
    );
    const id = getAtr(product, 'data-docid="', '"');
    const reversed = imageLinks.split("").reverse().join("");
    const index = reversed.indexOf(id.split("").reverse().join("")) + id.length;
    const start = reversed.indexOf("'", index + 3) + 1;
    const end = reversed.indexOf("//:", start + 10) + 8;
    const url = reversed
      .substr(start, end - start)
      .split("")
      .reverse()
      .join("")
      .replace(/\\x3d/g, "=")
      .replace(/\\x26/g, "&")
      .replace(/\\x26/g, "&");
    return url;
  }
  googleProductGetTitle(product) {
    var tag;
    for (var i = 1; i < 6; i++) {
      if (product.includes("<h" + i.toString())) {
        tag = "<h" + i.toString();
      }
    }
    const start = product.indexOf(">", product.indexOf(tag) + 2) + 1;
    const end = product.indexOf("</", start);
    const title = product.substr(start, end - start);
    return title;
  }
  googleProductGetLink(product, countrycode) {
    const id = 'class="shntl"';
    const reversed = product.split("").reverse().join("");
    const index = reversed.indexOf(id.split("").reverse().join("")) + id.length;
    const start = reversed.indexOf('"', index) + 1;
    const end = reversed.indexOf('"', start + 10);
    var url =
      "https://www.google.com" +
      reversed
        .substr(start, end - start)
        .split("")
        .reverse()
        .join("")
        .replace(/\\x3d/g, "=")
        .replace(/\\x26/g, "&")
        .replace(/&amp;/g, "&");

    if (url.includes("ebay.com")) url = createEbayAffiliate(url);
    else if (url.includes("amazon.com"))
      url = createAmazonAffiliate(url, countrycode);
    return url;
  }

  async searchGoogle(search, iproyal) {
    const searchTerm = search.replace(/ /g, "+");
    console.log("https://www.google.com/search?q=" + searchTerm + "&tbm=shop");
    const optionsSearch = {
      method: "GET",
      url:
        "http://api.scraperapi.com/?api_key=" +
        API_KEY +
        "&url=" +
        "https://www.google.com/search?q=" +
        searchTerm +
        "&tbm=shop" +
        "&country_code=us",
      timeout: 20000,
    };
    var response;
    var countrycode = iproyal.countrycode;
    for (let index = 0; index < 7; index++) {
      try {
        if (iproyal.use) {
          console.log(countrycode);
          console.log("IProyal");
          const proxyAgent = new HttpsProxyAgent(
            "http://jorgeDynamite:78428621_country-" +
              countrycode +
              "@geo.iproyal.com:12321"
          );
          response = await fetch(
            "https://www.google.com/search?q=" + searchTerm + "&tbm=shop",
            {
              signal: Timeout(20).signal,
              agent: proxyAgent,

              headers: {
                "User-agent":
                  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36",
              },
            }
          );
          response = await response.text();
        } else {
          console.log("scraper api");
          response = await request(optionsSearch);
        }
        break;
      } catch (error) {
        // var endTime = performance.now();
        // console.log(`Call canceled at ${(endTime - startTime) / 1000} seconds`);
        if (index > 1) {
          countrycode = "us";
        }
      }
    }

    var nProducts = [];
    var nProductsData = [];
    const products = response.split(/(?=data-docid=)/g);

    //console.log(products[1]);
    for (var i = 0; i < products.length; i++) {
      if (products[i].includes("a8Pemb")) {
        nProducts.push(products[i]);
      }
    }

    for (var i = 0; i < nProducts.length; i++) {
      const title = this.googleProductGetTitle(nProducts[i]);
      const img = this.googleProductGetImage(response, nProducts[i]);
      const price = getAtr(nProducts[i], 'class="a8Pemb OFFNJ">', "<")
        .replace('"')
        .replace(">");
      var review = getAtr(
        nProducts[i].substr(
          nProducts[i].indexOf("out of 5") - 5,
          nProducts[i].length
        ),
        '"',
        '"'
      ).split(" ")[0];
      review = nProducts[i].includes("out of 5")
        ? review
        : nProducts[i].includes('class="Rsc7Yb">')
        ? getAtr(nProducts[i], 'class="Rsc7Yb">', "<")
        : "";
      const reviewAmountContent = nProducts[i]
        .substr(
          nProducts[i].indexOf("out of 5 stars. ") + "out of 5 stars. ".length,
          100
        )
        .split(" ")[0];

      const reviewAmount =
        nProducts[i].indexOf("out of 5 stars. ") != -1
          ? reviewAmountContent
          : "";
      const link = this.googleProductGetLink(nProducts[i], countrycode);

      if (!price.includes("undefined")) {
        nProductsData.push({
          title: title,
          img: img,
          price: price,
          link: link,
          review: review.replace(/,/g, "."),
          reviewAmount: reviewAmount,
        });
      }
      // nProductsData = nProductsData.reverse();
    }
    console.log(nProductsData);
    console.log(nProductsData.length);
    //var endTime = performance.now();
    // console.log(`Finished at ${(endTime - startTime) / 1000} seconds`);
    return nProductsData;
  }
}

class ImageSearch {
  async getAliexpressData(url) {
    const Results = [];
    const aliData = await aliScrapeImage(url);

    for (var i = 0; i < aliData.length; i++) {
      Results[i] = {
        price: "$" + aliData[i].productMinPrice.value,
        title: aliData[i].title,
        img: aliData[i].imageUrl,
        link:
          "https://www.aliexpress.com/item/" + aliData[i].productId + ".html",
        review: aliData[i].averageRating,
      };
    }
    return aliData;
  }

  getPriceAndImage(data, urls, number, website) {
    let price;
    let image;
    let title;
    const stringData = data.toString();
    //write out source

    if (website == 1) {
      //Amazon
      let $ = cheerio.load(data);
      title = $("#productTitle").text();
      price = $(".a-offscreen").first().text();
      image = getTagContent(
        stringData,
        "data-old-hires",
        '"og:image" content="'
      );
      console.log(title);
      console.log(price);
      console.log(image);
    } else if (website == 2) {
      //Ebay
      let $ = cheerio.load(data);
      title = $(".x-item-title__mainTitle").text();
      price = $(".x-price-primary").find("span.ux-textspans").text();
      price = price != "" ? price : getTagContent(stringData, '"binPrice":');
      image = getTagContent(stringData, 'og:image" Content="');
    } else if (website == 3) {
      //Aliexpress
      data = data.data.items;
      price = data.image = getTagContent(
        stringData,
        '<meta property="og:image" content="'
      );
      title = getTagContent(stringData, '"subject":');
    }
    //Log results
    console.log("___________________");
    console.log(price);
    console.log(title);
    console.log(image);
    console.log(urls[number]);
    console.log("Finshed Scraping");
    console.log("___________________");
    title = title.trim();
    price = price.trim();
    image = image.trim();
    return { title: title, price: price, img: image };
  }

  async getOrganicResults(websiteNumber, searchImageURL = null) {
    const Results = [];
    const links = [];
    const titles = [];
    const searchContent =
      websiteNumber == 1
        ? amazonSearch
        : websiteNumber == 2
        ? ebaySearch
        : aliExpressSearch;
    const url =
      "https://www.google.com/searchbyimage?hl=en&site=imghp&q=" +
      searchContent +
      "&authuser=0&image_url=" +
      searchImageURL +
      "?fmt=webp&v=1";
    console.log(url);
    const optionsGoogle = {
      method: "GET",
      url:
        "http://api.scraperapi.com/?api_key=" +
        API_KEY +
        "&url=" +
        url +
        "&country_code=us",
      timeout: 20000,
    };
    var data;
    for (let index = 0; index < 7; index++) {
      try {
        data = await request(optionsGoogle);
        break;
      } catch (error) {
        console.log("try again");
      }
    }

    let $ = cheerio.load(data);
    $(".yuRUbf > a").each((i, el) => {
      links[i] = $(el).attr("href").replace(/.com/, ".com");
    });
    $(".yuRUbf > a > h3").each((i, el) => {
      titles[i] = $(el).text();
    });

    const result = [];
    for (let i = 0; i < links.length; i++) {
      //links[i] = links[i].replace(/.com/, ".us");
      var ASIN = "";
      var regex = RegExp("(?:[/dp/]|$)([A-Z0-9]{10})");
      var m = links[i].match("/([a-zA-Z0-9]{10})(?:[/?]|$)");
      console.log(links[i]);
      console.log(m);
      if (m) {
        ASIN = m[1];
      }
      result[i] = {
        asin: ASIN,
        link: links[i],
        title: titles[i],
      };
    }
    console.log(result);
    if (websiteNumber == 1 && links.length != 0) {
      try {
        await Promise.all([
          Amazon_.findProduct(result[0].asin).then((data) => {
            Results[0] = data;
            if (Results[0] != null) {
              Results[0].link = links[0];
            }
          }),
          ,
          Amazon_.findProduct(result[1].asin).then((data) => {
            Results[1] = data;
            if (Results[1] != null) {
              Results[1].link = links[1];
            }
          }),

          ,
          Amazon_.findProduct(result[2].asin).then((data) => {
            Results[2] = data;
            if (Results[2] != null) {
              Results[2].link = links[2];
            }
          }),
          ,
          Amazon_.findProduct(result[3].asin).then((data) => {
            Results[3] = data;
            if (Results[3] != null) {
              Results[3].link = links[3];
            }
          }),
          Amazon_.findProduct(result[4].asin).then((data) => {
            Results[4] = data;
            if (Results[4] != null) {
              Results[4].link = links[4];
            }
          }),
        ]);
      } catch (err) {
        console.log("post call failed");
        console.log(err);
      }
    }
    /*
    if (links.length != 0) {
      try {
        await Promise.all([
          scraperapiClient.get(links[0]).then((data) => {
            Results[0] = this.getPriceAndImage(data, links[0], 0, websiteNumber);
            Results[0].link = links[0]
          }),
          scraperapiClient.get(links[1]).then((data) => {
            Results[1] = this.getPriceAndImage(data, links[1], 1, websiteNumber);
            Results[1].link = links[1]
          }),
          scraperapiClient.get(links[2]).then((data) => {
            Results[2] = this.getPriceAndImage(data, links[2], 2, websiteNumber);
            Results[2].link = links[2]
          }),
          scraperapiClient.get(links[3]).then(async (data) => {
            Results[3] = this.getPriceAndImage(data, links[3], 3, websiteNumber);
            Results[3].link = links[3]
          }),
          scraperapiClient.get(links[4]).then(async (data) => {
            Results[4] = this.getPriceAndImage(data, links[4], 4, websiteNumber);
            Results[4].link = links[4]
          }),


        ]); //Amazon and Ebay fetching
        //Aliexpress fetching
         
  } catch(err) {
    console.log("post call failed");
    console.log(err);
  }
}*/

    //console.log(Results);

    return Results.filter(Boolean);
  }
}

//Run scripts

const ImageSearch_ = new ImageSearch();
const SearchGoogle_ = new SearchGoogle();

app.get("/searchByImage/aliexpress/", async (req, res) => {
  var Results = [];
  var startTime = performance.now();
  for (var i = 0; i < 4; i++) {
    try {
      console.log("Starting Aliexpress search by image");
      console.log(req.query.img);
      Results = await ImageSearch_.getAliexpressData(req.query.img);
    } catch (error) {
      console.log("Aliexpress Image Error");
      console.log(error);
      await delay(2000);
    }

    if (Results.length !== 0) {
      break;
    }
  }
  var endTime = performance.now();
  console.log(
    `SearchByImage Aliexpress took ${(endTime - startTime) / 1000} seconds`
  );
  return res.status(200).send({ results: Results });
});
app.get("/searchByImage/amazon/", async (req, res) => {
  var Results = [];
  var ExtraParam = "";
  var startTime = performance.now();
  try {
    Results = await ImageSearch_.getOrganicResults(
      1,
      req.query.img + ExtraParam
    );
  } catch (error) {
    console.log(error);
    ExtraParam = "?width=500";
  }

  var endTime = performance.now();
  console.log(
    `SearchByImage Amazon took ${(endTime - startTime) / 1000} seconds`
  );
  return res.status(200).send({ results: Results });
});

function titleSmaler(title, i) {
  if (i == 1) {
    title = title.split(" ").slice(0, 5).join(" ");
  }
  if (i == 2) {
    title = title.split(" ").slice(0, 3).join(" ");
  }
  if (i == 3) {
    title = title.split(" ").slice(0, 1).join(" ");
  }
  return title.replace(/  /g, " ").replace(/ /g, "+");
}

app.get("/searchByTitle/google/", async (req, res) => {
  var title = "";
  var Results = {};
  var startTime = performance.now();
  var countrycode = req.query.cc || "us";
  for (var i = 0; i < 4; i++) {
    if (i > 1) {
      countrycode = "us";
    }
    try {
      title = titleSmaler(req.query.title, 0);
      Results = await SearchGoogle_.searchGoogle(title, {
        use: true,
        countrycode: countrycode,
      });
      var endTime = performance.now();
      console.log(
        `SearchByTitle to took ${(endTime - startTime) / 1000} seconds`
      );
    } catch (error) {
      console.log(error);
      await delay(2000);
    }
    if (Results.length !== 0) {
      break;
    }
  }
  var endTime = performance.now();
  console.log(`Call to took ${(endTime - startTime) / 1000} seconds`);

  //console.log(Results)
  console.log("Finished Title Google");
  return res.status(200).send({ results: Results });
});

app.get("/searchByTitle/amazon/", async (req, res) => {
  var title;
  var Results = {};
  var startTime = performance.now();
  var countrycode = req.query.cc || "us";
  for (var i = 0; i < 4; i++) {
    if (i > 1) {
      countrycode = "us";
    }
    title = titleSmaler(req.query.title, i);
    console.log(title);
    try {
      Results = await Amazon_.search(title, {
        use: true,
        countrycode: countrycode,
      });
      var endTime = performance.now();
      console.log(
        `SearchByTitle to took ${(endTime - startTime) / 1000} seconds`
      );
    } catch (error) {
      console.log(error);
      await delay(2000);
    }
    if (Results.length != 0) break;
  }
  var endTime = performance.now();
  console.log(`Call to took ${(endTime - startTime) / 1000} seconds`);

  //console.log(Results)
  console.log("Finished Title Amazon");
  return res.status(200).send({ results: Results });
});

app.get("/affilite/aliexpress/", async (req, res) => {
  const urlPortals =
    "https://portals.aliexpress.com/tools/linkGenerate/generatePromotionLink.htm?trackId=default&targetUrl=https%3A%2F%2Fwww.aliexpress.com%2Fitem%2F4000233378302.html%3FgatewayAdapt%3D4itemAdapt";

  var linkParam =
    "https://www.aliexpress.com/item/4000233378302.html?gatewayAdapt=4itemAdapt";
  var ALink;
  const iproyal = false;
  var startTime = performance.now();

  try {
    if (iproyal) {
      console.log("IProyal");
      const httpsAgent = new HttpsProxyAgent(
        "http://jorgeDynamite:78428621_country-us@geo.iproyal.com:12321"
      );
      axios = axios.create({ httpsAgent: httpsAgent });
      var options = {
        method: "GET",
        url: "https://portals.aliexpress.com/tools/linkGenerate/generatePromotionLink.htm",
        params: {
          trackId: "default",
          targetUrl:
            "https://www.aliexpress.com/item/4000233378302.html?gatewayAdapt=4itemAdapt",
        },
        headers: {
          cookie:
            'cna=xvZ6GhLECxACAVDYzWS/LAOJ; af_ss_a=1; sgcookie=E100ZeOzD%2BgEOZ4n55xAJfGApPoF3ttsBl%2Bo2GuMF8CikxTaSpKlxC0JhKK8PnpNgPvy126SS1igOurUS6WsQ4aYZgnD2ARHKWu0CsYZQ9wTzxk%3D; ali_apache_id=33.0.189.208.1663676877360.178764.1; e_id=pt20; tmr_lvid=fc384f025d8a54b6dbe3cfa1b341403e; tmr_lvidTS=1663765785947; tmr_reqNum=6; account_v=1; traffic_se_co=%7B%7D; x_router_us_f=x_alimid=2621188861; _fbp=fb.1.1667571261278.1808605894; _gcl_au=1.1.437935579.1667571261; _ym_uid=1667571261682248832; _ym_d=1667571261; __utma=3375712.7945120.1667475221.1668347492.1668347492.1; __utmz=3375712.1668347492.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); _gid=GA1.2.1053997407.1674990165; intl_locale=en_US; af_ss_b=1; ali_apache_tracktmp=W_signed=Y; xlly_s=1; _ym_isad=2; x-hng=lang=en-US; kifc_108675=1; aep_common_f=t7Q4jx+6Z/QwPSfJsnfTjLYpDNB4G9DXisOluUfwPDXC4th/QcZQRQ==; ali_apache_track=mt=1|mid=se1022263857iarae; acs_usuc_t=acs_rt=06380e9e17ef491eaa45e74b2e5b7336&x_csrf=13ex4r45qrf1c; havana_tgc=eyJwYXRpYWxUZ2MiOnsiYWNjSW5mb3MiOnsxMzp7ImFjY2Vzc1R5cGUiOjEsIm1lbWJlcklkIjoxMzM2OTA5OTA5MDIsInRndElkIjoiNjB2bkJUbHFRU0ZIcmtZSVNmWEJKWGcifX19fQ; _hvn_login=13; xman_us_t=x_lid=se1022263857iarae&sign=y&rmb_pp=tobiesongeorge@gmail.com&x_user=lgsuVrWTLLFErpK4ysJbn8vPpKYtbAVP323CCxyWWwQ=&ctoken=r2a8ywbgt3um&l_source=aliexpress; xman_f=LIJ3YlOet2LrhVs94/ewhW4zYZ+gdEzKT1OWNLWLDSd/E5OEU87IXKlztnAQXLe3AZHpQS2tq0L5DCw2Wn9Duhu4O2/ZoA/Ekuo/Bx0vQVdKLbFRS9q3kRWyj2kFa9YnwMcmTje3jKLoIj3t4DwcZ9+Xh6XmKQD/7KNFc2M0lLcWBUwcFUokR5+3mkFyhxt88TbJI2mB2xsgzUBtdLdi8Yi9eqIRsfa5nvSh7idOg5313fVbssntB8w8rMWWdP+9gHj2E3o9BxbG8qPtYKdC3d6zc7HVKtEzes1GGYOVMOusYylyDjK3WhAbCxvpF8sB388ME99VkEilJY5HquYOST3ULgZ6vxYoHy0IuMI4KZHBU3xciTDndkiBOZBQhFevoHVlcadE3LQIvEniG7YI9qFUWGxFdQu2StxIOSx/NoTmww4yX44bGfmYuOEuK/hDxh+22n+QmBiRoZoiHD1Qi+Rho6gWk8Y9DQDb0zdviwY=; aep_usuc_f=site=glo&c_tp=SEK&x_alimid=2621188861&isfb=y&ups_d=1|1|1|1&isb=y&ups_u_t=1682860528264&region=SE&b_locale=en_US&ae_u_p_s=2; AKA_A2=A; xman_us_f=x_locale=en_US&x_l=0&last_popup_time=1643382989398&x_user=SE|George|Tobieson|ifm|2621188861&no_popup_today=n&x_lid=se1022263857iarae&x_c_chg=0&x_c_synced=0&x_as_i=%7B%22aeuCID%22%3A%22cb4a1c42e21941b3808e064550cfc098-1675280191716-07399-_DndpqHN%22%2C%22affiliateKey%22%3A%22_DndpqHN%22%2C%22channel%22%3A%22AFFILIATE%22%2C%22cv%22%3A%221%22%2C%22isCookieCache%22%3A%22N%22%2C%22ms%22%3A%221%22%2C%22pid%22%3A%222621188861%22%2C%22tagtime%22%3A1675280191716%7D&acs_rt=07bffcb204fb450bbcee000a859a73ae; aeu_cid=cb4a1c42e21941b3808e064550cfc098-1675280191716-07399-_DndpqHN; aep_history=keywords%5E%0Akeywords%09%0A%0Aproduct_selloffer%5E%0Aproduct_selloffer%091005004428938634%091005001817659402%091005004831875502%091005005111114841%091005003674158006%091005001763663811%094000233378302%091005001976367073; intl_common_forever=K/UdyWt5MmFBwvmeqPyGfSbDzed2YQES4n+deEb/vkuz0wwOflTrdw==; JSESSIONID=1D925750BBB7AB9B2AB05B669E1860D6; xman_t=VWU0uQXbkSY1YvmvjIwNOcy8im+x92si4mV5GImPbYHOVfbywRHJxPJ8RvFsGNJ9l89zHBXUgmexeuRHnLt8+NHoln/dnIlhiQVNSRhLzpD+AQ2xMiFZ000Echq8nJ8QS6hIqTtSiZOicgJzqAdg7wN/hr/VrK3SdmtJqE9tX56/EKYbt0No/236QBI/eveTUEtzvZnwh7JAFp2aL/mpcLoNvMBXbshFnN6tcv5BARAQwyGPxftBuBJtSDH557q5wrEois5jrV7dLOVzmtz2njRyc7Kenam2/YCxmQWU7+gSDFRER7pQs1CsA4Ubjn55UUx5SZ54FYEmGYa/VRY10HKaO4qbo4n2/fjDR7YgcQfh8hgQpaQtYgz0cXrTp+qlGQ8lFCKXAg4QeV/Rx2rHW6w6WTIE+rm1ndmS2GkG/oZVjLO+h5b6sbvO88AWDbfni00/gmUgnzCapWgiI5mq6UWfVtv43VkFw110vE3Pq9Qb/F6f305ILtkTSnIGrjDymW1/H2+N8E4opBi+M+0O93rej6kwlP34o5upggfHkI7tXVBVRlppjGey/XwMrwXbdk7IYtcWp5loa2XX7QHssR8/8/lbnlCTQjBKttEvOTcXD6F8gilGX0e9poFzNGxwySKwcuCL0LMR6yB9BUIoGQomJ2C14csYSJl2eUo3Se4KGLRvFQcJJURmFt7UhDALiAuOH9lSp/Q=; _m_h5_tk=d9d80c2b0fc16b298a82995bec1a511c_1675282100891; _m_h5_tk_enc=84331be8bb8b96c5d75de7f4f5cf07a7; cto_bundle=rx6IZF9XMVklMkJPb0F4UEhadnJOa2NrWTduME9PNGttemFmaDdxbGd3b3I3RVlyMUtYeWNQT2s0Q3VJbWpJUGs3TWFQRzVybmFMTlhIT3p4UWxhcGJOVjJEWkgxNnpsVmpJRHRNcTRDaDRsMnIyOURYcWJpQjBkeDdCNExwcVdiVUVRc1g3ZnNnWE1HJTJCd1FnUzExWXZZbHJ0QmdRJTNEJTNE; _ga_VED1YSGNC7=GS1.1.1675280218.31.0.1675280218.0.0.0; _ga=GA1.1.7945120.1667475221; _ym_visorc=b; RT="z=1&dm=aliexpress.com&si=438c99c2-b401-4a7d-9726-8f32a1fbe996&ss=ldm2k6q5&sl=1&tt=11v3&rl=1&ld=11v5"; isg=BHd3Hsts2JTVCV42sZHPIfW9Bm3BPEueobwZ38kgg8aveJ660w4P7wweW8AmsiMW; tfstk=ccU5BPOb8JUqvM7HrY1VTW9KdWu1az8Sg_M0NTYVNxzRYH2ZHsbe7Aws6Wvx8Xhf.; l=fBxrdorlgdEx4ZIwBO5Cnurza779gCAf5GVzaNbMiIEGa6OO6FTuONCeQARJJdtxQT50Dexy58T6YdnMWJ43Wx9z7vO31j0FDIvMJe__E-ZF.',
          authority: "portals.aliexpress.com",
          accept: "application/json, text/plain, */*",
          "accept-language": "en-US,en;q=0.9,sv-SE;q=0.8,sv;q=0.7",
          "bx-v": "2.2.3",
          "cache-control": "no-cache",
          pragma: "no-cache",
          referer:
            "https://portals.aliexpress.com/affiportals/web/link_generator.htm?spm=0._dscenter_dada.0.0.507agk0xgk0xNI",
          "sec-ch-ua":
            '"Not_A Brand";v="99", "Google Chrome";v="109", "Chromium";v="109"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
        },
      };

      const data = await axios.request(options);
      ALink = data.data.data;
    } else {
      console.log("scraper api");
      response = await request(optionsSearch);
    }
  } catch (error) {
    console.log(error);
  }
  var endTime = performance.now();
  console.log(
    `Aliexpress Affilite link: ${(endTime - startTime) / 1000} seconds`
  );

  console.log(ALink);
  console.log("Finished Affiliate Aliexpress");
  return res.status(200).send({ link: ALink });
});

app.get("/searchByTitle/aliexpress/", async (req, res) => {
  var title = "";
  var Results = {};
  var startTime = performance.now();
  for (var i = 0; i < 3; i++) {
    try {
      title = titleSmaler(req.query.title, i).replace(/\+/g, " ");
      Results = await aliScrape("search/", title);
      var endTime = performance.now();
      console.log(
        `SearchByTitle to took ${(endTime - startTime) / 1000} seconds`
      );
    } catch (error) {
      console.log(error);
    }
    var endTime = performance.now();
    console.log(`Call to took ${(endTime - startTime) / 1000} seconds`);
    if (Results.length !== 0) {
      break;
    }
  }

  //console.log(Results)
  console.log("Finished Title Aliexpress");
  return res.status(200).send({ results: Results });
});

app.get("/test/", (req, res) => {
  res.send("I am working");
});

const credentials = {
  key: key,
  cert: cert,
};

app.listen(port, () => {
  console.log("listening to port" + port.toString());
});
const httpsServer = https.createServer(credentials, app);
httpsServer.listen(8443);
