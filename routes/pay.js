"use strict";

require("dotenv").config();

const express = require('express');
const router = express.Router();
const request = require("request");
const debug = require("debug")("bot-express:route");
const Pay = require("line-pay");
const cache = require("memory-cache");
const line_event = require("../service/line-event");

Promise = require("bluebird");
Promise.promisifyAll(request);

const pay = new Pay({
    channelId: process.env.LINE_PAY_CHANNEL_ID,
    channelSecret: process.env.LINE_PAY_CHANNEL_SECRET,
    hostname: process.env.LINE_PAY_HOSTNAME
});

/**
Payment confirm URL
*/

router.get('/confirm', (req, res, next) => {
    if (!req.query.transactionId || !req.query.orderId){
        // Required query string not found.
        return res.sendStatus(400);
    }

    // Get reserved info
    let order;
    debug(`Transaction Id is ${req.query.transactionId}`);
    debug(`Order Id is ${req.query.orderId}`);

    // Get reservation from db.
    let reservation = cache.get(req.query.orderId);

    // Confirm & Capture the payment.
    debug(`Going to confirm/capture payment...`);
    return pay.confirm({
        transactionId: req.query.transactionId,
        amount: reservation.amount,
        currency: reservation.currency
    }).then((response) => {
        debug("Succeeed to capture payment.");
        res.sendStatus(200);

        debug("Going to send completion message to user.");
        return line_event.fire({
            type: "bot-express:push",
            to: {
                type: "user",
                userId: reservation.userId
            },
            intent: {
                name: "simple-response",
                fulfillment: {
                    messages: [{
                        type: 4,
                        payload: {
                            type: "sticker",
                            packageId: 2,
                            stickerId: 144
                        }
                    },{
                        type: 0,
                        speech: `決済が完了しました。`
                    }]
                }
            }
        });
    }, (response) => {
        debug("Failed to capture payment.");
        debug(response);
        res.sendStatus(400);
    }).then((response) => {
        debug("Succeed to send message");
    });
});

module.exports = router;
