const express = require('express');
const axios = require('axios');
const { ESLint } = require('eslint');
const csslint = require('csslint').CSSLint;
const cors = require('cors');
const cheerio = require('cheerio');
const beautify = require('js-beautify').js;
const beautifyCSS = require('js-beautify').css;

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
    origin: ['https://skifolio.netlify.app', 'http://localhost:3000'], 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// Fetch external files and ensure absolute URLs
const fetchExternalFiles = async (links, baseURL) => {
    const contents = [];
    for (const link of links) {
        try {
            const url = new URL(link, baseURL).href; // Ensures absolute URL
            console.log(`Attempting to fetch: ${url}`);

            const response = await axios.get(url, {
                timeout: 5000,
                headers: { 'User-Agent': 'Mozilla/5.0' }  // Bypass GitHub CORS
            });

            if (response.data && response.data.length > 0) {
                contents.push(response.data);
                console.log(`Fetched content from: ${url}`);
            } else {
                console.warn(`Empty content received from: ${url}`);
            }
        } catch (error) {
            console.error(`Failed to fetch file at ${link}:`, error.message);
        }
    }
    return contents.join('\n'); // Join all fetched content
};

// HTML evaluation with best practices
const evaluateHTML = (htmlContent) => {
    const feedback = [];
    let score = 100;

    const requiredTags = ['<header>', '<main>', '<footer>', '<title>', '<meta name="description">'];
    requiredTags.forEach(tag => {
        if (!new RegExp(tag).test(htmlContent)) {
            score -= 10;
            feedback.push(`Missing ${tag} for improved structure or SEO.`);
        }
    });

    if (!/<img[^>]+alt="[^"]*"/.test(htmlContent)) {
        score -= 10;
        feedback.push("Images are missing alt attributes for accessibility.");
    }
    if (/(<font>|<center>|<marquee>)/.test(htmlContent)) {
        score -= 15;
        feedback.push("Deprecated tags found (e.g., <font>, <center>); please remove.");
    }

    return { score, feedback };
};

// CSS evaluation with formatting
const evaluateCSS = (cssContent) => {
    const formattedCSS = beautifyCSS(cssContent, { indent_size: 2 }); // Beautify CSS
    const results = csslint.verify(formattedCSS);
    const feedback = [];
    let score = 100;

    results.messages.forEach(msg => {
        const severity = msg.type === 'warning' ? 1 : 2;
        score -= severity * 3;
        feedback.push(`${msg.type.toUpperCase()}: ${msg.message} at line ${msg.line}`);
    });

    if (cssContent.includes('!important')) {
        score -= 10;
        feedback.push("Avoid using '!important' in CSS.");
    }

    return { score: Math.max(score, 0), feedback };
};

// JavaScript evaluation with ESLint and beautification
const evaluateJavaScript = async (jsContent) => {
    const formattedJS = beautify(jsContent, { indent_size: 2 }); // Beautify JavaScript
    const eslint = new ESLint({
        useEslintrc: false,
        baseConfig: { extends: "eslint:recommended" }
    });

    const [result] = await eslint.lintText(formattedJS);
    const feedback = [];
    let score = 100;

    result.messages.forEach(msg => {
        const severity = msg.severity;
        score -= severity * 5;
        feedback.push(`${severity === 1 ? 'Warning' : 'Error'}: ${msg.message} at line ${msg.line}`);
    });

    if ((jsContent.match(/console\./g) || []).length > 0) {
        score -= 5;
        feedback.push("Avoid using console logs in production code.");
    }

    return { score: Math.max(score, 0), feedback };
};

// Analyze function
app.post('/analyze', async (req, res) => {
    const { url } = req.body;

    try {
        // Check if URL is reachable
        const { status } = await axios.head(url);
        if (status !== 200) {
            return res.status(400).json({ error: "The provided URL is not reachable." });
        }

        // Fetch page content
        const { data: htmlData } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(htmlData);

        // HTML Analysis
        const { score: htmlScore, feedback: htmlFeedback } = evaluateHTML(htmlData);

        // CSS Analysis
        const cssLinks = $('link[rel="stylesheet"]').map((_, el) => $(el).attr('href')).get();
        const inlineCSS = $('style').text();
        const cssContent = inlineCSS + await fetchExternalFiles(cssLinks, url);
        console.log("Final CSS Length:", cssContent.length);
        const { score: cssScore, feedback: cssFeedback } = evaluateCSS(cssContent);

        // JavaScript Analysis
        const jsLinks = $('script[src]').map((_, el) => $(el).attr('src')).get();
        const inlineJS = $('script:not([src])').text();
        const jsContent = inlineJS + await fetchExternalFiles(jsLinks.filter(src => src.endsWith('.js')), url);
        console.log("Final JS Length:", jsContent.length);
        const { score: jsScore, feedback: jsFeedback } = await evaluateJavaScript(jsContent);

        res.json({
            scores: { html: htmlScore, css: cssScore, javascript: jsScore },
            feedback: { html: htmlFeedback, css: cssFeedback, javascript: jsFeedback }
        });

    } catch (error) {
        console.error("Error fetching or analyzing the URL:", error.message);
        res.status(500).json({ error: "Failed to analyze the live demo link." });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
