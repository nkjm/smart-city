"use strict";

const debug = require('debug')('bot-express:skill');
const line_event = require("../service/line-event");
const parse = require("../service/parser");
Promise = require('bluebird');

module.exports = class SkillJuminhyo {

    constructor(){
        this.required_parameter = {
            type: {
                message_to_confirm: {
                    type: "template",
                    altText: "住民票ですね。今回必要なのは世帯全員分ですか？あるいはご本人だけ？",
                    template: {
                        type: "buttons",
                        text: "住民票ですね。今回必要なのは世帯全員分ですか？あるいはご本人だけ？",
                        actions: [
                            {type:"message", label:"世帯全員分", text:"世帯全員分"},
                            {type:"message", label:"本人だけ", text:"本人だけ"}
                        ]
                    }
                },
                parser: (value, bot, event, context, resolve, reject) => {
                    parse.by_list(context.sender_language, "type", value, ["世帯全員分", "本人だけ"], resolve, reject);
                },
                reaction: (error, value, bot, event, context, resolve, reject) => {
                    if (error){
                        return resolve();
                    }

                    bot.queue({text: `${value}ですね。OKです。`});
                    return resolve();
                }
            },
            name: {
                message_to_confirm: {
                    type: "text",
                    text: "次にご本人のことを少々。お名前教えてもらえますか？"
                },
                parser: (value, bot, event, context, resolve, reject) => {
                    parse.name(value, resolve, reject);
                },
                reaction: (error, value, bot, event, context, resolve, reject) => {
                    if (error) return resolve();

                    if (value && value.lastname && value.firstname){
                        // We got Lastname & Firstname so going to check with user if this is correct.
                        bot.collect("is_name_correct");
                    } else {
                        // We got limited information about Name so going to ask for the user.
                        bot.queue({
                            type: "text",
                            text: `すいません、私不勉強なものでどれが姓でどれが名かわかりませんでした。ご面倒ですがそれぞれ順に教えていただきたく。`
                        });
                        bot.collect("lastname");
                    }
                    return resolve();
                }
            },
            zip_code: {
                message_to_confirm: {
                    type: "text",
                    text: "郵便番号を教えていただけますか？"
                },
                parser: (value, bot, event, context, resolve, reject) => {
                    parse.zip_code(value, resolve, reject);
                },
                reaction: (error, value, bot, event, context, resolve, reject) => {
                    if (error) return resolve();

                    if (!value.resolved_address){
                        // While provided zip code seems correct, we could not find the address.
                        bot.queue({
                            type: "text",
                            text: "すみません、郵便番号に該当する住所が見つかりませんでした。"
                        });
                        bot.collect("address");
                        return resolve();
                    }

                    // It seems we could find the corresponding address.
                    // Set resolved address as city.
                    context.confirmed.city = context.confirmed.zip_code.resolved_address;
                    bot.collect("is_city_correct");
                    return resolve();
                }
            },
            social_id: {
                message_to_confirm: {
                    type: "text",
                    text: "ご本人確認のため、身分証をカメラで撮って送ってもらえますか？"
                },
                parser: (value, bot, event, context, resolve, reject) => {
                    if (!value || typeof value === "string"){
                        return reject();
                    }
                    if (value.type === "image"){
                        return resolve(value);
                    }
                    return reject();
                },
                reaction: (error, value, bot, event, context, resolve, reject) => {
                    if (error){
                        bot.change_message_to_confirm("social_id", {
                            type: "text",
                            text: "写真を送ってもらってますか？身分証を写真で送ってくださいね。"
                        });
                    }
                    return resolve();
                }
            },
            payment: {
                message_to_confirm: {
                    type: "template",
                    altText: "手数料は300円になります。お支払い方法を選択してください。",
                    template: {
                        type: "confirm",
                        text: "手数料は300円になります。お支払い方法を選択してください。",
                        actions: [
                            {type: "message", label: "LINE Pay", text: "LINE Pay"},
                            {type: "message", label: "代引き", text: "代引き"}
                        ]
                    }
                },
                parser: (value, bot, event, context, resolve, reject) => {
                    parse.by_list(context.sender_language, "payment", value, ["LINE Pay", "代引き"], resolve, reject);
                }
            }
        }

        this.optional_parameter = {
            is_name_correct: {
                message_to_confirm: (bot, event, context, resolve, reject) => {
                    return resolve({
                        type: "template",
                        altText: `一応ご確認を。${context.confirmed.name.lastname} ${context.confirmed.name.firstname}さんでよかったでしょうか？`,
                        template: {
                            type: "confirm",
                            text: `一応ご確認を。${context.confirmed.name.lastname} ${context.confirmed.name.firstname}さんでよかったでしょうか？`,
                            actions: [
                                {type: "message", label: "はい", text: "はい"},
                                {type: "message", label: "いいえ", text: "いいえ"}
                            ]
                        }
                    });
                },
                parser: (value, bot, event, context, resolve, reject) => {
                    parse.by_list(context.sender_language, "yes_no", value, ["はい", "いいえ"], resolve, reject);
                },
                reaction: (error, value, bot, event, context, resolve, reject) => {
                    if (error) return resolve();

                    if (value == "はい"){
                        bot.queue({
                            type: "text",
                            text: "ハイカラなお名前じゃないですか〜。いいですね。"
                        });
                    } else {
                        bot.queue({
                            type: "text",
                            text: "大変失礼しました。ご面倒ですが姓と名を順に教えていただきたく。"
                        });
                        bot.collect("lastname");
                    }
                    return resolve();
                }
            },
            lastname: {
                message_to_confirm: {
                    type: "text",
                    text: "氏名（姓）を教えてもらえますか？"
                },
                reaction: (error, value, bot, event, context, resolve, reject) => {
                    if (error) return resolve();

                    bot.collect("firstname");
                    return resolve();
                }
            },
            firstname: {
                message_to_confirm: {
                    type: "text",
                    text: "氏名（名）を教えてもらえますか？"
                },
                reaction: (error, value, bot, event, context, resolve, reject) => {
                    if (error) return resolve();

                    bot.queue({
                        type: "text",
                        text: `${context.confirmed.lastname} ${value}さん、なかなかナウい名前ですね。`
                    });
                    return resolve();
                }
            },
            is_city_correct: {
                message_to_confirm: (bot, event, context, resolve, reject) => {
                    return resolve({
                        type: "template",
                        altText: `住所は「${context.confirmed.zip_code.resolved_address}」で間違いないですか？（はい・いいえ）`,
                        template: {
                            type: "confirm",
                            text: `住所は「${context.confirmed.zip_code.resolved_address}」で間違いないですか？`,
                            actions: [
                                {type:"message", label:"はい", text:"はい"},
                                {type:"message", label:"いいえ", text:"いいえ"}
                            ]
                        }
                    });
                },
                parser: (value, bot, event, context, resolve, reject) => {
                    parse.by_list(context.sender_language, "yes_no", value, ["はい", "いいえ"], resolve, reject);
                },
                reaction: (error, value, bot, event, context, resolve, reject) => {
                    if (error) return resolve();

                    if (value == "はい"){
                        // Going to collect remaining street address.
                        bot.collect("street");
                    } else if (value == "いいえ"){
                        bot.collect({
                            zip_code: {
                                message_to_confirm: {
                                    type: "text",
                                    text: "なんと。もう一度郵便番号うかがってもいいですか？"
                                }
                            }
                        });
                    }
                    return resolve();
                }
            },
            street: {
                message_to_confirm: {
                    type: "text",
                    text: "OK. では残りの番地を教えていただけますか？"
                }
            },
            address: {
                message_to_confirm: {
                    type: "text",
                    text: "ご住所を教えていただけますか？"
                }
            }
        }

        this.clear_context_on_finish = true;
    }

    finish(bot, event, context, resolve, reject){
        let address = context.confirmed.address || context.confirmed.city + context.confirmed.street;
        let name;
        if (context.confirmed.is_name_correct === "はい"){
            name = context.confirmed.name.lastname + " " + context.confirmed.name.firstname;
        } else {
            name = context.confirmed.lastname + " " + context.confirmed.firstname;
        }

        if (context.confirmed.payment === "代引き"){
            return bot.reply({
                type: "text",
                text: `${name}さん、了解です。${address}が身分証のご住所と一致しているか担当者がチェックし、問題なければご住所に住民票をお届けしますね。`
            }).then((response) => {
                return resolve();
            })
        }

        // Payment should be LINE Pay
        return line_event.fire({
            type: "bot-express:push",
            to: {
                type: "user",
                userId: bot.extract_sender_id()
            },
            intent: {
                name: "pay",
                parameters: {
                    productName: "住民票",
                    amount: 300,
                    currency: "JPY",
                    orderId: `${bot.extract_sender_id()}-${Date.now()}`,
                    message_text: `了解です。決済完了後に住民票をご自宅に発送します。下記のボタンから決済にお進みください。`
                }
            },
            language: "en"
        }).then((response) => {
            return resolve();
        });
    }
};
