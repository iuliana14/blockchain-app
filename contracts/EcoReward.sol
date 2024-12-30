pragma solidity >=0.4.22 <0.9.0;
pragma experimental ABIEncoderV2;

contract EcoReward {
    mapping(address => uint) public rewards;

    event RewardIssued(address indexed user, uint amount);
    event RewardClaimed(address indexed user, uint amount);
    event ActivityAdded(string activityName, uint rewardRate);

    struct Activity {
        string name;
        uint rewardRate; // Rata de recompensă per unitate
    }

    Activity[] public activities; // Lista activităților disponibile

    constructor() public payable {
        // Inițializăm activități de bază
        addActivity("Recycling", 1);
        addActivity("Planting Trees", 2);
        addActivity("Using Public Transport", 3);
    }

    function addActivity(string memory activityName, uint rewardRate) public {
        activities.push(Activity(activityName, rewardRate));
        emit ActivityAdded(activityName, rewardRate);
    }

    function logEcoActivity(uint activityIndex, uint detail, address user) public {
        require(activityIndex < activities.length, "Invalid activity index");
        uint rewardAmount = activities[activityIndex].rewardRate * detail;
        rewards[user] += rewardAmount;
        emit RewardIssued(user, rewardAmount);
    }

	function claimReward() public payable {
		uint rewardAmount = rewards[msg.sender];

		require(rewardAmount > 0, "No reward available");
		require(address(this).balance >= rewardAmount, "Not enough funds in contract");

		rewards[msg.sender] = 0;
		
        // Transferă folosind metoda `transfer`
        msg.sender.transfer(rewardAmount);

		emit RewardClaimed(msg.sender, rewardAmount);
	}


    function getActivities() public view returns (Activity[] memory) {
        return activities;
    }

    // Funcție pentru a permite alimentarea contractului
    function depositFunds() public payable {}
}
