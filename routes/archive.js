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

const status = {'-1': 'failed', 0: 'waiting', 1: 'running', 2: 'complete'};

router.get('/', function (req, res, next) {
    let form_workflow_item = req.query.form_workflow_item;
    res.render('archive', {
        title: 'archive', theme: nconf.get('web').theme,
        form_workflow_list: [''].concat(Object.keys(nconf.get('workflows'))),
        form_workflow_item: form_workflow_item,
        user: req.user.fullname
    })
});

router.post('/archive_inc', function (req, res, next) {

    let form_workflow_item = req.body.form_workflow_item;
    let query = req.body.q || {};

    let sort_field = req.body.sort_field || 'archive';
    let _sort_order = req.body.sort_order || 'asc';
    let sort_order = (_sort_order === 'asc' || _sort_order === '-1') ? -1 : 1;

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
    },
    ], function (err, aggregate) {
        if (err) return next(err);
        let _aggregate = aggregate.group(a => a._id.archive).map(function (d) {
            let data = {archive: d[0]};
            let total = 0;
            d[1].forEach(function (dd) {
                data[status[dd._id.status]] = dd.count;
                total += dd.count;
            });
            data['total'] = total;
            return data;
        }).sort((a, b) => {
            if (a[sort_field] === undefined) a[sort_field] = 0;
            if (b[sort_field] === undefined) b[sort_field] = 0;
            if (a[sort_field] < b[sort_field]) return sort_order;
            if (a[sort_field] > b[sort_field]) return -sort_order;
            return 0;
        });

        res.render('archive_inc', {
            archives: _aggregate,
            form_workflow_item: form_workflow_item,
        });
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
            if (task) {
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
        check(update.has_iiif)) ? 2 : -1;
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
