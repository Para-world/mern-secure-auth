import userModel from "../models/user.model.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import config from "../config/config.js";

export async function register(req, res) {
  const { username, email, password } = req.body;

  const isAlreadyRegistered = await userModel.findOne({
    $or: [{ username: username }, { email: email }],
  });

  if (isAlreadyRegistered) {
    res.status(409).json({
      success: false,
      message: "User already registered",
    });
  }

  const hashedPassword = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");

  const user = await userModel.create({
    username,
    email,
    password: hashedPassword,
  });

  const accessToken = jwt.sign(
    {
      id: user._id,
    },
    config.jwt_secret,
    {
      expiresIn: "15m",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: user._id,
    },
    config.jwt_secret,
    {
      expiresIn: "7d",
    },
  );

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, //7days
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    user: {
      username: user.username,
      email: user.email,
    },
    accessToken,
    
  });
}

export async function getMe(req, res) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      message: "token not found",
    });
  }

  const decoded = jwt.verify(token, config.jwt_secret);
  const user = await userModel.findById(decoded.id);

  res.status(200).json({
    message: "user fetched succesfully",
    user: {
      username: user.username,
      email: user.email,
    },
  });
}


export async function refreshToken(req, res){
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken){
        return res.status(401).json({
            message:"refresh Token not found"
        })
    }

    const decoded = jwt.verify(refreshToken, config.jwt_secret);

    const accessToken = jwt.sign(
        {
            id: decoded.id,
        },
        config.jwt_secret,
        {
            expiresIn: "15m",
        }
    )

    const newRefreshToken = jwt.sign(
        {
            id: decoded.id,
        },
        config.jwt_secret,
        {
            expiresIn: "7d",
        }
    )
    res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, //7days
    });

    res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, //7days
    });

    res.status(200).json({
        success: true,
        message: "refresh token generated successfully",
        accessToken,
    })
}