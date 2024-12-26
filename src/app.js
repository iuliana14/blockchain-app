
App = {
  loading: false,
  contracts: {},

  load: async () => {
    // Încarcă aplicația ...
    await App.loadWeb3()
    await App.loadAccount()
    await App.loadContract()
	await App.render()
  },

  loadWeb3: async () => {
    if (window.ethereum) {
      // Browsere DApp moderne (de exemplu, Metamask)
      App.web3Provider = window.ethereum;
      window.web3 = new Web3(window.ethereum);  // Corectat: inițializează Web3 cu provider-ul Ethereum

      try {
        // Cere permisiunea utilizatorului pentru accesarea conturilor
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log("Connected to Metamask successfully.");
      } catch (error) {
        console.error("User denied account access:", error);
      }
    } else if (window.web3) {
      // Browsere DApp mai vechi
      App.web3Provider = window.web3.currentProvider;
      window.web3 = new Web3(window.web3.currentProvider);  // Corectat: inițializează Web3 cu provider-ul existent
      console.log("Legacy Web3 provider detected.");
    } else {
      // Browsere non-DApp
      window.alert("Non-Ethereum browser detected. You should consider trying MetaMask!");
    }

    // Verifică dacă Web3 a fost inițializat corect
    if (window.web3) {
      console.log("Web3 initialized:", window.web3);
    } else {
      console.error("Failed to initialize Web3.");
    }
  },

  loadAccount: async () => {
	if (window.web3) {
	  try {
		// Fetch the available accounts
		const accounts = await window.web3.eth.getAccounts();
  
		if (accounts.length === 0) {
		  console.warn("No accounts found. Please ensure Metamask is unlocked.");
		  alert("Please log in to your Metamask account.");
		  return;
		}
  
		// Set the default account
		App.account = accounts[0];
		console.log("Connected Account:", App.account);
  
		// Listen for account changes in Metamask
		if (window.ethereum) {
		  window.ethereum.on('accountsChanged', async (newAccounts) => {
			App.account = newAccounts[0];
			console.log("Account changed to:", App.account);
			await App.loadContract(); // Reload the contract if the account changes
		  });
		}
  
	  } catch (error) {
		console.error("Error fetching account:", error);
	  }
	} else {
	  console.error("Web3 is not initialized, cannot fetch account.");
	}
  },
  

  loadContract: async () => {
	try {
	  // Încarcă ABI-ul contractului ToDoList.json
	  const todoList = await $.getJSON('ToDoList.json');
	  
	  // Creează contractul cu Truffle Contract
	  App.contracts.TodoList = TruffleContract(todoList);
	  
	  // Setează provider-ul pentru contract folosind provider-ul Web3
	  App.contracts.TodoList.setProvider(web3.currentProvider);
	  
	  // Obține instanța contractului
	  App.todoList = await App.contracts.TodoList.deployed();
	  console.log('Contract loaded and hydrated:', App.todoList);
	  
	} catch (err) {
	  console.error('Contract loading or hydration failed:', err);
	}
  },

  render: async () => {
	//prevent double render
	if(App.loading) {
		return
	}

	//update app loading state
	App.setLoading(true)

	// render account
	$('#account').html(App.account)

	//render tasks
	await App.renderTasks()

	//update loading state
	App.setLoading(false)
  },

  renderTasks: async () => {
	//load the task count from the blockchain
	const taskCount = await App.todoList.taskCount()
	const $taskTemplate = $('.taskTemplate')

	//render out each task with a new task template
	for (var i = 1; i <= taskCount; i++) {
		const task = await App.todoList.tasks(i)
		const taskId = task[0].toNumber()
		const taskContent = task[1]
		const taskCompleted = task[2]

		// Create the html for the task
		const $newTaskTemplate = $taskTemplate.clone()
		$newTaskTemplate.find('.content').html(taskContent)
		$newTaskTemplate.find('input')
						.prop('name', taskId)
						.prop('checked', taskCompleted)
						//.on('click', App.toggleCompleted)
		
		// Put the task in the correct list
		if (taskCompleted) {
			$('#completedTaskList').append($newTaskTemplate)
		} else {
			$('#taskList').append($newTaskTemplate)
		}
			//show the task
		$newTaskTemplate.show()
	}

  },

  createTask: async () => {
	App.setLoading(true)
	const content = $('#newTask').val()
	await App.todoList.createTask(content, { from: App.account })
	window.location.reload()

  },

  setLoading: (boolean) => {
    App.loading = boolean
    const loader = $('#loader')
    const content = $('#content')
    if (boolean) {
      loader.show()
      content.hide()
    } else {
      loader.hide()
      content.show()
    }
  }
  
};

$(() => {
  $(window).load(() => {
    App.load();
  });
});
