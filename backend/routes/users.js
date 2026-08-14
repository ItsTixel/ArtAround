const express = require('express');
const router = express.Router();
const controller = require('../controllers/user');

const verifyToken = require('../middlewares/verifyToken');
const isSelf = require('../middlewares/isSelf');
const { createImageUpload, handleUploadErrors } = require('../middlewares/upload');

// L'avatar, se caricato come file, finisce qui (vedi controllers/user.js),
// servito poi staticamente da /assets.
const uploadAvatar = handleUploadErrors(createImageUpload('avatars').single('avatar'));

router.get('/',    controller.getAll);
router.get('/:id', controller.getById);
router.post('/',   controller.create);
router.put('/:id', verifyToken, isSelf, uploadAvatar, controller.update);
router.delete('/:id', controller.remove);

router.put('/:id/adopt/:visitId',       verifyToken, isSelf, controller.adoptVisit);
router.delete('/:id/adopt/:visitId',    verifyToken, isSelf, controller.removeAdoption);
router.put('/:id/bookmark/:visitId',    verifyToken, isSelf, controller.bookmarkVisit);
router.delete('/:id/bookmark/:visitId', verifyToken, isSelf, controller.removeBookmark);

module.exports = router;
