const cheerio = require('cheerio');
const axios = require('axios');

const { webhookURL } = require('./config.json');

const currentDate = new Date().toISOString();

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
  return axios.post(webhook, {
    content: message,
  });
}

(async () => {
  try {
    const website = await axios.get('https://www.x-kom.pl/hot-shots/current/widget');
    const $ = cheerio.load(website.data);

    const productName = $('.product-name').text();
    const productId = $('div.col-md-12:nth-child(1)').attr('data-product-id');
    const oldPrice = $('.old-price').text();
    const newPrice = $('.new-price').text();
    const remainingAmount = $('.pull-left .gs-quantity').text();
    const soldAmount = $('.pull-right .gs-quantity').text();
    const soldOut = $('.sold-info').text();

    const staraCenaJakoLiczba = parseInt(oldPrice.replace(/ /g, '').slice(0, -5), 10);
    const nowaCenaJakoLiczba = parseInt(newPrice.replace(/ /g, '').slice(0, -5), 10);
    const saving = convertPriceFormat(staraCenaJakoLiczba - nowaCenaJakoLiczba);

    const product = {
      productName, oldPrice, newPrice, saving, remainingAmount, soldAmount, soldOut, productId,
    };

    const message = prepareMessage(deleteEmptyProperties(product));

    if (Array.isArray(webhookURL)) {
      const executingWebhooks = [];
      webhookURL.forEach((webhook) => {
        executingWebhooks.push(executeWebhook(webhook, message));
      });

      await Promise.all(executingWebhooks);
    } else {
      await executeWebhook(webhookURL, message);
    }
  } catch (error) {
    console.error(currentDate, error);
  }
})();
