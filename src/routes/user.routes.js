import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

/*
    - A router object is an isolated instance of middleware and routes. 
    - Think of it as a “mini-application,” . We can add middleware and HTTP method routes (such as get, put, post, and so on) to it just like an application
    - A router behaves like middleware itself.
    - We can use a router for a particular root URL; In this way we separate routes into files or even mini-apps.
*/
const router = Router();

// router.route(path) -  Returns an instance of a single route which you can then use to handle HTTP verbs with optional middleware. Use router.route() to avoid duplicate route naming and thus typing errors.
router.route("/register").post(registerUser);

export default router;
