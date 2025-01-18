pragma solidity >=0.4.22 <0.9.0;
pragma experimental ABIEncoderV2;

contract EcoReward {
    mapping(address => uint) public rewards;

    event RewardIssued(address indexed user, uint amount);
    event RewardClaimed(address indexed user, uint amount);
    event ActivityAdded(string activityName, uint rewardRate);
	event DebugActivity(uint index, uint rewardRate);

    struct Activity {
        string name;
        uint rewardRate; // Rata de recompensă per unitate
    }

    Activity[] public activities; // Lista activităților disponibile

    constructor() public payable {
    }

	function addAndLogActivity(
			string memory activityName,
			uint rewardRate,
			address user
		) public {
			// Adauga o noua activitate
			activities.push(Activity(activityName, rewardRate));
			emit ActivityAdded(activityName, rewardRate);

			// Calculeaza recompensa si actualizeaza balanta utilizatorului
			uint rewardAmount = rewardRate;
			rewards[user] += rewardAmount;
			emit RewardIssued(user, rewardAmount);
		}


	function claimReward() public payable {
		uint rewardAmount = rewards[msg.sender];

		require(rewardAmount > 0, "No reward available");
		require(address(this).balance >= rewardAmount, "Not enough funds in contract");

		rewards[msg.sender] = 0;
		
        msg.sender.transfer(rewardAmount);

		emit RewardClaimed(msg.sender, rewardAmount);
	}


    function getActivities() public view returns (Activity[] memory) {
        return activities;
    }

    // Functie pentru a permite alimentarea contractului
    function depositFunds() public payable {}

	function claimSelectedRewards(uint[] memory activityIndexes) public {
    uint totalReward = 0;

    for (uint i = 0; i < activityIndexes.length; i++) {
        uint index = activityIndexes[i];
        require(index < activities.length, "Invalid activity index");

        Activity storage activity = activities[index];
        emit DebugActivity(index, activity.rewardRate); // Debugging event
        require(activity.rewardRate > 0, "Activity already claimed");

        totalReward += activity.rewardRate;
        activity.rewardRate = 0;
    }

    require(totalReward > 0, "No valid rewards to claim");
    require(address(this).balance >= totalReward, "Not enough funds in contract");

	// Transfer recompense utilizatorului
    rewards[msg.sender] = 0;
    msg.sender.transfer(totalReward); // Transfer fonduri
    emit RewardClaimed(msg.sender, totalReward);
}
}
