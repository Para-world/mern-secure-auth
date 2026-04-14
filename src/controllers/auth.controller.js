import userModel from "../models/user.model.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import sessionModel from "../models/session.model.js";

export async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    const isAlreadyRegistered = await userModel.findOne({
      $or: [{ username: username }, { email: email }],
    });

    if (isAlreadyRegistered) {
      return res.status(409).json({
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


    const refreshToken = jwt.sign(
      {
        id: user._id,
      },
      config.jwt_secret,
      {
        expiresIn: "7d",
      },
    );

    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const session = await sessionModel.create({
      user: user._id,
      refreshTokenHash,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    })
      


    const accessToken = jwt.sign(
      {
        id: user._id,
        sessionId: session._id,
      },
      config.jwt_secret,
      {
        expiresIn: "15m",
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}


export async function login(req, res) {
  const {email, password} = req.body;
  const user = await userModel.findOne({email})
  
  if (!user){
    return res.status(401).json({
      message:"Invalid credentials"
    })
  }

  const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");
  const isPasswordValid = user.password === hashedPassword;

  if (!isPasswordValid){
    return res.status(401).json({
      message: "Invalid credentials"
    })
  }

  const refreshToken = jwt.sign({
    id: user._id,
  
  },config.jwt_secret,{
    expiresIn: "7d",
  })

  const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

  const session = await sessionModel.create({
    user: user._id,
    refreshTokenHash,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  })

  const accessToken = jwt.sign({
    id: user._id,
    sessionId: session._id,
  },config.jwt_secret,{
    expiresIn: "15m",
  })

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, //7days
  })

  res.status(200).json({
    success: true,
    message: "User logged in successfully",
    user: {
      username: user.username,
      email: user.email,
    },
    accessToken,
  })

  
  


  
}

export async function getMe(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token not found",
      });
    }

    const decoded = jwt.verify(token, config.jwt_secret);
    const user = await userModel.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User fetched successfully",
      user: {
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

export async function refreshToken(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not found",
      });
    }

    const decoded = jwt.verify(refreshToken, config.jwt_secret);
    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const session = await sessionModel.findOne({
      refreshTokenHash,
      revoked: false
    })

    if (!session){
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    const accessToken = jwt.sign(
      {
        id: decoded.id,
      },
      config.jwt_secret,
      {
        expiresIn: "15m",
      },
    );

    const newRefreshToken = jwt.sign(
      {
        id: decoded.id,
      },
      config.jwt_secret,
      {
        expiresIn: "7d",
      },
    );

    const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
    session.refreshTokenHash = newRefreshTokenHash;
    await session.save();
    

    

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, //7days
    });

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      accessToken,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
}

export async function logout(req, res) {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken){
    return res.status(400).json({
      message:"No refresh token found"
    })
  }

  const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

  const session = await sessionModel.findOne({
    refreshTokenHash,
    revoked: false,
  })

  if (!session){
    return res.status(400).json({
      message: "Invalid or expired refresh token",
    });
  }

  session.revoked = true;
  await session.save(); 

  res.clearCookie("refreshToken");

  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
  
}

export async function logoutAll(req, res) {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken){
    return res.status(400).json({
      message:"No refresh token found"
    })
  }

  const decoded = jwt.verify(refreshToken, config.jwt_secret);

  await sessionModel.updateMany({
    user: decoded.id,
    revoked: false,
  
  },{
    revoked: true
  })


  res.clearCookie("refreshToken");

  res.status(200).json({
    success: true,
    message: "Logout from all devices successfully",
  });
  
}