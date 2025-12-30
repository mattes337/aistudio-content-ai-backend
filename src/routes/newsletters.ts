import { Router } from 'express';
import { NewsletterController } from '../controllers/NewsletterController';
import { authenticateToken } from '../middleware/auth';
import { validateNewsletterLenient } from '../middleware/validation';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/newsletters:
 *   get:
 *     summary: Get all newsletters
 *     tags: [Newsletters]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of newsletters
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Newsletter'
 *       500:
 *         description: Internal server error
 */
router.get('/', NewsletterController.getNewsletters);

/**
 * @swagger
 * /api/newsletters/template-variables:
 *   get:
 *     summary: Get available template variables for newsletter personalization
 *     description: Returns an object describing all available data fields for email templates, including recipient columns, data JSON fields, and a sample multi-level structure.
 *     tags: [Newsletters]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Template variables structure
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 description:
 *                   type: string
 *                 columns:
 *                   type: object
 *                   description: Available recipient table columns
 *                 dataFields:
 *                   type: object
 *                   description: Available fields in recipient data JSON
 *                 sample:
 *                   type: object
 *                   description: Sample recipient object with all fields populated
 *                 usage:
 *                   type: object
 *                   description: Examples of how to use variables in templates
 *       500:
 *         description: Internal server error
 */
router.get('/template-variables', NewsletterController.getTemplateVariables);

/**
 * @swagger
 * /api/newsletters:
 *   post:
 *     summary: Create a new newsletter
 *     tags: [Newsletters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateNewsletterRequest'
 *     responses:
 *       201:
 *         description: Newsletter created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Newsletter'
 *       500:
 *         description: Internal server error
 */
router.post('/', validateNewsletterLenient, NewsletterController.createNewsletter);

/**
 * @swagger
 * /api/newsletters/{newsletterId}:
 *   get:
 *     summary: Get newsletter by ID
 *     tags: [Newsletters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: newsletterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Newsletter ID
 *     responses:
 *       200:
 *         description: Newsletter details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Newsletter'
 *       404:
 *         description: Newsletter not found
 *       500:
 *         description: Internal server error
 */
router.get('/:newsletterId', NewsletterController.getNewsletterById);

/**
 * @swagger
 * /api/newsletters/{newsletterId}:
 *   put:
 *     summary: Update a newsletter
 *     tags: [Newsletters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: newsletterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Newsletter ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateNewsletterRequest'
 *     responses:
 *       200:
 *         description: Newsletter updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Newsletter'
 *       404:
 *         description: Newsletter not found
 *       500:
 *         description: Internal server error
 */
router.put('/:newsletterId', validateNewsletterLenient, NewsletterController.updateNewsletter);

/**
 * @swagger
 * /api/newsletters/{newsletterId}:
 *   delete:
 *     summary: Delete a newsletter
 *     tags: [Newsletters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: newsletterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Newsletter ID
 *     responses:
 *       204:
 *         description: Newsletter deleted successfully
 *       404:
 *         description: Newsletter not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:newsletterId', NewsletterController.deleteNewsletter);

export default router;
