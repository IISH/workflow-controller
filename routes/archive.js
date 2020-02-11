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

const status = {'-1': 'failed', 0: 'waiting', '1': 'running', 2: 'complete'};

router.get('/', function (req, res, next) {
    let form_archive_name = req.query.form_archive_name;
    res.render('archive', {
        title: 'archive',
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

router.get('/delete/:archive', function (req, res, next) {
    let archive = req.archive;
    Workflow.deleteMany({archive:archive}, function(err, rowsToDelete) {
        if (err) {
            console.error(err);
        } else {
            res.redirect('/archive');
        }
    });
});

module.exports = router;
