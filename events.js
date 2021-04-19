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
const fs = require('fs');
const path = require('path');
const request = require('request');
const url = nconf.get('web').endpoint + '/workflow';
const extension = ['.txt', '.csv'];
const systemfile = ['new folder', 'tmp', 'temp'];

const workflows = nconf.get('workflows');
for (let workflow in workflows) {
    if (workflows.hasOwnProperty(workflow)) {
        let flow = workflows[workflow];
        if (flow.enable === true) {
            let hotfolders = flow.events;
            console.log("Candidate workflow '" + workflow + "' in hotfolders: " + hotfolders);
            for (let _hotfolder in hotfolders) {
                if (hotfolders.hasOwnProperty(_hotfolder)) {
                    let hotfolder = hotfolders[_hotfolder];
                    if (fs.existsSync(hotfolder)) {
                        console.log("Monitoring '" + workflow);
                        setInterval(function () {
                            // Iterate though each folder and file

                            fs.readdirSync(hotfolder).forEach(filename => {
                                if (filename[0] === '.' || systemfile.includes(filename.toLowerCase())) {
                                    console.log("Ignore system file " + filename)
                                } else {
                                    let fullpath = hotfolder + '/' + filename;
                                    console.log("Detect " + fullpath)
                                    if (fs.lstatSync(fullpath).isDirectory()) {
                                        sent(workflow, fullpath);
                                    } else if (fs.lstatSync(fullpath).isFile()) {
                                        let extname = path.extname(filename).toLowerCase();
                                        if (extension.includes(extname)) {
                                            fs.readFileSync(fullpath, "utf8").split("\n")
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
                                            console.log('Removing the file: ' + fullpath);
                                            fs.unlink(fullpath, function (err) {
                                                if (err) {
                                                    console.log(err);
                                                }
                                            });
                                        }
                                    } else {
                                        console.log("Unknown file type " + fullpath);
                                    }
                                }
                            })
                        }, 3000);
                    } else {
                        console.log("This hotfolder " + hotfolder + " does not exist and will be ignored. To enable, create the folder and restart this application");
                    }
                }
            }
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
    let _url = url + '/heartbeat';
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
};

setInterval(stale, heartbeat);