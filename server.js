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

const evaluateHTML = (htmlContent) => {
    let score = 100;
    if (!/<header>/.test(htmlContent)) score -= 10;
    if (!/<main>/.test(htmlContent)) score -= 10;
    if (!/<footer>/.test(htmlContent)) score -= 10;
    if (!/<img[^>]+alt="[^"]*"/.test(htmlContent)) score -= 10;
    if (!/<title>/.test(htmlContent)) score -= 5;
    return score;
};

const evaluateCSS = (cssContent) => {
    const results = csslint.verify(cssContent);
    let score = 100;
    results.messages.forEach(msg => {
        const severity = msg.type === 'warning' ? 1 : 2;
        score -= 2 * severity;
    });
    return Math.max(score, 0);
};

const evaluateJavaScript = async (jsContent) => {
    const eslint = new ESLint();
    const results = await eslint.lintText(jsContent);
    let score = 100;
    results[0].messages.forEach(msg => {
        const severity = msg.severity;
        score -= 5 * severity;
    });
    return Math.max(score, 0);
};

const fetchExternalFiles = async (links, baseURL) => {
    const contents = [];
    for (const link of links) {
        try {
            const url = new URL(link, baseURL).href;
            const response = await axios.get(url);
            contents.push(response.data);
        } catch (error) {
            console.error(`Error fetching external file at ${link}:`, error);
        }
    }
    return contents.join('\n');
};

app.post('/analyze', async (req, res) => {
    const { url } = req.body;

    try {
        const { data: htmlData } = await axios.get(url);
        const $ = cheerio.load(htmlData);

        const htmlScore = evaluateHTML(htmlData);

        const cssLinks = $('link[rel="stylesheet"]').map((_, el) => $(el).attr('href')).get();
        const inlineCSS = $('style').text();
        const cssContent = inlineCSS + await fetchExternalFiles(cssLinks, url);
        const cssScore = evaluateCSS(cssContent);

        const jsLinks = $('script[src]').map((_, el) => $(el).attr('src')).get();
        const inlineJS = $('script:not([src])').text();
        const jsContent = inlineJS + await fetchExternalFiles(jsLinks, url);
        const jsScore = await evaluateJavaScript(jsContent);

        res.json({
            scores: {
                html: htmlScore,
                css: cssScore,
                javascript: jsScore,
            }
        });
    } catch (error) {
        console.error("Error fetching or analyzing the URL:", error);
        res.status(500).json({ error: "Failed to analyze the live demo link." });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
