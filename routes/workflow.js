/**
 * workflow
 *
 * Description
 * Workflow CRUD
 *
 * @type {route}
 */

const express = require('express');
const router = express.Router({});
const nconf = require('nconf');
const Workflow = require('../model/workflow');
const request = require('request');
const nodemailer = require('nodemailer');
const path = require('path');

const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

const Map = require('collections/map');
const map = new Map();

router.get('/', function (req, res, next) {
    let form_workflow_identifier = req.query.form_workflow_identifier;
    let form_workflow_name = req.query.form_workflow_name;
    let form_workflow_status = req.query.form_workflow_status;
    res.render('workflow', {
        title: 'workflow',
        user: req.user.fullname,
        workflow_name: [''].concat(Object.keys(nconf.get('workflows'))),
        workflow_status: [''].concat(['Waiting', 'Running', 'Failed', 'Complete']),
        form_workflow_name: form_workflow_name,
        form_workflow_status: form_workflow_status,
        form_workflow_identifier: form_workflow_identifier
    })
});

router.get('/workflow_inc', function (req, res, next) {
    let limit = req.params.limit || 1000;
    let form_workflow_identifier = req.query.form_workflow_identifier;
    let form_workflow_name = req.query.form_workflow_name;
    let form_workflow_status = req.query.form_workflow_status;
    let sort = req.query.sort || 'date';
    let query = (form_workflow_name) ? {name: form_workflow_name} : {};
    if (form_workflow_identifier) {
        query.identifier = form_workflow_identifier;
    }
    if (form_workflow_status) {
        switch (form_workflow_status) {
            case 'Waiting':
                query['tasks.0.status'] = 200;
                break;
            case 'Running':
                query['tasks.0.status'] = 300;
                break;
            case 'Failed':
                query['tasks.0.status'] = 499;
                break;
            case 'Complete':
                query['tasks.0.status'] = 600;
                break;

            default:
                break;
        }
    }
    Workflow.find(query, function (err, workflows) {
        if (err) return next(err);
        res.render('workflow_inc', {
            workflows: workflows,
            form_workflow_name: form_workflow_name,
            form_workflow_status: form_workflow_status,
            form_workflow_identifier: form_workflow_identifier
        })
    }).sort(sort).limit(limit);
});

router.param('identifier', function (req, res, next, identifier) {
    res.setHeader('Content-Type', 'application/json');
    Workflow.findOne({$or: [{'identifier': identifier}, {'tasks.identifier': identifier}]}, function (err, workflow) {
        if (err) {
            res.status(500);
            res.end(JSON.stringify({status: 500, message: 'Failed to load fileset ' + identifier + ' ' + err}));
        } else if (workflow) {
            req.workflow = workflow;
            next()
        } else {
            res.status(404);
            res.end(JSON.stringify({status: 404, message: 'No task found with identifier ' + identifier}));
        }
    });
});

router.get('/:identifier', function (req, res) {
    res.status(200);
    res.end(JSON.stringify({status: 200, workflow: req.workflow}));
});

// A workflow consists of one or more tasks.
router.post("/", (req, res) => {

    res.setHeader('Content-Type', 'application/json');

    let fileset = req.body.fileset;
    let name = req.body.name;

    function createFlow(workflow) {
        let workflows = nconf.get('workflows');
        if (workflows.hasOwnProperty(name)) {
            const flow = workflows[name];
            let tasks = flow.tasks;
            let order = 0;
            let accession = path.basename(req.body.fileset);
            let i = accession.indexOf('.');
            let archive = (i === -1) ? accession : accession.substring(0, accession.indexOf('.'));
            workflow = Workflow({
                identifier: Workflow.identifier(),
                name: name,
                fileset: fileset,
                accession: accession,
                archive: archive,
                begin: new Date(),
                environment: flow.environment,
                delete_on_success: flow.delete_on_success || false
            });
            tasks.forEach(function (task) {
                task.order = ++order;
                workflow.tasks.push(task);
            });
            send_message(workflow);
            res.status(200);
            res.end(JSON.stringify({status: 200, message: workflow}));
        } else {
            res.status(404);
            res.end(JSON.stringify({status: 404, message: "Not found " + name}));
        }
    }

    Workflow.findOne({'fileset': fileset}, function (err, workflow) {
        if (err) {
            res.status(500);
            res.end(JSON.stringify({status: 500, message: err}));
        } else {
            if (workflow == null) { // a new flow
                createFlow();
            } else {
                if (workflow.complete || workflow.stuck) {
                    workflow.delete();
                    createFlow();
                }
                console.info("This workflow is running. Ignoring request: " + fileset);
            }
        }
    });
    res.status(200);
    res.end(JSON.stringify({status: 200}));
});

router.get('/retry/:identifier', function (req, res, next) {
    let workflow = req.workflow;
    let task = workflow.tasks.find(_task => _task.identifier === req.params.identifier);
    workflow.tasks = workflow.tasks.filter(function (_task) {
        return (_task.identifier !== task.identifier);
    });
    workflow.tasks.unshift(task);
    workflow.task.info = 'Retrying...';
    send_message(workflow);

    let form_workflow_name = parse(req.query.form_workflow_name);
    res.redirect('/workflow?form_workflow_name=' + form_workflow_name);
});

router.get('/skip/:identifier', function (req, res, next) {
    let workflow = req.workflow;
    workflow.task.status = 500;
    status(workflow);
    let form_workflow_name = parse(req.query.form_workflow_name);
    res.redirect('/workflow?form_workflow_name=' + form_workflow_name);
});

router.get('/delete/:identifier', function (req, res, next) {
    let workflow = req.workflow;
    workflow.delete();
    let form_workflow_name = parse(req.query.form_workflow_name);
    res.redirect('/workflow?form_workflow_name=' + form_workflow_name);
});

function parse(_text) {
    let text = _text || '';
    return (text === 'undefined') ? '' : text;
}

function status(workflow) {
    workflow.isNew = false;
    let now = new Date();

    let minutes_begin = Math.floor(Math.abs((now - workflow.task.begin) / ONE_MINUTE)); // The difference between now and the last call from the agent.
    let minutes_end = Math.floor(Math.abs((now - workflow.task.end) / ONE_MINUTE)); // The difference between now and the last call from the agent.

    console.log("Workflow status " + workflow.fileset + ':' + workflow.task.queue + ':' + workflow.task.status);
    switch (workflow.task.status) {
        case 100:
        case 150:
            console.log("Task start " + workflow.task.queue);
            send_message(workflow);
            break;
        case 200:
            if (minutes_begin > 6 * ONE_HOUR) {
                console.log("Queued task takes a bit longer than expected. Is the agent offline or busy? Task: " + workflow.task.queue);
                workflow.task.info = 'overdue (' + minutes_begin + 'm)';
                workflow.task.status = 250;
                save(workflow);
            }
            break;
        case 250:
            console.log("Resent message");
            send_message(workflow);
            break;
        case 300:
            if (minutes_end > ONE_HOUR) { // For one hour no response yet?
                console.log("No response from agent. Is the agent offline or busy? Task: " + workflow.task.queue);
                send_message(workflow);
            } else {
                workflow.status = 1;
                save(workflow);
            }
            break;
        case 400:
        case 450:
        case -450:
            let has_error = (workflow.task.status !== -450);
            workflow.status = -1;
            workflow.task.status = 499;
            send_mail(workflow, 'Fail', has_error);
            save(workflow);
            break;
        case 499:
            if (workflow.task.retry && minutes_end > ONE_DAY) { // For one day no response yet
                console.log("No response from agent. Is the agent offline or busy? Task: " + workflow.task.queue);
                send_message(workflow);
            }
            break;
        case 500:
            console.log("Task end " + workflow.task.queue);
            workflow.task.end = now;
            let old = workflow.tasks.shift();
            old.status = 600;
            workflow.tasks.push(old);
            status(workflow);
            break;
        case 600:
            if (workflow.complete && workflow.status !== 2) {
                console.log("Workflow end " + workflow.task.queue);
                workflow.status = 2; // this will move the document to another collection.
                send_mail(workflow, 'Success', false);
                save(workflow);
                return;
            }
            if (workflow.complete && workflow.delete_on_success) {
                workflow.delete();
            }
            break;
        default:
            console.log("Ignoring...");
    }
}

// see if we are not stale or failed. If so retry
router.put('/queues/:workflow_name', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    let filesets = []; // something to report
    let workflow_name = req.params.workflow_name;

    let query = (workflow_name) ? {'name': workflow_name} : {};
    Workflow.find(query).stream()
        .on('error', function (err) {
            res.status(500);
            res.end(JSON.stringify({status: 500, message: err}));
        })
        .on('data', function (workflow) {
            status(Workflow(workflow));
        });

    res.status(200);
    res.end(JSON.stringify({status: 200, message: filesets}));
});

router.post('/queue/:identifier', function (req, res) {
    let workflow = req.workflow;
    let task_agent = req.body;
    if (workflow.task.queue === task_agent.queue) {
        workflow.task.status = task_agent.status;
        workflow.task.end = Date(task_agent.date);
        workflow.task.info = task_agent.info;
        status(workflow);
        res.status(200);
        res.end(JSON.stringify({status: 200, message: 'OK'}));
    } else {
        res.status(404);
        res.end(JSON.stringify({status: 404, message: 'No such task for workflow ' + workflow}));
    }
});

function send_message(workflow) {
    let amq = nconf.get('amq');
    let url = amq.protocol + '://' + amq.host + ':' + amq.port + '/api/message/' + workflow.task.queue + '?type=' + workflow.task.type;
    workflow.task.identifier = Workflow.identifier();
    save(workflow);
    let form = {body: workflow.task.identifier};
    request.post({url: url, form: form},
        function (error, response, body) {
            if (!error && response.statusCode === 200) {
                console.log(body);
                workflow.task.info = 'send to queue';
                workflow.task.begin = new Date();
                workflow.task.status = 200;
            } else {
                console.error(body);
                workflow.task.info = body;
                workflow.task.status = 150;
            }
        }
    ).auth(amq.username, amq.password, false);
}

function new_message(key) {
    let now = new Date();
    let date = map.get(key);
    if (date) {
        let minutes = Math.floor(Math.abs((now - date) / ONE_MINUTE));
        if (minutes > ONE_MINUTE * 5) {
            map.delete(key);
        } else {
            return false;
        }
    }
    return !map.set(key, now);
}

function send_mail(workflow, subject, has_error) {
    const mailer = nconf.get('mailer');
    if (mailer) {
        let workflows = nconf.get('workflows');
        if (workflows.hasOwnProperty(workflow.name)) {
            let flow = workflows[workflow.name];
            let mail_archivist_on_error = flow.mail_archivist_on_error;
            let mail_archivist_on_success = flow.mail_archivist_on_success;
            let mail_support_on_success = flow.mail_support_on_success;
            let mail_support_on_error = flow.mail_support_on_error;

            let mail_to = [];
            if (!has_error && mail_archivist_on_success) {
                mail_to.push(mail_archivist_on_success);
            }
            if (!has_error && mail_support_on_success) {
                mail_to.push(mail_support_on_success);
            }
            if (has_error && mail_archivist_on_error) {
                mail_to.push(mail_archivist_on_error);
            }
            if (has_error && mail_support_on_error) {
                mail_to.push(mail_support_on_error);
            }

            if (mail_to.length === 0) {
                console.log('No one to notify');
                return;
            }

            console.log('Mail for: ' + mail_to);

            let hash = workflow.name + ':' + workflow.archive + ':' + workflow.task.queue;
            if (has_error && new_message(hash) || !has_error) {
                let body = workflow.task.info || 'There is no information about this workflow.';
                let mailOptions = {
                    from: mailer.auth.username,
                    to: mail_to,
                    subject: subject + ' ' + workflow.name + ' ' + workflow.fileset,
                    text: body,
                    html: '<p>' + body.replace("\n", "<br/>") + '</p>'
                };
                const transporter = nodemailer.createTransport(mailer);
                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                })
            }
        }
    } else {
        console.warn('No mailer installed. Cannot sent mail.')
    }
}

async function save(workflow) {
    await workflow.save();
}

module.exports = router;
