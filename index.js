const express = require("express");
const app = express();
const port = 3000;
const fs = require("fs");

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());
const requestParams = {
  baseURL: `http://google.com`,
  coordinates: "@32.5446655,35.9338782",
  query: "Super market", // what we want to search , // parameter defines GPS coordinates of location where you want your query to be applied
  hl: "en", // parameter defines the language to use for the Google maps search
};
const { executablePath } = require("puppeteer");
async function scrollPage(page, scrollContainer) {
  page.waitForTimeout(1000);

  // Check if a div with id "myDiv" exists on the page
  let divExists = (await page.$(".qR292b")) !== null;

  console.log(`Does the data exist? ${divExists}`);

  while (divExists) {
    console.log("not found");
    await Drag(page);

    await search_for_shown(page);
    
    await main(page);
    break;
  }
  let lastHeight = await page.evaluate(
    `document.querySelector("${scrollContainer}").scrollHeight`
  );
  while (true) {
    await page.evaluate(
      `document.querySelector("${scrollContainer}").scrollTo(0, document.querySelector("${scrollContainer}").scrollHeight)`
    );
    await page.waitForTimeout(3000);
    let newHeight = await page.evaluate(
      `document.querySelector("${scrollContainer}").scrollHeight`
    );
    if (newHeight === lastHeight) {
      break;
    }
    lastHeight = newHeight;
  }
}
async function fillDataFromPage(page) {
  const dataFromPage = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".bfdHYd")).map((el) => {
      const placeUrl = el.parentElement
        .querySelector(".hfpxzc")
        ?.getAttribute("href");
      const urlPattern =
        /!1s(?<id>[^!]+).+!3d(?<latitude>[^!]+)!4d(?<longitude>[^!]+)/gm; // https://regex101.com/r/KFE09c/1
      const dataId = [...placeUrl.matchAll(urlPattern)].map(
        ({ groups }) => groups.id
      )[0];
      const latitude = [...placeUrl.matchAll(urlPattern)].map(
        ({ groups }) => groups.latitude
      )[0];
      const longitude = [...placeUrl.matchAll(urlPattern)].map(
        ({ groups }) => groups.longitude
      )[0];
      return {
        title: el.querySelector(".qBF1Pd")?.textContent.trim(),
        rating: el.querySelector(".MW4etd")?.textContent.trim(),
        reviews: el
          .querySelector(".UY7F9")
          ?.textContent.replace("(", "")
          .replace(")", "")
          .trim(),
        type: el
          .querySelector(
            ".W4Efsd:last-child > .W4Efsd:nth-of-type(1) > span:first-child"
          )
          ?.textContent.replaceAll("·", "")
          .trim(),
        address: el
          .querySelector(
            ".W4Efsd:last-child > .W4Efsd:nth-of-type(1) > span:last-child"
          )
          ?.textContent.replaceAll("·", "")
          .trim(),
        openState: el
          .querySelector(
            ".W4Efsd:last-child > .W4Efsd:nth-of-type(3) > span:first-child"
          )
          ?.textContent.replaceAll("·", "")
          .trim(),
        phone: el
          .querySelector(
            ".W4Efsd:last-child > .W4Efsd:nth-of-type(3) > span:last-child"
          )
          ?.textContent.replaceAll("·", "")
          .trim(),
        website: el.querySelector("a[data-value]")?.getAttribute("href"),
        description: el
          .querySelector(".W4Efsd:last-child > .W4Efsd:nth-of-type(2)")
          ?.textContent.replace("· Open ·", "")
          .trim(),
        serviceOptions: el
          .querySelector(".qty3Ue")
          ?.textContent.replaceAll("·", "")
          .replaceAll("  ", " ")
          .trim(),
        gpsCoordinates: {
          latitude,
          longitude,
        },
        placeUrl,
        dataId,
      };
    });
  });
  return dataFromPage;
}
const extract_latlng = (url) => {
  const match = url.match(/@([\d\.]+),([\d\.]+)/);
  if (match) {
    const lat = match[1];
    const lng = match[2];
    const latLngString = `${lat},${lng}`;
    return latLngString;
  } else {
    console.log("Latitude and longitude not found in URL");
  }
};
async function getLocalPlacesInfo() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--start-maximized"],
    executablePath: executablePath(),
  });
  const page = await browser.newPage();
  const URL = `${requestParams.baseURL}/maps/search/${requestParams.query}/${requestParams.coordinates},16z/data=!4m2!2m1!6e6?hl=${requestParams.hl}`;
  await page.setDefaultNavigationTimeout(60000);
  await page.goto(URL);
  await page.waitForNavigation();

  await main(page);

  return page;
}

const main = async (page) => {
  const scrollContainer = ".m6QErb[aria-label]";
  const localPlacesInfo = [];
  await page.waitForTimeout(1500);
  await scrollPage(page, scrollContainer);
  localPlacesInfo.push(...(await fillDataFromPage(page)));

  if (localPlacesInfo.length > 1) {
    await save_as_file(page, localPlacesInfo);
  }
  await Drag(page);

  await search_for_shown(page);

  return main(page);
};
const search_for_shown = async (page) => {
  await page
    .waitForSelector(".cDZBKc")
    .then(async (i) => {
      await page
        .click(".cDZBKc")
        .then((i) => {
          return;
        })
        .catch(async (err) => {
          await page.reload();
          await page.waitForTimeout(3000);
          await Drag(page);
          return search_for_shown(page);
        });
    })
    .catch(async (err) => {
      await page.reload();
      await page.waitForTimeout(3000);
      await Drag(page);
      return search_for_shown(page);
    });
};
const save_as_file = async (page, data) => {
  // Extract the headers dynamically from the keys of the objects in the JSON data
  const headers = [
    ...new Set(data.flatMap((obj) => Object.keys(flatten(obj)))),
  ];
  const url = await page.evaluate(() => document.location.href);
  const latlng_string = extract_latlng(url);
  // Flatten the objects in the JSON data and extract the values dynamically
  const rows = data.map((obj) => {
    const flattenedObj = flatten(obj);
    return headers.map((header) => {
      if (header === "gpsCoordinates") {
        return `${flattenedObj[header].latitude},${flattenedObj[header].longitude}`;
      } else {
        const value = flattenedObj[header] || "";
        // Enclose each value in quotes and escape any existing quotes
        return `"${value.replace(/"/g, '\\"')}"`;
      }
    });
  });

  // Combine the headers and rows into a CSV string
  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

  // Write the CSV data to a file
  fs.writeFileSync(`${latlng_string}.csv`, csv);

  // Helper function to flatten an object
  function flatten(obj, prefix = "") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "object" && value !== null) {
        const nested = flatten(value, `${prefix}${key}.`);
        Object.assign(result, nested);
      } else {
        result[`${prefix}${key}`] = value;
      }
    }
    return result;
  }
};
const Drag = async (page) => {
  // Get the starting and ending points for the drag
  const startX = 569;
  const startY = 494;
  const endX = 169;
  const endY = 494;

  // Simulate mouse drag by pressing down the left mouse button, moving the mouse and releasing the button
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 0; i <= 100; i++) {
    const x = startX + ((endX - startX) * i) / 100;
    const y = startY + ((endY - startY) * i) / 100;
    await page.mouse.move(x, y);
  }
  await page.mouse.up();
  return;
};
app.get("/", (req, res) => {
  getLocalPlacesInfo().then((i) => {
    main(i);
  });
});

app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);
