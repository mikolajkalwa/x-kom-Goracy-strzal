const cheerio = require('cheerio');
const got = require('got');
const logger = require('pino')();

const { webhookURL } = require('./config.json');

function convertPriceFormat(price) {
  return `${price},00 zł`;
}

function deleteEmptyProperties(product) {
  Object.entries(product).forEach(([key, value]) => {
    if (!value) {
      // eslint-disable-next-line no-param-reassign
      delete product[key];
    }
  });
  return product;
}

function prepareMessage(product) {
  let message = '';

  Object.entries(product).forEach(([key, value]) => {
    switch (key) {
      case 'productName':
        message += `**${value}**\n`;
        break;
      case 'oldPrice':
        message += `Stara cena: ${value}\n`;
        break;
      case 'newPrice':
        message += `Nowa cena: ${value}\n`;
        break;
      case 'saving':
        message += `Oszczędzasz: ${value}\n`;
        break;
      case 'remainingAmount':
        message += `Pozostało ${value} sztuk.\n`;
        break;
      case 'soldAmount':
        message += `Sprzedano już ${value} sztuk.\n`;
        break;
      case 'soldOut':
        message += '**Wyprzedano!**\n';
        break;
      case 'productId':
        message += `<http://x-kom.pl/p/${value}>\n`;
        break;
      default:
        message += '';
    }
  });

  message += 'https://www.x-kom.pl/goracy_strzal/';

  return message;
}

function executeWebhook(webhook, message) {
  return got.post(webhook, {
    json: {
      content: message,
    },
  });
}

async function sendNotification(message) {
  if (Array.isArray(webhookURL)) {
    const executingWebhooks = [];
    webhookURL.forEach((webhook) => {
      executingWebhooks.push(executeWebhook(webhook, message));
    });

    await Promise.all(executingWebhooks);
  } else {
    await executeWebhook(webhookURL, message);
  }
}

async function getProduct() {
  const website = await got('https://www.x-kom.pl/hot-shots/current/widget');
  const $ = cheerio.load(website.body);

  const productName = $('.product-name').text();
  const productId = $('div.col-md-12:nth-child(1)').attr('data-product-id');
  const oldPrice = $('.old-price').text();
  const newPrice = $('.new-price').text();
  const remainingAmount = $('.pull-left .gs-quantity').text();
  const soldAmount = $('.pull-right .gs-quantity').text();
  const soldOut = $('.sold-info').text();

  const oldPriceAsNumber = parseInt(oldPrice.replace(/ /g, '').slice(0, -5), 10);
  const newPriceAsNumber = parseInt(newPrice.replace(/ /g, '').slice(0, -5), 10);
  const saving = convertPriceFormat(oldPriceAsNumber - newPriceAsNumber);

  const product = {
    productName, oldPrice, newPrice, saving, remainingAmount, soldAmount, soldOut, productId,
  };
  return product;
}

async function notifyAboutNewPromotion(oldPromotion, retries = 1) {
  const newPromotion = await getProduct();
  if (newPromotion.productId !== oldPromotion.productId) {
    logger.info('Fetched products are different. Finish recurssion!');
    const message = prepareMessage(deleteEmptyProperties(newPromotion));
    await sendNotification(message);
    process.exit(0);
  }

  logger.info(`Product haven't changed. Attempt: ${retries}`);
  setTimeout(async () => notifyAboutNewPromotion(oldPromotion, retries + 1), retries * 5 * 1000);
}

(async () => {
  const oldPromotion = await getProduct();

  setTimeout(async () => {
    await notifyAboutNewPromotion(oldPromotion);
  }, 90 * 1000);
  // assuming the script runs at 9:59, we give x-kom additional 30 seconds to update hot shot

  // terminate the process after 8 minutes:
  setTimeout(() => {
    logger.error('Unable to fetch new promotion.');
    process.exit(1);
  }, 8 * 60 * 1000);
})();
