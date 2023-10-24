require('dotenv').config();
const path = require('path');
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import sanitize from 'express-mongo-sanitize';
import bearer from './middleware/bearer';
import usersRoute from './routes/usersRoute';

const DEBUG = process.env.NODE_ENV ? process.env.NODE_ENV.toLocaleLowerCase() !== 'production' : true; // Fix DEBUG logic
const PORT = process.env.PORT || 3000;

export const configureApp = (middleware?: any[]) => {

    const app = express();

    app.use(morgan(DEBUG ? 'dev' : 'short'));
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'build')));
    app.use(sanitize());

    app.use(cors());

    if (middleware) {
        app.use(middleware);
    }

    app.use("/api/users/", usersRoute);

    return app;
}

const app = configureApp([bearer]);

if (!process.env.NODE_ENV || (process.env.NODE_ENV && process.env.NODE_ENV !== 'test'))
    app.listen(PORT, () => {
        console.log(`Express app running on port ${PORT}`);
    });

export default app;