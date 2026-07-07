const fs = require("fs");
const h = fs.readFileSync("C:/Users/xomoe/Downloads/foodies pakistan/live-restaurant2.html", "utf8");
console.log("HTML bytes:", h.length);
const checks = [
  "Howdy",
  "__next_f.push",
  "BAILOUT",
  "application/ld+json",
  "description-text",
  "About Howdy",
  "prose prose-sm",
  "dangerouslySetInnerHTML",
  "menuItems",
  "openingHours",
];
for (const c of checks) console.log(c + ":", (h.split(c).length - 1));

// RSC payload size estimate
const rsc = h.match(/self\.__next_f\.push\(\[1,"[^"]*"\]\)/g) || [];
let rscBytes = 0;
rsc.forEach((m) => { rscBytes += m.length; });
console.log("RSC chunks:", rsc.length, "escaped bytes ~", rscBytes);

// find largest __next_f chunk
let max = 0, maxIdx = -1;
rsc.forEach((m, i) => { if (m.length > max) { max = m.length; maxIdx = i; } });
console.log("Largest RSC chunk bytes:", max);
