const EcoReward = artifacts.require("EcoReward");

module.exports = function(deployer) {
  deployer.deploy(EcoReward);
};
