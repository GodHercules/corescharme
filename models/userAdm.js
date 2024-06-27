const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/db');

const UserAdm = db.define('UserAdm', {
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
}, {
    timestamps: true,
});

module.exports = UserAdm