const fetch = require("node-fetch");
require("dotenv").config({ path: ".env" });

const API_KEY = process.env.SHORT_IO_API_KEY;

async function checkStats() {
  if (!API_KEY) {
    console.error("Missing SHORT_IO_API_KEY");
    return;
  }

  // Get first few links
  const linksRes = await fetch("https://api.short.io/api/links?limit=5", {
    headers: { authorization: API_KEY },
  });
  const { links } = await linksRes.json();

  if (!links || links.length === 0) {
    console.log("No links found");
    return;
  }

  const linkId = links[0].idString || links[0].id;
  console.log(`Checking stats for link: ${links[0].path} (${linkId})`);

  const statsRes = await fetch(
    `https://api-v2.short.io/statistics/link/${linkId}?period=last7`,
    {
      headers: { authorization: API_KEY },
    },
  );
  const stats = await statsRes.json();

  console.log("Stats Keys:", Object.keys(stats));

  const utmKeys = Object.keys(stats).filter((k) =>
    k.toLowerCase().includes("utm"),
  );
  console.log("UTM Related Keys:", utmKeys);

  if (utmKeys.length > 0) {
    utmKeys.forEach((k) => {
      console.log(`${k}:`, JSON.stringify(stats[k], null, 2));
    });
  } else {
    console.log("No UTM keys found in response.");
    // Log the whole object if few keys
    if (Object.keys(stats).length < 20) {
      console.log("Full Stats Object:", JSON.stringify(stats, null, 2));
    }
  }
}

checkStats();
