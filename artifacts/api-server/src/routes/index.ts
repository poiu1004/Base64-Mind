import { Router, type IRouter } from "express";
import healthRouter from "./health";
import understandRouter from "./understand";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/understand", understandRouter);

export default router;
