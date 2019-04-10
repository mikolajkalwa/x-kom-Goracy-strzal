const puppeteer = require('puppeteer');
const axios = require('axios');

const { webhookURL } = require('./config.json');

function przygotujWiadomosc(produkt) {
  let wiadomoscDoWyslania = '';

  Object.entries(produkt).forEach(([key, value]) => {
    switch (key) {
      case 'nazwa':
        wiadomoscDoWyslania += `**${value}**\n`;
        break;
      case 'staraCena':
        wiadomoscDoWyslania += `Stara cena: ${value}\n`;
        break;
      case 'nowaCena':
        wiadomoscDoWyslania += `Nowa cena: ${value}\n`;
        break;
      case 'oszczedz':
        wiadomoscDoWyslania += `Oszczędzasz: ${value}\n`;
        break;
      case 'pozostalo':
        wiadomoscDoWyslania += `Pozostało ${value} sztuk.\n`;
        break;
      case 'sprzedano':
        wiadomoscDoWyslania += `Sprzedano już ${value} sztuk.\n`;
        break;
      case 'wyprzedano':
        wiadomoscDoWyslania += '**Wyprzedano!**\n';
        break;
      default:
        wiadomoscDoWyslania += '';
    }
  });

  wiadomoscDoWyslania += 'https://www.x-kom.pl/goracy_strzal/';
  return wiadomoscDoWyslania;
}

function wykonajWebhook(webhook, wiadomosc) {
  return axios.post(webhook, {
    content: wiadomosc,
  });
}

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://www.x-kom.pl/hot-shots/current/widget');

    const produkt = await page.evaluate(() => {
      const przecenionyProdukt = {
        nazwa: document.querySelector('#hotShot > div:nth-child(2) > div.col-md-12.col-sm-6.product-impression > p'),
        staraCena: document.querySelector('#hotShot > div:nth-child(2) > div:nth-child(2) > div.clearfix.price > div.old-price'),
        nowaCena: document.querySelector('#hotShot > div:nth-child(2) > div:nth-child(2) > div.clearfix.price > div.new-price'),
        oszczedz: document.querySelector('#hotShot > div:nth-child(2) > div:nth-child(2) > div.clearfix.discount.hidden-md.hidden-lg > span'),
        pozostalo: document.querySelector('#hotShot > div:nth-child(2) > div:nth-child(2) > div.clearfix.count > div.pull-left > span'),
        sprzedano: document.querySelector('#hotShot > div:nth-child(2) > div:nth-child(2) > div.clearfix.count > div.pull-right > span'),
        wyprzedano: document.querySelector('#hotShot > div:nth-child(2) > div:nth-child(2) > div.sold-info'),
      };

      Object.entries(przecenionyProdukt).forEach(([key, value]) => {
        if (value === null) {
          delete przecenionyProdukt[key];
        } else {
          przecenionyProdukt[key] = value.innerText;
        }
      });

      return przecenionyProdukt;
    });


    const wiadomosc = przygotujWiadomosc(produkt);

    if (Array.isArray(webhookURL)) {
      const wykonywaneWebhooki = [];
      webhookURL.forEach((webhook) => {
        wykonywaneWebhooki.push(wykonajWebhook(webhook, wiadomosc));
      });
      await Promise.all(wykonywaneWebhooki);
    } else {
      await wykonajWebhook(webhookURL, wiadomosc);
    }

    await browser.close();
  } catch (error) {
    console.error(error);
  } finally {
    if (browser) {
      await browser.close();
    }
    process.exit(0);
  }
})();
