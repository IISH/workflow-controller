/**
 * workflow model
 * // https://mongoosejs.com/docs/index.html
 *
 * workflow:
 *   name: workflow type
 *   fileset: absolute path of the archival item. E.g. /a/b/c/d/ARCH12345.67
 *   task: list of tasks to perform
 *   status: 0 = queued, 1 = running, -1 = error, 2 = completed
 *   accession: the Accession number. E.g. ARCH12345.67
 *   archive: the archive. E.g. ARCH12345
 *
 *   task:
 *     queue: name of the queue
 *     status:
 *       100 Hotfolder recorded event
 *       150 Failed to sent message to queue
 *       200 Controller queued message
 *       250 Controller queued message tasks longer than expected
 *       300 Agent consumes message
 *       400 Agent threw an internal exception
 *       450 Task completed with error
 *       500 Task completed
 *       600 Next task started
 *     info: console output
 *     begin: activation time. A task is active when queued.
 *     end: completion time task
 *     span: the expected time it takes for a message to be picked up by an agent
 *     description: what the task is for
 *     retry: when true retry the task
 */

'use strict';

const dao = require('./dao');
const uuidv4 = require('uuid/v4');

/**
 * Task is a child of Workflow
 * @type {dao.Schema}
 */
let taskSchema = new dao.Schema({
    identifier: String,
    begin: {type: Date, default: new Date()},
    end: {type: Date, default: new Date()},
    queue: String,
    type: {type: String, default: 'queue'},
    status: {type: Number, default: 100},
    info: {type: String, default: 'Waiting its turn'},
    description: String,
    order: Number,
    retry: {type: Boolean, default: true}
}, { _id: false });

/**
 * duration = time of the task
 */
taskSchema.virtual('duration').get(function () {
    const SECOND = 1000;
    if (this.status === 100) {
        return '';
    }
    let now = (this.status < 400 || this.status >= 500) ? new Date() : this.end;
    let seconds = Math.floor(Math.abs((now - this.begin) / SECOND));
    let hours = Math.floor(seconds / 3600);
    seconds = seconds - hours * 3600;
    let minutes = Math.floor(seconds / 60);
    seconds = seconds - minutes * 60;
    return ('00' + hours).substr(-2) + ':' + ('00' + minutes).substr(-2) + ':' + ('00' + seconds).substr(-2);
});

let workflowSchema = new dao.Schema({
    identifier: String,
    name: String,
    fileset: {type: String, index: {unique: true, dropDups: true}},
    accession: {type: String, index: {unique: false, dropDups: false}},
    archive: {type: String, index: {unique: false, dropDups: false}},
    begin: {type: Date, default: new Date()},
    end: {type: Date, default: new Date()},
    delete_on_success: {type: Boolean, default: true},
    tasks: [taskSchema],
    status: {type: Number, default: 0},
    has_aip: {type: Number, default: 0},
    has_dip: {type: Number, default: 0},
    has_iiif: {type: Number, default: 0}
});

/**
 * First task still to begin?
 */
workflowSchema.virtual('first').get(function () {
    return this.tasks.filter( function(task) {
        return task.status <= 300 ;
    }).length === this.tasks.length;
});

/**
 * Did all tasks complete?
 */
workflowSchema.virtual('complete').get(function () {
    return this.tasks.filter( function(task) {
        return task.status < 500 ;
    }).length === 0;
});

/**
 * Is the workflow stuck or hanging on something?
 */
workflowSchema.virtual('stuck').get(function () {
    return this.tasks.filter( function(task) {
        return task.status >= 400 && task.status < 500 ;
    }).length !== 0;
});

/**
 * duration = time of the task
 */
workflowSchema.virtual('duration').get(function () {
    const seconds = 1000;
    return Math.floor(Math.abs((this.end - this.begin) / seconds));
});

/**
 * task = current task is the first in the list
 * @returns {*}
 */
workflowSchema.virtual('task').get(function () {
    return this.tasks[0];
});

workflowSchema.static('identifier', function() {
   return uuidv4();
});

module.exports = dao.model('Workflow', workflowSchema, 'workflow');
