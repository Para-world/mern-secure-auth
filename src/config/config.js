import dotenv from "dotenv";

dotenv.config();


if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not defined in .env file");
}

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in .env file");
}

const config = {
    mongo_uri: process.env.MONGO_URI,
    jwt_secret: process.env.JWT_SECRET

}

export default config;