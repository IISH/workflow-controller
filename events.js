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
//const {exec} = require("child_process");
//const child_process = require("child_process");
const url = nconf.get('web').endpoint + '/workflow';
const extension = ['.txt', '.csv'];
const systemfile = ['new folder', 'tmp', 'temp', 'work'];
const Workflow2 = require('./model/workflow');

const workflows = nconf.get('workflows');

const timeoutReloadHotfolder = 10*60*1000;
let heartbeatReloadHotfolder = nconf.get('web').heartbeatReloadHotfolder || timeoutReloadHotfolder;
console.info('HeartbeatReloadHotfolder interval is ' + heartbeatReloadHotfolder);
const reloadHotfolder = function () {
//    const workflows = nconf.get('workflows');
    for (let workflow in workflows) {
        if (workflows.hasOwnProperty(workflow)) {
            let flow = workflows[workflow];
            if (flow.enable === true) {
                let hotfolders = flow.events;
                console.log("Watching fs events for workflow:" + workflow + " in hotfolders: " + hotfolders);

                console.log('RELOAD hotfolder ZZZZZ' + Date.now())
                const fs = require('fs');
                fs.readdir(hotfolders[0], (err, files) => {
                    if (err) {
                        console.log(err);
                    } else {
                        files.forEach(file => {
                            if ( fs.lstatSync( hotfolders[0]+'/'+file ).isDirectory() ) {
                                addDir(workflow, hotfolders[0]+'/'+file);
                            } else {
                                addFile(workflow, hotfolders[0]+'/'+file, false);
                            }
                        })
                    }
                })

            } else {
                console.log('Ignoring disabled workflow ' + workflow);
            }
        }
    }
};
// run at startup
//reloadHotfolder()
// set reload interval
setInterval(reloadHotfolder, heartbeatReloadHotfolder);

//const workflows = nconf.get('workflows');
for (let workflow in workflows) {
    if (workflows.hasOwnProperty(workflow)) {
        let flow = workflows[workflow];
        if (flow.enable === true) {
            let hotfolders = flow.events;
            console.log("Watching fs events for workflow:" + workflow + " in hotfolders: " + hotfolders);

            let fsWatcher = chokidar.watch(hotfolders, {
                depth: 0,
                ignored: /(^|[\/\\])\../,
                ignoreInitial: true,
                interval: 3000,
                usePolling: true,
            });

            fsWatcher
                .on('unlinkDir', (fileset) => {
                    remove(fileset);
                })
                .on('addDir', (fileset) => {
                    addDir(workflow, fileset);
                })
                .on('add', (filename) => {
                    addFile(workflow, filename, true);
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
                console.log('ERROR ERROR')
                console.error('Error with post to ' + url);
                console.error(error);
            }
        });
}

function remove(fileset) {
    console.log('DIRECTORY REMOVED: ' + fileset);
    console.log("workflow removal not implemented: " + fileset);
}

function addDir(workflow, fileset) {
    let accession = path.basename(fileset);
    if (!systemfile.includes(accession.toLowerCase())) {
        Workflow2.findOne({'fileset': fileset}, function (err, resWorkflow) {
            if (err) {
                console.log ('MONGODB fileset: ' + fileset + ' ERROR: ' + err)
            } else if (!resWorkflow) {
                console.log('MONGODB RECORD NOT FOUND ' + fileset)
//                addDir(workflow, hotfolders[0]+'/'+file);
                console.log('DIRECTORY ADDED: ' + fileset);
                sent(workflow, fileset);
            } else {
                console.log('SKIPPING MONGODB ' + fileset);
            }
        });


    }
}

function addFile(workflow, filename, triggeredByFsWatcher) {
    console.log('ADDFILE: ' + filename)

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
                        console.log('DIT TRIGGERT GEEN FSWATCHER ALS FILE AANGEMAAKT IS WANNEER SERVICE DOWN WAS !!!')

                        // vreemd probleem
                        // indien proces draait en je maakt een lijst met records dan worden directories meteen aangemaakt
                        // dat ziet fswatcher en er worden meteen records aangemaakt in mongodb
                        // maar als je een lijst aanmaakt terwijl de service offline is, en daarna de service weer opstart
                        // de service ziet wel een lijst, maakt nieuwe directories aan
                        // maar de nieuwe directories triggeren geen fswatcher event (addDir)
                        // oplossing: indien gevonden bij service start doe dan 'handmatig' de addDir (omdat fsWatcher het event niet ziet)
                        if ( !triggeredByFsWatcher ) {
                            console.log('START HIER ADD DIR: ' + fileset)
                            addDir(workflow, fileset);
                        }
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
}

// Database check to recover from stale, failed or lost messages.
const timeout = 10*1000;
let heartbeat = nconf.get('web').heartbeat || timeout;
console.info('Heartbeat interval is ' + heartbeat);
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
