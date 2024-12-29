App = {
    web3Provider: null,
    contracts: {},
    account: null,

    init: async () => {
        console.log("App initialized.");
        return await App.initWeb3();
    },

    initWeb3: async () => {
        if (typeof web3 !== 'undefined') {
            App.web3Provider = web3.currentProvider;
        } else {
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
        }
        web3 = new Web3(App.web3Provider);
        return await App.initContract();
    },

    initContract: async () => {
        const response = await fetch('EcoReward.json');
        const EcoRewardArtifact = await response.json();
        App.contracts.EcoReward = TruffleContract(EcoRewardArtifact);
        App.contracts.EcoReward.setProvider(App.web3Provider);

        App.account = (await web3.eth.getAccounts())[0];
        console.log(`Using account: ${App.account}`);

        await App.loadActivities();
        await App.updateRewardBalance();

        App.bindEvents();
    },

    bindEvents: () => {
        document.getElementById('logActivityButton').addEventListener('click', App.logEcoActivity);
        document.getElementById('claimRewardButton').addEventListener('click', App.claimReward);
        document.getElementById('depositFundsButton').addEventListener('click', App.depositFunds);
        document.getElementById('checkRewardsButton').addEventListener('click', App.checkRewards);
        document.getElementById('addActivityButton').addEventListener('click', App.addActivity); // Buton pentru adăugarea activităților
    },

    loadActivities: async () => {
		if (!App.contracts.EcoReward) {
			console.error("Contractul EcoReward nu a fost inițializat.");
			return;
		}
	
		try {
			const ecoReward = App.contracts.EcoReward;
			const activities = await ecoReward.methods.getActivities().call(); // Obține array-ul de obiecte Activity
	
			const activitiesContainer = document.getElementById('activitiesContainer');
			activitiesContainer.innerHTML = '';  // Curăță containerul de activități
	
			// Afișează activitățile
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
        const ecoReward = await App.contracts.EcoReward.deployed();
        const activityIndex = document.getElementById('activitySelect').value;
        const detail = document.getElementById('activityDetail').value;

        if (!detail || detail <= 0) {
            alert("Please enter a valid detail (e.g., kg, trees, trips).");
            return;
        }

        try {
            await ecoReward.logEcoActivity(activityIndex, detail, App.account, { from: App.account });
            console.log(`Logged activity: ${activityIndex}, Detail: ${detail}`);

            await App.updateRewardBalance();
        } catch (error) {
            console.error("Error logging activity:", error);
        }
    },

    addActivity: async () => {
        const activityName = document.getElementById('newActivityName').value;
        const rewardRate = document.getElementById('newActivityReward').value;

        if (!activityName || !rewardRate || isNaN(rewardRate) || rewardRate <= 0) {
            alert("Please enter valid activity name and reward rate.");
            return;
        }

        const ecoReward = await App.contracts.EcoReward.deployed();
        try {
            await ecoReward.addActivity(activityName, rewardRate, { from: App.account });
            console.log(`Added activity: ${activityName} with reward rate: ${rewardRate}`);

            // Reload activities to update the list
            await App.loadActivities();
        } catch (error) {
            console.error("Error adding activity:", error);
        }
    },

    claimReward: async () => {
		const ecoReward = await App.contracts.EcoReward.deployed();
		const userRewards = await App.getUserRewards(App.account);
		const contractBalance = await App.getContractBalance();
	
		if (userRewards > 0) {
			if (contractBalance >= userRewards) {
				try {
					await ecoReward.claimReward({ from: App.account });
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
        const ecoReward = await App.contracts.EcoReward.deployed();
        const amount = document.getElementById('depositAmount').value;

        if (!amount || amount <= 0) {
            alert("Please enter a valid deposit amount.");
            return;
        }

        try {
            await ecoReward.depositFunds({ from: App.account, value: web3.utils.toWei(amount, 'ether') });
            console.log(`Deposited ${amount} ETH to the contract.`);
        } catch (error) {
            console.error("Error depositing funds:", error);
        }
    },

    checkRewards: async () => {
		const ecoReward = await App.contracts.EcoReward.deployed();
		try {
			// Obținem activitățile și recompensele lor
			const activities = await ecoReward.getActivities({ from: App.account });
	
			let activitiesList = "";
			for (let i = 0; i < activities.length; i++) {
				const activityName = activities[i].name;
				const rewardRate = activities[i].rewardRate;
				activitiesList += `${activityName}: ${rewardRate} points\n`;
			}
	
			// Afișăm activitățile și recompensele lor
			alert(`Your activities and rewards:\n${activitiesList}`);
		} catch (error) {
			console.error("Error checking activities and rewards:", error);
			alert("Failed to check activities and rewards.");
		}
    },

    updateRewardBalance: async () => {
        const ecoReward = await App.contracts.EcoReward.deployed();
        try {
            const balance = await ecoReward.rewards(App.account);
            document.getElementById('rewardBalance').textContent = balance.toString();
        } catch (error) {
            console.error("Error updating reward balance:", error);
        }
    },

	getContractBalance: async () => {
		const ecoReward = await App.contracts.EcoReward.deployed();
		try {
			// Verifică soldul contractului
			const balance = await web3.eth.getBalance(ecoReward.address);
			console.log(`Contract balance: ${web3.utils.fromWei(balance, 'ether')} ETH`);
			return balance;
		} catch (error) {
			console.error("Error checking contract balance:", error);
		}
	},

	getUserRewards: async (userAddress) => {
		const ecoReward = await App.contracts.EcoReward.deployed();
		try {
			// Verifică recompensa disponibilă pentru utilizator
			const rewards = await ecoReward.rewards(userAddress);
			console.log(`User rewards: ${rewards} points`);
			return rewards;
		} catch (error) {
			console.error("Error checking user rewards:", error);
		}
	}
	
	
	
};

window.addEventListener('load', () => {
    App.init();  // Inițializează aplicația
    App.loadActivities();  // Încărcați activitățile
});
