import { Router } from "express";
import userRoutes from "./api/userRoutes.js"
import welcome from "./welcomeRoutes.js";
import contentRoutes from './api/contentRoutes.js'

const routes = Router();

routes.use(userRoutes);
routes.use(welcome);
routes.use(contentRoutes);

export default routes