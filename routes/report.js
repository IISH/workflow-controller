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
    let form_report_status = req.query.form_report_status;
    let form_report_name = req.query.form_report_name;
    res.render('report', {
        title: 'report',
        user: req.user.fullname,
        report_status: [''].concat(['Error', 'Waiting', 'Running', 'Complete']),
        form_report_status: form_report_status,
        form_report_name: form_report_name
    })
});

router.get('/report_inc', function (req, res, next) {
    let limit = req.params.limit || 1000;
    let form_report_name = req.query.form_report_name;
    let form_report_status = req.query.form_report_status;
    let sort = req.query.sort || 'accession';
    let query = ( form_report_name ) ? {archive: form_report_name} : {};

    if (form_report_status) {
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
    }

    Workflow.find(query, function (err, workflows) {
        if (err) return next(err);
        res.render('report_inc', {
            workflows: workflows,
            status: {'-1': '✘', 0: '?', 1: '✔'},
            form_report_status: form_report_status
        })
    }).sort(sort).limit(limit);
});

module.exports = router;
