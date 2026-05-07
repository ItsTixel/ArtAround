const express = require('express');
const router = express.Router();
const controller = require('../controllers/user');

router.get('/',    controller.getAll);
router.get('/:id', controller.getById);
router.post('/',   controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

router.put('/:id/adopt/:visitId',       controller.adoptVisit);
router.delete('/:id/adopt/:visitId',    controller.removeAdoption);
router.put('/:id/bookmark/:visitId',    controller.bookmarkVisit);
router.delete('/:id/bookmark/:visitId', controller.removeBookmark);

module.exports = router;
