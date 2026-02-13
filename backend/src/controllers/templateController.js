const db = require('../database/models');
const logger = require('../utils/logger');

class TemplateController {
    /**
     * Create a new template
     * POST /api/templates
     */
    async createTemplate(req, res) {
        try {
            const { name, structure, backgroundUrl, backgroundType } = req.body;
            const organizationId = req.user.organizationId;

            if (!name || !structure || !backgroundUrl) {
                return res.status(400).json({
                    success: false,
                    error: 'Name, structure, and background URL are required'
                });
            }

            const template = await db.Template.create({
                organizationId,
                name,
                structure,
                backgroundUrl,
                backgroundType: backgroundType || 'ipfs'
            });

            res.status(201).json({
                success: true,
                data: template
            });

        } catch (error) {
            logger.error('Create template failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get all templates for an organization
     * GET /api/templates
     */
    async getTemplates(req, res) {
        try {
            const organizationId = req.user.organizationId;

            const templates = await db.Template.findAll({
                where: { organizationId },
                order: [['createdAt', 'DESC']]
            });

            res.status(200).json({
                success: true,
                data: templates
            });

        } catch (error) {
            logger.error('Get templates failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Delete a template
     * DELETE /api/templates/:id
     */
    async deleteTemplate(req, res) {
        try {
            const { id } = req.params;
            const organizationId = req.user.organizationId;

            const deleted = await db.Template.destroy({
                where: { id, organizationId }
            });

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Template not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Template deleted'
            });

        } catch (error) {
            logger.error('Delete template failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new TemplateController();
