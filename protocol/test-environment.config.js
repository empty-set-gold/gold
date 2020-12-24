module.exports = {
  mocha: {
    enableTimeouts: false,
    before_timeout: 120000 // 2m
  },

  accounts: {
    ether: 1e6,
  },

  contracts: {
    type: 'truffle',
  }
};
