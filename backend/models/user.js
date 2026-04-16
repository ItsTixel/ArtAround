const mongoose = require('mongoose');
const { Schema, model } = mongoose;


const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minLength: [3, 'Username too short (min 3 characters)'],
        maxLength: [30, 'Username too long (max 30 characters)']
    },


    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Email non valida']
    },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: ['author', 'visitor'],
        default: 'visitor'
    },

}, {
    timestamps: true
})

const User = model('User', userSchema)

module.exports = User