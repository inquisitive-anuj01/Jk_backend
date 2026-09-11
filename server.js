import dotenv from "dotenv";
dotenv.config();

console.log("Environment Variables Loaded:");
console.log("MONGO_URI exists:", process.env.MONGO_URI ? "YES" : "NO");
console.log("PORT from env:", process.env.PORT);
console.log("Current Directory (cwd):", process.cwd());

import express from "express";
import cors from "cors";
import { errorMiddleware } from "./src/middlewares/error.js";
import { apiRateLimiter } from "./src/middlewares/rateLimiter.js";
import connectDB from "./src/db/database.js";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Routes
import vehicleRoutes from "./src/routes/vehical.route.js";
import pricingRoutes from "./src/routes/pricing.route.js";
import airportRoutes from "./src/routes/airport.route.js";
import airportPricingRoutes from "./src/routes/airportPricing.route.js";
import bookingRoutes from "./src/routes/booking.route.js";
import paymentRoutes from "./src/routes/payment.route.js";
import adminRoutes from "./src/routes/admin.route.js";
import serviceRoutes from "./src/routes/service.route.js";
import fleetRoutes from "./src/routes/fleet.route.js";
import eventRoutes from "./src/routes/event.route.js";
import blogRoutes from "./src/routes/blog.route.js";
import contactRoutes from "./src/routes/contact.route.js";
import faqRoutes from "./src/routes/faq.route.js";
import calendarEventRoutes from "./src/routes/calendarEvent.route.js";
import Blog from "./src/models/blog.model.js";
import { Service } from "./src/models/service.model.js";
import Event from "./src/models/event.model.js";
import { Fleet } from "./src/models/fleet.model.js";
import { sitemapState } from "./src/utils/sitemapCache.js";
const app = express();

// ================================================================
// TRUST PROXY — Required when running behind Hostinger's reverse proxy
// Allows express-rate-limit to read the real client IP from
// X-Forwarded-For headers instead of the proxy IP
// '1' = trust exactly one proxy hop (safe for Hostinger/Passenger)
// ================================================================
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================================================================
// CANONICAL REDIRECT — Force www + HTTPS
// Must be the VERY FIRST middleware, before CORS / routes / Passenger
// Catches requests that bypass Apache .htaccess (e.g. direct Node access)
// Scoped to production domain only — localhost is intentionally skipped
// ================================================================
app.use((req, res, next) => {
  const host = req.headers.host || "";
  const isProduction = host.includes("jkexecutivechauffeurs.com");
  if (isProduction && !host.startsWith("www.")) {
    return res.redirect(301, "https://www.jkexecutivechauffeurs.com" + req.originalUrl);
  }
  next();
});

// Middleware setup
const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5005", "http://127.0.0.1:5173", "https://jk-frontend-nine.vercel.app", "https://jkexecutivechauffeurs.com", "https://www.jkexecutivechauffeurs.com", "http://jkexecutivechauffeurs.com/", "http://dev.jkexecutivechauffeurs.com/", "https://www.dev.jkexecutivechauffeurs.com"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// rate limiter 
app.use(apiRateLimiter);

// Serve static files from uploads directory (Images)
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: "1y" // Cache images for 1 year
}));


// ================================================================
// HEALTH CHECK ENDPOINT
// Used by UptimeRobot / monitoring tools to detect outages
// Returns 200 if everything is OK, 503 if DB is down
// ================================================================
app.get("/health", async (req, res) => {
  const dbState     = mongoose.connection.readyState;
  //  0 = disconnected | 1 = connected | 2 = connecting | 3 = disconnecting
  const dbStateMap  = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  const dbStatus    = dbStateMap[dbState] || "unknown";
  const dbHealthy   = dbState === 1;

  // Ping the DB with a lightweight command to confirm it's truly alive
  let dbPingMs = null;
  let dbPingOk = false;
  if (dbHealthy) {
    try {
      const t0 = Date.now();
      await mongoose.connection.db.admin().ping();
      dbPingMs = Date.now() - t0;
      dbPingOk = true;
    } catch {
      dbPingOk = false;
    }
  }

  const memMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);

  const payload = {
    status:      dbPingOk ? "ok" : "degraded",
    timestamp:   new Date().toISOString(),
    uptime_sec:  Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    database: {
      status:    dbStatus,
      ping_ok:   dbPingOk,
      ping_ms:   dbPingMs,
      host:      mongoose.connection.host || null,
      db_name:   mongoose.connection.name || null,
    },
    memory: {
      rss_mb: parseFloat(memMB),
    },
  };

  const httpStatus = dbPingOk ? 200 : 503;
  return res.status(httpStatus).json(payload);
});

// Routes setup
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/airports", airportRoutes);
app.use("/api/airport-pricing", airportPricingRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/fleet", fleetRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/calendar-events", calendarEventRoutes);


// ================================================================
// DYNAMIC SITEMAP — auto-updates when blogs/services are added
// Cached in memory for 60 min; busted immediately on any mutation
// ================================================================

const SITEMAP_CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes
const SITE_URL_SITEMAP = "https://www.jkexecutivechauffeurs.com";

app.get("/sitemap.xml", async (req, res) => {
  try {
    const now = Date.now();

    // Serve cached version if still fresh
    if (sitemapState.cache && (now - sitemapState.cacheTime) < SITEMAP_CACHE_TTL_MS) {
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      return res.send(sitemapState.cache);
    }

    // ── Static pages ─────────────────────────────────────────
    const staticUrls = [
      { loc: `${SITE_URL_SITEMAP}/`, changefreq: "weekly", priority: "1.0" },
      { loc: `${SITE_URL_SITEMAP}/services`, changefreq: "weekly", priority: "0.9" },
      { loc: `${SITE_URL_SITEMAP}/fleet`, changefreq: "weekly", priority: "0.9" },
      { loc: `${SITE_URL_SITEMAP}/blog`, changefreq: "daily", priority: "0.8" },
      { loc: `${SITE_URL_SITEMAP}/booking`, changefreq: "monthly", priority: "0.8" },
      { loc: `${SITE_URL_SITEMAP}/about`, changefreq: "monthly", priority: "0.7" },
      { loc: `${SITE_URL_SITEMAP}/contact`, changefreq: "monthly", priority: "0.7" },
      { loc: `${SITE_URL_SITEMAP}/terms-and-conditions`, changefreq: "yearly", priority: "0.3" },
      { loc: `${SITE_URL_SITEMAP}/privacy-policy`, changefreq: "yearly", priority: "0.3" },
      { loc: `${SITE_URL_SITEMAP}/gdpr-policy`, changefreq: "yearly", priority: "0.3" },
    ];

    // ── Fetch all active dynamic content from MongoDB ────────
    const [blogs, services, fleets, events] = await Promise.all([
      Blog.find({ isActive: true }, "slug updatedAt").lean(),
      Service.find({ isActive: true }, "slug updatedAt").lean(),
      Fleet.find({ isActive: true }, "slug updatedAt").lean(),
      Event.find({ isActive: true }, "slug updatedAt").lean(),
    ]);

    const formatDate = (d) =>
      d ? new Date(d).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

    // ── Build <url> entries ──────────────────────────────────
    const urlEntries = [];

    for (const p of staticUrls) {
      urlEntries.push(`
    <url>
        <loc>${p.loc}</loc>
        <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
        <changefreq>${p.changefreq}</changefreq>
        <priority>${p.priority}</priority>
    </url>`);
    }

    for (const s of services) {
      if (!s.slug) continue;
      urlEntries.push(`
    <url>
        <loc>${SITE_URL_SITEMAP}/services/${s.slug}</loc>
        <lastmod>${formatDate(s.updatedAt)}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`);
    }

    for (const f of fleets) {
      if (!f.slug) continue;
      urlEntries.push(`
    <url>
        <loc>${SITE_URL_SITEMAP}/fleet/${f.slug}</loc>
        <lastmod>${formatDate(f.updatedAt)}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`);
    }

    for (const e of events) {
      if (!e.slug) continue;
      urlEntries.push(`
    <url>
        <loc>${SITE_URL_SITEMAP}/events/${e.slug}</loc>
        <lastmod>${formatDate(e.updatedAt)}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>`);
    }

    for (const b of blogs) {
      if (!b.slug) continue;
      urlEntries.push(`
    <url>
        <loc>${SITE_URL_SITEMAP}/blog/${b.slug}</loc>
        <lastmod>${formatDate(b.updatedAt)}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
    xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="
        http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">${urlEntries.join("")}
</urlset>`;

    // Store in shared cache
    sitemapState.cache = xml;
    sitemapState.cacheTime = now;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.send(xml);

  } catch (err) {
    console.error("Sitemap generation error:", err.message);
    return res.status(500).send("Error generating sitemap");
  }
});

// ================================================================
// GEO: llms.txt — AI-readable business summary for LLMs
// ================================================================
app.get('/llms.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h
  res.send(`# JK Executive Chauffeurs

> Premium chauffeur and executive car service based in London, UK. Specialists in airport transfers, corporate travel, and luxury event transportation.

## Core Services
- Airport Transfers (Heathrow, Gatwick, Stansted, Luton, London City)
- Corporate Chauffeur Services
- Wedding & Special Event Transportation
- Executive Business Travel
- Hourly Hire

## Fleet
- Mercedes E-Class (Executive Saloon)
- Mercedes S-Class (First Class)
- Mercedes V-Class (Group/MPV)
- Range Rover (Premium SUV)

## Key Facts
- Available 24/7, 365 days a year
- Real-time flight tracking at no extra cost
- Fixed-price fares, no hidden charges
- DBS-checked, fully licensed professional drivers
- Meet and greet at airports (60-min free wait)

## Contact
- Website: https://www.jkexecutivechauffeurs.com
- Book: https://www.jkexecutivechauffeurs.com/booking
- Email: info@jkexecutivechauffeurs.com

## Key Pages
- [Home](https://www.jkexecutivechauffeurs.com/)
- [Book Now](https://www.jkexecutivechauffeurs.com/booking)
- [Services](https://www.jkexecutivechauffeurs.com/services)
- [Fleet](https://www.jkexecutivechauffeurs.com/fleet)
- [Blog](https://www.jkexecutivechauffeurs.com/blog)
- [Contact](https://www.jkexecutivechauffeurs.com/contact)
`);
});

// ================================================================
// SSR ROUTES — Meta tag injection for SEO (Google indexing)
// Must come BEFORE static file serving
// ================================================================

const SITE_URL = "https://www.jkexecutivechauffeurs.com";

// Helper: read built index.html from dist/
const getIndexTemplate = () => {
  const indexPath = path.join(__dirname, "dist", "index.html");
  return fs.readFileSync(indexPath, "utf-8");
};

// Helper: inject meta tags and optional preload script into HTML
const injectMeta = (template, metaTags, preloadScript = "") => {
  return template
    .replace(/<title>[^<]*<\/title>/, metaTags)
    .replace("</head>", `${preloadScript}</head>`);
};

// SSR: / (Home Page)
app.get("/", async (req, res, next) => {
  try {
    const template = getIndexTemplate();
    const metaTags = `
      <title>Chauffeur Service in London | Travel In Style & Comfort | JK Executive</title>
      <meta name="description" content="Premium chauffeur services in London and across the UK. Professional drivers for airport transfers, business travel, and special events. Book your luxury ride today." />
      <meta property="og:title" content="Chauffeur Service in London | JK Executive Chauffeurs" />
      <meta property="og:description" content="Luxury chauffeur services for airport transfers, corporate travel and events in London." />
      <meta property="og:image" content="${SITE_URL}/JkLogo.png" />
      <meta property="og:url" content="${SITE_URL}/" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Chauffeur Service in London | JK Executive Chauffeurs" />
      <meta name="twitter:description" content="Luxury chauffeur services for airport transfers, corporate travel and events in London." />
      <link rel="canonical" href="${SITE_URL}/" />`;

    // ── GEO: JSON-LD Structured Data ─────────────────────────────────────
    // LocalBusiness schema — AI models extract business facts from this
    const localBusinessJsonLd = `<script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": ["TaxiService", "LocalBusiness"],
      "name": "JK Executive Chauffeurs",
      "description": "Premium executive chauffeur service in London. Airport transfers, corporate travel, wedding cars & events. Mercedes S-Class, V-Class, Rolls-Royce fleet. Available 24/7.",
      "url": "https://www.jkexecutivechauffeurs.com",
      "logo": "https://www.jkexecutivechauffeurs.com/assets/JkLogo-DofcZZYI.png",
      "image": "https://www.jkexecutivechauffeurs.com/assets/heroImage-B2GGPHyc.png",
      "telephone": "+442034759906",
      "email": "info@jkexecutivechauffeurs.com",
      "vatID": "280189982",
      "legalName": "JK Executive Chauffeurs Ltd",
      "identifier": [
        {
          "@type": "PropertyValue",
          "name": "Companies House Registration",
          "value": "10696876"
        },
        {
          "@type": "PropertyValue",
          "name": "TfL Private Hire Operator Licence",
          "value": "[ 010468 ]"
        }
      ],
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "1 Furzeground Way, Stockley Park",
        "addressLocality": "Uxbridge",
        "addressRegion": "Middlesex",
        "postalCode": "UB11 1BD",
        "addressCountry": "GB"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 51.5074,
        "longitude": -0.4593
      },
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": [
          "Monday","Tuesday","Wednesday",
          "Thursday","Friday","Saturday","Sunday"
        ],
        "opens": "00:00",
        "closes": "23:59"
      },
      "areaServed": [
        { "@type": "City", "name": "London" },
        { "@type": "Airport", "name": "Heathrow Airport", "iataCode": "LHR" },
        { "@type": "Airport", "name": "Gatwick Airport", "iataCode": "LGW" },
        { "@type": "Airport", "name": "Stansted Airport", "iataCode": "STN" },
        { "@type": "Airport", "name": "London City Airport", "iataCode": "LCY" },
        { "@type": "Airport", "name": "Luton Airport", "iataCode": "LTN" }
      ],
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Executive Chauffeur Services",
        "itemListElement": [
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Airport Transfer Service" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Corporate Chauffeur Service" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Wedding Chauffeur Service" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Hourly As-Directed Chauffeur" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Private Aviation Chauffeur" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Intercity Chauffeur Service" } }
        ]
      },
      "paymentAccepted": "Cash, Credit Card, Debit Card, PayPal, RuPay",
      "currenciesAccepted": "GBP",
      "numberOfEmployees": {
        "@type": "QuantitativeValue",
        "value": 120
      },
      "sameAs": [
        "https://www.facebook.com/profile.php?id=61581449520001",
        "https://www.instagram.com/jkexecutivechauffeurs?igsh=NnFwN3B0d2Q0NHZk",
        "https://www.linkedin.com/company/jk-executive-chauffeurs",
        "https://share.google/09Kot2PXaujfkjnBQ"
      ]
    }
    </script>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "JK Executive Chauffeurs",
      "url": "https://www.jkexecutivechauffeurs.com",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://www.jkexecutivechauffeurs.com/?s={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    }
    </script>`;

    // FAQPage schema — AI uses this to answer user questions about your business
    const faqJsonLd = `<script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How much does a chauffeur service from Heathrow Airport to London cost?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "JK Executive Chauffeurs offers fixed-price airport transfers from Heathrow with no hidden charges. Prices vary by vehicle class and destination in London. Get an instant quote at jkexecutivechauffeurs.com/booking."
          }
        },
        {
          "@type": "Question",
          "name": "Do you offer 24/7 chauffeur service in London?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. JK Executive Chauffeurs operates 24 hours a day, 7 days a week, 365 days a year across London and all major UK airports."
          }
        },
        {
          "@type": "Question",
          "name": "What luxury vehicles are available for hire?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Our fleet includes Mercedes E-Class (executive saloon), Mercedes S-Class (first class), Mercedes V-Class (group travel up to 7 passengers), and Range Rover (premium SUV)."
          }
        },
        {
          "@type": "Question",
          "name": "Do you track flights for airport pickups?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. We monitor all flights in real-time and automatically adjust the pickup time if your flight is delayed or lands early, at no extra cost."
          }
        },
        {
          "@type": "Question",
          "name": "Are JK Executive Chauffeur drivers licensed and DBS checked?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. All our drivers hold a valid Private Hire Vehicle (PHV) licence, are fully DBS (Disclosure and Barring Service) checked, and all vehicles carry full commercial insurance."
          }
        },
        {
          "@type": "Question",
          "name": "Which airports do you cover?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "We cover all major London airports: Heathrow (LHR), Gatwick (LGW), Stansted (STN), Luton (LTN), and London City Airport (LCY), as well as Southend Airport."
          }
        }
      ]
    }
    </script>`;
    // ─────────────────────────────────────────────────────────────────────

    const structuredData = localBusinessJsonLd + faqJsonLd;
    const finalHtml = injectMeta(template, metaTags, structuredData);
    return res.status(200).set({ "Content-Type": "text/html" }).end(finalHtml);
  } catch (err) {
    return next();
  }
});

// SSR: /blog/:slug — Blog detail page (most important for Google indexing)
app.get("/blog/:slug", async (req, res, next) => {
  try {
    // Strip trailing slash so /blog/my-slug/ resolves identically to /blog/my-slug
    const slug = req.params.slug.replace(/\/$/, "");

    // Skip API-like slugs
    if (slug.startsWith("api")) return next();

    const blog = await Blog.findOne({ slug, isActive: true }).lean();
    if (!blog) return next(); // Not found → fall through to SPA

    const template = getIndexTemplate();

    const seoTitle = blog.seoTitle || blog.title;
    const rawIntro = blog.intro ? blog.intro.replace(/<[^>]+>/g, "").slice(0, 160) : "";
    const seoDesc = blog.seoDescription || blog.excerpt || rawIntro;
    const heroImg = blog.heroImageUrl || blog.heroImage?.url || `${SITE_URL}/logo.png`;

    const metaTags = `
      <title>${seoTitle}</title>
      <meta name="description" content="${seoDesc.replace(/"/g, "&quot;")}" />
      <meta property="og:title" content="${seoTitle.replace(/"/g, "&quot;")}" />
      <meta property="og:description" content="${seoDesc.replace(/"/g, "&quot;")}" />
      <meta property="og:image" content="${heroImg}" />
      <meta property="og:url" content="${SITE_URL}/blog/${slug}" />
      <meta property="og:type" content="article" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${seoTitle.replace(/"/g, "&quot;")}" />
      <meta name="twitter:description" content="${seoDesc.replace(/"/g, "&quot;")}" />
      <link rel="canonical" href="${SITE_URL}/blog/${slug}" />`;

    // Preload blog data → React won't need to re-fetch on first load
    const safeData = JSON.stringify(blog).replace(/<\/script>/gi, "<\\/script>");
    const preloadScript = `<script>window.__BLOG_DATA__ = ${safeData};</script>`;

    const finalHtml = injectMeta(template, metaTags, preloadScript);
    return res.status(200).set({ "Content-Type": "text/html" }).end(finalHtml);

  } catch (err) {
    console.error("SSR error for /blog/:slug →", err.message);
    return next(); // On error, fall through to SPA (site still works)
  }
});

// SSR: /blog — Blog listing page
app.get("/blog", async (req, res, next) => {
  try {
    const template = getIndexTemplate();
    const metaTags = `
      <title>Chauffeur Blog | JK Executive Chauffeurs</title>
      <meta name="description" content="Expert insights on luxury chauffeur services, airport transfers, and premium travel in the UK. Read our latest articles." />
      <meta property="og:title" content="Chauffeur Blog | JK Executive Chauffeurs" />
      <meta property="og:description" content="Expert insights on luxury chauffeur services, airport transfers, and premium travel in the UK." />
      <meta property="og:url" content="${SITE_URL}/blog" />
      <meta property="og:type" content="website" />
      <link rel="canonical" href="${SITE_URL}/blog" />`;

    const finalHtml = injectMeta(template, metaTags);
    return res.status(200).set({ "Content-Type": "text/html" }).end(finalHtml);

  } catch (err) {
    console.error("SSR error for /blog →", err.message);
    return next();
  }
});

// SSR: /services/:slug — Service detail page
app.get("/services/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;
    const service = await Service.findOne({ slug, isActive: true }).lean();
    if (!service) return next();

    const template = getIndexTemplate();
    const seoTitle = service.meta_title || service.title;
    const seoDesc = service.meta_description || service.description || "";
    const imgUrl = service.image?.url || `${SITE_URL}/logo.png`;

    const metaTags = `
      <title>${seoTitle}</title>
      <meta name="description" content="${seoDesc.replace(/"/g, "&quot;")}" />
      <meta property="og:title" content="${seoTitle.replace(/"/g, "&quot;")}" />
      <meta property="og:description" content="${seoDesc.replace(/"/g, "&quot;")}" />
      <meta property="og:image" content="${imgUrl}" />
      <meta property="og:url" content="${SITE_URL}/services/${slug}" />
      <link rel="canonical" href="${SITE_URL}/services/${slug}" />`;

    const finalHtml = injectMeta(template, metaTags);
    return res.status(200).set({ "Content-Type": "text/html" }).end(finalHtml);
  } catch (err) {
    console.error("SSR error for /services/:slug →", err.message);
    return next();
  }
});

// SSR: /events/:slug — Event detail page
app.get("/events/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;
    const event = await Event.findOne({ slug, isActive: true }).lean();
    if (!event) return next();

    const template = getIndexTemplate();
    const seoTitle = event.seoTitle || event.title;
    const seoDesc = event.seoDescription || event.description || "";
    const imgUrl = event.heroImageUrl || event.heroImage?.url || `${SITE_URL}/logo.png`;

    const metaTags = `
      <title>${seoTitle}</title>
      <meta name="description" content="${seoDesc.replace(/"/g, "&quot;")}" />
      <meta property="og:title" content="${seoTitle.replace(/"/g, "&quot;")}" />
      <meta property="og:description" content="${seoDesc.replace(/"/g, "&quot;")}" />
      <meta property="og:image" content="${imgUrl}" />
      <meta property="og:url" content="${SITE_URL}/events/${slug}" />
      <link rel="canonical" href="${SITE_URL}/events/${slug}" />`;

    const finalHtml = injectMeta(template, metaTags);
    return res.status(200).set({ "Content-Type": "text/html" }).end(finalHtml);
  } catch (err) {
    console.error("SSR error for /events/:slug →", err.message);
    return next();
  }
});

// SSR: /fleet — Fleet listing page
app.get("/fleet", async (req, res, next) => {
  try {
    const template = getIndexTemplate();
    const metaTags = `
      <title>Our Luxury Fleet | JK Executive Chauffeurs</title>
      <meta name="description" content="Explore our premium fleet of luxury vehicles, including Mercedes E-Class, S-Class, and V-Class, for your comfortable travel in London." />
      <meta property="og:title" content="Our Luxury Fleet | JK Executive Chauffeurs" />
      <meta property="og:description" content="Premium vehicles for airport transfers and corporate travel in London." />
      <meta property="og:url" content="${SITE_URL}/fleet" />
      <link rel="canonical" href="${SITE_URL}/fleet" />`;

    const finalHtml = injectMeta(template, metaTags);
    return res.status(200).set({ "Content-Type": "text/html" }).end(finalHtml);
  } catch (err) {
    return next();
  }
});

// SSR: /fleet/:slug — Fleet detail page
app.get("/fleet/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;
    const vehicle = await Fleet.findOne({ slug, isActive: true }).lean();
    if (!vehicle) return next();

    const template = getIndexTemplate();
    const seoTitle = vehicle.seoTitle || vehicle.meta_title || vehicle.title;
    const seoDesc = vehicle.seoDescription || vehicle.meta_description || vehicle.description || "";
    const imgUrl = vehicle.heroImage?.url || `${SITE_URL}/logo.png`;

    const metaTags = `
      <title>${seoTitle}</title>
      <meta name="description" content="${seoDesc.replace(/"/g, "&quot;")}" />
      <meta property="og:title" content="${seoTitle.replace(/"/g, "&quot;")}" />
      <meta property="og:description" content="${seoDesc.replace(/"/g, "&quot;")}" />
      <meta property="og:image" content="${imgUrl}" />
      <meta property="og:url" content="${SITE_URL}/fleet/${slug}" />
      <link rel="canonical" href="${SITE_URL}/fleet/${slug}" />`;

    const finalHtml = injectMeta(template, metaTags);
    return res.status(200).set({ "Content-Type": "text/html" }).end(finalHtml);
  } catch (err) {
    console.error("SSR error for /fleet/:slug →", err.message);
    return next();
  }
});

// SSR: Static Informational Pages
const staticPages = [
  { path: "/about", title: "About Us | JK Executive Chauffeurs", desc: "Learn more about our premium chauffeur services and our commitment to luxury and professional travel." },
  { path: "/contact", title: "Contact Us | Book Your Luxury Chauffeur", desc: "Get in touch with us for bookings, inquiries, and custom travel arrangements in London and the UK." },
  { path: "/terms-and-conditions", title: "Terms & Conditions | JK Executive Chauffeurs", desc: "Our terms of service and booking conditions." },
  { path: "/privacy-policy", title: "Privacy Policy | Your Data Security", desc: "How we protect and manage your personal information." },
  { path: "/gdpr-policy", title: "GDPR Policy | Data Protection Compliance", desc: "Our compliance with General Data Protection Regulation." }
];

staticPages.forEach(page => {
  app.get(page.path, async (req, res, next) => {
    try {
      const template = getIndexTemplate();
      const metaTags = `
        <title>${page.title}</title>
        <meta name="description" content="${page.desc}" />
        <meta property="og:title" content="${page.title}" />
        <meta property="og:description" content="${page.desc}" />
        <meta property="og:url" content="${SITE_URL}${page.path}" />
        <link rel="canonical" href="${SITE_URL}${page.path}" />`;

      const finalHtml = injectMeta(template, metaTags);
      return res.status(200).set({ "Content-Type": "text/html" }).end(finalHtml);
    } catch (err) {
      return next();
    }
  });
});

// ================================================================
// END SSR ROUTES
// ================================================================

// React Frontend Static Files (JS, CSS, Images from dist/)
app.use(express.static(path.join(__dirname, "dist"), {
  maxAge: "1y", // Cache static assets for 1 year
  setHeaders: (res, path) => {
    // DO NOT cache the dynamic index.html so updates are visible immediately!
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));


app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Dummy route to check if the server is running
// app.get("/", (req, res) => {
//   res.send("Hi, Welcome to the server!");
// });

// Error handling middleware
app.use(errorMiddleware);

// Connect to the database and start the server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is up and running on port http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
  });


export default app;