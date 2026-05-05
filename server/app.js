const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.resolve(__dirname, '../client/dist')));

require('./routes')(app);

app.use(function (req, res) {
    res.sendFile(path.resolve(__dirname, '../client/dist/index.html'));
});

app.use(function (err, req, res, next) {
    console.error(err.stack || err);
    res.status(500).json({ message: '伺服器內部錯誤' });
});

const PORT = process.env.APP_PORT || 3000;
app.listen(PORT, function () {
    console.log(`success listen...${PORT}`);
});
