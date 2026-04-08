import { Router } from "express";

const authRouter = Router();



//**
// post /api/atuh/register 
//  */

authRouter.post("/register", (req, res) => {
    res.send("Register");
});
 
export default authRouter; 