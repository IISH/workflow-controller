/**
 * history
 *
 * Description
 * history CRUD
 *
 * @type {route}
 */

const express = require('express');
const router = express.Router({});
const nconf = require('nconf');
const Workflow = require('../model/workflow');

router.get('/', function (req, res, next) {
    let form_workflow_item = req.query.form_workflow_item;
    let form_history_status = req.query.form_history_status;
    let form_history_name = req.query.form_history_name;
    let d = {
        title: 'history', theme: nconf.get('web').theme,
        user: req.user.fullname,
        form_workflow_list: [''].concat(Object.keys(nconf.get('workflows'))),
        history_status: [''].concat(['Error', 'Waiting', 'Running', 'Complete']),
        form_history_status: form_history_status,
        form_history_name: form_history_name,
        form_history_item: form_history_item
    };
    res.render('history', d);
});

router.post('/history_inc', function (req, res, next) {
    let limit = req.params.limit || 1000;
    let form_history_item = req.query.form_history_item;
    let form_history_name = req.query.form_history_name;
    let form_history_status = req.query.form_history_status;
    let sort = req.query.sort || 'accession';
    let query = (form_history_name) ? {archive: form_history_name} : {};
    if (form_history_item) {
        query['name'] = form_history_item
    }

    switch (form_history_status) {
        case 'Error':
            query['status'] = -1;
            break;
        case 'Waiting':
            query['status'] = 0;
            break;
        case 'Running':
            query['status'] = 1;
            break;
        case 'Complete':
            query['status'] = 2;
            break;
        default:
            break;
    }

    Workflow.find(query, function (err, workflows) {
        if (err) return next(err);
        res.render('history_inc', {
            workflows: workflows,
            status: {'-1': '✘', 0: '?', 1: '✔'},
            form_history_status: form_history_status,
            iiif_url: nconf.get('web').iiif_url,
            handle_url: nconf.get('web').handle_url
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

router.get('/delete/:identifier', function (req, res, next) {
    let workflow = req.workflow;
    workflow.delete();
    let form_history_name = req.query.form_history_name;
    res.redirect('/history?form_history_name=' + form_history_name);
});


module.exports = router;
