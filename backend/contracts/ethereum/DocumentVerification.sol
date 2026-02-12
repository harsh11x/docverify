// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title DocumentVerification
 * @dev Decentralized document verification smart contract
 * @notice Stores immutable verification proofs anchored from Hyperledger Fabric
 */
contract DocumentVerification is 
    Initializable, 
    AccessControlUpgradeable, 
    PausableUpgradeable, 
    UUPSUpgradeable 
{
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ORGANIZATION_ROLE = keccak256("ORGANIZATION_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // Organization types
    enum OrgType { UNIVERSITY, GOVERNMENT, CORPORATE, CERTIFICATION_BODY }

    // Organization structure
    struct Organization {
        string orgId;
        OrgType orgType;
        address walletAddress;
        uint256 registrationTimestamp;
        bool isActive;
        string name;
        string metadata; // IPFS CID for additional org data
    }

    // Document verification structure
    struct DocumentVerification {
        bytes32 documentHash;
        string ipfsCID;
        string organizationId;
        bool verified;
        uint256 blockTimestamp;
        bytes32 fabricProofHash;
        uint256 blockNumber;
    }

    // Storage mappings
    mapping(string => Organization) public organizations;
    mapping(bytes32 => DocumentVerification) public verifications;
    mapping(address => string) public walletToOrgId;
    
    // Organization list for enumeration
    string[] public organizationIds;
    
    // Nonce tracking for replay protection
    mapping(address => uint256) public nonces;

    // Events
    event OrganizationRegistered(
        string indexed orgId,
        address indexed walletAddress,
        OrgType orgType,
        uint256 timestamp
    );

    event OrganizationDeactivated(
        string indexed orgId,
        address indexed walletAddress,
        uint256 timestamp
    );

    event DocumentVerified(
        bytes32 indexed documentHash,
        string indexed organizationId,
        string ipfsCID,
        bytes32 fabricProofHash,
        uint256 timestamp,
        uint256 blockNumber
    );

    event DocumentRejected(
        bytes32 indexed documentHash,
        string indexed organizationId,
        string reason,
        uint256 timestamp
    );

    event OrganizationUpdated(
        string indexed orgId,
        address indexed newWalletAddress,
        uint256 timestamp
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract
     * @param _admin Address of the initial admin
     */
    function initialize(address _admin) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
    }

    /**
     * @dev Register a new organization
     * @param _orgId Unique organization identifier
     * @param _orgType Type of organization
     * @param _walletAddress Organization's wallet address
     * @param _name Organization name
     * @param _metadata IPFS CID for additional metadata
     */
    function registerOrganization(
        string memory _orgId,
        OrgType _orgType,
        address _walletAddress,
        string memory _name,
        string memory _metadata
    ) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(bytes(_orgId).length > 0, "Invalid organization ID");
        require(_walletAddress != address(0), "Invalid wallet address");
        require(!organizations[_orgId].isActive, "Organization already exists");
        require(bytes(walletToOrgId[_walletAddress]).length == 0, "Wallet already registered");

        organizations[_orgId] = Organization({
            orgId: _orgId,
            orgType: _orgType,
            walletAddress: _walletAddress,
            registrationTimestamp: block.timestamp,
            isActive: true,
            name: _name,
            metadata: _metadata
        });

        walletToOrgId[_walletAddress] = _orgId;
        organizationIds.push(_orgId);

        // Grant organization role
        _grantRole(ORGANIZATION_ROLE, _walletAddress);

        emit OrganizationRegistered(_orgId, _walletAddress, _orgType, block.timestamp);
    }

    /**
     * @dev Deactivate an organization
     * @param _orgId Organization identifier
     */
    function deactivateOrganization(string memory _orgId) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenNotPaused 
    {
        require(organizations[_orgId].isActive, "Organization not active");

        organizations[_orgId].isActive = false;
        address walletAddress = organizations[_orgId].walletAddress;

        // Revoke organization role
        _revokeRole(ORGANIZATION_ROLE, walletAddress);

        emit OrganizationDeactivated(_orgId, walletAddress, block.timestamp);
    }

    /**
     * @dev Verify a document and store proof on-chain
     * @param _documentHash SHA-256 hash of the document
     * @param _ipfsCID IPFS content identifier
     * @param _organizationId Organization that verified the document
     * @param _fabricProofHash Cross-chain proof hash from Fabric
     */
    function verifyDocument(
        bytes32 _documentHash,
        string memory _ipfsCID,
        string memory _organizationId,
        bytes32 _fabricProofHash
    ) external onlyRole(ORGANIZATION_ROLE) whenNotPaused {
        require(_documentHash != bytes32(0), "Invalid document hash");
        require(bytes(_ipfsCID).length > 0, "Invalid IPFS CID");
        require(organizations[_organizationId].isActive, "Organization not active");
        require(
            keccak256(bytes(walletToOrgId[msg.sender])) == keccak256(bytes(_organizationId)),
            "Unauthorized organization"
        );
        require(verifications[_documentHash].blockTimestamp == 0, "Document already verified");

        verifications[_documentHash] = DocumentVerification({
            documentHash: _documentHash,
            ipfsCID: _ipfsCID,
            organizationId: _organizationId,
            verified: true,
            blockTimestamp: block.timestamp,
            fabricProofHash: _fabricProofHash,
            blockNumber: block.number
        });

        emit DocumentVerified(
            _documentHash,
            _organizationId,
            _ipfsCID,
            _fabricProofHash,
            block.timestamp,
            block.number
        );
    }

    /**
     * @dev Reject a document verification
     * @param _documentHash SHA-256 hash of the document
     * @param _organizationId Organization rejecting the document
     * @param _reason Rejection reason
     */
    function rejectDocument(
        bytes32 _documentHash,
        string memory _organizationId,
        string memory _reason
    ) external onlyRole(ORGANIZATION_ROLE) whenNotPaused {
        require(_documentHash != bytes32(0), "Invalid document hash");
        require(organizations[_organizationId].isActive, "Organization not active");
        require(
            keccak256(bytes(walletToOrgId[msg.sender])) == keccak256(bytes(_organizationId)),
            "Unauthorized organization"
        );

        emit DocumentRejected(_documentHash, _organizationId, _reason, block.timestamp);
    }

    /**
     * @dev Get document verification details
     * @param _documentHash Document hash to query
     * @return DocumentVerification struct
     */
    function getDocumentVerification(bytes32 _documentHash) 
        external 
        view 
        returns (DocumentVerification memory) 
    {
        return verifications[_documentHash];
    }

    /**
     * @dev Check if a document is verified
     * @param _documentHash Document hash to check
     * @return bool verification status
     */
    function isDocumentVerified(bytes32 _documentHash) external view returns (bool) {
        return verifications[_documentHash].verified;
    }

    /**
     * @dev Get organization details
     * @param _orgId Organization identifier
     * @return Organization struct
     */
    function getOrganization(string memory _orgId) 
        external 
        view 
        returns (Organization memory) 
    {
        return organizations[_orgId];
    }

    /**
     * @dev Get organization by wallet address
     * @param _wallet Wallet address
     * @return Organization struct
     */
    function getOrganizationByWallet(address _wallet) 
        external 
        view 
        returns (Organization memory) 
    {
        string memory orgId = walletToOrgId[_wallet];
        require(bytes(orgId).length > 0, "Organization not found");
        return organizations[orgId];
    }

    /**
     * @dev Get total number of organizations
     * @return uint256 count
     */
    function getOrganizationCount() external view returns (uint256) {
        return organizationIds.length;
    }

    /**
     * @dev Update organization wallet address
     * @param _orgId Organization identifier
     * @param _newWalletAddress New wallet address
     */
    function updateOrganizationWallet(
        string memory _orgId,
        address _newWalletAddress
    ) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(organizations[_orgId].isActive, "Organization not active");
        require(_newWalletAddress != address(0), "Invalid wallet address");
        require(bytes(walletToOrgId[_newWalletAddress]).length == 0, "Wallet already registered");

        address oldWallet = organizations[_orgId].walletAddress;
        
        // Revoke old wallet role
        _revokeRole(ORGANIZATION_ROLE, oldWallet);
        delete walletToOrgId[oldWallet];

        // Update to new wallet
        organizations[_orgId].walletAddress = _newWalletAddress;
        walletToOrgId[_newWalletAddress] = _orgId;
        _grantRole(ORGANIZATION_ROLE, _newWalletAddress);

        emit OrganizationUpdated(_orgId, _newWalletAddress, block.timestamp);
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Authorize upgrade (UUPS pattern)
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        onlyRole(UPGRADER_ROLE) 
        override 
    {}

    /**
     * @dev Get nonce for replay protection
     * @param _address Address to get nonce for
     * @return uint256 current nonce
     */
    function getNonce(address _address) external view returns (uint256) {
        return nonces[_address];
    }

    /**
     * @dev Increment nonce (called internally or by authorized contracts)
     * @param _address Address to increment nonce for
     */
    function incrementNonce(address _address) external onlyRole(ORGANIZATION_ROLE) {
        nonces[_address]++;
    }
}
