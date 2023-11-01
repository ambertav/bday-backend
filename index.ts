require('dotenv').config();
import path from 'path';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import sanitize from 'express-mongo-sanitize';
import bearer from './middleware/bearer';
import usersRoute from './routes/usersRoute';
import friendsRoute from './routes/friendsRoute';
import userProfileRoute from './routes/userProfileRoute';
import tagsRoute from './routes/tagsRoute';
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

    app.use(cors({
        origin: ["https://ga-oct-hackathon-team-3.github.io/", "http://localhost:3000"]
    }));

    if (middleware) {
        app.use(middleware);
    }

    app.use("/api/users", usersRoute);
    app.use('/api/friends', friendsRoute);

    app.use('/api/users/profile', userProfileRoute);
    app.use('/api/tags', tagsRoute);

    app.use((req,res,next)=>{
        res.set('Access-Control-Allow-Credentials', 'true');
        next();
    });

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