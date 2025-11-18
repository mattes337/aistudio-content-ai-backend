import { Router } from 'express';
import { MediaAssetController } from '../controllers/MediaAssetController';
import { authenticateToken } from '../middleware/auth';
import { validateMediaAsset } from '../middleware/validation';

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * /api/media-assets:
 *   get:
 *     summary: Get all media assets
 *     tags: [Media Assets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of media assets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MediaAsset'
 *       500:
 *         description: Internal server error
 */
router.get('/', MediaAssetController.getMediaAssets);

/**
 * @swagger
 * /api/media-assets:
 *   post:
 *     summary: Create a new media asset
 *     tags: [Media Assets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMediaAssetRequest'
 *     responses:
 *       201:
 *         description: Media asset created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaAsset'
 *       500:
 *         description: Internal server error
 */
router.post('/', validateMediaAsset, MediaAssetController.createMediaAsset);

/**
 * @swagger
 * /api/media-assets/{assetId}:
 *   get:
 *     summary: Get media asset by ID
 *     tags: [Media Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Media asset ID
 *     responses:
 *       200:
 *         description: Media asset details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaAsset'
 *       404:
 *         description: Media asset not found
 *       500:
 *         description: Internal server error
 */
router.get('/:assetId', MediaAssetController.getMediaAssetById);

/**
 * @swagger
 * /api/media-assets/{assetId}:
 *   put:
 *     summary: Update a media asset
 *     tags: [Media Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Media asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMediaAssetRequest'
 *     responses:
 *       200:
 *         description: Media asset updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaAsset'
 *       404:
 *         description: Media asset not found
 *       500:
 *         description: Internal server error
 */
router.put('/:assetId', validateMediaAsset, MediaAssetController.updateMediaAsset);

/**
 * @swagger
 * /api/media-assets/{assetId}:
 *   delete:
 *     summary: Delete a media asset
 *     tags: [Media Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Media asset ID
 *     responses:
 *       204:
 *         description: Media asset deleted successfully
 *       404:
 *         description: Media asset not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:assetId', MediaAssetController.deleteMediaAsset);

export default router;
