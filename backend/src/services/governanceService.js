const crypto = require('crypto');
const { ethers } = require('ethers');
const logger = require('../utils/logger');
const db = require('../database/models');
const ethereumService = require('./ethereumService');
const fabricService = require('./fabricService');

class GovernanceService {
    constructor() {
        this.proposalTypes = {
            ACTIVATE_ORG: 'activate_organization',
            DEACTIVATE_ORG: 'deactivate_organization',
            BAN_ORG: 'ban_organization',
            UNBAN_ORG: 'unban_organization',
            UPDATE_POLICY: 'update_policy',
            UPGRADE_CONTRACT: 'upgrade_contract',
            EMERGENCY_PAUSE: 'emergency_pause'
        };

        this.quorumRequirements = {
            activate_organization: 51,
            deactivate_organization: 67,
            ban_organization: 75,
            unban_organization: 51,
            update_policy: 67,
            upgrade_contract: 80,
            emergency_pause: 51
        };
    }

    /**
     * Create a new governance proposal
     * @param {Object} proposalData - Proposal details
     * @param {string} proposerOrgId - Organization creating the proposal
     * @returns {Object} Created proposal
     */
    async createProposal(proposalData, proposerOrgId) {
        try {
            // Validate proposer is active organization
            const proposer = await db.Organization.findOne({
                where: { orgId: proposerOrgId, isActive: true }
            });

            if (!proposer) {
                throw new Error('Proposer organization not found or inactive');
            }

            // Validate proposal type
            if (!Object.values(this.proposalTypes).includes(proposalData.type)) {
                throw new Error('Invalid proposal type');
            }

            // Generate proposal ID
            const proposalId = '0x' + crypto.randomBytes(32).toString('hex');

            // Calculate voting deadline (default: 7 days)
            const votingPeriod = parseInt(process.env.GOVERNANCE_VOTING_PERIOD) || 7 * 24 * 60 * 60 * 1000;
            const votingDeadline = new Date(Date.now() + votingPeriod);

            // Get quorum requirement
            const quorumRequired = this.quorumRequirements[proposalData.type] || 51;

            // Create proposal
            const proposal = await db.sequelize.query(
                `INSERT INTO governance_proposals 
                (proposal_id, proposal_type, title, description, proposer_org_id, target_org_id, 
                 payload, status, quorum_required, voting_deadline)
                VALUES (:proposalId, :type, :title, :description, :proposerOrgId, :targetOrgId,
                        :payload, 'pending', :quorum, :deadline)
                RETURNING *`,
                {
                    replacements: {
                        proposalId,
                        type: proposalData.type,
                        title: proposalData.title,
                        description: proposalData.description || '',
                        proposerOrgId,
                        targetOrgId: proposalData.targetOrgId || null,
                        payload: JSON.stringify(proposalData.payload || {}),
                        quorum: quorumRequired,
                        deadline: votingDeadline
                    },
                    type: db.sequelize.QueryTypes.SELECT
                }
            );

            // Auto-vote yes from proposer
            await this.castVote(proposalId, proposerOrgId, true, proposer.walletAddress);

            // Log audit event
            await this.logAuditEvent('proposal_created', 'organization', proposerOrgId, 'proposal', proposalId, {
                type: proposalData.type,
                title: proposalData.title
            });

            logger.info(`Governance proposal created: ${proposalId} by ${proposerOrgId}`);

            return {
                proposalId,
                type: proposalData.type,
                title: proposalData.title,
                status: 'pending',
                votingDeadline,
                quorumRequired
            };

        } catch (error) {
            logger.error('Failed to create proposal:', error);
            throw error;
        }
    }

    /**
     * Cast a vote on a proposal
     * @param {string} proposalId - Proposal ID
     * @param {string} voterOrgId - Voting organization ID
     * @param {boolean} vote - true for yes, false for no
     * @param {string} signature - Optional signature for verification
     * @returns {Object} Vote result
     */
    async castVote(proposalId, voterOrgId, vote, signature = null) {
        try {
            // Validate voter is active organization
            const voter = await db.Organization.findOne({
                where: { orgId: voterOrgId, isActive: true }
            });

            if (!voter) {
                throw new Error('Voter organization not found or inactive');
            }

            // Get proposal
            const [proposal] = await db.sequelize.query(
                `SELECT * FROM governance_proposals WHERE proposal_id = :proposalId`,
                { replacements: { proposalId }, type: db.sequelize.QueryTypes.SELECT }
            );

            if (!proposal) {
                throw new Error('Proposal not found');
            }

            if (proposal.status !== 'pending') {
                throw new Error('Proposal is no longer open for voting');
            }

            if (new Date(proposal.voting_deadline) < new Date()) {
                throw new Error('Voting deadline has passed');
            }

            // Check if already voted
            const [existingVote] = await db.sequelize.query(
                `SELECT * FROM governance_votes WHERE proposal_id = :proposalId AND voter_org_id = :voterOrgId`,
                { replacements: { proposalId, voterOrgId }, type: db.sequelize.QueryTypes.SELECT }
            );

            if (existingVote) {
                throw new Error('Organization has already voted on this proposal');
            }

            // Get voting weight
            const weight = voter.governanceWeight || 1;

            // Record vote
            await db.sequelize.query(
                `INSERT INTO governance_votes (proposal_id, voter_org_id, vote, weight, signature)
                 VALUES (:proposalId, :voterOrgId, :vote, :weight, :signature)`,
                {
                    replacements: { proposalId, voterOrgId, vote, weight, signature }
                }
            );

            // Update proposal vote counts
            if (vote) {
                await db.sequelize.query(
                    `UPDATE governance_proposals 
                     SET votes_for = votes_for + :weight, total_weight = total_weight + :weight 
                     WHERE proposal_id = :proposalId`,
                    { replacements: { weight, proposalId } }
                );
            } else {
                await db.sequelize.query(
                    `UPDATE governance_proposals 
                     SET votes_against = votes_against + :weight, total_weight = total_weight + :weight 
                     WHERE proposal_id = :proposalId`,
                    { replacements: { weight, proposalId } }
                );
            }

            // Check if quorum reached and execute if passed
            await this.checkAndExecuteProposal(proposalId);

            logger.info(`Vote cast on proposal ${proposalId} by ${voterOrgId}: ${vote ? 'YES' : 'NO'}`);

            return {
                proposalId,
                voterOrgId,
                vote,
                weight,
                recorded: true
            };

        } catch (error) {
            logger.error('Failed to cast vote:', error);
            throw error;
        }
    }

    /**
     * Check if proposal reached quorum and execute if passed
     * @param {string} proposalId - Proposal ID
     */
    async checkAndExecuteProposal(proposalId) {
        try {
            const [proposal] = await db.sequelize.query(
                `SELECT * FROM governance_proposals WHERE proposal_id = :proposalId`,
                { replacements: { proposalId }, type: db.sequelize.QueryTypes.SELECT }
            );

            if (!proposal || proposal.status !== 'pending') return;

            // Get total voting power
            const [totalPower] = await db.sequelize.query(
                `SELECT COALESCE(SUM(governance_weight), 0) as total FROM organizations WHERE is_active = true`,
                { type: db.sequelize.QueryTypes.SELECT }
            );

            const totalVotingPower = parseInt(totalPower.total) || 1;
            const participationRate = (proposal.total_weight / totalVotingPower) * 100;
            const approvalRate = proposal.total_weight > 0 
                ? (proposal.votes_for / proposal.total_weight) * 100 
                : 0;

            // Check if quorum met and proposal passed
            if (participationRate >= 50 && approvalRate >= proposal.quorum_required) {
                await this.executeProposal(proposal);
            }

        } catch (error) {
            logger.error('Failed to check/execute proposal:', error);
        }
    }

    /**
     * Execute an approved proposal
     * @param {Object} proposal - Proposal to execute
     */
    async executeProposal(proposal) {
        try {
            logger.info(`Executing proposal: ${proposal.proposal_id}`);

            let ethereumTxHash = null;

            switch (proposal.proposal_type) {
                case this.proposalTypes.ACTIVATE_ORG:
                    await this.executeActivateOrg(proposal);
                    break;

                case this.proposalTypes.DEACTIVATE_ORG:
                    ethereumTxHash = await this.executeDeactivateOrg(proposal);
                    break;

                case this.proposalTypes.BAN_ORG:
                    await this.executeBanOrg(proposal);
                    break;

                case this.proposalTypes.UNBAN_ORG:
                    await this.executeUnbanOrg(proposal);
                    break;

                case this.proposalTypes.UPDATE_POLICY:
                    await this.executeUpdatePolicy(proposal);
                    break;

                case this.proposalTypes.EMERGENCY_PAUSE:
                    ethereumTxHash = await this.executeEmergencyPause(proposal);
                    break;

                default:
                    throw new Error(`Unknown proposal type: ${proposal.proposal_type}`);
            }

            // Mark proposal as executed
            await db.sequelize.query(
                `UPDATE governance_proposals 
                 SET status = 'executed', executed_at = NOW(), ethereum_tx_hash = :txHash 
                 WHERE proposal_id = :proposalId`,
                { replacements: { proposalId: proposal.proposal_id, txHash: ethereumTxHash } }
            );

            // Log audit event
            await this.logAuditEvent('proposal_executed', 'system', 'governance', 'proposal', proposal.proposal_id, {
                type: proposal.proposal_type
            });

            logger.info(`Proposal executed: ${proposal.proposal_id}`);

        } catch (error) {
            logger.error('Failed to execute proposal:', error);

            // Mark proposal as failed
            await db.sequelize.query(
                `UPDATE governance_proposals SET status = 'failed' WHERE proposal_id = :proposalId`,
                { replacements: { proposalId: proposal.proposal_id } }
            );

            throw error;
        }
    }

    /**
     * Execute organization activation
     */
    async executeActivateOrg(proposal) {
        const payload = typeof proposal.payload === 'string' 
            ? JSON.parse(proposal.payload) 
            : proposal.payload;

        // Activate in local database
        await db.Organization.update(
            { isActive: true, status: 'active' },
            { where: { orgId: proposal.target_org_id } }
        );

        // If organization has wallet, register on Ethereum
        const org = await db.Organization.findOne({ where: { orgId: proposal.target_org_id } });
        if (org && org.walletAddress) {
            try {
                await ethereumService.registerOrganization(
                    org.orgId,
                    org.orgType,
                    org.walletAddress,
                    org.name,
                    org.metadata || ''
                );
            } catch (ethError) {
                logger.warn('Ethereum registration failed (non-critical):', ethError.message);
            }
        }
    }

    /**
     * Execute organization deactivation
     */
    async executeDeactivateOrg(proposal) {
        // Deactivate in local database
        await db.Organization.update(
            { isActive: false, status: 'inactive' },
            { where: { orgId: proposal.target_org_id } }
        );

        // Deactivate on Ethereum
        try {
            const result = await ethereumService.deactivateOrganization(proposal.target_org_id);
            return result.transactionHash;
        } catch (ethError) {
            logger.warn('Ethereum deactivation failed:', ethError.message);
            return null;
        }
    }

    /**
     * Execute organization ban
     */
    async executeBanOrg(proposal) {
        const payload = typeof proposal.payload === 'string' 
            ? JSON.parse(proposal.payload) 
            : proposal.payload;

        const banDuration = payload.banDuration || 30 * 24 * 60 * 60 * 1000; // Default 30 days
        const banExpiresAt = new Date(Date.now() + banDuration);

        await db.Organization.update(
            { 
                isActive: false, 
                status: 'banned',
                banExpiresAt 
            },
            { where: { orgId: proposal.target_org_id } }
        );

        // Deactivate on Ethereum
        try {
            await ethereumService.deactivateOrganization(proposal.target_org_id);
        } catch (ethError) {
            logger.warn('Ethereum deactivation for ban failed:', ethError.message);
        }
    }

    /**
     * Execute organization unban
     */
    async executeUnbanOrg(proposal) {
        await db.Organization.update(
            { 
                isActive: true, 
                status: 'active',
                banExpiresAt: null 
            },
            { where: { orgId: proposal.target_org_id } }
        );
    }

    /**
     * Execute policy update
     */
    async executeUpdatePolicy(proposal) {
        const payload = typeof proposal.payload === 'string' 
            ? JSON.parse(proposal.payload) 
            : proposal.payload;

        // Store policy update in database
        await db.sequelize.query(
            `INSERT INTO audit_log (action, actor_type, actor_id, target_type, target_id, details)
             VALUES ('policy_updated', 'governance', :proposalId, 'policy', :policyKey, :payload)`,
            {
                replacements: {
                    proposalId: proposal.proposal_id,
                    policyKey: payload.policyKey || 'unknown',
                    payload: JSON.stringify(payload)
                }
            }
        );
    }

    /**
     * Execute emergency pause
     */
    async executeEmergencyPause(proposal) {
        try {
            // Pause Ethereum contract
            const tx = await ethereumService.contract.pause({
                gasLimit: process.env.GAS_LIMIT || 3000000
            });
            const receipt = await tx.wait();
            return receipt.hash;
        } catch (error) {
            logger.error('Emergency pause failed:', error);
            throw error;
        }
    }

    /**
     * Get proposal details
     */
    async getProposal(proposalId) {
        try {
            const [proposal] = await db.sequelize.query(
                `SELECT * FROM governance_proposals WHERE proposal_id = :proposalId`,
                { replacements: { proposalId }, type: db.sequelize.QueryTypes.SELECT }
            );

            if (!proposal) {
                throw new Error('Proposal not found');
            }

            // Get votes
            const votes = await db.sequelize.query(
                `SELECT gv.*, o.name as org_name 
                 FROM governance_votes gv 
                 JOIN organizations o ON gv.voter_org_id = o.org_id 
                 WHERE gv.proposal_id = :proposalId`,
                { replacements: { proposalId }, type: db.sequelize.QueryTypes.SELECT }
            );

            return {
                ...proposal,
                votes
            };

        } catch (error) {
            logger.error('Failed to get proposal:', error);
            throw error;
        }
    }

    /**
     * Get all proposals with optional filtering
     */
    async getProposals(filters = {}) {
        try {
            let query = `SELECT * FROM governance_proposals WHERE 1=1`;
            const replacements = {};

            if (filters.status) {
                query += ` AND status = :status`;
                replacements.status = filters.status;
            }

            if (filters.type) {
                query += ` AND proposal_type = :type`;
                replacements.type = filters.type;
            }

            if (filters.proposerOrgId) {
                query += ` AND proposer_org_id = :proposerOrgId`;
                replacements.proposerOrgId = filters.proposerOrgId;
            }

            query += ` ORDER BY created_at DESC LIMIT :limit OFFSET :offset`;
            replacements.limit = filters.limit || 50;
            replacements.offset = filters.offset || 0;

            const proposals = await db.sequelize.query(query, {
                replacements,
                type: db.sequelize.QueryTypes.SELECT
            });

            return proposals;

        } catch (error) {
            logger.error('Failed to get proposals:', error);
            throw error;
        }
    }

    /**
     * Finalize expired proposals
     */
    async finalizeExpiredProposals() {
        try {
            // Get expired pending proposals
            const expired = await db.sequelize.query(
                `SELECT * FROM governance_proposals 
                 WHERE status = 'pending' AND voting_deadline < NOW()`,
                { type: db.sequelize.QueryTypes.SELECT }
            );

            for (const proposal of expired) {
                // Check final vote count
                const approvalRate = proposal.total_weight > 0 
                    ? (proposal.votes_for / proposal.total_weight) * 100 
                    : 0;

                if (approvalRate >= proposal.quorum_required) {
                    await this.executeProposal(proposal);
                } else {
                    await db.sequelize.query(
                        `UPDATE governance_proposals SET status = 'rejected' WHERE proposal_id = :proposalId`,
                        { replacements: { proposalId: proposal.proposal_id } }
                    );
                }
            }

            return expired.length;

        } catch (error) {
            logger.error('Failed to finalize expired proposals:', error);
            throw error;
        }
    }

    /**
     * Log audit event
     */
    async logAuditEvent(action, actorType, actorId, targetType, targetId, details) {
        try {
            await db.sequelize.query(
                `INSERT INTO audit_log (action, actor_type, actor_id, target_type, target_id, details)
                 VALUES (:action, :actorType, :actorId, :targetType, :targetId, :details)`,
                {
                    replacements: {
                        action,
                        actorType,
                        actorId,
                        targetType,
                        targetId,
                        details: JSON.stringify(details)
                    }
                }
            );
        } catch (error) {
            logger.error('Failed to log audit event:', error);
        }
    }

    /**
     * Register new organization (pending governance approval)
     */
    async registerOrganizationRequest(orgData, requesterAddress) {
        try {
            // Create organization record with pending status
            const org = await db.Organization.create({
                orgId: orgData.orgId,
                orgType: orgData.orgType,
                walletAddress: requesterAddress.toLowerCase(),
                name: orgData.name,
                metadata: JSON.stringify(orgData.metadata || {}),
                registrationTimestamp: Date.now(),
                isActive: false,
                status: 'pending_approval',
                governanceWeight: 1
            });

            // Auto-create activation proposal if instant approval disabled
            if (process.env.GOVERNANCE_AUTO_APPROVE !== 'true') {
                await this.createProposal({
                    type: this.proposalTypes.ACTIVATE_ORG,
                    title: `Activate Organization: ${orgData.name}`,
                    description: `Request to activate organization ${orgData.orgId} (${orgData.name})`,
                    targetOrgId: orgData.orgId,
                    payload: { orgData }
                }, process.env.GOVERNANCE_ADMIN_ORG || 'SYSTEM');
            } else {
                // Instant approval for development
                await db.Organization.update(
                    { isActive: true, status: 'active' },
                    { where: { orgId: orgData.orgId } }
                );
            }

            return org;

        } catch (error) {
            logger.error('Failed to register organization:', error);
            throw error;
        }
    }
}

module.exports = new GovernanceService();
