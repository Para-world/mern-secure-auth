import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";

const authRouter = Router();



//**
// post /api/atuh/register 
//  */

authRouter.post("/register", authController.register);
 
export default authRouter; 