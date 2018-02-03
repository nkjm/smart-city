"use strict";

require("dotenv").config();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Emulator = require("../test-util/emulator");
const messenger_options = [{
    name: "line",
    options: {
        line_channel_secret: process.env.LINE_CHANNEL_SECRET
    }
}];

chai.use(chaiAsPromised);
const should = chai.should();

for (let messenger_option of messenger_options){
    let emu = new Emulator(messenger_option.name, messenger_option.options);

    describe("Test pay skill from " + emu.messenger_type, function(){
        let user_id = "pay";

        describe("Push event", function(){
            it("will provide payment URL.", function(){
                this.timeout(8000);

                return emu.clear_context(user_id).then(function(){
                    let event = {
                        type: "bot-express:push",
                        to: {
                            type: "user",
                            userId: user_id
                        },
                        intent: {
                            name: "pay",
                            parameters: {
                                productName: "住民票",
                                amount: 300,
                                currency: "JPY",
                                orderId: "dummy",
                                message_text: `下記のボタンから決済にお進みください。`
                            }
                        },
                        language: "ja"
                    }
                    return emu.send(event);
                }).then(function(context){
                    context.intent.name.should.equal("pay");
                    context.previous.message[0].message.type.should.equal("template");
                    context.previous.message[0].message.altText.should.equal("下記のボタンから決済にお進みください。");
                    context.previous.message[0].message.template.type.should.equal("buttons");
                    context.previous.message[0].message.template.text.should.equal("下記のボタンから決済にお進みください。");
                    context.previous.message[0].message.template.actions.should.lengthOf(1);
                    context.previous.message[0].message.template.actions[0].type.should.equal("uri");
                    context.previous.message[0].message.template.actions[0].label.should.equal("300円を決済する");
                    context.previous.message[0].message.template.actions[0].uri.should.match(/^https:\/\/sandbox-web-pay\.line\.me\/web\/payment\/wait\?transactionReserveId/);
                });
            });
        });
    });
}
