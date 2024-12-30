App = {
    web3Provider: null,
    contracts: {},
    account: null,

    load: async () => {
        await App.loadWeb3();
        await App.loadAccount();
        await App.loadContract();
        await App.render();
    },

	loadWeb3: async () => {
		if (typeof web3 !== 'undefined') {
		  App.web3Provider = web3.currentProvider;
		  web3 = new Web3(web3.currentProvider);
		} else {
		  window.alert("Please connect to Metamask.");
		  return;
		}
	  
		// Modern dapp browsers...
		if (window.ethereum) {
		  window.web3 = new Web3(ethereum);
		  try {
			await ethereum.request({ method: 'eth_requestAccounts' });
			App.account = (await web3.eth.getAccounts())[0];  // Ensure App.account is set
			console.log(`Account: ${App.account}`);
		  } catch (error) {
			console.error("User denied account access:", error);
		  }
		}
		// Legacy dapp browsers...
		else if (window.web3) {
		  App.web3Provider = web3.currentProvider;
		  window.web3 = new Web3(web3.currentProvider);
		  App.account = web3.eth.accounts[0];  // Legacy method for getting accounts
		  console.log(`Account: ${App.account}`);
		} else {
		  console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
		}
	  },
	  

    loadAccount: async () => {
        const accounts = await web3.eth.getAccounts();
        App.account = accounts[0];
        console.log(`Using account: ${App.account}`);
    },

    loadContract: async () => {
        const ecoReward = await $.getJSON('EcoReward.json');
        App.contracts.EcoReward = TruffleContract(ecoReward);
        App.contracts.EcoReward.setProvider(App.web3Provider);
        App.contracts.EcoRewardInstance = await App.contracts.EcoReward.deployed();
    },

    render: async () => {
        await App.loadActivities();
        await App.updateRewardBalance();
        App.bindEvents();
    },

    bindEvents: () => {
        //document.getElementById('logActivityButton').addEventListener('click', App.logEcoActivity);
        document.getElementById('claimRewardButton').addEventListener('click', App.claimReward);
        document.getElementById('depositFundsButton').addEventListener('click', App.depositFunds);
        document.getElementById('checkRewardsButton').addEventListener('click', App.checkRewards);
        document.getElementById('addActivityButton').addEventListener('click', App.addActivity);
    },

    loadActivities: async () => {
        if (!App.contracts.EcoRewardInstance) {
            console.error("Contractul EcoReward nu a fost încărcat.");
            return;
        }
        try {
            const activities = await App.contracts.EcoRewardInstance.getActivities();
            const activitiesContainer = document.getElementById('activitiesContainer');
            activitiesContainer.innerHTML = '';

            activities.forEach(activity => {
                const activityElement = document.createElement('div');
                activityElement.classList.add('activity');
                activityElement.innerHTML = `
                    <strong>Activitate:</strong> ${activity.name}<br>
                    <strong>Recompensă:</strong> ${activity.rewardRate} Wei
                `;
                activitiesContainer.appendChild(activityElement);
            });
        } catch (error) {
            console.error("Eroare la încărcarea activităților:", error);
        }
    },

    logEcoActivity: async () => {
        const activityIndex = document.getElementById('activitySelect').value;
        const detail = document.getElementById('activityDetail').value;
        if (!detail || detail <= 0) {
            alert("Please enter a valid detail (e.g., kg, trees, trips).");
            return;
        }
        try {
            await App.contracts.EcoRewardInstance.logEcoActivity(activityIndex, detail, { from: App.account });
            console.log(`Logged activity: ${activityIndex}, Detail: ${detail}`);
            await App.updateRewardBalance();
        } catch (error) {
            console.error("Error logging activity:", error);
        }
    },

	addActivity: async () => {
		const activityName = document.getElementById('newActivityName').value;
		const rewardRate = parseInt(document.getElementById('newActivityReward').value, 10);  // Ensuring it's a number
		if (!activityName || !rewardRate || isNaN(rewardRate) || rewardRate <= 0) {
			alert("Please enter valid activity name and reward rate.");
			return;
		}
	
		try {
			// Add activity
			await App.contracts.EcoRewardInstance.addActivity(activityName, rewardRate, { from: App.account });
			console.log(`Added activity: ${activityName} with reward rate: ${rewardRate}`);
	
			// After adding, log the activity using logEcoActivity
			const activities = await App.contracts.EcoRewardInstance.getActivities();  // Corrected this line
			const activityIndex = activities.length - 1; // The last added activity
	
			const detail = 1; // Example detail (could be set dynamically)
	
			// Log the activity and reward
			await App.contracts.EcoRewardInstance.logEcoActivity(activityIndex, detail, { from: App.account });
	
			console.log(`Logged activity: ${activityIndex}, Detail: ${detail}`);
	
			// Update activities list and reward balance
			await App.loadActivities();
			await App.updateRewardBalance();
		} catch (error) {
			console.error("Error adding and logging activity:", error);
		}
	},
	
	

    claimReward: async () => {
        const userRewards = await App.getUserRewards(App.account);
        const contractBalance = await App.getContractBalance();
        if (userRewards > 0) {
            if (contractBalance >= userRewards) {
                try {
                    await App.contracts.EcoRewardInstance.claimReward({ from: App.account });
                    console.log(`Reward claimed: ${userRewards} points`);
                } catch (error) {
                    console.error("Error claiming reward:", error);
                }
            } else {
                alert("Contract does not have enough funds to pay the reward.");
            }
        } else {
            alert("No reward available for you.");
        }
    },

    depositFunds: async () => {
        const amount = document.getElementById('depositAmount').value;
        if (!amount || amount <= 0) {
            alert("Please enter a valid deposit amount.");
            return;
        }
        try {
            await App.contracts.EcoRewardInstance.depositFunds({ from: App.account, value: web3.utils.toWei(amount, 'ether') });
            console.log(`Deposited ${amount} ETH to the contract.`);
        } catch (error) {
            console.error("Error depositing funds:", error);
        }
    },

    checkRewards: async () => {
        try {
            const activities = await App.contracts.EcoRewardInstance.getActivities({ from: App.account });
            let activitiesList = "";
            activities.forEach(activity => {
                activitiesList += `${activity.name}: ${activity.rewardRate} points\n`;
            });
            alert(`Your activities and rewards:\n${activitiesList}`);
        } catch (error) {
            console.error("Error checking activities and rewards:", error);
            alert("Failed to check activities and rewards.");
        }
    },

    updateRewardBalance: async () => {
        try {
            const balance = await App.contracts.EcoRewardInstance.rewards(App.account);
			console.log(`Current reward balance for ${App.account}: ${balance.toString()}`);
            document.getElementById('rewardBalance').textContent = balance.toString();
        } catch (error) {
            console.error("Error updating reward balance:", error);
        }
    },

    getContractBalance: async () => {
        try {
            const balance = await web3.eth.getBalance(App.contracts.EcoRewardInstance.address);
            console.log(`Contract balance: ${web3.utils.fromWei(balance, 'ether')} ETH`);
            return balance;
        } catch (error) {
            console.error("Error checking contract balance:", error);
        }
    },

    getUserRewards: async (userAddress) => {
		try {
			const rewards = await App.contracts.EcoRewardInstance.methods.rewards(userAddress).call();
			const rewardPoints = parseInt(rewards, 10); // Conversia din BigNumber în număr
			console.log(`User rewards: ${rewardPoints} points`);
			return rewardPoints;
		} catch (error) {
			console.error("Error checking user rewards:", error);
			return 0; // Returnăm 0 pentru a preveni erori ulterioare
		}
    }
};

window.addEventListener('load', App.load);
