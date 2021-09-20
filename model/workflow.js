/**
 * workflow model
 * // https://mongoosejs.com/docs/index.html
 *
 * workflow:
 *   uid: user identifier of the user
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

const nconf = require('nconf');

const SECOND = 1000;
const ONE_MINUTE = 60 * SECOND;

/**
 * Task is a child of Workflow
 * @type {dao.Schema}
 */
let taskSchema = new dao.Schema({
    identifier: String,
    begin: Date,
    end: Date,
    queue: String,
    type: {type: String, default: 'queue'},
    status: {type: Number, default: 100},
    info: {type: String, default: 'Waiting its turn'},
    description: String,
    order: Number,
    retry: {type: Number, default: ONE_MINUTE}
}, { _id: false });

/**
 * retryTime = time to retry a failed task
 */
taskSchema.virtual('retryTime').get(function(){
    let now = new Date();
    let seconds_end = now - this.end;
    return (this.retry) ? this.retry - seconds_end : 0;
});


function formatDate(date) {
    let year = date.getFullYear();
    let month = ('00' + (date.getUTCMonth() + 1)).substr(-2);
    let day = ('00' + date.getUTCDate()).substr(-2);
    return year + '-' + month + '-' + day;
}
function formatTime(date) {
    let hour = ('00' + date.getHours()).substr(-2);
    let minute = ('00' + date.getMinutes()).substr(-2);
    let second = ('00' + date.getSeconds()).substr(-2);
    return hour + ':' + minute + ':' + second;
}

function formatDateTime(date) {
    return formatDate(date) + 'T' + formatTime(date) + 'Z';
}

taskSchema.virtual('startdate').get(function(){
    return formatDate(this.begin);
});
taskSchema.virtual('enddate').get(function(){
    return formatDate(this.end);
});
taskSchema.virtual('starttime').get(function(){
    return formatTime(this.begin);
});
taskSchema.virtual('endtime').get(function(){
    return formatTime(this.end);
});

let workflowSchema = new dao.Schema({
    uid: Number,
    identifier: String,
    name: String,
    fileset: {type: String, index: {unique: true, dropDups: true}},
    accession: {type: String, index: {unique: false, dropDups: false}},
    archive: {type: String, index: {unique: false, dropDups: false}},
    begin: Date,
    end: Date,
    delete_on_success: {type: Boolean, default: true},
    tasks: [taskSchema],
    status: {type: Number, default: 0},
    has_aip: {type: Number, default: 0},
    has_dip: {type: Number, default: 0},
    has_iiif: {type: Number, default: 0},
    has_pid: {type: Number, default: 0}
});

workflowSchema.virtual('datetime').get(function(){
    let date = (this.begin < this.end) ? this.end : this.begin;
    return formatDateTime(date);
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
 * get user via the id
 */
workflowSchema.virtual('owner').get(function(){
    const users = nconf.get('users');
    let uid = this.uid;
    let user = users.find(function (u) {
        return (u.uid === uid);
    });
    return (user) ? user.fullname : uid;
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
