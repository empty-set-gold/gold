const { accounts, contract } = require('@openzeppelin/test-environment');

const { BN, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const MockRegulator = contract.fromArtifact('MockRegulator');
const MockSettableOracle = contract.fromArtifact('MockSettableOracle');
const Gold = contract.fromArtifact('Gold');

const POOL_REWARD_PERCENT = 30;
const TREASURY_REWARD_BIPS = 250;
const TREASURY_ADDRESS = '0xd62ca03796A3242aFc585566618Aa4c52f4E155D';

function lessPoolAndTreasuryIncentive(baseAmount, newAmount) {
  return new BN(baseAmount + newAmount - poolIncentive(newAmount) - treasuryIncentive(newAmount));
}

function poolIncentive(newAmount) {
  return new BN(newAmount * POOL_REWARD_PERCENT / 100);
}

function treasuryIncentive(newAmount) {
  return new BN(newAmount * TREASURY_REWARD_BIPS / 10000);
}

describe('Regulator', function () {
  const [ ownerAddress, userAddress, poolAddress ] = accounts;

  beforeEach(async function () {
    this.oracle = await MockSettableOracle.new({from: ownerAddress, gas: 8000000});
    this.regulator = await MockRegulator.new(this.oracle.address, poolAddress, {from: ownerAddress, gas: 8000000});
    this.gold = await Gold.at(await this.regulator.gold());
  });

  describe('after bootstrapped', function () {
    beforeEach(async function () {
      await this.regulator.incrementEpochE(); // 1
      await this.regulator.incrementEpochE(); // 2
      await this.regulator.incrementEpochE(); // 3
      await this.regulator.incrementEpochE(); // 4
      await this.regulator.incrementEpochE(); // 5
    });

    describe('up regulation', function () {
      describe('above limit', function () {
        beforeEach(async function () {
          await this.regulator.incrementEpochE(); // 1
          await this.regulator.incrementEpochE(); // 2
          await this.regulator.incrementTotalBondedE(1000000);
          await this.regulator.mintToE(this.regulator.address, 1000000);
        });

        describe('on step', function () {
          beforeEach(async function () {
            await this.oracle.set(125, 100, true);
            this.expectedReward = 100000;

            this.result = await this.regulator.stepE();
            this.txHash = this.result.tx;
          });

          it('mints new Gold tokens', async function () {
            expect(await this.gold.totalSupply()).to.be.bignumber.equal(new BN(1000000).add(new BN(this.expectedReward)));
            expect(await this.gold.balanceOf(this.regulator.address)).to.be.bignumber.equal(lessPoolAndTreasuryIncentive(1000000, this.expectedReward));
            expect(await this.gold.balanceOf(poolAddress)).to.be.bignumber.equal(poolIncentive(this.expectedReward));
            expect(await this.gold.balanceOf(TREASURY_ADDRESS)).to.be.bignumber.equal(treasuryIncentive(this.expectedReward));
          });

          it('updates totals', async function () {
            expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalBonded()).to.be.bignumber.equal(lessPoolAndTreasuryIncentive(1000000, this.expectedReward));
            expect(await this.regulator.totalDebt()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalSupply()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalCoupons()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalRedeemable()).to.be.bignumber.equal(new BN(0));
          });

          it('emits SupplyIncrease event', async function () {
            const event = await expectEvent.inTransaction(this.txHash, MockRegulator, 'SupplyIncrease', {});

            expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
            expect(event.args.price).to.be.bignumber.equal(new BN(125).mul(new BN(10).pow(new BN(16))));
            expect(event.args.newRedeemable).to.be.bignumber.equal(new BN(0));
            expect(event.args.lessDebt).to.be.bignumber.equal(new BN(0));
            expect(event.args.newBonded).to.be.bignumber.equal(new BN(this.expectedReward));
          });
        });
      });

      describe('(2) - only to bonded', function () {
        beforeEach(async function () {
          await this.regulator.incrementEpochE(); // 1
          await this.regulator.incrementEpochE(); // 2
          await this.regulator.incrementTotalBondedE(1000000);
          await this.regulator.mintToE(this.regulator.address, 1000000);
        });

        describe('on step', function () {
          beforeEach(async function () {
            await this.oracle.set(101, 100, true);
            this.expectedReward = 10000;

            this.result = await this.regulator.stepE();
            this.txHash = this.result.tx;
          });

          it('mints new Gold tokens', async function () {
            expect(await this.gold.totalSupply()).to.be.bignumber.equal(new BN(1000000).add(new BN(this.expectedReward)));
            expect(await this.gold.balanceOf(this.regulator.address)).to.be.bignumber.equal(lessPoolAndTreasuryIncentive(1000000, this.expectedReward));
            expect(await this.gold.balanceOf(poolAddress)).to.be.bignumber.equal(poolIncentive(this.expectedReward));
            expect(await this.gold.balanceOf(TREASURY_ADDRESS)).to.be.bignumber.equal(treasuryIncentive(this.expectedReward));
          });

          it('updates totals', async function () {
            expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalBonded()).to.be.bignumber.equal(lessPoolAndTreasuryIncentive(1000000, this.expectedReward));
            expect(await this.regulator.totalDebt()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalSupply()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalCoupons()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalRedeemable()).to.be.bignumber.equal(new BN(0));
          });

          it('emits SupplyIncrease event', async function () {
            const event = await expectEvent.inTransaction(this.txHash, MockRegulator, 'SupplyIncrease', {});

            expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
            expect(event.args.price).to.be.bignumber.equal(new BN(101).mul(new BN(10).pow(new BN(16))));
            expect(event.args.newRedeemable).to.be.bignumber.equal(new BN(0));
            expect(event.args.lessDebt).to.be.bignumber.equal(new BN(0));
            expect(event.args.newBonded).to.be.bignumber.equal(new BN(this.expectedReward));
          });
        });
      });

      describe('(1) - refresh redeemable at specified ratio', function () {
        beforeEach(async function () {
          await this.regulator.incrementEpochE(); // 1

          await this.regulator.incrementTotalBondedE(1000000);
          await this.regulator.mintToE(this.regulator.address, 1000000);

          await this.regulator.increaseDebtE(new BN(2000));
          await this.regulator.incrementBalanceOfCouponsE(userAddress, 1, new BN(100000));

          await this.regulator.incrementEpochE(); // 2
        });

        describe('on step', function () {
          beforeEach(async function () {
            await this.oracle.set(101, 100, true);
            this.expectedReward = 10000;
            this.expectedRewardCoupons = 6750;
            this.expectedRewardDAO = 0;
            this.expectedRewardLP = 3000;
            this.expectedRewardTreasury = 250;

            this.result = await this.regulator.stepE();
            this.txHash = this.result.tx;
          });

          it('mints new Gold tokens', async function () {
            expect(await this.gold.totalSupply()).to.be.bignumber.equal(new BN(1000000).add(new BN(this.expectedReward)));
            expect(await this.gold.balanceOf(this.regulator.address)).to.be.bignumber.equal(new BN(1000000).add(new BN(this.expectedRewardCoupons)));
            expect(await this.gold.balanceOf(poolAddress)).to.be.bignumber.equal(new BN(this.expectedRewardLP));
            expect(await this.gold.balanceOf(TREASURY_ADDRESS)).to.be.bignumber.equal(new BN(this.expectedRewardTreasury));
          });

          it('updates totals', async function () {
            expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalBonded()).to.be.bignumber.equal(new BN(1000000).add(new BN(this.expectedRewardDAO)));
            expect(await this.regulator.totalDebt()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalSupply()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalCoupons()).to.be.bignumber.equal(new BN(100000));
            expect(await this.regulator.totalRedeemable()).to.be.bignumber.equal(new BN(this.expectedRewardCoupons));
          });

          it('emits SupplyIncrease event', async function () {
            const event = await expectEvent.inTransaction(this.txHash, MockRegulator, 'SupplyIncrease', {});

            expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
            expect(event.args.price).to.be.bignumber.equal(new BN(101).mul(new BN(10).pow(new BN(16))));
            expect(event.args.newRedeemable).to.be.bignumber.equal(new BN(this.expectedRewardCoupons));
            expect(event.args.lessDebt).to.be.bignumber.equal(new BN(2000));
            expect(event.args.newBonded).to.be.bignumber.equal(new BN(this.expectedRewardLP + this.expectedRewardDAO + this.expectedRewardTreasury));
          });
        });
      });
    });

    describe('(1 + 2) - refresh redeemable then mint to bonded', function () {
      beforeEach(async function () {
        await this.regulator.incrementEpochE(); // 1

        await this.regulator.incrementTotalBondedE(1000000);
        await this.regulator.mintToE(this.regulator.address, 1000000);

        await this.regulator.increaseDebtE(new BN(2000));
        await this.regulator.incrementBalanceOfCouponsE(userAddress, 1, new BN(2000));

        await this.regulator.incrementEpochE(); // 2

      });

      describe('on step', function () {
        beforeEach(async function () {
          await this.oracle.set(101, 100, true);
          this.bondedReward = 4750;
          this.newRedeemable = 2000;
          this.poolReward = 3000;
          this.treasuryReward = 250;

          this.result = await this.regulator.stepE();
          this.txHash = this.result.tx;
        });

        it('mints new Gold tokens', async function () {
          expect(await this.gold.totalSupply()).to.be.bignumber.equal(new BN(1010000));
          expect(await this.gold.balanceOf(this.regulator.address)).to.be.bignumber.equal(new BN(1000000 + this.newRedeemable + this.bondedReward));
          expect(await this.gold.balanceOf(poolAddress)).to.be.bignumber.equal(new BN(this.poolReward));
          expect(await this.gold.balanceOf(TREASURY_ADDRESS)).to.be.bignumber.equal(new BN(this.treasuryReward));
        });

        it('updates totals', async function () {
          expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalBonded()).to.be.bignumber.equal(new BN(1000000 + this.bondedReward));
          expect(await this.regulator.totalDebt()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalSupply()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalCoupons()).to.be.bignumber.equal(new BN(2000));
          expect(await this.regulator.totalRedeemable()).to.be.bignumber.equal(new BN(2000));
        });

        it('emits SupplyIncrease event', async function () {
          const event = await expectEvent.inTransaction(this.txHash, MockRegulator, 'SupplyIncrease', {});

          expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
          expect(event.args.price).to.be.bignumber.equal(new BN(101).mul(new BN(10).pow(new BN(16))));
          expect(event.args.newRedeemable).to.be.bignumber.equal(new BN(2000));
          expect(event.args.lessDebt).to.be.bignumber.equal(new BN(2000));
          expect(event.args.newBonded).to.be.bignumber.equal(new BN(8000));
        });
      });
    });

    describe('(3) - above limit but below coupon limit', function () {
        beforeEach(async function () {
          await this.regulator.incrementEpochE(); // 1

          await this.regulator.incrementTotalBondedE(1000000);
          await this.regulator.mintToE(this.regulator.address, 1000000);

          await this.regulator.increaseDebtE(new BN(2000));
          await this.regulator.incrementBalanceOfCouponsE(userAddress, 1, new BN(100000));

          await this.regulator.incrementEpochE(); // 2
        });

        describe('on step', function () {
          beforeEach(async function () {
            await this.oracle.set(105, 100, true);
            this.expectedReward = 50000;
            this.expectedRewardCoupons = 33750;
            this.expectedRewardDAO = 0;
            this.expectedRewardLP = 15000;
            this.expectedRewardTreasury = 1250;

            this.result = await this.regulator.stepE();
            this.txHash = this.result.tx;
          });

          it('mints new Gold tokens', async function () {
            expect(await this.gold.totalSupply()).to.be.bignumber.equal(new BN(1000000).add(new BN(this.expectedReward)));
            expect(await this.gold.balanceOf(this.regulator.address)).to.be.bignumber.equal(new BN(1000000).add(new BN(this.expectedRewardCoupons)));
            expect(await this.gold.balanceOf(poolAddress)).to.be.bignumber.equal(new BN(this.expectedRewardLP));
            expect(await this.gold.balanceOf(TREASURY_ADDRESS)).to.be.bignumber.equal(new BN(this.expectedRewardTreasury));
          });

          it('updates totals', async function () {
            expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalBonded()).to.be.bignumber.equal(new BN(1000000).add(new BN(this.expectedRewardDAO)));
            expect(await this.regulator.totalDebt()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalSupply()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalCoupons()).to.be.bignumber.equal(new BN(100000));
            expect(await this.regulator.totalRedeemable()).to.be.bignumber.equal(new BN(this.expectedRewardCoupons));
          });

          it('emits SupplyIncrease event', async function () {
            const event = await expectEvent.inTransaction(this.txHash, MockRegulator, 'SupplyIncrease', {});

            expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
            expect(event.args.price).to.be.bignumber.equal(new BN(105).mul(new BN(10).pow(new BN(16))));
            expect(event.args.newRedeemable).to.be.bignumber.equal(new BN(this.expectedRewardCoupons));
            expect(event.args.lessDebt).to.be.bignumber.equal(new BN(2000));
            expect(event.args.newBonded).to.be.bignumber.equal(new BN(this.expectedRewardLP + this.expectedRewardDAO + this.expectedRewardTreasury));
          });
        });
    });

    describe('down regulation', function () {
      describe('under limit', function () {
        beforeEach(async function () {
          await this.regulator.incrementEpochE(); // 1
          await this.regulator.incrementEpochE(); // 2

          await this.regulator.incrementTotalBondedE(1000000);
          await this.regulator.mintToE(this.regulator.address, 1000000);

          await this.regulator.incrementEpochE(); // 3
        });

        describe('on step', function () {
          beforeEach(async function () {
            await this.oracle.set(85, 100, true);
            this.expectedDebt = 100000;

            this.result = await this.regulator.stepE();
            this.txHash = this.result.tx;
          });

          it('doesnt mint new Gold tokens', async function () {
            expect(await this.gold.totalSupply()).to.be.bignumber.equal(new BN(1000000));
            expect(await this.gold.balanceOf(this.regulator.address)).to.be.bignumber.equal(new BN(1000000));
            expect(await this.gold.balanceOf(poolAddress)).to.be.bignumber.equal(new BN(0));
          });

          it('updates totals', async function () {
            expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalBonded()).to.be.bignumber.equal(new BN(1000000));
            expect(await this.regulator.totalDebt()).to.be.bignumber.equal(new BN(this.expectedDebt));
            expect(await this.regulator.totalSupply()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalCoupons()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalRedeemable()).to.be.bignumber.equal(new BN(0));
          });

          it('emits SupplyDecrease event', async function () {
            const event = await expectEvent.inTransaction(this.txHash, MockRegulator, 'SupplyDecrease', {});

            expect(event.args.epoch).to.be.bignumber.equal(new BN(8));
            expect(event.args.price).to.be.bignumber.equal(new BN(85).mul(new BN(10).pow(new BN(16))));
            expect(event.args.newDebt).to.be.bignumber.equal(new BN(this.expectedDebt));
          });
        });
      });

      describe('without debt', function () {
        beforeEach(async function () {
          await this.regulator.incrementEpochE(); // 1

          await this.regulator.incrementTotalBondedE(1000000);
          await this.regulator.mintToE(this.regulator.address, 1000000);

          await this.regulator.incrementEpochE(); // 2

        });

        describe('on step', function () {
          beforeEach(async function () {
            await this.oracle.set(99, 100, true);
            this.expectedDebt = 10000

            this.result = await this.regulator.stepE();
            this.txHash = this.result.tx;
          });

          it('doesnt mint new Gold tokens', async function () {
            expect(await this.gold.totalSupply()).to.be.bignumber.equal(new BN(1000000));
            expect(await this.gold.balanceOf(this.regulator.address)).to.be.bignumber.equal(new BN(1000000));
            expect(await this.gold.balanceOf(poolAddress)).to.be.bignumber.equal(new BN(0));
          });

          it('updates totals', async function () {
            expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalBonded()).to.be.bignumber.equal(new BN(1000000));
            expect(await this.regulator.totalDebt()).to.be.bignumber.equal(new BN(this.expectedDebt));
            expect(await this.regulator.totalSupply()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalCoupons()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalRedeemable()).to.be.bignumber.equal(new BN(0));
          });

          it('emits SupplyDecrease event', async function () {
            const event = await expectEvent.inTransaction(this.txHash, MockRegulator, 'SupplyDecrease', {});

            expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
            expect(event.args.price).to.be.bignumber.equal(new BN(99).mul(new BN(10).pow(new BN(16))));
            expect(event.args.newDebt).to.be.bignumber.equal(new BN(this.expectedDebt));
          });
        });
      });

      describe('with debt', function () {
        beforeEach(async function () {
          await this.regulator.incrementEpochE(); // 1

          await this.regulator.incrementTotalBondedE(1000000);
          await this.regulator.mintToE(this.regulator.address, 1000000);

          await this.regulator.increaseDebtE(new BN(100000));

          await this.regulator.incrementEpochE(); // 2
        });

        describe('on step', function () {
          beforeEach(async function () {
            await this.oracle.set(99, 100, true);
            this.expectedDebt = 9000;

            this.result = await this.regulator.stepE();
            this.txHash = this.result.tx;
          });

          it('doesnt mint new Gold tokens', async function () {
            expect(await this.gold.totalSupply()).to.be.bignumber.equal(new BN(1000000));
            expect(await this.gold.balanceOf(this.regulator.address)).to.be.bignumber.equal(new BN(1000000));
            expect(await this.gold.balanceOf(poolAddress)).to.be.bignumber.equal(new BN(0));
          });

          it('updates totals', async function () {
            it('updates totals', async function () {
              expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
              expect(await this.regulator.totalBonded()).to.be.bignumber.equal(new BN(1000000));
              expect(await this.regulator.totalDebt()).to.be.bignumber.equal(new BN(100000).add(new BN(this.expectedDebt)));
              expect(await this.regulator.totalSupply()).to.be.bignumber.equal(new BN(0));
              expect(await this.regulator.totalCoupons()).to.be.bignumber.equal(new BN(0));
              expect(await this.regulator.totalRedeemable()).to.be.bignumber.equal(new BN(0));
            });
          });

          it('emits SupplyDecrease event', async function () {
            const event = await expectEvent.inTransaction(this.txHash, MockRegulator, 'SupplyDecrease', {});

            expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
            expect(event.args.price).to.be.bignumber.equal(new BN(99).mul(new BN(10).pow(new BN(16))));
            expect(event.args.newDebt).to.be.bignumber.equal(new BN(this.expectedDebt));
          });
        });
      });

      describe('with debt over limit', function () {
        beforeEach(async function () {
          await this.regulator.incrementEpochE(); // 1

          await this.regulator.incrementTotalBondedE(1000000);
          await this.regulator.mintToE(this.regulator.address, 1000000);

          await this.regulator.increaseDebtE(new BN(100000));

          await this.regulator.incrementEpochE(); // 2
        });

        describe('on step', function () {
          beforeEach(async function () {
            await this.oracle.set(85, 100, true);
            this.expectedDebt = 90000; // 10% not 15%

            this.result = await this.regulator.stepE();
            this.txHash = this.result.tx;
          });

          it('doesnt mint new Gold tokens', async function () {
            expect(await this.gold.totalSupply()).to.be.bignumber.equal(new BN(1000000));
            expect(await this.gold.balanceOf(this.regulator.address)).to.be.bignumber.equal(new BN(1000000));
            expect(await this.gold.balanceOf(poolAddress)).to.be.bignumber.equal(new BN(0));
          });

          it('updates totals', async function () {
            it('updates totals', async function () {
              expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
              expect(await this.regulator.totalBonded()).to.be.bignumber.equal(new BN(1000000));
              expect(await this.regulator.totalDebt()).to.be.bignumber.equal(new BN(100000).add(new BN(this.expectedDebt)));
              expect(await this.regulator.totalSupply()).to.be.bignumber.equal(new BN(0));
              expect(await this.regulator.totalCoupons()).to.be.bignumber.equal(new BN(0));
              expect(await this.regulator.totalRedeemable()).to.be.bignumber.equal(new BN(0));
            });
          });

          it('emits SupplyDecrease event', async function () {
            const event = await expectEvent.inTransaction(this.txHash, MockRegulator, 'SupplyDecrease', {});
            expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
            expect(event.args.price).to.be.bignumber.equal(new BN(85).mul(new BN(10).pow(new BN(16))));
            expect(event.args.newDebt).to.be.bignumber.equal(new BN(this.expectedDebt));
          });
        });
      });

      describe('with debt some capped', function () {
        beforeEach(async function () {
          await this.regulator.incrementEpochE(); // 1

          await this.regulator.incrementTotalBondedE(1000000);
          await this.regulator.mintToE(this.regulator.address, 1000000);

          await this.regulator.increaseDebtE(new BN(345000));

          await this.regulator.incrementEpochE(); // 2
        });

        describe('on step', function () {
          beforeEach(async function () {
            await this.oracle.set(99, 100, true);
            this.expectedDebt = 5000;

            this.result = await this.regulator.stepE();
            this.txHash = this.result.tx;
          });

          it('doesnt mint new Gold tokens', async function () {
            expect(await this.gold.totalSupply()).to.be.bignumber.equal(new BN(1000000));
            expect(await this.gold.balanceOf(this.regulator.address)).to.be.bignumber.equal(new BN(1000000));
            expect(await this.gold.balanceOf(poolAddress)).to.be.bignumber.equal(new BN(0));
          });

          it('updates totals', async function () {
            it('updates totals', async function () {
              expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
              expect(await this.regulator.totalBonded()).to.be.bignumber.equal(new BN(1000000));
              expect(await this.regulator.totalDebt()).to.be.bignumber.equal(new BN(345000).add(new BN(this.expectedDebt)));
              expect(await this.regulator.totalSupply()).to.be.bignumber.equal(new BN(0));
              expect(await this.regulator.totalCoupons()).to.be.bignumber.equal(new BN(0));
              expect(await this.regulator.totalRedeemable()).to.be.bignumber.equal(new BN(0));
            });
          });

          it('emits SupplyDecrease event', async function () {
            const event = await expectEvent.inTransaction(this.txHash, MockRegulator, 'SupplyDecrease', {});

            expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
            expect(event.args.price).to.be.bignumber.equal(new BN(99).mul(new BN(10).pow(new BN(16))));
            expect(event.args.newDebt).to.be.bignumber.equal(new BN(this.expectedDebt));
          });
        });
      });

      describe('with debt all capped', function () {
        beforeEach(async function () {
          await this.regulator.incrementEpochE(); // 1

          await this.regulator.incrementTotalBondedE(1000000);
          await this.regulator.mintToE(this.regulator.address, 1000000);

          await this.regulator.increaseDebtE(new BN(350000));

          await this.regulator.incrementEpochE(); // 2
        });

        describe('on step', function () {
          beforeEach(async function () {
            await this.oracle.set(99, 100, true);
            this.expectedDebt = 0;

            this.result = await this.regulator.stepE();
            this.txHash = this.result.tx;
          });

          it('doesnt mint new Gold tokens', async function () {
            expect(await this.gold.totalSupply()).to.be.bignumber.equal(new BN(1000000));
            expect(await this.gold.balanceOf(this.regulator.address)).to.be.bignumber.equal(new BN(1000000));
            expect(await this.gold.balanceOf(poolAddress)).to.be.bignumber.equal(new BN(0));
          });

          it('updates totals', async function () {
            it('updates totals', async function () {
              expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
              expect(await this.regulator.totalBonded()).to.be.bignumber.equal(new BN(1000000));
              expect(await this.regulator.totalDebt()).to.be.bignumber.equal(new BN(350000).add(new BN(this.expectedDebt)));
              expect(await this.regulator.totalSupply()).to.be.bignumber.equal(new BN(0));
              expect(await this.regulator.totalCoupons()).to.be.bignumber.equal(new BN(0));
              expect(await this.regulator.totalRedeemable()).to.be.bignumber.equal(new BN(0));
            });
          });

          it('emits SupplyDecrease event', async function () {
            const event = await expectEvent.inTransaction(this.txHash, MockRegulator, 'SupplyDecrease', {});

            expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
            expect(event.args.price).to.be.bignumber.equal(new BN(99).mul(new BN(10).pow(new BN(16))));
            expect(event.args.newDebt).to.be.bignumber.equal(new BN(this.expectedDebt));
          });
        });
      });
    });

    describe('neutral regulation', function () {
      beforeEach(async function () {
        await this.regulator.incrementEpochE(); // 1

        await this.regulator.incrementTotalBondedE(1000000);
        await this.regulator.mintToE(this.regulator.address, 1000000);

        await this.regulator.incrementEpochE(); // 2

      });

      describe('on step', function () {
        beforeEach(async function () {
          await this.oracle.set(100, 100, true);
          this.result = await this.regulator.stepE();
          this.txHash = this.result.tx;
        });

        it('doesnt mint new Gold tokens', async function () {
          expect(await this.gold.totalSupply()).to.be.bignumber.equal(new BN(1000000));
          expect(await this.gold.balanceOf(this.regulator.address)).to.be.bignumber.equal(new BN(1000000));
          expect(await this.gold.balanceOf(poolAddress)).to.be.bignumber.equal(new BN(0));
        });

        it('updates totals', async function () {
          expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalBonded()).to.be.bignumber.equal(new BN(1000000));
          expect(await this.regulator.totalDebt()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalSupply()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalCoupons()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalRedeemable()).to.be.bignumber.equal(new BN(0));
        });

        it('emits SupplyNeutral event', async function () {
          const event = await expectEvent.inTransaction(this.txHash, MockRegulator, 'SupplyNeutral', {});

          expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
        });
      });
    });

    describe('not valid', function () {
      beforeEach(async function () {
        await this.regulator.incrementEpochE(); // 1

        await this.regulator.incrementTotalBondedE(1000000);
        await this.regulator.mintToE(this.regulator.address, 1000000);

        await this.regulator.incrementEpochE(); // 2

      });

      describe('on step', function () {
        beforeEach(async function () {
          await this.oracle.set(105, 100, false);
          this.result = await this.regulator.stepE();
          this.txHash = this.result.tx;
        });

        it('doesnt mint new Gold tokens', async function () {
          expect(await this.gold.totalSupply()).to.be.bignumber.equal(new BN(1000000));
          expect(await this.gold.balanceOf(this.regulator.address)).to.be.bignumber.equal(new BN(1000000));
          expect(await this.gold.balanceOf(poolAddress)).to.be.bignumber.equal(new BN(0));
        });

        it('updates totals', async function () {
          expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalBonded()).to.be.bignumber.equal(new BN(1000000));
          expect(await this.regulator.totalDebt()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalSupply()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalCoupons()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalRedeemable()).to.be.bignumber.equal(new BN(0));
        });

        it('emits SupplyNeutral event', async function () {
          const event = await expectEvent.inTransaction(this.txHash, MockRegulator, 'SupplyNeutral', {});

          expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
        });
      });
    });
  });
});
