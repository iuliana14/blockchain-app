module.exports = {
	networks: {
	  development: {
		host: "127.0.0.1",
		port: 7545,
		network_id: "*" // Match any network id
	  }
	},
	solc: {
	  optimizer: {
		enabled: true,
		runs: 200
	  }
	},
	compilers: {
		solc: {
		  version: "0.5.0" // Specifică versiunea exactă a compilatorului
		}
	}
  }