const express = require('express');
const axios = require('axios');
const { ESLint } = require('eslint');
const { CSSLint } = require('csslint');
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

// Function to evaluate HTML content with GitHub best practices
const evaluateHTML = (htmlContent) => {
    const feedback = [];
    let score = 100;

    // Mandatory tags for structural clarity and SEO
    const requiredTags = ['<header>', '<main>', '<footer>', '<title>'];
    requiredTags.forEach(tag => {
        if (!new RegExp(tag).test(htmlContent)) {
            score -= 10;
            feedback.push(`Missing ${tag} tag for improved structure.`);
        }
    });

    // Accessibility checks
    if (!/<img[^>]+alt="[^"]*"/.test(htmlContent)) {
        score -= 10;
        feedback.push("Images are missing alt attributes for accessibility.");
    }

    // Semantic structure
    const htmlLines = htmlContent.split('\n').length;
    if (htmlLines > 200) {
        score -= 5;
        feedback.push("HTML document is large; consider refactoring for readability.");
    }

    return { score, feedback };
};

// Function to evaluate CSS content with enhanced scoring
const evaluateCSS = (cssContent) => {
    const results = CSSLint.verify(cssContent);
    const feedback = [];
    let score = 100;

    results.messages.forEach(msg => {
        const severity = msg.type === 'warning' ? 1 : 2;
        score -= severity * 3;  // Enhanced penalty for errors
        feedback.push(`${msg.type.toUpperCase()}: ${msg.message} at line ${msg.line}`);
    });

    // Maintainability check
    if (cssContent.split('\n').length > 300) {
        score -= 10;
        feedback.push("CSS file is large; consider modularizing styles.");
    }

    return { score: Math.max(score, 0), feedback };
};

// Function to evaluate JavaScript content with complexity analysis
const evaluateJavaScript = async (jsContent) => {
    const eslint = new ESLint();
    const [result] = await eslint.lintText(jsContent);
    const feedback = [];
    let score = 100;

    // Linting messages for warnings and errors
    result.messages.forEach(msg => {
        const severity = msg.severity;
        score -= severity * 5;  // Enhanced deduction
        feedback.push(`${severity === 1 ? 'Warning' : 'Error'}: ${msg.message} at line ${msg.line}`);
    });

    // Complexity check (based on line count and function length)
    const jsLines = jsContent.split('\n').length;
    const functionLines = jsContent.match(/function\s+.*\{[^}]*\}/g) || [];
    if (jsLines > 400) {
        score -= 10;
        feedback.push("JavaScript file is large; consider refactoring or modularizing.");
    }
    if (functionLines.some(fn => fn.split('\n').length > 50)) {
        score -= 10;
        feedback.push("Consider reducing function length to improve readability and maintainability.");
    }

    return { score: Math.max(score, 0), feedback };
};

// Helper function to fetch external files (CSS or JS) and return their content
const fetchExternalFiles = async (links, baseURL) => {
    const requests = links.map(link => axios.get(new URL(link, baseURL).href).then(res => res.data).catch(() => ''));
    const responses = await Promise.all(requests);
    return responses.join('\n');
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

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
