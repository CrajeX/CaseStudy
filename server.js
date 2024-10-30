const express = require('express');
const axios = require('axios');
const { ESLint } = require('eslint'); // ESLint for JavaScript analysis
const csslint = require('csslint').CSSLint;
const cors = require('cors'); // Make sure to import CORS

const app = express();
const PORT = process.env.PORT || 4000; // Use the port from the environment variable


app.use(cors({
    origin: 'https://casestudynapoles.netlify.app', // Allow requests from your frontend's origin
    methods: ['GET', 'POST'], // Specify the HTTP methods you want to allow
    allowedHeaders: ['Content-Type'], // Specify the headers you want to allow
}));

app.use(express.json()); // Middleware to parse JSON request bodies

// Function to evaluate HTML content
const evaluateHTML = (htmlContent) => {
    let score = 100;
    if (!/<header>/.test(htmlContent)) score -= 10;
    if (!/<main>/.test(htmlContent)) score -= 10;
    if (!/<footer>/.test(htmlContent)) score -= 10;
    if (!/<img[^>]+alt="[^"]*"/.test(htmlContent)) score -= 10;
    return score;
};

// Function to evaluate CSS content
const evaluateCSS = (cssContent) => {
    const results = csslint.verify(cssContent);
    let score = 100;
    if (results.messages.length > 0) {
        score -= results.messages.length * 2; // Subtract points per warning/error
    }
    return Math.max(score, 0);
};

// Function to evaluate JavaScript content
const evaluateJavaScript = async (jsContent) => {
    const eslint = new ESLint();
    const results = await eslint.lintText(jsContent);
    let score = 100;
    results[0].messages.forEach(msg => {
        score -= 5; // Subtract points for each error/warning
    });
    return Math.max(score, 0);
};

// POST endpoint to analyze the provided URL
app.post('/analyze', async (req, res) => {
    const { url } = req.body;

    try {
        const { data } = await axios.get(url);

        const htmlScore = evaluateHTML(data);
        const cssContent = data.match(/<style>(.*?)<\/style>/s)?.[1] || "";
        const cssScore = evaluateCSS(cssContent);

        const jsContent = data.match(/<script>(.*?)<\/script>/s)?.[1] || "";
        const jsScore = await evaluateJavaScript(jsContent);

        res.json({ htmlScore, cssScore, jsScore });
    } catch (error) {
        console.error("Error fetching the URL:", error); // Log the error for debugging
        res.status(500).json({ error: "Failed to analyze the live demo link." });
    }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
