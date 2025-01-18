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
        await App.updateRewardBalance();
        App.bindEvents();
    },

	showNotification: (message, type = 'success') => {
		const container = document.getElementById('notificationContainer');
		const notification = document.createElement('div');
		notification.className = `notification ${type}`;
		notification.textContent = message;

		container.appendChild(notification);

		// Elimină notificarea după 5 secunde
		setTimeout(() => {
			container.removeChild(notification);
		}, 5000);
	},

    bindEvents: () => {
		document.getElementById('addActivityButton').addEventListener('click', async () => {
			App.showNotification("Adaugarea activitatii in curs...", 'success');
			await App.addAndLogActivity();
			App.showNotification("Activitatea a fost adaugata cu succes!", 'success');
		});

		document.getElementById('checkRewardsButton').addEventListener('click', async () => {
			App.showNotification("Verificare recompensa in curs...", 'success');
			await App.checkRewards();
			App.showNotification("Recompensa verificata cu succes!", 'success');
		});

		document.getElementById('claimRewardButton').addEventListener('click', async () => {
			// Încarcă activitățile pentru revendicare
			await App.showSelectableActivities();
		});

		document.getElementById('depositFundsButton').addEventListener('click', async () => {
			App.showNotification("Depunerea fondurilor in curs...", 'success');
			await App.depositFunds();
			App.showNotification("Fonduri depuse cu succes!", 'success');
		});
		document.getElementById('claimRewardButton').addEventListener('click', async () => {
			App.showSelectableActivities();
		});

    },

    loadActivities : async () => {
		try {
			const activities = await App.contracts.EcoRewardInstance.getActivities();
			const container = document.getElementById("rewardActivities");
			const noActivitiesMessage = document.getElementById("noActivitiesMessage");

			container.innerHTML = "";
			let hasActivities = false;

			activities.forEach((activity, index) => {
				if (activity.rewardRate > 0) {
					const activityDiv = document.createElement("div");
					activityDiv.innerHTML = `
						<input type="checkbox" id="activity-${index}" value="${index}">
						<label for="activity-${index}">${activity.name} - ${activity.rewardRate} puncte</label>
					`;
					container.appendChild(activityDiv);
					hasActivities = true;
				}
			});

			noActivitiesMessage.style.display = hasActivities ? "none" : "block";
		} catch (error) {
			console.error("Error loading activities:", error);
		}
	},

	addAndLogActivity: async () => {
		const activityName = document.getElementById('newActivityName').value;
		const rewardRate = parseInt(document.getElementById('newActivityReward').value, 10); // Ensure it's a number
		const user = App.account;

		// Validări
		if (!activityName || !rewardRate || isNaN(rewardRate) || rewardRate <= 0) {
			alert("Please enter a valid activity name and reward rate.");
			return;
		}


		try {
			// Adăugăm activitatea și logăm recompensa într-un singur apel
			await App.contracts.EcoRewardInstance.addAndLogActivity(activityName, rewardRate, user, { from: App.account });

			console.log(`Activitate adăugată și logată: ${activityName}, Recompensă: ${rewardRate}`);

			// Actualizează lista de activități și balanța recompenselor
			await App.loadActivities();
			await App.updateRewardBalance();
			App.showNotification(`Activitate "${activityName}" adaugata cu succes!`, 'success');
		} catch (error) {
			console.error("Eroare la adaugarea si logarea activitatii:", error);
			App.showNotification("Eroare la adaugarea activitatii. Va rugam sa incercati din nou.", 'error');
		}
	},


    claimReward: async () => {
        try {
			const userRewards = await App.getUserRewards(App.account); // Obține recompensele utilizatorului

			// Verifică dacă există recompense disponibile
			if (userRewards <= 0) {
				App.showNotification("Nu aveți recompense disponibile pentru revendicare.", 'error');
				return; // Nu continuăm funcția
			}

			const contractBalance = await App.getContractBalance(); // Obține balanța contractului
			console.log(`Contract balance: ${web3.utils.fromWei(balance, 'ether')} ETH`);

			// Verifică dacă contractul are suficiente fonduri
			if (contractBalance < userRewards) {
				App.showNotification("Contractul nu are suficiente fonduri pentru a plăti recompensa.", 'error');
				return; // Nu continuăm funcția
			}

			// Dacă toate condițiile sunt îndeplinite, inițiază tranzacția
			await App.contracts.EcoRewardInstance.claimReward({ from: App.account });
			App.showNotification("Recompensa a fost revendicată cu succes!", 'success');

			// Actualizează activitățile și balanța recompenselor
			await App.loadActivities();
			await App.updateRewardBalance();
		} catch (error) {
			console.error("Error claiming reward:", error);
			console.log(`Contract balance: ${web3.utils.fromWei(balance, 'ether')} ETH`);

			App.showNotification("Eroare la revendicarea recompensei. Încercați din nou.", 'error');
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

	claimSelectedRewards: async (selectedIndexes) => {
		try {
			if (!selectedIndexes || selectedIndexes.length === 0) {
				App.showNotification("Nu ați selectat nicio activitate pentru revendicare.", "error");
				return;
			}

			console.log("Selected indexes to claim:", selectedIndexes); // Verifică indexurile

			// Verificare balanță contract înainte de revendicare
			const initialBalanceWei = await App.getContractBalance();
			const initialBalanceEth = web3.utils.fromWei(initialBalanceWei, 'ether');
			console.log(`Balanța contractului înainte de revendicare: ${initialBalanceEth} ETH`);
			App.showNotification(`Balanța contractului înainte de revendicare: ${initialBalanceEth} ETH`, "info");

	
			if (parseFloat(initialBalanceEth) <= 0) {
				App.showNotification("Balanța contractului este insuficientă.", "error");
				return;
			}

			// Apelul contractului
			await App.contracts.EcoRewardInstance.claimSelectedRewards(selectedIndexes, { from: App.account });
			App.showNotification("Recompense revendicate cu succes!", "success");


			// Verificare balanță contract după revendicare
			const finalBalanceWei = await App.getContractBalance();
			const finalBalanceEth = web3.utils.fromWei(finalBalanceWei, 'ether');
			console.log(`Balanța contractului după revendicare: ${finalBalanceEth} ETH`);
			App.showNotification(`Balanța contractului după revendicare: ${finalBalanceEth} ETH`, "info");			

			// Actualizează interfața
			await App.loadActivities();
			await App.updateRewardBalance();
		} catch (error) {
			console.error("Error claiming selected rewards:", error);
			App.showNotification("Eroare la revendicarea recompenselor. Încercați din nou.", "error");
		}
	},
	
	showSelectableActivities: async () => {
		try {
			const activities = await App.contracts.EcoRewardInstance.getActivities({ from: App.account });
			console.log("Fetched activities raw:", activities);

			const container = document.getElementById('rewardActivities');
			container.innerHTML = ''; // Resetează lista

			let hasUnclaimedActivities = false;

			// Parcurge activitățile și afișează-le doar pe cele nerevendicate
			activities.forEach((activity, index) => {
				const rewardRate = typeof activity.rewardRate !== 'undefined'
					? parseInt(activity.rewardRate, 10)
					: parseInt(activity[1], 10);

				const name = typeof activity.name !== 'undefined'
					? activity.name
					: activity[0];

				console.log(`Activity ${index}: Name = ${name}, RewardRate = ${rewardRate}`);

				// Afișează doar activitățile cu `rewardRate > 0`
				if (rewardRate > 0) {
					const activityDiv = document.createElement('div');
					activityDiv.innerHTML = `
						<div class="activity-card">
							<input type="checkbox" id="activity-${index}" value="${index}">
							<label for="activity-${index}">${name} - ${rewardRate} puncte</label>
						</div>
					`;
					container.appendChild(activityDiv);
					hasUnclaimedActivities = true;
				}
			});

			// Verifică dacă există activități nerevendicate
			if (hasUnclaimedActivities) {
				container.style.display = "block";
			} else {
				container.style.display = "none";
				App.showNotification("Nu există activități disponibile pentru revendicare.", "error");
			}

			// Adaugă butonul de revendicare
			const claimButton = document.getElementById('claimSelectedButton');
			if (hasUnclaimedActivities) {
				if (!claimButton) {
					const newClaimButton = document.createElement('button');
					newClaimButton.id = 'claimSelectedButton';
					newClaimButton.textContent = 'Claim Selected Rewards';
					newClaimButton.onclick = async () => {
						const selectedIndexes = Array.from(
							container.querySelectorAll('input[type="checkbox"]:checked')
						).map(input => parseInt(input.value));
						console.log("Selected indexes:", selectedIndexes);
						await App.claimSelectedRewards(selectedIndexes);
					};
					container.parentNode.appendChild(newClaimButton);
				}
			} else {
				// Ascunde butonul dacă nu există activități nerevendicate
				if (claimButton) {
					claimButton.remove();
				}
			}
		} catch (error) {
			console.error('Error fetching activities:', error);
		}
	},


	checkRewards: async () => {
		try {
			const activities = await App.contracts.EcoRewardInstance.getActivities({ from: App.account });

			// Salvează activitățile în localStorage
			const activitiesList = activities.map(activity => ({
				name: activity.name,
				rewardRate: activity.rewardRate // Stocăm rewardRate pentru a determina starea
			}));
			localStorage.setItem('activitiesList', JSON.stringify(activitiesList));

			// Redirecționează utilizatorul către pagina cu activități
			window.location.href = 'activities.html';
		} catch (error) {
			console.error("Error checking activities and rewards:", error);
			alert("Failed to check activities and rewards.");
		}
	},

    updateRewardBalance: async () => {
        try {
            const balance = await App.contracts.EcoRewardInstance.rewards(App.account);
			console.log(`Current reward balance for ${App.account}: ${balance.toString()}`);
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
			const rewards = await App.contracts.EcoRewardInstance.rewards(userAddress);
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
