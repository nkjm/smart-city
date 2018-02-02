"use strict";

/*
** Import Packages
*/
const server = require("express")();
const bot_express = require("bot-express");

/*
** Middleware Configuration
*/
server.listen(process.env.PORT || 5000, () => {
    console.log("server is running...");
});

/*
** Mount bot-express
*/
server.use("/webhook", bot_express({
    nlu: {
        type: "dialogflow",
        options: {
            client_access_token: process.env.DIALOGFLOW_CLIENT_ACCESS_TOKEN
        }
    },
    memory: {
        type: "memory-cache",
        retention: 600
    },
    language: "ja",
    line_channel_secret: process.env.LINE_CHANNEL_SECRET,
    line_access_token: process.env.LINE_ACCESS_TOKEN,
    default_skill: process.env.DEFAULT_SKILL,
    google_project_id: process.env.GOOGLE_PROJECT_ID,
    google_api_key: process.env.GOOGLE_API_KEY,
    auto_translation: process.env.AUTO_TRANSLATION
}));

const routes_pay = require("./routes/pay");
server.use("/pay", routes_pay);

module.exports = server;
