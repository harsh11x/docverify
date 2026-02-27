/**
 * IPFS Service — communicates with Kubo (go-ipfs) via native fetch().
 * Replaces ipfs-http-client (ESM-only, incompatible with CommonJS on Node 25).
 *
 * Kubo RPC API docs: https://docs.ipfs.tech/reference/kubo/rpc/
 */

const logger = require('../utils/logger');

class IPFSService {
    constructor() {
        this.baseUrl = null;
        this.gatewayUrl = null;
        this._connected = false;
    }

    _getBaseUrl() {
        if (!this.baseUrl) {
            const protocol = process.env.IPFS_PROTOCOL || 'http';
            const host = process.env.IPFS_HOST || 'localhost';
            const port = process.env.IPFS_PORT || 5001;
            this.baseUrl = `${protocol}://${host}:${port}/api/v0`;
            this.gatewayUrl = process.env.IPFS_GATEWAY || 'http://localhost:8080';
        }
        return this.baseUrl;
    }

    /**
     * Initialize IPFS client — just verifies connection
     */
    async initialize() {
        try {
            const base = this._getBaseUrl();
            const res = await fetch(`${base}/version`, { method: 'POST' });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            const data = await res.json();
            this._connected = true;
            logger.info(`IPFS client initialized. Version: ${data.Version}`);
            return true;
        } catch (error) {
            this._connected = false;
            logger.error('Failed to initialize IPFS client:', error.message);
            throw error;
        }
    }

    /**
     * Upload file to IPFS using multipart/form-data
     * @param {Buffer} fileBuffer
     * @param {Object} options
     * @returns {{ cid: string, size: number }}
     */
    async uploadFile(fileBuffer, options = {}) {
        try {
            const base = this._getBaseUrl();
            const pin = options.pin !== false;

            // Build form data manually (fetch FormData works in Node 18+)
            const FormData = (await import('node:buffer')).Blob;
            const boundary = `----FormBoundary${Math.random().toString(36).slice(2)}`;

            const body = Buffer.concat([
                Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"\r\nContent-Type: application/octet-stream\r\n\r\n`),
                fileBuffer,
                Buffer.from(`\r\n--${boundary}--\r\n`)
            ]);

            const url = `${base}/add?pin=${pin}&quieter=true`;
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': body.length.toString(),
                },
                body,
            });

            if (!res.ok) {
                throw new Error(`IPFS add failed: HTTP ${res.status} ${res.statusText}`);
            }

            // Response is newline-delimited JSON
            const text = await res.text();
            const lines = text.trim().split('\n').filter(Boolean);
            const lastLine = JSON.parse(lines[lines.length - 1]);

            const cid = lastLine.Hash;
            const size = lastLine.Size || 0;

            logger.info(`File uploaded to IPFS. CID: ${cid}`);
            return { cid, path: cid, size: parseInt(size, 10) };
        } catch (error) {
            logger.error('Failed to upload file to IPFS:', error.message);
            throw new Error(`IPFS upload failed: ${error.message}`);
        }
    }

    /**
     * Retrieve file from IPFS
     * @param {string} cid
     * @returns {Buffer}
     */
    async getFile(cid) {
        try {
            const base = this._getBaseUrl();
            const res = await fetch(`${base}/cat?arg=${encodeURIComponent(cid)}`, { method: 'POST' });

            if (!res.ok) {
                throw new Error(`IPFS cat failed: HTTP ${res.status} ${res.statusText}`);
            }

            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            logger.info(`File retrieved from IPFS. CID: ${cid}, Size: ${buffer.length} bytes`);
            return buffer;
        } catch (error) {
            logger.error(`Failed to retrieve file from IPFS (CID: ${cid}):`, error.message);
            throw new Error(`IPFS retrieval failed: ${error.message}`);
        }
    }

    /**
     * Pin a file
     * @param {string} cid
     */
    async pinFile(cid) {
        try {
            const base = this._getBaseUrl();
            const res = await fetch(`${base}/pin/add?arg=${encodeURIComponent(cid)}`, { method: 'POST' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            logger.info(`File pinned to IPFS. CID: ${cid}`);
            return true;
        } catch (error) {
            logger.error(`Failed to pin file (CID: ${cid}):`, error.message);
            throw new Error(`IPFS pin failed: ${error.message}`);
        }
    }

    /**
     * Unpin a file
     * @param {string} cid
     */
    async unpinFile(cid) {
        try {
            const base = this._getBaseUrl();
            const res = await fetch(`${base}/pin/rm?arg=${encodeURIComponent(cid)}`, { method: 'POST' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            logger.info(`File unpinned from IPFS. CID: ${cid}`);
            return true;
        } catch (error) {
            logger.error(`Failed to unpin file (CID: ${cid}):`, error.message);
            throw new Error(`IPFS unpin failed: ${error.message}`);
        }
    }

    /**
     * Check if a CID is pinned
     * @param {string} cid
     * @returns {boolean}
     */
    async isPinned(cid) {
        try {
            const base = this._getBaseUrl();
            const res = await fetch(`${base}/pin/ls?arg=${encodeURIComponent(cid)}&type=all`, { method: 'POST' });
            if (!res.ok) return false;
            const data = await res.json();
            return !!(data.Keys && data.Keys[cid]);
        } catch {
            return false;
        }
    }

    /**
     * Get file stats
     * @param {string} cid
     */
    async getFileStats(cid) {
        try {
            const base = this._getBaseUrl();
            const res = await fetch(`${base}/object/stat?arg=${encodeURIComponent(cid)}`, { method: 'POST' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return {
                cid,
                size: data.DataSize || 0,
                cumulativeSize: data.CumulativeSize || 0,
                blocks: data.NumLinks || 0,
                type: 'file'
            };
        } catch (error) {
            throw new Error(`IPFS stat failed: ${error.message}`);
        }
    }

    /**
     * Validate CID format
     * @param {string} cid
     * @returns {boolean}
     */
    validateCID(cid) {
        const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
        const cidV1Regex = /^b[A-Za-z2-7]{58}$/;
        return cidV0Regex.test(cid) || cidV1Regex.test(cid);
    }

    /**
     * Get public gateway URL for a CID
     * @param {string} cid
     * @returns {string}
     */
    getGatewayURL(cid) {
        const gateway = this.gatewayUrl || process.env.IPFS_GATEWAY || 'http://localhost:8080';
        return `${gateway}/ipfs/${cid}`;
    }

    /**
     * Check connection status
     * @returns {boolean}
     */
    async checkConnection() {
        try {
            const base = this._getBaseUrl();
            const res = await fetch(`${base}/version`, { method: 'POST' });
            this._connected = res.ok;
            return this._connected;
        } catch {
            this._connected = false;
            return false;
        }
    }

    /**
     * Get IPFS node info
     */
    async getNodeInfo() {
        const base = this._getBaseUrl();
        const [vRes, idRes] = await Promise.all([
            fetch(`${base}/version`, { method: 'POST' }),
            fetch(`${base}/id`, { method: 'POST' }),
        ]);
        const version = await vRes.json();
        const id = await idRes.json();
        return {
            version: version.Version,
            peerId: id.ID,
            addresses: id.Addresses,
            agentVersion: id.AgentVersion,
            protocolVersion: id.ProtocolVersion
        };
    }
}

module.exports = new IPFSService();
