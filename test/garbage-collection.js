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

    describe("Test garbage-collection skill from " + emu.messenger_type, function(){
        let user_id = "garbage-collection";

        describe("Perfect reply and user select LINE Pay", function(){
            it("will reserve payment and provide payment url.", function(){
                this.timeout(8000);

                return emu.clear_context(user_id).then(function(){
                    let event = emu.create_postback_event(user_id, {
                        data: JSON.stringify({
                            _type: "intent",
                            intent: {
                                name: "garbage-collection"
                            },
                            language: "ja"
                        })
                    });
                    return emu.send(event);
                }).then(function(context){
                    context.intent.name.should.equal("garbage-collection");
                    context.confirming.should.equal("garbage");
                    let event = emu.create_message_event(user_id, "ソファ");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("quantity");
                    let event = emu.create_message_event(user_id, "2");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("name");
                    let event = emu.create_message_event(user_id, "中嶋一樹");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("is_name_correct");
                    let event = emu.create_message_event(user_id, "はい");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("zip_code");
                    let event = emu.create_message_event(user_id, "107-0062");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("is_city_correct");
                    let event = emu.create_message_event(user_id, "はい");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("street");
                    let event = emu.create_message_event(user_id, "1-1");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("date");
                    let event = emu.create_postback_event(user_id, {
                        params: {
                            date: "2018-12-31"
                        }
                    });
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("payment");
                    let event = emu.create_message_event(user_id, "LINE Pay");
                    return emu.send(event);
                }).then(function(context){
                    should.not.exist(context);
                });
            });
        });
    });
}
