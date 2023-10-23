require('dotenv').config();
const path= require('path');
const express = require('express');
const logger = require('morgan');
const sanitize = require('express-mongo-sanitize');
const cors = require("cors");

const DEBUG = process.env.NODE_ENV ? process.env.NODE_ENV.toLocaleLowerCase() !== 'production' : true; // Fix DEBUG logic
const PORT = process.env.PORT || 3000;

const configureApp = (customMiddleware) => {

    const app = express();

    app.use(logger(DEBUG ? 'dev' : 'short'));
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'build')));
    app.use(sanitize());

    app.use(cors());

    // Dummy auth middleware or real middleware
    if (customMiddleware) {
        app.use(customMiddleware);
    }

    app.get('/*', (req, res) => {
        res.sendFile(path.join(__dirname, '../build', 'index.html'));
    });

    return app;
}

const app = configureApp();

if (!process.env.NODE_ENV || (process.env.NODE_ENV && process.env.NODE_ENV !== 'test'))
    app.listen(PORT, () => {
        console.log(`Express app running on port ${PORT}`);
    });

module.exports = { app, configureApp };