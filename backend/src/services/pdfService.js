```
const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');
const logger = require('../utils/logger');
const axios = require('axios');
const QRCode = require('qrcode');

class PDFService {
    /**
     * Generate a certificate PDF by overlaying data on a template
     * @param {Buffer} templateBuffer - The PDF template buffer
     * @param {Object} data - Key-value pairs of data to overlay
     * @param {Array} structure - Array of field definitions (name, x, y, fontSize, etc.)
     * @param {string} certificateId - Unique Certificate ID
     * @param {string} qrData - Data to encode in QR (e.g., verification URL)
     * @returns {Promise<Buffer>} - The generated PDF buffer
     */
    async generateCertificate(templateBuffer, data, structure, certificateId, qrData) {
        try {
            const pdfDoc = await PDFDocument.load(templateBuffer);
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];
            const { width, height } = firstPage.getSize();

            // Embed font
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            // 1. Overlay dynamic text fields
            for (const field of structure) {
                const value = data[field.name] || '';
                const fontSize = field.fontSize || 12;
                
                firstPage.drawText(String(value), {
                    x: field.x,
                    y: field.y,
                    size: fontSize,
                    font: font,
                    color: rgb(0, 0, 0),
                });
            }

            // 2. Add Watermark "Verified by DocVerify"
            // Draw diagonally across the center
            const watermarkText = 'Verified by DocVerify';
            const watermarkSize = 50;
            const textWidth = boldFont.widthOfTextAtSize(watermarkText, watermarkSize);
            
            firstPage.drawText(watermarkText, {
                x: width / 2 - textWidth / 2,
                y: height / 2,
                size: watermarkSize,
                font: boldFont,
                color: rgb(0.8, 0.8, 0.8), // Light gray
                rotate: degrees(45),
                opacity: 0.3,
            });

            // 3. Add Certificate ID (Bottom Left)
            if (certificateId) {
                const idText = `Certificate ID: ${ certificateId } `;
                firstPage.drawText(idText, {
                    x: 50,
                    y: 50,
                    size: 10,
                    font: font,
                    color: rgb(0.3, 0.3, 0.3),
                });
            }

            // 4. Add QR Code (Bottom Right)
            if (qrData) {
                try {
                    const qrImageDataUrl = await QRCode.toDataURL(qrData);
                    const qrImageBytes = await fetch(qrImageDataUrl).then(res => res.arrayBuffer());
                    const qrImage = await pdfDoc.embedPng(qrImageBytes);
                    const qrDims = qrImage.scale(0.5); // Scale down

                    firstPage.drawImage(qrImage, {
                        x: width - 150,
                        y: 50,
                        width: 100,
                        height: 100,
                    });
                     
                    // Add "Scan to Verify" text below QR
                    firstPage.drawText('Scan to Verify', {
                        x: width - 135,
                        y: 35,
                        size: 8,
                        font: font,
                        color: rgb(0, 0, 0),
                    });

                } catch (qrError) {
                    logger.error('Failed to embed QR code:', qrError);
                    // Continue without QR if it fails
                }
            }

            // Serialize the PDF
            const pdfBytes = await pdfDoc.save();
            return Buffer.from(pdfBytes);

        } catch (error) {
            logger.error('PDF Generation failed:', error);
            throw error;
        }
    }

    /**
     * Fetch PDF from IPFS or URL
     * @param {string} url - IPFS gateway URL or direct link
     */
    async fetchPDF(url) {
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            return Buffer.from(response.data);
        } catch (error) {
            logger.error(`Failed to fetch PDF from ${ url }: `, error);
            throw error;
        }
    }
}

module.exports = new PDFService();
