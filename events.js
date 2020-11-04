/**
 * events.js
 *
 * Initiate events whenever:
 * 1. folders are added to a hotfolder.
 * The hotfolders are a comma separated list: HOTFOLDER=folder1, folder[n]
 *
 * 2. Or a crontab starts
 *
 * An event like this kickstarts a workflow:
 */

'use strict';

// const cron = require('node-cron');
const nconf = require('nconf');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const request = require('request');
const url = nconf.get('web').endpoint + '/workflow';
const extension = ['.txt', '.csv'];

const workflows = nconf.get('workflows');
for (let workflow in workflows) {
    if (workflows.hasOwnProperty(workflow)) {
        let flow = workflows[workflow];
        if (flow.enabled === true) {
            let hotfolders = flow.events;
            console.log("Watching fs events for workflow:" + workflow + " in hotfolders: " + hotfolders);
            let fsWatcher = chokidar.watch(hotfolders, {
                depth: 0,
                ignored: /(^|[\/\\])\../,
                ignoreInitial: true,
                interval: 3000,
                usePolling: true
            });
            fsWatcher
                .on('addDir', (fileset) => {
                    sent(workflow, fileset);
                })
                .on('add', (filename) => {
                    let extname = path.extname(filename).toLowerCase();
                    if (extension.includes(extname)) {
                        let hotfolder = path.dirname(filename);
                        fs.readFileSync(filename, "utf8").split("\n")
                            .map(element => element.trim())
                            .filter(function (element, index, array) {
                                return element.length !== 0 && array.indexOf(element) === index;
                            })
                            .forEach(function (identifier) {
                                    let fileset = hotfolder + '/' + identifier;
                                    try {
                                        fs.mkdirSync(fileset, {recursive: false});
                                        console.log('Fileset added: ' + fileset);
                                    } catch (err) {
                                        console.warn(err);
                                    }
                                }
                            );
                        fs.unlink(filename, function (err) {
                            if (err) {
                                console.log(err);
                            }
                            console.log('File removed: ' + filename);
                        });
                    }
                });
        } else {
            console.log('Ignoring disabled workflow ' + workflow);
        }
    }
}

function sent(workflow, fileset) {
    request.post(
        url,
        {json: {name: workflow, fileset: fileset}},
        function (error, response, body) {
            if (!error && response.statusCode === 200) {
                console.log(body)
            } else {
                console.error('Error with post to ' + url);
                console.error(error);
            }
        });
}


// Database check to recover from stale, failed or lost messages.
const timeout = 10000;
let heartbeat = nconf.get('web').heartbeat || timeout;
console.info('Heartbeat ' + heartbeat);
const stale = function () {
    for (let workflow in workflows) {
        if (workflows.hasOwnProperty(workflow)) {
            let flow = workflows[workflow];
            if (flow.enabled === true) {
                let hotfolders = flow.events;
                hotfolders.forEach(function (hotfolder) {
                    console.log("Status hotfolder: " + hotfolder);
                    let _url = url + '/queues/' + workflow;
                    request.put(
                        _url,
                        function (error, response, body) {
                            if (!error && response.statusCode === 200) {
                                console.log(body)
                            } else {
                                console.error('Error with put to ' + url);
                                console.error(error);
                            }
                        }
                    );
                });
            } else {
                console.log('Ignoring disabled workflow ' + workflow);
            }
        }
    }
};
//
// if (timeout !== heartbeat) {
//     setTimeout(stale, timeout);
// }
// setInterval(stale, heartbeat);
stale();