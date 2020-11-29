const axios = require("axios");
const cheerio = require("cheerio");

const product = "YOUR PRODUCT HERE";

// formats the string to work with a url
const prepareSearch = search => {
    search = search.split("/").join("%2F");
    search = search.split("+").join("%2B");
    search = search.split("(").join("%28");
    search = search.split(")").join("%29");
    const characterArray = search.split(" ");
    let preparedSearch = characterArray.join("+");
    preparedSearch = preparedSearch.substring(0, 90);
    return preparedSearch;
}

// intialize variables
let currPrice = 0;
let isOnSale = false;
let isInStock = false;

// gets the link to the product based on num matches, calls getStatus
const monitorShop = search => {
    axios.get(`https://www.amazon.com/s?k=${search}`)
    .then(response => {

        const searchTags = search.split(" ");
        const $ = cheerio.load(response.data);
        let products = [];
        let links = []; 
        let currMatches = 0;
        let pastMatches = 0;
        let finalIndex = 0;

        $('.s-main-slot.s-result-list.s-search-results.sg-row > div').each(function(i) {
            links[i] = $(this).attr('data-asin');
        });
        links = links.filter(id => id != '');
        links = links.map(id => "https://www.amazon.com/dp/" + id);

        $('.a-color-base.a-text-normal span').each(function(i) {
            products[i] = $(this).text();
            const productTags = $(this).text().split(" ");
            
            for (let a = 0; a < productTags.length; a++) {
                for (let b = 0; b < searchTags.length; b++) {
                    if (productTags[a] == searchTags[b]) {
                        currMatches += 1;
                    }
                }
            }

            if (currMatches > pastMatches) {
                pastMatches = currMatches;
                finalIndex = i;
            }

            currMatches = 0;

        });

        getStatus(links[finalIndex]);
    })
    .catch(error => {
        console.log("Error: URL Not found.");
        console.log(error.message);
    });

};

// says whether the product is in stock or not as well as the price
const getStatus = link => {
    axios.get(link)
    .then(response => {
        const $$ = cheerio.load(response.data);
        let prices = [];
        let price = 0;
        let stocks = [];
        $$('.a-size-medium.a-color-success').each(function(i) {
            stocks[i] = $$(this).text();
        });
        let availability = stocks[1];
        if (availability.trim() != "In Stock.") {
            isInStock = false;
            console.log("Update: " + availability.trim());
        } else {
            if (!isInStock) {
                console.log("Stock update!");
            }
            isInStock = true;
            console.log("This product is in stock.")
        }
        $$(".a-color-price").each(function(i) {
            prices[i] = $$(this).text();
        });
        price = prices[0];
        console.log("The price of this product is " + price);
        if (currPrice != 0) {
            if (price < currPrice) {
                currPrice = price;
                isOnSale = true;
            }
        } else {
            currPrice = price;
        }
    })
    .catch(error => {
        console.log("Error: Couldn't handle the request.");
        console.log(error.message);
    });
}

// runs monitor every 100 ms
runMonitor = async search => {
    while (true) {
        while (!isOnSale) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            monitorShop(search);
            console.log();
        }
        console.log("Product is on sale at " + currPrice + "!");
        isOnSale = false;
    }
}

let search = prepareSearch(product);
runMonitor(search);
