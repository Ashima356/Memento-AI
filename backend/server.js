require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = 5000;

connectDB();

app.listen(PORT, () => {
    console.log(`Memento-AI backend running on http://localhost:${PORT}`);
});
