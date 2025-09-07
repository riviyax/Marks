const express = require('express');
const dbConnection = require('./config/db');
const router = require('./routes/members');
const cors = require('cors');
const bodyParser = require('body-parser');

const  app = express();
app.use(cors({origin: true, credentials: true}));

dbConnection();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('<h1>Hello World!</h1><br>This is the server side website for the Members API<br><a href="">Go To Main Site</a><br><a target="_blank" href="https://ggriviya.pages.dev">Go To Developer Page</a>');
}); 
app.use('/api/members', router);
const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});