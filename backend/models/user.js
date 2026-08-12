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
        // Non richiesta per gli account creati via Google Sign-In (niente password locale).
        required: function () { return !this.googleId; }
    },

    googleId: {
        type: String,
        unique: true,
        sparse: true // permette a più utenti di non avere googleId senza violare l'unique index
    },

    role: {
        type: String,
        enum: ['author', 'visitor'],
        default: 'visitor'
    },

    display_name: { type: String, trim: true, maxLength: 60 },
    bio:          { type: String, trim: true, maxLength: 300 },
    avatar_url:   { type: String, trim: true },

    
adopted_visits: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Visit'
    }],

    bookmarked_visits: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Visit'
    }]
}, {
    timestamps: true
})

const User = model('User', userSchema)

module.exports = User