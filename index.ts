require('dotenv').config();
const path = require('path');
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import sanitize from 'express-mongo-sanitize';

const DEBUG = process.env.NODE_ENV ? process.env.NODE_ENV.toLocaleLowerCase() !== 'production' : true; // Fix DEBUG logic
const PORT = process.env.PORT || 3000;


const app = express();

app.use(morgan(DEBUG ? 'dev' : 'short'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));
app.use(sanitize());

app.use(cors());



// app.get('/*', (req: any, res: any) => {
//     res.sendFile(path.join(__dirname, '../build', 'index.html'));
// });



if (!process.env.NODE_ENV || (process.env.NODE_ENV && process.env.NODE_ENV !== 'test'))
    app.listen(PORT, () => {
        console.log(`Express app running on port ${PORT}`);
    });