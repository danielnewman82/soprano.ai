const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    image: { data: Buffer, contentType: String },
    title: String,
    description: String
    });
    
module.exports = postSchema;