require('dotenv').config();
import path from 'path';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import sanitize from 'express-mongo-sanitize';
import bearer from './middleware/bearer';
import usersRoute from './modules/user/routes/usersRoute';
import friendsRoute from './modules/friends/friendsRoute';
import userProfileRoute from './modules/profile/userProfileRoute';
import tagsRoute from './modules/tags/tagsRoute';
import connectDB from './utilities/db';


const DEBUG = process.env.NODE_ENV ? process.env.NODE_ENV.toLocaleLowerCase() !== 'production' : true; // Fix DEBUG logic
const PORT = process.env.PORT || 3010;

export const configureApp = (middleware?: any[]) => {

    const app = express();

    app.use(morgan(DEBUG ? 'dev' : 'short'));
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'build')));
    app.use(sanitize());
    app.use(fileUpload());

    app.use(cors());

    if (middleware) {
        app.use(middleware);
    }

    app.use("/api/users", usersRoute);
    app.use('/api/friends', friendsRoute);

    app.use('/api/users/profile', userProfileRoute);
    app.use('/api/tags', tagsRoute);

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