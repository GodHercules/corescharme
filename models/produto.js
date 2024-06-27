const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/db');

const Product = db.define('Product', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    imageUrl: {
        type: DataTypes.STRING,
    },
}, {
    timestamps: true,
});

module.exports = Product