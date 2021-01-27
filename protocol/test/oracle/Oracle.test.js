const { accounts, contract, web3 } = require('@openzeppelin/test-environment');

const { BN, expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const Gold = contract.fromArtifact('Gold');
const MockHybridOracle = contract.fromArtifact('MockHybridOracle');
const MockBackingAsset = contract.fromArtifact('MockBackingAsset');
const MockUniswapV2PairTrade = contract.fromArtifact('MockUniswapV2PairTrade');
const MockAggregatorV3Interface = contract.fromArtifact('MockAggregatorV3Interface');

const DECIMAL_DIFF = new BN(10).pow(new BN(0));
const EPSILON = new BN(1).mul(DECIMAL_DIFF);

function cents(n) {
  return new BN(n).mul(new BN(10).pow(new BN(16)));
}

function sXAU(n) {
  return new BN(n).mul(new BN(10).pow(new BN(18)));
}

function uint112s(time, priceNum=1, priceDen=1) {
  return new BN(priceNum).mul(new BN(2).pow(new BN(112))).divn(priceDen).div(DECIMAL_DIFF).muln(time)
}

async function priceForToBN(oracle) {
  return (await oracle.latestPrice()).value;
}

async function simulateTrade(amm, esg, sXAU) {
  return await amm.simulateTrade(
    new BN(esg).mul(new BN(10).pow(new BN(18))),
    new BN(sXAU).mul(new BN(10).pow(new BN(18))));
}

describe('Oracle', function () {
  const [ ownerAddress, userAddress ] = accounts;

  beforeEach(async function () {
    const [decimals, initialPrice, reserveMinimum, decimalOffset] = [8, 1000e8, 1e18, 0]
    this.gold = await Gold.new({from: ownerAddress});
    this.mockBackingAsset = await MockBackingAsset.new(18, {from: ownerAddress})
    this.amm = await MockUniswapV2PairTrade.new(this.gold.address, this.mockBackingAsset.address, {from: ownerAddress})
    this.goldOracle = await MockAggregatorV3Interface.new(decimals, initialPrice, {from: ownerAddress})
    this.backingAssetOracle = await MockAggregatorV3Interface.new(decimals, initialPrice, {from: ownerAddress})
    this.oracle = await MockHybridOracle.new(
        this.amm.address,
        this.gold.address,
        this.backingAssetOracle.address,
        this.goldOracle.address,
        web3.utils.stringToHex("Mock_Oracle"),
        reserveMinimum.toString(),
        {from: ownerAddress, gas: 8000000}
    )
    await this.oracle.setHybridOraclePoolAddress(ownerAddress, {from: ownerAddress})

    await time.increase(3600);
  });

  describe('step', function () {
    describe('not dao', function () {
      it('reverts', async function () {
        await expectRevert(this.oracle.capture({from: userAddress}), "Mock_Oracle: Not Hybrid Oracle");
      });
    });

    describe('after advance without trade', function () {
      beforeEach(async function () {
        this.timestamp = await time.latest();
        await this.oracle.capture({from: ownerAddress});
      });

      it('is uninitialized', async function () {
        expect(await priceForToBN(this.oracle)).to.be.bignumber.equal(cents(100));
        expect(await this.oracle.isInitialized()).to.be.equal(false);
        expect(await this.oracle.cumulative()).to.be.bignumber.equal(new BN(0));
        expect(await this.oracle.timestamp()).to.be.bignumber.equal(new BN(0));
        expect(await this.oracle.reserve()).to.be.bignumber.equal(new BN(0));
      });
    });

    describe('after advance with trade', function () {
      describe('price of 1', function () {
        describe('same block', function () {
          beforeEach(async function () {
            this.timestamp = await time.latest();
            await simulateTrade(this.amm, 1000000, 1000000);
            await this.oracle.capture({from: ownerAddress});
          });

          it('is initialized', async function () {
            expect(await priceForToBN(this.oracle)).to.be.bignumber.equal(cents(100));
            expect(await this.oracle.isInitialized()).to.be.equal(true);
            expect(await this.oracle.cumulative()).to.be.bignumber.equal(new BN(0));
            expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
            expect(await this.oracle.reserve()).to.be.bignumber.equal(sXAU(1000000));
          });
        });

        describe('long before', function () {
          beforeEach(async function () {
            this.timestamp = await time.latest();
            await simulateTrade(this.amm, 1000000, 1000000);
            await time.increase(3600);
            await this.oracle.capture({from: ownerAddress});
          });

          it('is initialized', async function () {
            expect(await priceForToBN(this.oracle)).to.be.bignumber.equal(cents(100));
            expect(await this.oracle.isInitialized()).to.be.equal(true);
            expect(await this.oracle.cumulative()).to.be.bignumber.equal(new BN(0));
            expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
            expect(await this.oracle.reserve()).to.be.bignumber.equal(sXAU(1000000));
          });
        });
      });

      describe('price greater than 1', function () {
        describe('same block', function () {
          beforeEach(async function () {
            this.timestamp = await time.latest();
            await simulateTrade(this.amm, 1100000, 1000000);
            await this.oracle.capture({from: ownerAddress});
          });

          it('is initialized', async function () {
            expect(await priceForToBN(this.oracle)).to.be.bignumber.equal(cents(100));
            expect(await this.oracle.isInitialized()).to.be.equal(true);
            expect(await this.oracle.cumulative()).to.be.bignumber.equal(new BN(0));
            expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
            expect(await this.oracle.reserve()).to.be.bignumber.equal(sXAU(1000000));
          });
        });

        describe('long before', function () {
          beforeEach(async function () {
            this.timestamp = await time.latest();
            await simulateTrade(this.amm, 1100000, 1000000);
            await time.increase(3600);
            await this.oracle.capture({from: ownerAddress});
          });

          it('is initialized', async function () {
            expect(await priceForToBN(this.oracle)).to.be.bignumber.equal(cents(100));
            expect(await this.oracle.isInitialized()).to.be.equal(true);
            expect(await this.oracle.cumulative()).to.be.bignumber.equal(new BN(0));
            expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
            expect(await this.oracle.reserve()).to.be.bignumber.equal(sXAU(1000000));
          });
        });
      });
    });

    describe('after multiple advances with trade', function () {
      describe('price of 1', function () {
        describe('same block', function () {
          beforeEach(async function () {
            await simulateTrade(this.amm, 1000000, 1000000);
            this.initialized = await time.latest();
            await this.oracle.capture({from: ownerAddress});
            await time.increase(86400);
            await this.oracle.capture({from: ownerAddress});
            this.timestamp = await time.latest();
            this.timediff = this.timestamp.sub(this.initialized).toNumber();
          });

          it('is initialized', async function () {
            expect(await priceForToBN(this.oracle)).to.be.bignumber.closeTo(cents(100), EPSILON);
            expect(await this.oracle.isInitialized()).to.be.equal(true);
            expect(await this.oracle.cumulative()).to.be.bignumber.equal(uint112s(this.timediff));
            expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
            expect(await this.oracle.reserve()).to.be.bignumber.equal(sXAU(1000000));
          });
        });

        describe('long before', function () {
          beforeEach(async function () {
            await simulateTrade(this.amm, 1000000, 1000000);
            this.initialized = await time.latest();
            await time.increase(3600);
            await this.oracle.capture({from: ownerAddress});
            await time.increase(86400);
            await this.oracle.capture({from: ownerAddress});
            this.timestamp = await time.latest();
            this.timediff = this.timestamp.sub(this.initialized).toNumber();

          });

          it('is initialized', async function () {
            expect(await priceForToBN(this.oracle)).to.be.bignumber.closeTo(cents(100), EPSILON);
            expect(await this.oracle.isInitialized()).to.be.equal(true);
            expect(await this.oracle.cumulative()).to.be.bignumber.equal(uint112s(this.timediff));
            expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
            expect(await this.oracle.reserve()).to.be.bignumber.equal(sXAU(1000000));
          });
        });
      });

      describe('price greater than 1', function () {
        describe('same block', function () {
          beforeEach(async function () {
            await simulateTrade(this.amm, 1000000, 1100000);
            this.initialized = await time.latest();
            await this.oracle.capture({from: ownerAddress});
            await time.increase(86400);
            await this.oracle.capture({from: ownerAddress});
            this.timestamp = await time.latest();
            this.timediff = this.timestamp.sub(this.initialized).toNumber();
          });

          it('is initialized', async function () {
            expect(await priceForToBN(this.oracle)).to.be.bignumber.closeTo(cents(110), EPSILON);
            expect(await this.oracle.isInitialized()).to.be.equal(true);
            expect(await this.oracle.cumulative()).to.be.bignumber.equal(uint112s(this.timediff, 1100000, 1000000));
            expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
            expect(await this.oracle.reserve()).to.be.bignumber.equal(sXAU(1100000));
          });
        });

        describe('long before', function () {
          beforeEach(async function () {
            await simulateTrade(this.amm, 1000000, 1100000);
            this.initialized = await time.latest();
            await time.increase(3600);
            await this.oracle.capture({from: ownerAddress});
            await time.increase(86400);
            await this.oracle.capture({from: ownerAddress});
            this.timestamp = await time.latest();
            this.timediff = this.timestamp.sub(this.initialized).toNumber();
          });

          it('is initialized', async function () {
            expect(await priceForToBN(this.oracle)).to.be.bignumber.closeTo(cents(110), EPSILON);
            expect(await this.oracle.isInitialized()).to.be.equal(true);
            expect(await this.oracle.cumulative()).to.be.bignumber.equal(uint112s(this.timediff, 1100000, 1000000));
            expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
            expect(await this.oracle.reserve()).to.be.bignumber.equal(sXAU(1100000));
          });
        });
      });
    });

    describe('after advance with multiple trades', function () {
      describe('price of 1', function () {
        describe('same block', function () {
          beforeEach(async function () {
            await simulateTrade(this.amm, 1000000, 1000000);
            this.initialized = await time.latest();
            await time.increase(3600);
            await simulateTrade(this.amm, 1000000, 1000000);
            this.timestamp = await time.latest();
            await this.oracle.capture({from: ownerAddress});
            this.timediff = this.timestamp.sub(this.initialized).toNumber();
          });

          it('is initialized', async function () {
            expect(await priceForToBN(this.oracle)).to.be.bignumber.equal(cents(100));
            expect(await this.oracle.isInitialized()).to.be.equal(true);
            expect(await this.oracle.cumulative()).to.be.bignumber.equal(uint112s(this.timediff));
            expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
            expect(await this.oracle.reserve()).to.be.bignumber.equal(sXAU(1000000));
          });
        });

        describe('long before', function () {
          beforeEach(async function () {
            await simulateTrade(this.amm, 1000000, 1000000);
            this.initialized = await time.latest();
            await time.increase(3600);
            await simulateTrade(this.amm, 1000000, 1000000);
            this.timestamp = await time.latest();
            await time.increase(3600);
            await this.oracle.capture({from: ownerAddress});
            this.timediff = this.timestamp.sub(this.initialized).toNumber();
          });

          it('is initialized', async function () {
            expect(await priceForToBN(this.oracle)).to.be.bignumber.equal(cents(100));
            expect(await this.oracle.isInitialized()).to.be.equal(true);
            expect(await this.oracle.cumulative()).to.be.bignumber.equal(uint112s(this.timediff));
            expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
            expect(await this.oracle.reserve()).to.be.bignumber.equal(sXAU(1000000));
          });
        });
      });

      describe('price greater than 1', function () {
        describe('same block', function () {
          beforeEach(async function () {
            await simulateTrade(this.amm, 1000000, 1100000);
            this.initialized = await time.latest();
            await time.increase(3600);
            await simulateTrade(this.amm, 1000000, 1100000);
            this.timestamp = await time.latest();
            await this.oracle.capture({from: ownerAddress});
            this.timediff = this.timestamp.sub(this.initialized).toNumber();
          });

          it('is initialized', async function () {
            expect(await priceForToBN(this.oracle)).to.be.bignumber.equal(cents(100));
            expect(await this.oracle.isInitialized()).to.be.equal(true);
            expect(await this.oracle.cumulative()).to.be.bignumber.equal(uint112s(this.timediff, 1100000, 1000000));
            expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
            expect(await this.oracle.reserve()).to.be.bignumber.equal(sXAU(1100000));
          });
        });

        describe('long before', function () {
          beforeEach(async function () {
            await simulateTrade(this.amm, 1000000, 1100000);
            this.initialized = await time.latest();
            await time.increase(3600);
            await simulateTrade(this.amm, 1000000, 1100000);
            this.timestamp = await time.latest();
            await time.increase(3600);
            await this.oracle.capture({from: ownerAddress});
            this.timediff = this.timestamp.sub(this.initialized).toNumber();
          });

          it('is initialized', async function () {
            expect(await priceForToBN(this.oracle)).to.be.bignumber.equal(cents(100));
            expect(await this.oracle.isInitialized()).to.be.equal(true);
            expect(await this.oracle.cumulative()).to.be.bignumber.equal(uint112s(this.timediff, 1100000, 1000000));
            expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
            expect(await this.oracle.reserve()).to.be.bignumber.equal(sXAU(1100000));
          });
        });

        describe('different prices', function () {
          beforeEach(async function () {
            await simulateTrade(this.amm, 1000000, 1150000);
            this.initialized = await time.latest();
            await time.increase(3600);
            await simulateTrade(this.amm, 1000000, 1050000);
            this.timestamp = await time.latest();
            await time.increase(3600);
            await this.oracle.capture({from: ownerAddress});
            this.timediff = this.timestamp.sub(this.initialized).toNumber();
          });

          it('is initialized', async function () {
            expect(await priceForToBN(this.oracle)).to.be.bignumber.equal(cents(100));
            expect(await this.oracle.isInitialized()).to.be.equal(true);
            expect(await this.oracle.cumulative()).to.be.bignumber.equal(uint112s(this.timediff, 1150000, 1000000));
            expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
            expect(await this.oracle.reserve()).to.be.bignumber.equal(sXAU(1050000));
          });
        });
      });
    });

    describe('after multiple advances with multiple trades', function () {
      describe('price of 1', function () {
        describe('same block', function () {
          beforeEach(async function () {
            await simulateTrade(this.amm, 1000000, 1000000);
            this.initialized = await time.latest();
            await time.increase(3600);
            await simulateTrade(this.amm, 1000000, 1000000);
            await this.oracle.capture({from: ownerAddress});
            await time.increase(86400);
            await this.oracle.capture({from: ownerAddress});
            this.timestamp = await time.latest();
            this.timediff = this.timestamp.sub(this.initialized).toNumber();
          });

          it('is initialized', async function () {
            expect(await priceForToBN(this.oracle)).to.be.bignumber.closeTo(cents(100), EPSILON);
            expect(await this.oracle.isInitialized()).to.be.equal(true);
            expect(await this.oracle.cumulative()).to.be.bignumber.equal(uint112s(this.timediff));
            expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
            expect(await this.oracle.reserve()).to.be.bignumber.equal(sXAU(1000000));
          });
        });

        describe('long before', function () {
          beforeEach(async function () {
            await simulateTrade(this.amm, 1000000, 1000000);
            this.initialized = await time.latest();
            await time.increase(3600);
            await simulateTrade(this.amm, 1000000, 1000000);
            await time.increase(3600);
            await this.oracle.capture({from: ownerAddress});
            await time.increase(86400);
            await this.oracle.capture({from: ownerAddress});
            this.timestamp = await time.latest();
            this.timediff = this.timestamp.sub(this.initialized).toNumber();
          });

          it('is initialized', async function () {
            expect(await priceForToBN(this.oracle)).to.be.bignumber.closeTo(cents(100), EPSILON);
            expect(await this.oracle.isInitialized()).to.be.equal(true);
            expect(await this.oracle.cumulative()).to.be.bignumber.equal(uint112s(this.timediff));
            expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
            expect(await this.oracle.reserve()).to.be.bignumber.equal(sXAU(1000000));
          });
        });
      });

      describe('price greater than 1', function () {
        describe('same block', function () {
          beforeEach(async function () {
            await simulateTrade(this.amm, 1000000, 1100000);
            this.initialized = await time.latest();
            await time.increase(3600);
            await simulateTrade(this.amm, 1000000, 1100000);
            await this.oracle.capture({from: ownerAddress});
            await time.increase(86400);
            await this.oracle.capture({from: ownerAddress});
            this.timestamp = await time.latest();
            this.timediff = this.timestamp.sub(this.initialized).toNumber();
          });

          it('is initialized', async function () {
            expect(await priceForToBN(this.oracle)).to.be.bignumber.closeTo(cents(110), EPSILON);
            expect(await this.oracle.isInitialized()).to.be.equal(true);
            expect(await this.oracle.cumulative()).to.be.bignumber.equal(uint112s(this.timediff, 1100000, 1000000));
            expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
            expect(await this.oracle.reserve()).to.be.bignumber.equal(sXAU(1100000));
          });
        });

        describe('long before', function () {
          beforeEach(async function () {
            await simulateTrade(this.amm, 1000000, 1100000);
            this.initialized = await time.latest();
            await time.increase(3600);
            await simulateTrade(this.amm, 1000000, 1100000);
            await time.increase(3600);
            await this.oracle.capture({from: ownerAddress});
            await time.increase(86400);
            await this.oracle.capture({from: ownerAddress});
            this.timestamp = await time.latest();
            this.timediff = this.timestamp.sub(this.initialized).toNumber();
          });

          it('is initialized', async function () {
            expect(await priceForToBN(this.oracle)).to.be.bignumber.closeTo(cents(110), EPSILON);
            expect(await this.oracle.isInitialized()).to.be.equal(true);
            expect(await this.oracle.cumulative()).to.be.bignumber.equal(uint112s(this.timediff, 1100000, 1000000));
            expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
            expect(await this.oracle.reserve()).to.be.bignumber.equal(sXAU(1100000));
          });
        });

        describe('different prices', function () {
          beforeEach(async function () {
            await simulateTrade(this.amm, 1000000, 1150000);
            this.initialized = await time.latest();
            await time.increase(3600);
            await simulateTrade(this.amm, 1000000, 1050000);
            this.middle = await time.latest();
            await time.increase(3600);
            await this.oracle.capture({from: ownerAddress});
            await time.increase(86400);
            await this.oracle.capture({from: ownerAddress});
            this.timestamp = await time.latest();
          });

          it('is initialized', async function () {
            const begin = uint112s(this.middle.sub(this.initialized).toNumber(), 1150000, 1000000)
            const end = uint112s(this.timestamp.sub(this.middle).toNumber(), 1050000, 1000000)

            expect(await priceForToBN(this.oracle)).to.be.bignumber.closeTo(cents(105), EPSILON);
            expect(await this.oracle.isInitialized()).to.be.equal(true);
            expect(await this.oracle.cumulative()).to.be.bignumber.equal(begin.add(end));
            expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
            expect(await this.oracle.reserve()).to.be.bignumber.equal(sXAU(1050000));
          });
        });
      });
    });

    describe('after many advances', function () {
      describe('different prices', function () {
        beforeEach(async function () {
          await simulateTrade(this.amm, 1000000, 1150000);
          await time.increase(3600);
          await this.oracle.capture({from: ownerAddress});
          await time.increase(86400-3600);
          await simulateTrade(this.amm, 1000000, 1050000);
          await time.increase(3600);
          await this.oracle.capture({from: ownerAddress});
          await time.increase(3600);
          await simulateTrade(this.amm, 1000000, 950000);
          await time.increase(86400-3600);
          await this.oracle.capture({from: ownerAddress});
          await time.increase(3600);
          await simulateTrade(this.amm, 1000000, 950000);
          await time.increase(86400-3600);
          await this.oracle.capture({from: ownerAddress});
          this.timestamp = await time.latest();
        });

        it('is initialized', async function () {
          expect(await priceForToBN(this.oracle)).to.be.bignumber.closeTo(cents(95), EPSILON);
          expect(await this.oracle.isInitialized()).to.be.equal(true);
          expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
          expect(await this.oracle.reserve()).to.be.bignumber.equal(sXAU(950000));
        });
      });
    });

    describe('current reserve too low', function () {
      describe('long before', function () {
        beforeEach(async function () {
          await simulateTrade(this.amm, 250000, 300000);
          this.initialized = await time.latest();
          await time.increase(3600);
          await this.oracle.capture({from: ownerAddress});
          await time.increase(86400);
          await this.amm.simulateTrade(2500, 3000)
          await this.oracle.capture({from: ownerAddress});
          this.timestamp = await time.latest();
          this.timediff = this.timestamp.sub(this.initialized).toNumber();
        });

        it('is initialized', async function () {
          expect(await priceForToBN(this.oracle)).to.be.bignumber.closeTo(cents(120), EPSILON);
          expect(await this.oracle.latestValid()).to.be.equal(false);
          expect(await this.oracle.isInitialized()).to.be.equal(true);
          expect(await this.oracle.cumulative()).to.be.bignumber.equal(uint112s(this.timediff, 3000, 2500));
          expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
          expect(await this.oracle.reserve()).to.be.bignumber.equal("3000");
        });
      });
    });

    describe('previous reserve too low', function () {
      describe('long before', function () {
        beforeEach(async function () {
          await simulateTrade(this.amm, 2500, 3000);
          this.initialized = await time.latest();
          await time.increase(3600);
          await this.oracle.capture({from: ownerAddress});
          await time.increase(86400);
          await this.amm.simulateTrade(250000, 300000)
          await this.oracle.capture({from: ownerAddress});
          this.timestamp = await time.latest();
          this.timediff = this.timestamp.sub(this.initialized).toNumber();
        });

        it('is initialized', async function () {
          expect(await priceForToBN(this.oracle)).to.be.bignumber.closeTo(cents(120), EPSILON);
          expect(await this.oracle.latestValid()).to.be.equal(false);
          expect(await this.oracle.isInitialized()).to.be.equal(true);
          expect(await this.oracle.cumulative()).to.be.bignumber.equal(uint112s(this.timediff, 3000, 2500));
          expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
          expect(await this.oracle.reserve()).to.be.bignumber.equal("300000");
        });
      });
    });

    describe('both reserve too low', function () {
      describe('long before', function () {
        beforeEach(async function () {
          await this.amm.simulateTrade(2500, 3000)
          this.initialized = await time.latest();
          await time.increase(3600);
          await this.oracle.capture({from: ownerAddress});
          await time.increase(86400);
          await this.oracle.capture({from: ownerAddress});
          this.timestamp = await time.latest();
          this.timediff = this.timestamp.sub(this.initialized).toNumber();
        });

        it('is initialized', async function () {
          expect(await priceForToBN(this.oracle)).to.be.bignumber.closeTo(cents(120), EPSILON);
          expect(await this.oracle.latestValid()).to.be.equal(false);
          expect(await this.oracle.isInitialized()).to.be.equal(true);
          expect(await this.oracle.cumulative()).to.be.bignumber.equal(uint112s(this.timediff, 3000, 2500));
          expect(await this.oracle.timestamp()).to.be.bignumber.equal(this.timestamp);
          expect(await this.oracle.reserve()).to.be.bignumber.equal("3000");
        });
      });
    });
  });

  describe('pair', function () {
    it('is returns pair', async function () {
      expect(await this.oracle.pair()).to.be.equal(this.amm.address);
    });
  });
});
