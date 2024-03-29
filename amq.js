const nconf = require('nconf');
const Workflow = require('./model/workflow');
const request = require('request')

module.exports = function(workflow) {

    async function save(workflow) {
        await workflow.save();
    }

    let amq = nconf.get('amq');
    let url = amq.protocol + '://' + amq.host + ':' + amq.port + '/api/message/' + workflow.task.queue + '?type=' + workflow.task.type;
    workflow.task.identifier = Workflow.identifier();
    let form = {body: workflow.task.identifier};
    console.log('amq ' + url + ' ' + form);
    request.post({url: url, form: form},
        function (error, response, body) {
            if (!error && response.statusCode === 200) {
                console.log(body);
                workflow.task.info = 'send to queue';
                workflow.task.begin = new Date();
                workflow.task.end = new Date();
                workflow.task.status = 200;
                save(workflow);
            } else {
                console.error(error);
                workflow.task.info = body;
                workflow.task.status = 150;
                save(workflow);
            }
        }
    ).auth(amq.username, amq.password, false);
}

