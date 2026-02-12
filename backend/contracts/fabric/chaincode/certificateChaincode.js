/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class CertificateChaincode extends Contract {

    /**
     * Initialize the ledger with default data
     */
    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        console.info('============= END : Initialize Ledger ===========');
    }

    /**
     * Issue a new certificate
     * @param {Context} ctx - Transaction context
     * @param {string} certificateId - Unique certificate identifier
     * @param {string} organizationId - Organization issuing the certificate
     * @param {string} documentHash - SHA-256 hash of the document
     * @param {string} holderName - Name of certificate holder
     * @param {string} issueDate - Date of issuance
     * @param {string} metadata - Additional certificate metadata (JSON string)
     */
    async issueCertificate(ctx, certificateId, organizationId, documentHash, holderName, issueDate, metadata) {
        console.info('============= START : Issue Certificate ===========');

        // Validate inputs
        if (!certificateId || !organizationId || !documentHash) {
            throw new Error('Certificate ID, Organization ID, and Document Hash are required');
        }

        // Check if certificate already exists
        const exists = await this.certificateExists(ctx, certificateId);
        if (exists) {
            throw new Error(`Certificate ${certificateId} already exists`);
        }

        // Get organization MSP ID for validation
        const mspId = ctx.clientIdentity.getMSPID();
        console.info(`Issuing organization MSP: ${mspId}`);

        const certificate = {
            docType: 'certificate',
            certificateId,
            organizationId,
            documentHash,
            holderName,
            issueDate,
            metadata,
            issuedBy: mspId,
            timestamp: new Date().toISOString(),
            status: 'active',
            version: 1
        };

        // Store certificate in world state
        await ctx.stub.putState(certificateId, Buffer.from(JSON.stringify(certificate)));

        // Create composite key for hash-based lookup
        const hashIndexKey = ctx.stub.createCompositeKey('hash~cert', [documentHash, certificateId]);
        await ctx.stub.putState(hashIndexKey, Buffer.from('\u0000'));

        // Create composite key for organization-based lookup
        const orgIndexKey = ctx.stub.createCompositeKey('org~cert', [organizationId, certificateId]);
        await ctx.stub.putState(orgIndexKey, Buffer.from('\u0000'));

        // Emit event
        ctx.stub.setEvent('CertificateIssued', Buffer.from(JSON.stringify({
            certificateId,
            organizationId,
            documentHash,
            timestamp: certificate.timestamp
        })));

        console.info('============= END : Issue Certificate ===========');
        return JSON.stringify(certificate);
    }

    /**
     * Validate certificate hash
     * @param {Context} ctx - Transaction context
     * @param {string} documentHash - Document hash to validate
     * @param {string} organizationId - Organization ID to check against
     * @returns {Object} Validation result with certificate details
     */
    async validateCertificateHash(ctx, documentHash, organizationId) {
        console.info('============= START : Validate Certificate Hash ===========');

        if (!documentHash) {
            throw new Error('Document hash is required');
        }

        // Query certificates by hash
        const iterator = await ctx.stub.getStateByPartialCompositeKey('hash~cert', [documentHash]);

        const certificates = [];
        let result = await iterator.next();

        while (!result.done) {
            const compositeKey = result.value.key;
            const splitKey = ctx.stub.splitCompositeKey(compositeKey);
            const certId = splitKey.attributes[1];

            const certBytes = await ctx.stub.getState(certId);
            if (certBytes && certBytes.length > 0) {
                const cert = JSON.parse(certBytes.toString());

                // If organization ID is specified, filter by it
                if (!organizationId || cert.organizationId === organizationId) {
                    certificates.push(cert);
                }
            }

            result = await iterator.next();
        }

        await iterator.close();

        const validationResult = {
            valid: certificates.length > 0,
            matchCount: certificates.length,
            certificates: certificates,
            documentHash,
            organizationId: organizationId || 'any',
            timestamp: new Date().toISOString()
        };

        console.info('============= END : Validate Certificate Hash ===========');
        return JSON.stringify(validationResult);
    }

    /**
     * Query certificate by hash
     * @param {Context} ctx - Transaction context
     * @param {string} documentHash - Document hash
     * @returns {Array} Array of matching certificates
     */
    async queryCertificateByHash(ctx, documentHash) {
        console.info('============= START : Query Certificate By Hash ===========');

        const iterator = await ctx.stub.getStateByPartialCompositeKey('hash~cert', [documentHash]);

        const certificates = [];
        let result = await iterator.next();

        while (!result.done) {
            const compositeKey = result.value.key;
            const splitKey = ctx.stub.splitCompositeKey(compositeKey);
            const certId = splitKey.attributes[1];

            const certBytes = await ctx.stub.getState(certId);
            if (certBytes && certBytes.length > 0) {
                certificates.push(JSON.parse(certBytes.toString()));
            }

            result = await iterator.next();
        }

        await iterator.close();

        console.info('============= END : Query Certificate By Hash ===========');
        return JSON.stringify(certificates);
    }

    /**
     * Get certificate by ID
     * @param {Context} ctx - Transaction context
     * @param {string} certificateId - Certificate ID
     * @returns {Object} Certificate details
     */
    async getCertificate(ctx, certificateId) {
        const certBytes = await ctx.stub.getState(certificateId);

        if (!certBytes || certBytes.length === 0) {
            throw new Error(`Certificate ${certificateId} does not exist`);
        }

        return certBytes.toString();
    }

    /**
     * Get certificate history
     * @param {Context} ctx - Transaction context
     * @param {string} certificateId - Certificate ID
     * @returns {Array} History of certificate modifications
     */
    async getCertificateHistory(ctx, certificateId) {
        console.info('============= START : Get Certificate History ===========');

        const iterator = await ctx.stub.getHistoryForKey(certificateId);
        const history = [];

        let result = await iterator.next();
        while (!result.done) {
            const modification = {
                txId: result.value.txId,
                timestamp: result.value.timestamp,
                isDelete: result.value.isDelete,
            };

            if (!result.value.isDelete && result.value.value) {
                modification.value = JSON.parse(result.value.value.toString());
            }

            history.push(modification);
            result = await iterator.next();
        }

        await iterator.close();

        console.info('============= END : Get Certificate History ===========');
        return JSON.stringify(history);
    }

    /**
     * Update organization database (revoke or update certificate)
     * @param {Context} ctx - Transaction context
     * @param {string} certificateId - Certificate ID
     * @param {string} status - New status (active, revoked, expired)
     * @param {string} reason - Reason for status change
     */
    async updateCertificateStatus(ctx, certificateId, status, reason) {
        console.info('============= START : Update Certificate Status ===========');

        const certBytes = await ctx.stub.getState(certificateId);
        if (!certBytes || certBytes.length === 0) {
            throw new Error(`Certificate ${certificateId} does not exist`);
        }

        const certificate = JSON.parse(certBytes.toString());

        // Verify caller is from the issuing organization
        const mspId = ctx.clientIdentity.getMSPID();
        if (certificate.issuedBy !== mspId) {
            throw new Error('Only the issuing organization can update certificate status');
        }

        certificate.status = status;
        certificate.statusReason = reason;
        certificate.statusUpdatedAt = new Date().toISOString();
        certificate.version += 1;

        await ctx.stub.putState(certificateId, Buffer.from(JSON.stringify(certificate)));

        // Emit event
        ctx.stub.setEvent('CertificateStatusUpdated', Buffer.from(JSON.stringify({
            certificateId,
            status,
            reason,
            timestamp: certificate.statusUpdatedAt
        })));

        console.info('============= END : Update Certificate Status ===========');
        return JSON.stringify(certificate);
    }

    /**
     * Query certificates by organization
     * @param {Context} ctx - Transaction context
     * @param {string} organizationId - Organization ID
     * @returns {Array} Array of certificates issued by the organization
     */
    async queryCertificatesByOrganization(ctx, organizationId) {
        console.info('============= START : Query Certificates By Organization ===========');

        const iterator = await ctx.stub.getStateByPartialCompositeKey('org~cert', [organizationId]);

        const certificates = [];
        let result = await iterator.next();

        while (!result.done) {
            const compositeKey = result.value.key;
            const splitKey = ctx.stub.splitCompositeKey(compositeKey);
            const certId = splitKey.attributes[1];

            const certBytes = await ctx.stub.getState(certId);
            if (certBytes && certBytes.length > 0) {
                certificates.push(JSON.parse(certBytes.toString()));
            }

            result = await iterator.next();
        }

        await iterator.close();

        console.info('============= END : Query Certificates By Organization ===========');
        return JSON.stringify(certificates);
    }

    /**
     * Check if certificate exists
     * @param {Context} ctx - Transaction context
     * @param {string} certificateId - Certificate ID
     * @returns {boolean} True if exists
     */
    async certificateExists(ctx, certificateId) {
        const certBytes = await ctx.stub.getState(certificateId);
        return certBytes && certBytes.length > 0;
    }

    /**
     * Rich query using CouchDB (if available)
     * @param {Context} ctx - Transaction context
     * @param {string} queryString - CouchDB query string
     * @returns {Array} Query results
     */
    async queryWithCouchDB(ctx, queryString) {
        const iterator = await ctx.stub.getQueryResult(queryString);
        const results = [];

        let result = await iterator.next();
        while (!result.done) {
            if (result.value && result.value.value) {
                results.push(JSON.parse(result.value.value.toString()));
            }
            result = await iterator.next();
        }

        await iterator.close();
        return JSON.stringify(results);
    }
}

module.exports = CertificateChaincode;
