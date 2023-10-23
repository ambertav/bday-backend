"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const path = require('path');
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const cors_1 = __importDefault(require("cors"));
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const DEBUG = process.env.NODE_ENV ? process.env.NODE_ENV.toLocaleLowerCase() !== 'production' : true; // Fix DEBUG logic
const PORT = process.env.PORT || 3000;
const app = (0, express_1.default)();
app.use((0, morgan_1.default)(DEBUG ? 'dev' : 'short'));
app.use(express_1.default.json());
app.use(express_1.default.static(path.join(__dirname, 'build')));
app.use((0, express_mongo_sanitize_1.default)());
app.use((0, cors_1.default)());
// app.get('/*', (req: any, res: any) => {
//     res.sendFile(path.join(__dirname, '../build', 'index.html'));
// });
if (!process.env.NODE_ENV || (process.env.NODE_ENV && process.env.NODE_ENV !== 'test'))
    app.listen(PORT, () => {
        console.log(`Express app listsening on port ${PORT}`);
    });
