const { create } = require('ipfs-http-client');
const logger = require('../utils/logger');

class IPFSService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    /**
     * Initialize IPFS client
     */
    async initialize() {
        try {
            const ipfsConfig = {
                host: process.env.IPFS_HOST || 'localhost',
                port: process.env.IPFS_PORT || 5001,
                protocol: process.env.IPFS_PROTOCOL || 'http'
            };

            this.client = create(ipfsConfig);

            // Test connection
            const version = await this.client.version();
            this.isConnected = true;

            logger.info(`IPFS client initialized. Version: ${version.version}`);
            return true;
        } catch (error) {
            logger.error('Failed to initialize IPFS client:', error);
            this.isConnected = false;
            throw error;
        }
    }

    /**
     * Upload file to IPFS
     * @param {Buffer} fileBuffer - File buffer
     * @param {Object} options - Upload options
     * @returns {Object} Upload result with CID
     */
    async uploadFile(fileBuffer, options = {}) {
        try {
            if (!this.isConnected) {
                await this.initialize();
            }

            const uploadOptions = {
                pin: options.pin !== false, // Pin by default
                wrapWithDirectory: options.wrapWithDirectory || false,
                progress: options.progress || null
            };

            const result = await this.client.add(fileBuffer, uploadOptions);

            logger.info(`File uploaded to IPFS. CID: ${result.cid.toString()}`);

            return {
                cid: result.cid.toString(),
                path: result.path,
                size: result.size
            };
        } catch (error) {
            logger.error('Failed to upload file to IPFS:', error);
            throw new Error(`IPFS upload failed: ${error.message}`);
        }
    }

    /**
     * Retrieve file from IPFS
     * @param {string} cid - Content identifier
     * @returns {Buffer} File buffer
     */
    async getFile(cid) {
        try {
            if (!this.isConnected) {
                await this.initialize();
            }

            const chunks = [];
            for await (const chunk of this.client.cat(cid)) {
                chunks.push(chunk);
            }

            const fileBuffer = Buffer.concat(chunks);
            logger.info(`File retrieved from IPFS. CID: ${cid}, Size: ${fileBuffer.length} bytes`);

            return fileBuffer;
        } catch (error) {
            logger.error(`Failed to retrieve file from IPFS (CID: ${cid}):`, error);
            throw new Error(`IPFS retrieval failed: ${error.message}`);
        }
    }

    /**
     * Pin file to ensure persistence
     * @param {string} cid - Content identifier
     * @returns {boolean} Success status
     */
    async pinFile(cid) {
        try {
            if (!this.isConnected) {
                await this.initialize();
            }

            await this.client.pin.add(cid);
            logger.info(`File pinned to IPFS. CID: ${cid}`);
            return true;
        } catch (error) {
            logger.error(`Failed to pin file (CID: ${cid}):`, error);
            throw new Error(`IPFS pin failed: ${error.message}`);
        }
    }

    /**
     * Unpin file
     * @param {string} cid - Content identifier
     * @returns {boolean} Success status
     */
    async unpinFile(cid) {
        try {
            if (!this.isConnected) {
                await this.initialize();
            }

            await this.client.pin.rm(cid);
            logger.info(`File unpinned from IPFS. CID: ${cid}`);
            return true;
        } catch (error) {
            logger.error(`Failed to unpin file (CID: ${cid}):`, error);
            throw new Error(`IPFS unpin failed: ${error.message}`);
        }
    }

    /**
     * Check if file is pinned
     * @param {string} cid - Content identifier
     * @returns {boolean} Pin status
     */
    async isPinned(cid) {
        try {
            if (!this.isConnected) {
                await this.initialize();
            }

            for await (const { cid: pinnedCid } of this.client.pin.ls({ paths: cid })) {
                if (pinnedCid.toString() === cid) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            logger.error(`Failed to check pin status (CID: ${cid}):`, error);
            return false;
        }
    }

    /**
     * Get file stats
     * @param {string} cid - Content identifier
     * @returns {Object} File statistics
     */
    async getFileStats(cid) {
        try {
            if (!this.isConnected) {
                await this.initialize();
            }

            const stats = await this.client.files.stat(`/ipfs/${cid}`);

            return {
                cid: stats.cid.toString(),
                size: stats.size,
                cumulativeSize: stats.cumulativeSize,
                blocks: stats.blocks,
                type: stats.type
            };
        } catch (error) {
            logger.error(`Failed to get file stats (CID: ${cid}):`, error);
            throw new Error(`IPFS stat failed: ${error.message}`);
        }
    }

    /**
     * Validate CID format
     * @param {string} cid - Content identifier
     * @returns {boolean} Validation result
     */
    validateCID(cid) {
        try {
            // Basic CID validation (v0 and v1)
            const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
            const cidV1Regex = /^b[A-Za-z2-7]{58}$/;

            return cidV0Regex.test(cid) || cidV1Regex.test(cid);
        } catch (error) {
            return false;
        }
    }

    /**
     * Get IPFS gateway URL for a CID
     * @param {string} cid - Content identifier
     * @returns {string} Gateway URL
     */
    getGatewayURL(cid) {
        const gateway = process.env.IPFS_GATEWAY || 'http://localhost:8080';
        return `${gateway}/ipfs/${cid}`;
    }

    /**
     * Check IPFS connection status
     * @returns {boolean} Connection status
     */
    async checkConnection() {
        try {
            if (!this.client) {
                return false;
            }

            await this.client.version();
            this.isConnected = true;
            return true;
        } catch (error) {
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Get IPFS node info
     * @returns {Object} Node information
     */
    async getNodeInfo() {
        try {
            if (!this.isConnected) {
                await this.initialize();
            }

            const [version, id] = await Promise.all([
                this.client.version(),
                this.client.id()
            ]);

            return {
                version: version.version,
                peerId: id.id,
                addresses: id.addresses,
                agentVersion: id.agentVersion,
                protocolVersion: id.protocolVersion
            };
        } catch (error) {
            logger.error('Failed to get IPFS node info:', error);
            throw error;
        }
    }
}

module.exports = new IPFSService();
