/**
 * report
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

router.get('/', function (req, res, next) {
    let form_workflow_item = req.query.form_workflow_item;
    let form_report_status = req.query.form_report_status;
    let form_report_name = req.query.form_report_name;
    let d = {
        title: 'report', theme: nconf.get('web').theme,
        user: req.user.fullname,
        form_workflow_list: [''].concat(Object.keys(nconf.get('workflows'))),
        report_status: [''].concat(['Error', 'Waiting', 'Running', 'Complete']),
        form_report_status: form_report_status,
        form_report_name: form_report_name,
        form_workflow_item: form_workflow_item
    };
    res.render('report', d);
});

router.post('/report_inc', function (req, res, next) {
    let limit = req.params.limit || 1000;
    let form_workflow_item = req.query.form_workflow_item;
    let form_report_name = req.query.form_report_name;
    let form_report_status = req.query.form_report_status;
    let sort = req.query.sort || 'accession';
    let query = (form_report_name) ? {archive: form_report_name} : {};
    if (form_workflow_item) {
        query['name'] = form_workflow_item
    }

    switch (form_report_status) {
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
        res.render('report_inc', {
            workflows: workflows,
            status: {'-1': '✘', 0: '?', 1: '✔'},
            form_report_status: form_report_status,
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
    let form_report_name = req.query.form_report_name;
    res.redirect('/report?form_report_name=' + form_report_name);
});


module.exports = router;
