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

    describe("Test juminhyo skill from " + emu.messenger_type, function(){
        let user_id = "juminhyo-en";

        describe("Invalid type", function(){
            it("will ask type once again.", function(){
                this.timeout(8000);

                return emu.clear_context(user_id).then(function(){
                    let event = emu.create_postback_event(user_id, {
                        data: JSON.stringify({
                            _type: "intent",
                            intent: {
                                name: "juminhyo"
                            },
                            language: "en"
                        })
                    });
                    return emu.send(event);
                }).then(function(context){
                    context.intent.name.should.equal("juminhyo");
                    context.confirming.should.equal("type");
                    let event = emu.create_message_event(user_id, "for others");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("type");
                });
            });
        });

        describe("Incomplete name", function(){
            it("will ask name again.", function(){
                this.timeout(8000);

                return emu.clear_context(user_id).then(function(){
                    let event = emu.create_postback_event(user_id, {
                        data: JSON.stringify({
                            _type: "intent",
                            intent: {
                                name: "juminhyo"
                            },
                            language: "en"
                        })
                    });
                    return emu.send(event);
                }).then(function(context){
                    context.intent.name.should.equal("juminhyo");
                    context.confirming.should.equal("type");
                    let event = emu.create_message_event(user_id, "all households");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("name");
                    let event = emu.create_message_event(user_id, "kazuki");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("name");
                });
            });
        });

        describe("Name is incorrect", function(){
            it("will ask lastname and first name.", function(){
                this.timeout(8000);

                return emu.clear_context(user_id).then(function(){
                    let event = emu.create_postback_event(user_id, {
                        data: JSON.stringify({
                            _type: "intent",
                            intent: {
                                name: "juminhyo"
                            },
                            language: "en"
                        })
                    });
                    return emu.send(event);
                }).then(function(context){
                    context.intent.name.should.equal("juminhyo");
                    context.confirming.should.equal("type");
                    let event = emu.create_message_event(user_id, "all households");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("name");
                    let event = emu.create_message_event(user_id, "kazuki nakajima");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("is_name_correct");
                    let event = emu.create_message_event(user_id, "No");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("lastname");
                    let event = emu.create_message_event(user_id, "nakajima");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("firstname");
                    let event = emu.create_message_event(user_id, "kazuki");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("zip_code");
                });
            });
        });

        describe("City is incorrect", function(){
            it("will ask zip code once again.", function(){
                this.timeout(8000);

                return emu.clear_context(user_id).then(function(){
                    let event = emu.create_postback_event(user_id, {
                        data: JSON.stringify({
                            _type: "intent",
                            intent: {
                                name: "juminhyo"
                            },
                            language: "en"
                        })
                    });
                    return emu.send(event);
                }).then(function(context){
                    context.intent.name.should.equal("juminhyo");
                    context.confirming.should.equal("type");
                    let event = emu.create_message_event(user_id, "all households");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("name");
                    let event = emu.create_message_event(user_id, "kazuki nakajima");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("is_name_correct");
                    let event = emu.create_message_event(user_id, "Yes");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("zip_code");
                    let event = emu.create_message_event(user_id, "107-0062");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("is_city_correct");
                    let event = emu.create_message_event(user_id, "No");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("zip_code");
                });
            });
        });

        describe("Perfect reply and user selects LINE Pay", function(){
            it("will reserve payment and provide payment url.", function(){
                this.timeout(8000);

                return emu.clear_context(user_id).then(function(){
                    let event = emu.create_postback_event(user_id, {
                        data: JSON.stringify({
                            _type: "intent",
                            intent: {
                                name: "juminhyo"
                            },
                            language: "en"
                        })
                    });
                    return emu.send(event);
                }).then(function(context){
                    context.intent.name.should.equal("juminhyo");
                    context.confirming.should.equal("type");
                    let event = emu.create_message_event(user_id, "all households");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("name");
                    let event = emu.create_message_event(user_id, "kazuki nakajima");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("is_name_correct");
                    let event = emu.create_message_event(user_id, "Yes");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("zip_code");
                    let event = emu.create_message_event(user_id, "107-0062");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("is_city_correct");
                    let event = emu.create_message_event(user_id, "Yes");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("street");
                    let event = emu.create_message_event(user_id, "1-1");
                    return emu.send(event);
                }).then(function(context){
                    context.confirming.should.equal("social_id");
                    let event = emu.create_message_event(user_id, {
                        id: "dummy",
                        type: "image"
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
