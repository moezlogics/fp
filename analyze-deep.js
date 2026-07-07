const fs = require("fs")
const h = fs.readFileSync(__dirname + "/live-pdp.html", "utf8")

// RSC payload chunk sizes
const pushes = [...h.matchAll(/self\.__next_f\.push\(\[1,"([^"]*(?:\\.[^"]*)*)"\]\)/g)]
let flightBytes = 0
pushes.forEach((m) => { flightBytes += m[1].length })
console.log("RSC flight push chunks:", pushes.length, "approx escaped bytes:", flightBytes)

// Find restaurant name repetition
const name = "HN Foods"
console.log('"HN Foods" count:', (h.match(/HN Foods/gi) || []).length)

// Menu item duplication — pick a menu item if present
const menuSample = h.match(/Chicken[^"<]{0,30}/i)?.[0]
if (menuSample) {
  const c = (h.match(new RegExp(menuSample.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length
  console.log(`Sample menu text "${menuSample}" occurrences:`, c)
}

// Full restaurant object keys in JSON
console.log('"averageRating" count:', (h.match(/averageRating/g) || []).length)
console.log('"menuItems" count:', (h.match(/menuItems/g) || []).length)
console.log('"bookingSettings" count:', (h.match(/bookingSettings/g) || []).length)
console.log('"metaDescription" count:', (h.match(/metaDescription/g) || []).length)
console.log('"coverImage" count:', (h.match(/coverImage/g) || []).length)

// Visible vs hidden content
const bodyStart = h.indexOf("<body")
const body = h.slice(bodyStart, h.indexOf("</body>"))
const scriptsAfterBody = h.slice(h.indexOf("</body>"))
console.log("\nBody HTML size:", body.length, "KB", Math.round(body.length/1024))
console.log("After </body> (RSC/scripts):", scriptsAfterBody.length, "KB", Math.round(scriptsAfterBody.length/1024))

// JSON-LD size
const ld = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
if (ld) console.log("JSON-LD size:", ld[1].length, "bytes")

// use client bailout
console.log("BAILOUT:", h.includes("BAILOUT_TO_CLIENT_SIDE_RENDERING"))
