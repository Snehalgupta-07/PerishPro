const express = require('express');
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { connectMongoDB } = require('./connection');

const app = express();
const authRouter = require("./Routes/auth");
const productRouter = require("./Routes/product");
const userRouter = require("./Routes/user");
const donationRouter = require("./Routes/donation");


app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

const PORT = process.env.PORT || 8001;
const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/perishpro';

if (!process.env.MONGODB_URL) {
    console.warn('Warning: MONGODB_URL is not set. Falling back to local MongoDB at', mongoUrl);
}

const startServer = async () => {
    try {
        await connectMongoDB(mongoUrl);
        console.log('MongoDb connected Successfully');
        app.listen(PORT, () => console.log(`Server Running at ${PORT}`));
    } catch (error) {
        console.error('Error Connecting MongoDb', error);
        process.exit(1);
    }
};

startServer();

app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(cookieParser());

app.use("/api/auth/", authRouter);
app.use("/api/user/", userRouter);
app.use("/api/products/", productRouter);
app.use("/api/donations/", donationRouter);

app.get('/',(req,res)=>{
    return res.send("Server is  Running");
})