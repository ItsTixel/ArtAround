const mongoose = require('mongoose');
const { Schema, model } = mongoose;

// Completely WIP, just to test
const userSchema = new Schema({
    name : {
        type : String,
        required : true
    }
})
const User = model('User', userSchema)

module.exports = User