'use strict'

const puppeteer = require('puppeteer');
function extractItems() {
  const extractedElements = document.querySelectorAll('.MyEned span.wiI7pd');
  const items = [];
  for (let element of extractedElements) {
    items.push(element.innerText);
  }
  return items;
}
async function scrapeItems(
  page,
  extractItems,
  itemCount,
  scrollDelay = 2000,
) {
  let items = [];
  try {
    let previousHeight;
    while (items.length < itemCount) {
      console.log(`items.length: ${items.length} itemCount: ${itemCount}`)
      
      items = await page.evaluate(extractItems);

      previousHeight = await page.evaluate(() => { 
        const scroller = document.querySelector('div.m6QErb.DxyBCb') 
        return scroller.scrollHeight  
      })

      await page.evaluate(`document.querySelector("div.m6QErb.DxyBCb").scrollTo(0, ${previousHeight})`);
      await page.waitForFunction(`document.querySelector("div.m6QErb.DxyBCb").scrollHeight > ${previousHeight}`);
      await page.waitForTimeout(scrollDelay);

    }
  } catch(e) { }
  return items;
}


(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const [page] = await browser.pages();
  page.setViewport({ width: 1280, height: 926 });

  await page.goto('https://www.google.com/maps/place/%D8%B3%D9%88%D8%A8%D8%B1%D9%85%D8%A7%D8%B1%D9%83%D8%AA+%D9%88%D9%8A%D9%83+%D8%A7%D9%86%D8%AF+Supermarket+Week+End%E2%80%AD/@32.0009181,35.8606675,17z/data=!4m8!3m7!1s0x151ca112e34a85dd:0x1c7d1ca37ebff8e5!8m2!3d32.0009321!4d35.8606588!9m1!1b1!16s%2Fg%2F11j7wg2k3_?authuser=0&hl=en');

  // Auto-scroll and extract desired items from the page. Currently set to extract eight items.
  const items = await scrapeItems(page, extractItems, 30);

  console.log(items)

await browser.close();
})();