/**
 * aggregate
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
const amq = require('../amq');

const status = {'-1': 'failed', 0: 'waiting', '1': 'running', 2: 'complete'};

router.get('/', function (req, res, next) {
    let form_archive_name = req.query.form_archive_name;
    res.render('archive', {
        title: 'archive', theme: nconf.get('web').theme,
        workflow_name: [''].concat(Object.keys(nconf.get('workflows'))),
        form_archive_name: form_archive_name,
        user: req.user.fullname
    })
});

router.get('/archive_inc', function (req, res, next) {

    let form_archive_name = req.query.form_archive_name;
    let query = (form_archive_name) ? {name: form_archive_name} : {};


    // We want a table like:
    // Archive | waiting | running | completed | failed | total
    // The datastructure is to be:
    // { archive: {waiting: a, failed: b, running: x, completed: y, total: z} }
    Workflow.aggregate([{
        $match: query
    }, {
        $group: {
            _id: {archive: "$archive", status: "$status"},
            count: {$sum: 1}
        }
    }], function (err, aggregate) {
        if (err) return next(err);
        let archives = aggregate.group(a => a._id.archive).map(function (d) {
            let data = {archive: d[0]};
            let total = 0;
            d[1].forEach(function (dd) {
                data[status[dd._id.status]] = dd.count;
                total += dd.count;
            });
            data['total'] = total;
            return data;
        });
        res.render('archive_inc', {
            archives: archives,
            form_archive_name: form_archive_name,
        })
    });
});

router.param('archive', function (req, res, next, archive) {
    req.archive = archive;
    next()
});

router.param('accession_id', function (req, res, next, accession_id) {
    req.query = {accession: accession_id};
    next()
});

router.get('/check/:archive', function (req, res, next) {
    let archive = req.archive;
    let query = {archive: archive};
    const queue = 'archivematica_80_check';

    Workflow.find(query).stream()
        .on('error', function (err) {
            if (err) console.log('Error Workflow.find: ' + err);
            return next(err);
        })
        .on('data', function (_workflow) {
            let workflow = Workflow(_workflow);
            workflow.isNew = false;
            let task = workflow.tasks.find(_task => _task.queue === queue);
            if ( task ) {
                task.info = 'Retrying...';
                workflow.tasks = workflow.tasks.filter(function (_task) {
                    return (_task.identifier !== task.identifier);
                });
                workflow.tasks.unshift(task);
                amq(workflow);
            } else {
                console.log('Warn: no task with queue ' + queue + ' found in ' + workflow.identifier);
            }
        })
    res.redirect('/report');
});

router.post('/check/:accession_id', function (req, res) {
    let query = req.query;
    let task_agent = req.body;
    let update = {};
    update['has_aip'] = Number(task_agent.has_aip);
    update['has_dip'] = Number(task_agent.has_dip);
    update['has_pid'] = Number(task_agent.has_pid);
    update['has_iiif'] = Number(task_agent.has_iiif);
    update['status'] = (
        check(update.has_aip) &&
        check(update.has_dip) &&
        check(update.has_pid) &&
        check(update.has_iiif)) ? 2: -1;
    _update(query, update);
    res.status(200);
    res.end(JSON.stringify({status: 200, message: 'OK'}));
});

async function _update(query, update) {
    console.log(query);
    console.log(update);
    await Workflow.updateMany(query, {$set: update});
}

function check(i) {
    switch (i) {
        case -1:
        case 0:
            return false;
        case 1:
            return true;
        default:
            return false;
    }
}

router.get('/delete/:archive', function (req, res, next) {
    let archive = req.archive;
    Workflow.deleteMany({archive: archive}, function (err, rowsToDelete) {
        if (err) {
            console.error(err);
        } else {
            res.redirect('/archive');
        }
    });
});

module.exports = router;
