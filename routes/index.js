/**
 * index
 *
 * Description
 * Serve the home page
 *
 * @type {createApplication}
 */

const express = require('express');
const router = express.Router({});

router.get('/', function (req, res) {
    res.redirect('/archive');
});

module.exports = router;
