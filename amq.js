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
    save(workflow);
    let form = {body: workflow.task.identifier};
    request.post({url: url, form: form},
        function (error, response, body) {
            if (!error && response.statusCode === 200) {
                console.log(body);
                workflow.task.info = 'send to queue';
                workflow.task.begin = new Date();
                workflow.task.status = 200;
            } else {
                console.error(body);
                workflow.task.info = body;
                workflow.task.status = 150;
            }
        }
    ).auth(amq.username, amq.password, false);
}

