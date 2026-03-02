const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: [true, "User name already exists"],
        required: [true, "username is required"]
    },
    
    email:{
        type: String,
        unique: [true, "Email already exists"],
        required: [true, "Email is required"],
    },

    password:{
        type: String,
        required: [true, 'Password is required'],
    },
    
    bio: String,
    profileImage: {
        type: String,
        default: 'https://ik.imagekit.io/lq7qd2rhd/IMG-20251226-WA0073.jpg',
    }
})


const userModel = mongoose.model('users', userSchema);

module.exports = userModel;