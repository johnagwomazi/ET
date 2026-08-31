import express from "express";
import * as ticketingController from "../controllers/ticketing.controller.js";

const paymentRouter = express.Router();

paymentRouter.post("/paystack/webhook", ticketingController.handlePaystackWebhook);

export default paymentRouter;
