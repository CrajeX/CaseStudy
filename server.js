const express = require('express');
const axios = require('axios');
const { ESLint } = require('eslint');
const csslint = require('csslint').CSSLint;
const cors = require('cors');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
    origin: 'https://casestudynapoles.netlify.app',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

const fetchExternalFiles = async (links, baseURL) => {
    const requests = links.map(link => axios.get(new URL(link, baseURL).href).then(res => res.data).catch(() => ''));
    const responses = await Promise.all(requests);
    return responses.join('\n');
};

// HTML evaluation with expanded checks
const evaluateHTML = (htmlContent) => {
    const feedback = [];
    let score = 100;

    // Semantic tags
    const requiredTags = ['<header>', '<main>', '<footer>', '<title>', '<meta name="description">'];
    requiredTags.forEach(tag => {
        if (!new RegExp(tag).test(htmlContent)) {
            score -= 10;
            feedback.push(`Missing ${tag} for improved structure or SEO.`);
        }
    });

    // Accessibility and deprecated tags
    if (!/<img[^>]+alt="[^"]*"/.test(htmlContent)) {
        score -= 10;
        feedback.push("Images are missing alt attributes for accessibility.");
    }
    if (/(<font>|<center>|<marquee>)/.test(htmlContent)) {
        score -= 15;
        feedback.push("Deprecated tags found (e.g., <font>, <center>); please remove.");
    }

    // HTML length and readability
    const htmlLines = htmlContent.split('\n').length;
    if (htmlLines > 200) {
        score -= 5;
        feedback.push("HTML file is large; consider splitting into partials.");
    }

    return { score, feedback };
};

// Enhanced CSS evaluation for modularity and best practices
const evaluateCSS = (cssContent) => {
    const results = csslint.verify(cssContent);
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
    if (cssContent.length > 5000) {
        score -= 10;
        feedback.push("CSS file is large; consider modularizing styles.");
    }

    return { score: Math.max(score, 0), feedback };
};

// Enhanced JavaScript evaluation
const evaluateJavaScript = async (jsContent) => {
    const eslint = new ESLint();
    const [result] = await eslint.lintText(jsContent);
    const feedback = [];
    let score = 100;

    result.messages.forEach(msg => {
        const severity = msg.severity;
        score -= severity * 5;
        feedback.push(`${severity === 1 ? 'Warning' : 'Error'}: ${msg.message} at line ${msg.line}`);
    });

    if (jsContent.split('\n').length > 400) {
        score -= 10;
        feedback.push("JavaScript file is large; consider modularizing.");
    }
    if ((jsContent.match(/console\./g) || []).length > 0) {
        score -= 5;
        feedback.push("Avoid using console logs in production code.");
    }

    return { score: Math.max(score, 0), feedback };
};

// POST endpoint to analyze the provided GitHub live demo URL
app.post('/analyze', async (req, res) => {
    const { url } = req.body;

    try {
        const { status } = await axios.head(url);
        if (status !== 200) {
            return res.status(400).json({ error: "The provided URL is not reachable." });
        }

        const { data: htmlData } = await axios.get(url);
        const $ = cheerio.load(htmlData);

        // HTML Analysis
        const { score: htmlScore, feedback: htmlFeedback } = evaluateHTML(htmlData);

        // CSS Analysis
        const cssLinks = $('link[rel="stylesheet"]').map((_, el) => $(el).attr('href')).get();
        const cssContent = $('style').text() + await fetchExternalFiles(cssLinks, url);
        const { score: cssScore, feedback: cssFeedback } = evaluateCSS(cssContent);

        // JavaScript Analysis
        const jsLinks = $('script[src]').map((_, el) => $(el).attr('src')).get();
        const jsContent = $('script:not([src])').text() + await fetchExternalFiles(jsLinks, url);
        const { score: jsScore, feedback: jsFeedback } = await evaluateJavaScript(jsContent);

        res.json({
            scores: {
                html: htmlScore,
                css: cssScore,
                javascript: jsScore,
            },
            feedback: {
                html: htmlFeedback,
                css: cssFeedback,
                javascript: jsFeedback,
            }
        });
    } catch (error) {
        console.error("Error fetching or analyzing the URL:", error.message);
        res.status(500).json({ error: "Failed to analyze the live demo link." });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
