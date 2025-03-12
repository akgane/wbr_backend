require('dotenv').config();
const express = require('express');
const {MongoClient, ServerApiVersion} = require('mongodb');
const { perfomance } = require('perf_hooks');

const MONGO_USERNAME = process.env.MONGODB_USERNAME;
const MONGO_PASSWORD = process.env.MONGODB_PASSWORD;

const port = process.env.PORT || 4000;

const uri = `mongodb+srv://${MONGO_USERNAME}:${MONGO_PASSWORD}@ygwbr.yemnu.mongodb.net/?retryWrites=true&w=majority&appName=ygwbr`

// console.log(`MongoDB URI: ${uri}`);

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); // Разрешает запросы от любых доменов
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
});

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let ruCollection, enCollection;

async function connectDB() {
    try {
        await client.connect();
        const database = client.db("wbr");
        ruCollection = database.collection("ru");
        enCollection = database.collection("en");
        console.log("Database Connected");
    } catch (err) {
        console.log(err);
    }
}

app.get("/", (req, res) => {
    return res.status(200).json({"message": "Hello World!"});
})

app.post('/find_record', async (req, res) => {
    const startTime = performance.now();
    try {
        const {answer, prevAnswer, collectionName} = req.body;
        if (!prevAnswer || !answer) {
            return res.status(400).json({error: "Missing parameters!"});
        }

        let collection;

        switch (collectionName) {
            case "en":
                collection = enCollection;
                break;
            case "ru":
            default:
                collection = ruCollection;
                break;
        }

        const filter = {guess: answer, prev: prevAnswer};
        const update = {$inc: {cached_count: 1}};
        const options = {returnDocument: "after"};

        const record = await collection.findOneAndUpdate(filter, update, options);

        const endTime = performance.now();
        console.log(`find_record processed in ${(endTime - startTime).toFixed(2)} ms`);

        res.json(record || {});
    } catch (err) {
        const endTime = performance.now();
        console.log(`find_record got error. Processed in ${(endTime - startTime).toFixed(2)} ms`);
        res.status(500).json({error: err.message});
    }
});

app.post('/insert_record', async (req, res) => {
    const startTime = performance.now();
    try {
        const {guess, prev, win, emoji, reason, cached_count, collectionName} = req.body;
        console.log(guess, prev, win, emoji, reason, cached_count);
        console.log(collectionName);
        if (!guess || !prev) {
            return res.status(400).json({error: "Missing required fields"});
        }

        let collection;

        switch (collectionName) {

            case "en":
                collection = enCollection;
                break;
            case "ru":
            default:
                collection = ruCollection;
                break;
        }

        const document = {guess, prev, win, emoji, reason, cached_count: cached_count || 0};
        await collection.insertOne(document);

        const endTime = performance.now();
        console.log(`insert_record processed in ${(endTime - startTime).toFixed(2)} ms`);

        res.json({success: true, document});
    } catch (error) {
        const endTime = performance.now();
        console.log(`insert_record got error. Processed in ${(endTime - startTime).toFixed(2)} ms`);
        res.status(500).json({error: error.message});
    }
});

const PORT = process.env.PORT || 4000;
app.listen(port, async () => {
    await connectDB();
    console.log(`🚀 Server running on port ${PORT}`);
});
