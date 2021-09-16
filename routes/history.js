/**
 * history
 *
 * Description
 * history CRUD
 *
 * Hier tonen we alle intellectuele eenheden ongegroepeerd per workflow
 *
 * Filteropties:
 *  - geen = alle eenheden per workflow
 *  - een text keuze : ARCH12345 of ARCH12345.67
 *  - sorteer aanvankelijk op datum ( of _id die van nature oploopt  = een lege sort)
 *
 *  De gebruiker kan een intellectuele eenheid kiezen die leidt naar de workflow route.
 *
 * @type {route}
 */

const express = require('express');
const router = express.Router({});
const nconf = require('nconf');
const Workflow = require('../model/workflow');

const workflow_status = {failed: -1, waiting: 0, running: 1, complete: 2};

router.get('/', function (req, res, next) {
    let form_workflow_name = req.query.form_workflow_name;
    let form_archive_name = req.query.form_archive_name;
    res.render('history', {
        title: 'history', theme: nconf.get('web').theme,
        form_workflow_list: [''].concat(Object.keys(nconf.get('workflows'))),
        form_workflow_name: form_workflow_name,
        workflow_status: workflow_status,
        user: req.user.fullname,
        uid: req.user.uid || 1000,
        form_archive_name: form_archive_name
    });
});

router.post('/history_inc', function (req, res, next) {
    let limit = req.body.limit || 1000;
    let query = req.body.q || {};

    let sort_field = req.body.sort_field || 'begin';
    let _sort_order = req.body.sort_order || 'asc';
    let sort = {};
    sort[sort_field] = (_sort_order === 'asc' || _sort_order === '-1') ? -1 : 1;

    Workflow.find(query, function (err, workflows) {
        if (err) return next(err);
        res.render('history_inc', {
            workflows: workflows,
            iiif_url: nconf.get('web').iiif_url,
            handle_url: nconf.get('web').handle_url
        })
    }).sort(sort).limit(limit);
});

module.exports = router;
