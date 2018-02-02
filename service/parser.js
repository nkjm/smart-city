"use strict";

const debug = require('debug')('bot-express:service');
const mecab = require("mecabaas-client");
const zip_code = require("../service/zip-code");
const nlu = require("../service/dialogflow");
const uuid = require("uuid/v4");
Promise = require('bluebird');

module.exports = class ServiceParser {
    static name(value, resolve, reject){
        return mecab.parse(value).then(
            (response) => {
                let name = {};
                for (let elem of response){
                    if (elem[3] == "人名" && elem[4] == "姓"){
                        name.lastname = elem[0];
                    } else if (elem[3] == "人名" && elem[4] == "名"){
                        name.firstname = elem[0];
                    }
                }
                return resolve(name);
            },
            (response) => {
                return reject(response);
            }
        );
    }

    static zip_code(value, resolve, reject){
        return zip_code.search(value).then(
            (response) => {
                // In case we could not find the address.
                if (response === null){
                    return resolve({
                        zip_code: value,
                        resolved_address: null
                    });
                }

                // In case we could find the address.
                let address = response.address1 + response.address2 + response.address3;
                return resolve({
                    zip_code: value,
                    resolved_address: address
                });
            },
            (response) => {
                return reject(response);
            }
        );
    }

    /*
    static by_list(value, acceptable_values, resolve, reject){
        if (acceptable_values.includes(value)){
            return resolve(value);
        }
        return reject();
    }
    */

    static by_list(lang, value, acceptable_values, resolve, reject){
        debug("Going to understand value by NLU.");
        debug(`lang is ${lang}`);
        debug(`value is ${value}`);
        const session_id = uuid();
        return nlu.query(lang, session_id, value).then((response) => {
            if (response.result.action === "parser"){
                debug("Entity found.")
                if (response.result.parameters && response.result.parameters[Object.keys(response.result.parameters)[0]]){
                    if (acceptable_values.includes(response.result.parameters[Object.keys(response.result.parameters)[0]])){
                        debug("Recognized and accepted the value.");
                        return resolve(response.result.parameters[Object.keys(response.result.parameters)[0]]);
                    }
                }
            }
            return reject();
        })
    }

    static garbage(value, resolve, reject){
        return mecab.parse(value).then(
            (response) => {
                let garbages = [];
                for (let elem of response){
                    if (elem[1] == "名詞"){
                        garbages.push(elem[0]);
                    }
                }
                if (garbages.length == 0){
                    return reject();
                }
                return resolve(garbages);
            },
            (response) => {
                return reject(response);
            }
        );
    }
}
