const fs = require("fs");
const h = fs.readFileSync("C:/Users/xomoe/Downloads/foodies pakistan/live-restaurant.html", "utf8");
console.log("HTML bytes:", h.length);
for (const p of ["Howdy Rooftop", "howdy-rooftop", "application/ld+json", "__next_f.push", "BAILOUT"]) {
  console.log(p + ":", (h.split(p).length - 1));
}
const idx = h.indexOf("Howdy Rooftop");
if (idx > -1) {
  const contexts = [];
  let pos = 0;
  while ((pos = h.indexOf("Howdy Rooftop", pos)) !== -1) {
    contexts.push(h.slice(Math.max(0, pos - 40), pos + 60).replace(/\s+/g, " "));
    pos += 1;
    if (contexts.length >= 8) break;
  }
  console.log("\nSample contexts:");
  contexts.forEach((c, i) => console.log(i + 1, c));
}
