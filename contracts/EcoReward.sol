pragma solidity >=0.4.22 <0.9.0;
pragma experimental ABIEncoderV2;

contract EcoReward {
    mapping(address => uint) public rewards;
    address public admin; // Adminul care poate adăuga activități

    event RewardIssued(address indexed user, uint amount);
    event RewardClaimed(address indexed user, uint amount);
    event ActivityAdded(string activityName, uint rewardRate);

    struct Activity {
        string name;
        uint rewardRate; // Rata de recompensă per unitate
    }

    Activity[] public activities; // Lista activităților disponibile

    constructor() public payable {
        admin = msg.sender; // Setăm adminul ca fiind contul care a implementat contractul
        // Inițializăm activități de bază
        addActivity("Recycling", 1);
        addActivity("Planting Trees", 2);
        addActivity("Using Public Transport", 3);
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can add activities");
        _;
    }

    function addActivity(string memory activityName, uint rewardRate) public onlyAdmin {
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

        address recipient = msg.sender;
        address payable recipientPayable = address(uint160(recipient));
        recipientPayable.transfer(rewardAmount);

        emit RewardClaimed(msg.sender, rewardAmount);
    }

    function getActivities() public view returns (Activity[] memory) {
		return activities;
    }

	  // Funcție pentru a permite proprietarului să alimenteze contractul
    function depositFunds() public payable {}

}
