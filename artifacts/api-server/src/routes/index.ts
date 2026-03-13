import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storageRouter from "./storage";
import usersRouter from "./users";
import categoriesRouter from "./categories";
import documentsRouter from "./documents";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(storageRouter);
router.use(usersRouter);
router.use(categoriesRouter);
router.use(documentsRouter);
router.use(chatRouter);

export default router;
