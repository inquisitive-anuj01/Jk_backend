/**
 * WordPress Blog Migration Script
 * ================================
 * Parses a WordPress XML export, extracts blog content with internal links,
 * cleans up Elementor/sidebar junk, rewrites URLs, and POSTs to your MERN API.
 *
 * Usage:
 *   node migrate-blogs.js <path-to-xml-file>
 *   node migrate-blogs.js <path-to-xml-file> --dry-run     (preview without posting)
 *   node migrate-blogs.js <path-to-xml-file> --limit=5     (only process first N blogs)
 */

import fs from "fs";
import { parseStringPromise } from "xml2js";

// ─── CONFIG ──────────────────────────────────────────────────────────
const API_BASE = "http://localhost:5000";
const API_ENDPOINT = `${API_BASE}/api/blogs`;
const DELAY_BETWEEN_POSTS_MS = 500; // delay between API calls
const WP_DOMAIN = "https://www.jkexecutivechauffeurs.com";
// ─────────────────────────────────────────────────────────────────────

// ─── URL MAPPING: WordPress path → new MERN path ────────────────────
// Service pages (non-blog links in WP become /services/ or other routes in MERN)
const KNOWN_SERVICE_PAGES = {
    "/corporate-services/": "/services/corporate-chauffeur-service",
    "/events/": "/events/event-chauffeur-service",
    "/airport-transfers/": "/services/airport-chauffeur-service",
    "/wedding-chauffeur-service/": "/services/wedding-chauffeur-service",
    "/private-aviation/": "/services/private-aviation-chauffeur-service",
    "/london-sightseeing/": "/services/london-sightseeing-chauffeur-service",
    "/london-chauffeur-service/": "/services/london-chauffeur-service",
    "/school-chauffeur-service-in-london/": "/services/school-chauffeur-service-in-london",
    "/seaport-cruise-chauffeur-service/": "/services/seaport-cruise-chauffeur-service",
    "/intercity-chauffeur-service/": "/services/intercity-chauffeur-service",
    "/as-directed-hourly-service/": "/services/as-directed-hourly-service",
    "/evening-car-hire-service-in-london/": "/services/evening-car-hire-service-in-london",
    "/close-protection-service-in-london/": "/services/close-protection-service-in-london",
    "/shopping-trip-chauffeur-service-london/": "/services/shopping-trip-chauffeur-service-london",
    "/booking/": "/booking",
    "/about-us/": "/about",
    "/contact-us/": "/contact",
    "/fleet/": "/fleet",
    "/blog/": "/blog",
    // Fleet vehicle pages
    "/rolls-royce-chauffeur-hire-london/": "/fleet",
    "/range-rover-chauffeur-hire-london/": "/fleet",
    "/mercedes-s-class-chauffeur-hire-london/": "/fleet",
    "/mercedes-v-class-chauffeur-hire-london/": "/fleet",
    "/bmw-7-series-chauffeur-hire-london/": "/fleet",
    "/bentley-chauffeur-hire-london/": "/fleet",
    // Category pages
    "/category/chauffeurs/": "/blog",
    // Homepage
    "/": "/",
};

// Patterns to identify the sidebar/footer junk sections
const SIDEBAR_MARKERS = [
    "Our Categories",
    "Our Services",
    "Call to book an order",
    "Book Now",
    "Online Booking",
    "+44 203 475 9906",
];

// ─── HELPERS ─────────────────────────────────────────────────────────

function extractCDATA(val) {
    if (Array.isArray(val)) val = val[0];
    if (typeof val === "string") return val.trim();
    if (val?._ !== undefined) return String(val._).trim();
    return "";
}

function getMetaValue(postmetas, key) {
    if (!postmetas) return "";
    for (const meta of postmetas) {
        const metaKey = extractCDATA(meta["wp:meta_key"]);
        if (metaKey === key) {
            return extractCDATA(meta["wp:meta_value"]);
        }
    }
    return "";
}

/**
 * Rewrite internal links from WordPress URLs to new MERN routes.
 * Any link to jkexecutivechauffeurs.com that isn't a known service page
 * is assumed to be a blog post slug.
 */
function rewriteInternalLinks(html) {
    if (!html) return { html: html || "", unmappedUrls: [] };

    const unmappedUrls = [];

    // Replace all href attributes pointing to the WP domain
    const rewritten = html.replace(
        /href=["'](https?:\/\/(?:www\.)?jkexecutivechauffeurs\.com)(\/[^"']*?)["']/gi,
        (match, domain, wpPath) => {
            // Normalize: ensure trailing slash for path matching
            let normalizedPath = wpPath.endsWith("/") ? wpPath : wpPath + "/";

            // Check known service/page mappings first
            if (KNOWN_SERVICE_PAGES[normalizedPath]) {
                return `href="${KNOWN_SERVICE_PAGES[normalizedPath]}"`;
            }

            // If it contains /category/, map to /blog
            if (normalizedPath.startsWith("/category/")) {
                return `href="/blog"`;
            }

            // If it's a wp-content URL (image), keep it as-is
            if (normalizedPath.startsWith("/wp-content/")) {
                return match;
            }

            // Otherwise, treat as a blog post slug
            const slug = normalizedPath.replace(/^\//, "").replace(/\/$/, "");
            if (slug) {
                return `href="/blog/${slug}"`;
            }

            unmappedUrls.push(wpPath);
            return match;
        }
    );

    return { html: rewritten, unmappedUrls };
}

/**
 * Clean HTML content: remove Elementor widgets, SVGs, sidebar sections,
 * booking widgets, and other WordPress-specific junk.
 */
function cleanHtml(rawHtml) {
    if (!rawHtml) return "";

    let html = rawHtml;

    // Remove SVG elements
    html = html.replace(/<svg[\s\S]*?<\/svg>/gi, "");

    // Remove H1 tags (title is already captured from XML metadata)
    html = html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, "");

    // Remove booking-widget elements
    html = html.replace(/<booking-widget[\s\S]*?<\/booking-widget>/gi, "");

    // Remove script tags
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "");

    // Remove style tags
    html = html.replace(/<style[\s\S]*?<\/style>/gi, "");

    // Find the sidebar/footer section and cut there
    // The sidebar typically starts with "Our Categories" or similar
    for (const marker of SIDEBAR_MARKERS) {
        // Look for the marker in heading tags or standalone
        const markerRegex = new RegExp(
            `<h[2-3][^>]*>\\s*${escapeRegex(marker)}[\\s\\S]*$`,
            "i"
        );
        html = html.replace(markerRegex, "");
    }

    // Remove standalone "Book Now" button links at the end
    html = html.replace(
        /<a[^>]*href=["'][^"']*booking[^"']*["'][^>]*>\s*Book Now\s*<\/a>/gi,
        ""
    );

    // Remove phone number sections
    html = html.replace(
        /\+44\s*203\s*475\s*9906/g,
        ""
    );

    // Remove article wrapper tags (WordPress embeds)
    html = html.replace(/<\/?article[^>]*>/gi, "");

    // Remove empty links
    html = html.replace(/<a[^>]*href=["']#["'][^>]*>[\s\S]*?<\/a>/gi, "");

    // Clean up excessive whitespace
    html = html.replace(/\n\s*\n\s*\n/g, "\n\n");
    html = html.replace(/\t+/g, "");

    return html.trim();
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extract the hero image from the HTML content.
 * Returns { url, alt } and the HTML with that image removed.
 */
function extractHeroImage(html) {
    const imgMatch = html.match(/<img[^>]+>/i);
    if (!imgMatch) return { heroImage: null, html };

    const imgTag = imgMatch[0];
    const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
    const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);

    const heroImage = {
        url: srcMatch ? srcMatch[1] : "",
        alt: altMatch ? altMatch[1] : "",
    };

    // Remove the hero image from the content (and any srcset spam)
    const cleanedHtml = html.replace(imgTag, "").trim();

    return { heroImage, html: cleanedHtml };
}

/**
 * Parse cleaned HTML into structured sections.
 * Each <h2> starts a new section. <p> tags become text. <ul>/<li> become listItems.
 * Inline <img> tags become section images.
 */
function parseIntoSections(html) {
    if (!html) return { intro: "", sections: [] };

    // Split content by <h2> tags
    // First, normalize h2 tags
    const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;

    // Find all h2 positions
    const h2Matches = [];
    let h2Match;
    while ((h2Match = h2Regex.exec(html)) !== null) {
        h2Matches.push({
            index: h2Match.index,
            endIndex: h2Match.index + h2Match[0].length,
            heading: stripTags(h2Match[1]).trim(),
        });
    }

    if (h2Matches.length === 0) {
        // No headings — entire content is intro
        return { intro: cleanTextContent(html), sections: [] };
    }

    // Extract intro (content before first h2)
    const introHtml = html.substring(0, h2Matches[0].index);
    const intro = cleanTextContent(introHtml);

    // Extract sections
    const sections = [];
    for (let i = 0; i < h2Matches.length; i++) {
        const heading = h2Matches[i].heading;
        if (!heading) continue;

        // Skip sidebar headings that might have survived
        if (SIDEBAR_MARKERS.some((m) => heading.toLowerCase().includes(m.toLowerCase()))) {
            continue;
        }

        const start = h2Matches[i].endIndex;
        const end = i + 1 < h2Matches.length ? h2Matches[i + 1].index : html.length;
        const sectionHtml = html.substring(start, end).trim();

        if (!sectionHtml) continue;

        // Extract any <ul>/<ol> list items
        const listItems = [];
        const listRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        let liMatch;
        while ((liMatch = listRegex.exec(sectionHtml)) !== null) {
            const itemText = cleanInlineHtml(liMatch[1]).trim();
            if (itemText) listItems.push(itemText);
        }

        // Extract inline images (not hero)
        let sectionImage = null;
        const inlineImgMatch = sectionHtml.match(/<img[^>]+>/i);
        if (inlineImgMatch) {
            const srcM = inlineImgMatch[0].match(/src=["']([^"']+)["']/i);
            const altM = inlineImgMatch[0].match(/alt=["']([^"']+)["']/i);
            if (srcM) {
                sectionImage = {
                    url: srcM[1],
                    alt: altM ? altM[1] : heading,
                };
            }
        }

        // Get text content (paragraphs) — preserve <a> tags for internal links
        let textContent = sectionHtml
            .replace(/<ul[\s\S]*?<\/ul>/gi, "") // remove lists (already extracted)
            .replace(/<ol[\s\S]*?<\/ol>/gi, "")
            .replace(/<img[^>]*>/gi, ""); // remove images (already extracted)

        textContent = cleanInlineHtml(textContent).trim();

        if (!textContent && listItems.length === 0) continue;

        const section = { heading };
        if (textContent) section.text = textContent;
        if (listItems.length > 0) section.listItems = listItems;
        if (sectionImage) section.image = sectionImage;

        sections.push(section);
    }

    return { intro, sections };
}

/**
 * Remove block-level tags but preserve inline formatting (<a>, <strong>, <em>, <b>, <i>).
 */
function cleanInlineHtml(html) {
    if (!html) return "";

    let result = html;

    // Replace <p> and </p> with spaces
    result = result.replace(/<p[^>]*>/gi, "");
    result = result.replace(/<\/p>/gi, "\n\n");

    // Replace <br> with newlines
    result = result.replace(/<br\s*\/?>/gi, "\n");

    // Remove div tags
    result = result.replace(/<\/?div[^>]*>/gi, "");

    // Remove span tags (but keep content)
    result = result.replace(/<\/?span[^>]*>/gi, "");

    // Remove article tags
    result = result.replace(/<\/?article[^>]*>/gi, "");

    // Remove entry-content/entry-footer divs
    result = result.replace(/<\/?(?:div|section)[^>]*>/gi, "");

    // Keep <a>, <strong>, <em>, <b>, <i> tags — these are the internal links and formatting!

    // Clean up &nbsp;
    result = result.replace(/&nbsp;/g, " ");

    // Clean up excessive whitespace/newlines
    result = result.replace(/\n{3,}/g, "\n\n");
    result = result.replace(/^\s+|\s+$/g, "");

    return result;
}

/**
 * Strip all HTML tags (for headings, etc.)
 */
function stripTags(html) {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

/**
 * Clean text content for intro/excerpt (preserve <a> tags).
 */
function cleanTextContent(html) {
    return cleanInlineHtml(html).trim();
}

/**
 * Generate excerpt from intro text, or fallback to first section text (~200 chars, plain text).
 */
function generateExcerpt(intro, sections = [], maxLength = 200) {
    let source = intro;
    if (!source && sections.length > 0) {
        source = sections[0].text || sections[0].heading || "";
    }
    if (!source) return "";
    const plain = stripTags(source);
    if (plain.length <= maxLength) return plain;
    return plain.substring(0, maxLength).replace(/\s+\S*$/, "") + "...";
}

// ─── MAIN ────────────────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);
    const xmlPath = args.find((a) => !a.startsWith("--"));
    const dryRun = args.includes("--dry-run");
    const limitArg = args.find((a) => a.startsWith("--limit="));
    const limit = limitArg ? parseInt(limitArg.split("=")[1]) : Infinity;

    if (!xmlPath) {
        console.error("Usage: node migrate-blogs.js <path-to-xml-file> [--dry-run] [--limit=N]");
        process.exit(1);
    }

    if (!fs.existsSync(xmlPath)) {
        console.error(`File not found: ${xmlPath}`);
        process.exit(1);
    }

    console.log(`\n📖 Reading XML file: ${xmlPath}`);
    const xmlContent = fs.readFileSync(xmlPath, "utf-8");

    console.log("🔄 Parsing XML (this may take a moment for large files)...");
    const result = await parseStringPromise(xmlContent, {
        explicitCDATA: false,
        trim: true,
    });

    const channel = result.rss.channel[0];
    const items = channel.item || [];

    // Filter only published posts (not pages, templates, etc.)
    const publishedPosts = items.filter((item) => {
        const postType = extractCDATA(item["wp:post_type"]);
        const status = extractCDATA(item["wp:status"]);
        return postType === "post" && status === "publish";
    });

    console.log(`\n📊 Found ${items.length} total items, ${publishedPosts.length} published blog posts`);

    if (dryRun) {
        console.log("🔍 DRY RUN MODE — will not POST to API\n");
    }

    const postsToProcess = publishedPosts.slice(0, limit);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < postsToProcess.length; i++) {
        const item = postsToProcess[i];
        const title = extractCDATA(item.title);
        const slug = extractCDATA(item["wp:post_name"]);
        const pubDate = extractCDATA(item.pubDate);
        const rawContent = extractCDATA(item["content:encoded"]);
        const postmetas = item["wp:postmeta"] || [];

        // Category
        const categoryEl = item.category;
        let category = "Chauffeurs"; // default
        if (categoryEl) {
            const cats = Array.isArray(categoryEl) ? categoryEl : [categoryEl];
            for (const cat of cats) {
                if (typeof cat === "string") {
                    category = cat;
                } else if (cat._ && cat.$.domain === "category") {
                    category = cat._;
                }
            }
        }

        // SEO meta
        const seoTitle = getMetaValue(postmetas, "_aioseo_title") || title;
        const seoDescription = getMetaValue(postmetas, "_aioseo_description") || "";

        console.log(`\n[${i + 1}/${postsToProcess.length}] Processing: "${title}"`);
        console.log(`   Slug: ${slug}`);

        // Step 1: Clean HTML (remove SVGs, widgets, sidebar)
        let cleanedHtml = cleanHtml(rawContent);

        // Step 2: Keep all internal links as-is (no URL rewriting)

        // Step 3: Extract hero image
        const { heroImage, html: contentWithoutHero } = extractHeroImage(cleanedHtml);

        // Step 4: Parse into structured sections
        const { intro, sections } = parseIntoSections(contentWithoutHero);

        // Step 5: Generate excerpt (from intro, or fallback to first section)
        const excerpt = generateExcerpt(intro, sections);

        // Build the blog object
        const blogData = {
            title,
            slug,
            intro: intro || undefined,
            excerpt: excerpt || undefined,
            sections,
            heroImageUrl: heroImage?.url || undefined,
            heroImageAlt: heroImage?.alt || title,
            author: "JK Executive Chauffeurs",
            category,
            tags: [category.toLowerCase()],
            seoTitle: seoTitle || title,
            seoDescription: seoDescription || excerpt,
            isActive: true,
            priority: 0,
            publishDate: pubDate ? new Date(pubDate).toISOString() : undefined,
        };

        if (dryRun) {
            console.log(`   ✅ Parsed: ${sections.length} sections, hero: ${heroImage?.url ? "yes" : "no"}, intro: ${intro ? intro.substring(0, 80) + "..." : "none"}`);

            // Save first blog as sample JSON for inspection
            if (i === 0) {
                const samplePath = xmlPath.replace(".xml", "-sample-blog.json");
                fs.writeFileSync(samplePath, JSON.stringify(blogData, null, 2), "utf-8");
                console.log(`   📄 Sample saved to: ${samplePath}`);
            }
            successCount++;
            continue;
        }

        // POST to API
        try {
            const response = await fetch(API_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(blogData),
            });

            const responseData = await response.json();

            if (response.ok) {
                console.log(`   ✅ Created: /blog/${slug}`);
                successCount++;
            } else {
                console.log(`   ❌ Failed: ${responseData.message || response.statusText}`);
                errors.push({ title, slug, error: responseData.message });
                errorCount++;
            }
        } catch (err) {
            console.log(`   ❌ Network error: ${err.message}`);
            errors.push({ title, slug, error: err.message });
            errorCount++;
        }

        // Delay between posts to not overwhelm the server
        if (i < postsToProcess.length - 1) {
            await new Promise((r) => setTimeout(r, DELAY_BETWEEN_POSTS_MS));
        }
    }

    // ─── SUMMARY ─────────────────────────────────────────────────────
    console.log("\n" + "═".repeat(60));
    console.log("📊 MIGRATION SUMMARY");
    console.log("═".repeat(60));
    console.log(`   Total processed: ${postsToProcess.length}`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);



    if (errors.length > 0) {
        console.log("\n❌ Failed posts:");
        errors.forEach((e) => console.log(`   - "${e.title}" (${e.slug}): ${e.error}`));
    }

    if (dryRun) {
        console.log("\n🔍 This was a DRY RUN. No data was posted to the API.");
        console.log("   Run without --dry-run to actually migrate the blogs.");
    }

    console.log("");
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
