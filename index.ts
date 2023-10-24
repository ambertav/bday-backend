require('dotenv').config();
import path from 'path';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import sanitize from 'express-mongo-sanitize';
import bearer from './middleware/bearer';
import usersRoute from './routes/usersRoute';

import userProfileRoute from './routes/userProfileRoute';
import connectDB from './utilities/db';

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

    app.use("/api/users", usersRoute);


    app.use('/api/users/profile', userProfileRoute);
    return app;
}

const app = configureApp([bearer]);

if (!process.env.NODE_ENV || (process.env.NODE_ENV && process.env.NODE_ENV !== 'test')) {
    connectDB();
    app.listen(PORT, () => {
        console.log(`Express app running on port ${PORT}`);
    });
}
export default app;