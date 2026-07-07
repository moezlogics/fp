const fs = require("fs")
const path = require("path")

const file = path.join(__dirname, "live-pdp.html")
const h = fs.readFileSync(file, "utf8")

console.log("HTML size:", h.length, "bytes (", Math.round(h.length / 1024), "KB)")

const title = h.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || ""
console.log("title:", title.slice(0, 80))

const count = (needle) => {
  const re = typeof needle === "string" ? new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi") : needle
  return (h.match(re) || []).length
}

console.log("\n--- Duplication signals ---")
console.log("title occurrences:", count(title.slice(0, 40)))
console.log("hn-foods / HN Foods:", count(/hn-foods|HN Foods/i))
console.log("og:description blocks:", count(/property="og:description"/))
console.log("og:title blocks:", count(/property="og:title"/))
console.log("application/ld\\+json:", count(/application\/ld\+json/))
console.log("inline <style> tags:", count(/<style[^>]*>/))
console.log("RSC flight chunks ($Sreact):", count(/\$Sreact/))
console.log("self.__next_f.push:", count(/self\.__next_f\.push/))
console.log("BAILOUT_TO_CLIENT:", count(/BAILOUT_TO_CLIENT/))
console.log("force-dynamic hints:", count(/DYNAMIC_SERVER_USAGE/))

const preloads = [...h.matchAll(/<link[^>]+rel="preload"[^>]*>/gi)].map((m) => m[0].slice(0, 120))
console.log("\npreloads:", preloads.length)
preloads.slice(0, 6).forEach((p, i) => console.log(`  ${i + 1}`, p))

// Find repeated long strings (description-like)
const desc = h.match(/meta name="description" content="([^"]{20,200})"/i)?.[1]
if (desc) {
  console.log("\ndescription snippet occurrences:", count(desc.slice(0, 60)))
}

// CSS bloat — inline style blocks size
const styles = [...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
let inlineCssBytes = 0
styles.forEach((m) => { inlineCssBytes += m[1].length })
console.log("\ninline style blocks:", styles.length, "total chars:", inlineCssBytes)

// Sample repeated product/restaurant name in JSON payloads
const handles = ["hn-foods", "multan", "menu"]
handles.forEach((k) => console.log(`"${k}" count:`, count(k)))
