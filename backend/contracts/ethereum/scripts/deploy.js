const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Deploying DocumentVerification contract...");

    const [deployer] = await ethers.getSigners();

    console.log("Deploying with account:", deployer.address);
    console.log(
        "Account balance:",
        (await ethers.provider.getBalance(deployer.address)).toString()
    );

    const DocumentVerification = await ethers.getContractFactory(
        "DocumentVerification"
    );

    // Deploy as UUPS upgradeable proxy
    const contract = await upgrades.deployProxy(
        DocumentVerification,
        [deployer.address], // initializer args: _admin
        {
            initializer: "initialize",
            kind: "uups",
        }
    );

    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log("✓ DocumentVerification deployed to:", contractAddress);
    console.log("✓ Admin address:", deployer.address);

    // Write address to a file for easy retrieval
    const deploymentInfo = {
        contractAddress,
        deployer: deployer.address,
        network: hre.network.name,
        timestamp: new Date().toISOString(),
    };

    const deploymentPath = path.join(__dirname, "../deployment.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("✓ Deployment info saved to:", deploymentPath);

    // Grant ORGANIZATION_ROLE to deployer so we can test verifyDocument
    const ORGANIZATION_ROLE = await contract.ORGANIZATION_ROLE();
    await contract.registerOrganization(
        "org1",
        0, // UNIVERSITY
        deployer.address,
        "Test University",
        ""
    );
    console.log("✓ Registered test organization 'org1' for deployer address");

    console.log("\n=== Add to backend/.env ===");
    console.log(`ETHEREUM_CONTRACT_ADDRESS=${contractAddress}`);
    console.log(`ETHEREUM_PRIVATE_KEY=${(await ethers.provider.getSigner(0)).privateKey || "use_ganache_key_0"}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
