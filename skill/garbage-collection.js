'use strict';

const debug = require('debug')('bot-express:skill');
const line_event = require("../service/line-event");
const parse = require("../service/parser");
Promise = require('bluebird');

module.exports = class SkillGarbageCollection {

    constructor(){
        this.required_parameter = {
            garbage: {
                message_to_confirm: {
                    type: "text",
                    text: "大型ごみですね。まず出されるものを教えてもらえますか？"
                },
                parser: (value, bot, event, context, resolve, reject) => {
                    parse.garbage(value, resolve, reject);
                },
                reaction: (error, value, bot, event, context, resolve, reject) => {
                    if (error) return resolve();

                    if (value.length === 1){
                        bot.queue({
                            type: "text",
                            text: `${value[0]}ですね、了解です。`
                        });
                        return resolve();
                    }

                    // There are more than 1 garbage candidates.
                    let actions = [];
                    for (let garbage of value){
                        actions.push({type: "message", label: garbage, text: garbage});
                        if (actions.length == 4){
                            break;
                        }
                    }
                    bot.collect({
                        garbage: {
                            message_to_confirm: {
                                type: "template",
                                altText: "すみません、出される大型ゴミはどれですか？",
                                template: {
                                    type: "buttons",
                                    text: "すみません、出される大型ゴミはどれですか？",
                                    actions: actions
                                }
                            }
                        }
                    });
                    return resolve();
                }
            },
            quantity: {
                message_to_confirm: {
                    type: "template",
                    altText: "ちなみに数量は？",
                    template: {
                        type: "buttons",
                        text: "ちなみに数量は？",
                        actions: [
                            {type: "message", label: "1", text: "1"},
                            {type: "message", label: "2", text: "2"},
                            {type: "message", label: "3", text: "3"}
                        ]
                    }
                },
                parser: (value, bot, event, context, resolve, reject) => {
                    parse.by_list(value, ["1", "2", "3"], resolve, reject);
                },
                reaction: (error, value, bot, event, context, resolve, reject) => {
                    if (error) return resolve();

                    bot.queue({
                        type: "text",
                        text: `${value}個ですね。１個につき600円の処理料になりますので合計${600 * Number(value)}円になります。`
                    });
                    return resolve();
                }
            },
            name: {
                message_to_confirm: {
                    type: "text",
                    text: "お名前教えてもらえますか？"
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
                    text: "次にご住所ですが、郵便番号を教えていただけますか？"
                },
                parser: (value, bot, event, context, resolve, reject) => {
                    parse.zip_code(value, resolve, reject);
                },
                reaction: (error, value, bot, event, context, resolve, reject) => {
                    if (error){
                        if (error.message == "zip code format is incorrect."){
                            // Provide zip code is incorrect.
                            bot.change_message_to_confirm("zip_code", {
                                type: "text",
                                text: "なんだか郵便番号が正しくないような気がします。もう一度教えていただいてもいいですか？"
                            });
                            return resolve();
                        } else {
                            // While provided zip code is correct, zip code search is not working.
                            bot.queue({
                                type: "text",
                                text: "すみません、郵便番号検索が不調のようで該当する住所を探せませんでした。"
                            });
                            bot.collect("address");
                            return resolve();
                        }
                    }

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
            date: {
                message_to_confirm: {
                    type: "template",
                    altText: "収集希望日はいつですか？",
                    template: {
                        type: "buttons",
                        text: "収集希望日はいつですか？",
                        actions: [
                            {type: "datetimepicker", label:"日にちを選択", mode:"date", data:"date"}
                        ]
                    }
                },
                parser: (value, bot, event, context, resolve, reject) => {
                    if (typeof value == "string") return resolve(value);

                    // In case of LINE postback.
                    if (value.params && value.params.date) return resolve(value.params.date);

                    return reject();
                }
            },
            payment: {
                message_to_confirm: {
                    type: "template",
                    altText: `費用のお支払い方法を選択してください。`,
                    template: {
                        type: "buttons",
                        text: `費用のお支払い方法を選択してください。`,
                        actions: [
                            {type: "message", label: "LINE Pay", text: "LINE Pay"},
                            {type: "message", label: "コンビニ", text: "コンビニ"}
                        ]
                    }
                },
                parser: (value, bot, event, context, resolve, reject) => {
                    parse.by_list(value, ["LINE Pay", "コンビニ"], resolve, reject);
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
                    parse.by_list(value, ["はい", "いいえ"], resolve, reject);
                },
                reaction: (error, value, bot, event, context, resolve, reject) => {
                    if (error) return resolve();

                    if (value == "はい"){
                        bot.queue({
                            type: "text",
                            text: "グッとくるお名前じゃないですか〜。親御さんはセンスありますね！"
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
                    parse.by_list(value, ["はい", "いいえ"], resolve, reject);
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

        if (context.confirmed.payment === "コンビニ"){
            return bot.reply({
                type: "text",
                text: `${name}さん、大型ゴミの収集を承りました。${context.confirmed.date}に収集にうかがいますので、あらかじめコンビニで${Number(context.confirmed.quantitiy) * 600}円分のゴミ処理シールを購入いただき、当日の朝、シールを貼ってゴミを出しておいてください。`
            }).then((response) => {
                return resolve();
            })
        }

        // Payment should be LINE Pay
        return bot.reply({
            type: "text",
            text: `${name}さん、大型ゴミの収集を承りました。`
        }).then((response) => {
            return line_event.fire({
                type: "bot-express:push",
                to: {
                    type: "user",
                    userId: bot.extract_sender_id()
                },
                intent: {
                    name: "pay",
                    parameters: {
                        productName: "大型ゴミ処理",
                        amount: 600 * Number(context.confirmed.quantity),
                        currency: "JPY",
                        orderId: `${bot.extract_sender_id()}-${Date.now()}`,
                        message_text: `下記のボタンから処理費用の決済にお進みください。`
                    }
                },
                language: context.sender_language
            });
        }).then((response) => {
            return resolve();
        });
    }
};
