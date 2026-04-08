import dotenv from "dotenv";

dotenv.config();


if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not defined in .env file");
}

const config = {
    mongo_uri: process.env.MONGO_URI

}

export default config;