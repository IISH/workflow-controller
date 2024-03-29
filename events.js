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

const nconf = require('nconf');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const request = require('request');
const url = nconf.get('web').endpoint + '/workflow';
const extension = ['.txt', '.csv'];
const systemfile = ['new folder', 'tmp', 'temp', 'work'];
const Workflow = require('./model/workflow');
const TEN_MINUTES = 10 * 1000 * 60 ;

const workflows = nconf.get('workflows');

const ONE_MINUTE = 10 * 60 * 1000;
let heartbeatReloadHotfolder = nconf.get('web').heartbeatReloadHotfolder || ONE_MINUTE;
console.info('HeartbeatReloadHotfolder interval is ' + heartbeatReloadHotfolder);
const reloadHotfolder = function () {
    for (let workflow in workflows) {
        if (workflows.hasOwnProperty(workflow)) {
            let flow = workflows[workflow];
            if (flow.enable === true) {
                let hotfolders = flow.events.map(f => path.resolve(f)); // naar absoluut pad.
                console.log("Watching fs events for workflow:" + workflow + " in hotfolders: " + hotfolders);

                console.log('RELOAD hotfolder ' + new Date());
                for (let _hotfolder in hotfolders) {
                    if (hotfolders.hasOwnProperty(_hotfolder)) {
                        let hotfolder = hotfolders[_hotfolder];
                        fs.readdir(hotfolder, (err, files) => {
                            if (err) {
                                console.log(err);
                            } else {
                                files.forEach(file => {
                                    if (!systemfile.includes(file.toLowerCase())) {
                                        if (file.charAt(0) !== '.') {
                                            if (fs.lstatSync(hotfolder + '/' + file).isDirectory()) {
                                                addDir(workflow, hotfolder + '/' + file);
                                            } else {
                                                addFile(workflow, hotfolder + '/' + file, false);
                                            }
                                        }
                                    }
                                })
                            }
                        })
                    }
                }
            } else {
                console.log('Ignoring disabled workflow ' + workflow);
            }
        }
    }
};

//const workflows = nconf.get('workflows');
for (let workflow in workflows) {
    if (workflows.hasOwnProperty(workflow)) {
        let flow = workflows[workflow];
        if (flow.enable === true) {
            let hotfolders = flow.events.map(f => path.resolve(f)); // naar absoluut pad.
            console.log("Watching fs events for workflow:" + workflow + " in hotfolders: " + hotfolders);

            let fsWatcher = chokidar.watch(hotfolders, {
                depth: 0,
                ignored: /(^|[\/\\])\../,
                ignoreInitial: true,
                interval: 3000,
                usePolling: true
            });

            fsWatcher
                .on('unlinkDir', (fileset) => {
                    remove(fileset);
                })
                .on('addDir', (fileset) => {
                    addDir(workflow, fileset, true);
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
    fs.stat(fileset, function (e, stats) {
        let uid = 0;
        if (e) {
            console.error(e);
        } else {
            uid = stats.uid;
        }
        request.post(
            url,
            {json: {name: workflow, fileset: fileset, uid: uid}},
            function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    console.log(body)
                } else {
                    console.error('Error with post to ' + url);
                    console.error(error);
                }
            });
    });
}

function remove(fileset) {
    console.log("workflow removal not implemented: " + fileset);
}

function addDir(workflow, fileset, hot) {
    let b = (typeof hot !== 'undefined') ? hot : false;
    let accession = path.basename(fileset);
    if (!systemfile.includes(accession.toLowerCase())) {
        if (b) {
            sent(workflow, fileset)
        } else {
            let cooldown_period = new Date(new Date().getTime() - TEN_MINUTES);
            // Workflow.findOne({'fileset': fileset, end: {$gt: cooldown_period}}, function (err, resWorkflow) {
            Workflow.findOne({'fileset': fileset}, function (err, resWorkflow) {
                if (err) {
                    console.error('MONGODB fileset: ' + fileset + ' ERROR: ' + err)
                } else if (resWorkflow) {
                    console.log('Ignore existing database document ' + fileset)
                } else {
                    console.log('MONGODB RECORD NOT FOUND ' + fileset)
                    console.log('DIRECTORY ADDED: ' + fileset);
                    sent(workflow, fileset);
                }
            });
        }
    }
}

function addFile(workflow, filename, triggeredByFsWatcher) {
    console.log('ADDFILE: ' + filename)

    fs.stat(filename, function (e, stats) {
        let uid = 0;

        if (e) {
            console.error(e);
        } else {
            uid = stats.uid;
        }

        let extname = path.extname(filename).toLowerCase();
        if (extension.includes(extname)) {
            let hotfolder = path.dirname(filename);
            fs.readFileSync(filename, "utf8").split("\n")
                .map(element => element.trim())
                .filter(function (element, index, array) {
                    return element.length !== 0 && array.indexOf(element) === index;
                })
                .forEach(function (identifier) {
                        if (identifier.charAt(0) !== '.') {
                            let fileset = hotfolder + '/' + identifier;
                            try {
                                //
                                fs.mkdirSync(fileset, {recursive: false});
                                fs.chown(fileset, uid, uid, (error) => {
                                    if (error)
                                        console.log("Error setting file: " + fileset + " - uid: " + uid + " - error: ", error);
                                });

                                console.log('Fileset added: ' + fileset);
                                console.log('DIT TRIGGERT GEEN FSWATCHER ALS FILE AANGEMAAKT IS WANNEER SERVICE DOWN WAS !!!')

                                // vreemd probleem
                                // indien proces draait en je maakt een lijst met records dan worden directories meteen aangemaakt
                                // dat ziet fswatcher en er worden meteen records aangemaakt in mongodb
                                // maar als je een lijst aanmaakt terwijl de service offline is, en daarna de service weer opstart
                                // de service ziet wel een lijst, maakt nieuwe directories aan
                                // maar de nieuwe directories triggeren geen fswatcher event (addDir)
                                // oplossing: indien gevonden bij service start doe dan 'handmatig' de addDir (omdat fsWatcher het event niet ziet)
                                if (!triggeredByFsWatcher) {
                                    console.log('START HIER ADD DIR: ' + fileset)
                                    addDir(workflow, fileset);
                                }
                            } catch (err) {
                                console.warn(err);
                            }
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
}

// Database check to recover from stale, failed or lost messages.
const timeout = 10000;
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

// run at startup
reloadHotfolder()
// set reload interval
setInterval(reloadHotfolder, heartbeatReloadHotfolder);