require('dotenv').config();
require('./db');
import Tag from "../models/tag";


(async ()=>{
    await Tag.deleteMany({});
    await Tag.create([
        {type: "relationship", title: "family"},
        {type: "relationship", title: "friend"},
        {type: "relationship", title: "work"},
        {type: "gender", title: "male"},
        {type: "gender", title: "female"},
        {type: "gender", title: "non-binary"},
        {type: "gender", title: "non-binary"},
        {type: "aesthetics", title: "cottagecore"},
        {type: "aesthetics", title: "goth"},
        {type: "aesthetics", title: "minimal"},
        {type: "aesthetics", title: "pastel"},
        {type: "aesthetics", title: "sporty"},
        {type: "aesthetics", title: "grunge"},
        {type: "hobby", title: "gamer"},
        {type: "hobby", title: "painter"},
        {type: "hobby", title: "farmer"},
    ])
})();