import dotenv from "dotenv";

dotenv.config();

const config = {
    mongo_uri: process.env.MONGO_URI

}

export default config;