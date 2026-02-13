const csv = require('csv-parser');
const { Readable } = require('stream');
const db = require('../database/models');
const pdfService = require('../services/pdfService');
const ipfsService = require('../services/ipfsService');
const verificationService = require('../services/verificationService');
const logger = require('../utils/logger');
const crypto = require('crypto');

class IssuanceController {
    /**
     * Issue a single certificate manually
     * POST /api/issue/manual
     */
    async issueManual(req, res) {
        try {
            const { templateId, data } = req.body;
            const organizationId = req.user.organizationId;

            // 1. Fetch Template
            const template = await db.Template.findOne({
                where: { id: templateId, organizationId }
            });

            if (!template) {
                return res.status(404).json({ success: false, error: 'Template not found' });
            }

            // 2. Fetch Background PDF
            const pdfBuffer = await pdfService.fetchPDF(template.backgroundUrl);

            // 3. Generate ID & QR Data
            // We need to generate ID *before* PDF generation to embed it
            const certificateId = verificationService.generateCertificateId();
            const qrData = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify?id=${certificateId}`;

            // 4. Generate PDF with Enhancements
            const generatedPdf = await pdfService.generateCertificate(
                pdfBuffer,
                data,
                template.structure,
                certificateId,
                qrData
            );

            // 5. Verify/Register
            const documentHash = crypto.createHash('sha256').update(generatedPdf).digest('hex');
            const ipfsResult = await ipfsService.uploadFile(generatedPdf);

            // Use processIssuedDocument but pass the PRE-GENERATED certificateId
            // We need to overload processIssuedDocument or pass it as metadata?
            // Actually, processIssuedDocument generates a NEW ID. We should probably refactor it
            // to accept an optional ID, OR we just let it use the one we passed?

            // Refactor VerificationService.processIssuedDocument to accept existing ID
            // For now, let's assume we update VerificationService to accept `certificateId` override

            const result = await verificationService.processIssuedDocument(
                generatedPdf,
                documentHash,
                ipfsResult.cid,
                organizationId,
                { ...data, certificateId } // Pass ID in metadata? No, explicit param better.
            );

            // Wait, if processIssuedDocument generates a NEW ID, it will mismatch the one in PDF.
            // We MUST update VerificationService next to accept `certificateId` param.

            res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Manual issuance failed:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Issue in bulk via CSV
     * POST /api/issue/bulk
     */
    async issueBulk(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'CSV file is required' });
            }

            const { templateId } = req.body;
            const organizationId = req.user.organizationId;

            const template = await db.Template.findOne({
                where: { id: templateId, organizationId }
            });

            if (!template) {
                return res.status(404).json({ success: false, error: 'Template not found' });
            }

            const pdfBuffer = await pdfService.fetchPDF(template.backgroundUrl);
            const status = {
                total: 0,
                success: 0,
                failed: 0,
                results: []
            };

            const rows = [];
            const stream = Readable.from(req.file.buffer.toString());

            // Parse CSV
            await new Promise((resolve, reject) => {
                stream
                    .pipe(csv())
                    .on('data', (data) => rows.push(data))
                    .on('end', resolve)
                    .on('error', reject);
            });

            status.total = rows.length;

            // Process each row
            // In a real app, this should be a background job (Queue)
            for (const row of rows) {
                try {
                    const certificateId = verificationService.generateCertificateId();
                    const qrData = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify?id=${certificateId}`;

                    const generatedPdf = await pdfService.generateCertificate(
                        pdfBuffer,
                        row,
                        template.structure,
                        certificateId,
                        qrData
                    );

                    const documentHash = crypto.createHash('sha256').update(generatedPdf).digest('hex');
                    const ipfsResult = await ipfsService.uploadFile(generatedPdf);

                    const result = await verificationService.processIssuedDocument(
                        generatedPdf,
                        documentHash,
                        ipfsResult.cid,
                        organizationId,
                        { ...row, certificateId }
                    );

                    status.success++;
                    status.results.push({ ...row, status: 'success', hash: documentHash, certificateId });
                } catch (err) {
                    status.failed++;
                    status.results.push({ ...row, status: 'failed', error: err.message });
                }
            }

            res.status(200).json({
                success: true,
                data: status
            });

        } catch (error) {
            logger.error('Bulk issuance failed:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new IssuanceController();
