const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('coresecharme', 'root', 'root@123', {
    host: 'localhost',
    dialect: 'mysql',
});

sequelize.sync()
    .then(() => {
        console.log('Banco de dados sincronizado com sucesso.');
    })
    .catch(err => {
        console.error('Erro ao sincronizar o banco de dados:', err);
    });

module.exports= sequelize