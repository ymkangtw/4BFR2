module.exports = (app) => {
    const fs = require('fs');
    const path = require('path');
    const basename = path.basename(__filename);

    fs.readdirSync(__dirname)
        .filter(file => (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js'))
        .forEach(file => {
            const filename = file.slice(0, -3);
            require(path.join(__dirname, filename))(app);
        });
};
