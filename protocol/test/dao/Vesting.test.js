const {accounts, contract} = require('@openzeppelin/test-environment');
const {BN, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const {expect} = require('chai');
const MockBonding = contract.fromArtifact('MockBonding');
const Gold = contract.fromArtifact('Gold');

describe('Deployer Contract Vesting/Burn Mechanism', () => {
    const self = this

    const [deployerAddress, userA, userB, userC] = accounts

    const DEPLOYER_LOCKUP_END = 1622505600; // 2021-06-01T00:00:00+00:00

    const INITIAL_STAKE_MULTIPLE = new BN(10).pow(new BN(6))

    const initialAccountStates = [
        {acc: deployerAddress, initialBalance: 10},
        {acc: userA, initialBalance: 2},
        {acc: userB, initialBalance: 1}
    ]

    const additionalCirculatingUser = {
        acc: userC, initialBalance: 2
    }

    before(async () => {
        self.bonding = await MockBonding.new({from: deployerAddress, gas: 8000000});
        await self.bonding.setDeployerAddress(deployerAddress);
        self.gold = await Gold.at(await self.bonding.gold());
        await self.bonding.setEpochParamsE(DEPLOYER_LOCKUP_END - (100 * 21600), 21600);
        await self.bonding.setBlockTimestamp(DEPLOYER_LOCKUP_END - (2 * 21600));
    })

    it('should allow all users to deposit with their initial balance', async () => {
        //Aside from liquid user
        await self.bonding.mintToE(additionalCirculatingUser.acc, additionalCirculatingUser.initialBalance);

        for (const {acc, initialBalance} of initialAccountStates) {
            await self.bonding.mintToE(acc, initialBalance);
            await self.gold.approve(self.bonding.address, initialBalance, {from: acc});
            await self.bonding.deposit(initialBalance, {from: acc});
        }

        for (const {acc, initialBalance} of initialAccountStates) {
            expect(await self.gold.balanceOf(acc)).to.be.bignumber.equal(new BN(0));
            expect(await self.bonding.balanceOf(acc)).to.be.bignumber.equal(new BN(0));
            expect(await self.bonding.balanceOfStaged(acc)).to.be.bignumber.equal(new BN(initialBalance));
            expect(await self.bonding.balanceOfBonded(acc)).to.be.bignumber.equal(new BN(0));
        }
    });

    it('should update DAO balances to reflect user deposits', async () => {
        expect(await self.gold.balanceOf(self.bonding.address)).to.be.bignumber.equal(new BN(13));
        expect(await self.bonding.totalSupply()).to.be.bignumber.equal(new BN(0));
        expect(await self.bonding.totalBonded()).to.be.bignumber.equal(new BN(0));
        expect(await self.bonding.totalStaged()).to.be.bignumber.equal(new BN(13));
    });

    it('should update the total ESG supply', async () => {
        const totalStaged = 13
        const totalCirculating = additionalCirculatingUser.initialBalance;
        expect(await self.gold.totalSupply()).to.be.bignumber.equal(new BN(totalCirculating + totalStaged))
    })

    it('should allow all users to bond with their staged balance and update the bonded balance', async () => {
        for (const {acc, initialBalance} of initialAccountStates) {
            await self.bonding.bond(initialBalance, {from: acc});
        }

        for (const {acc, initialBalance} of initialAccountStates) {
            expect(await self.gold.balanceOf(acc)).to.be.bignumber.equal(new BN(0));
            expect(await self.bonding.balanceOf(acc)).to.be.bignumber.equal(new BN(INITIAL_STAKE_MULTIPLE.mul(new BN(initialBalance))));
            expect(await self.bonding.balanceOfStaged(acc)).to.be.bignumber.equal(new BN(0));
            expect(await self.bonding.balanceOfBonded(acc)).to.be.bignumber.equal(new BN(initialBalance));
        }

        expect(await self.bonding.totalBonded()).to.be.bignumber.equal(
            new BN(10).add(new BN(2)).add(new BN(1))
        );
    })

    it('should burn 70% of the deployer stake and ESG in response to burnDeployerStake()', async () => {
        const seventyPercent = new BN(70);
        await self.bonding.burnDeployerStakeE(seventyPercent, {from: userC});

        const deployerSharePostBurn = INITIAL_STAKE_MULTIPLE.mul(new BN(3));
        const userAShare = INITIAL_STAKE_MULTIPLE.mul(new BN(2));
        const userBShare = INITIAL_STAKE_MULTIPLE.mul(new BN(1));

        expect(await self.bonding.totalBonded()).to.be.bignumber.equal(
            new BN(3).add(new BN(2)).add(new BN(1))
        );

        expect(await self.bonding.totalSupply()).to.be.bignumber.equal(
            deployerSharePostBurn.add(userAShare).add(userBShare)
        );

        expect(await self.gold.totalSupply()).to.be.bignumber.equal(
            new BN(3).add(new BN(2)).add(new BN(1)).add(new BN(additionalCirculatingUser.initialBalance))
        );

        expect(await self.gold.balanceOf(additionalCirculatingUser.acc)).to.be.bignumber.equal(
            new BN(additionalCirculatingUser.initialBalance)
        );

        expect(await self.bonding.balanceOf(deployerAddress)).to.be.bignumber.equal(deployerSharePostBurn)
        expect(await self.bonding.balanceOf(userA)).to.be.bignumber.equal(userAShare)
        expect(await self.bonding.balanceOf(userB)).to.be.bignumber.equal(userBShare)
    })

    it('should allow users to unbond their balance', async () => {
        for (const {acc, unbondAmount} of [{acc: userA, unbondAmount: 2}, {acc: userB, unbondAmount: 1}]) {
            const unbondResult = await this.bonding.unbondUnderlying(unbondAmount, {from: acc})
            const event = await expectEvent.inTransaction(unbondResult.tx, MockBonding, 'Unbond', {
                account: acc
            });

            expect(event.args.value).to.be.bignumber.equal(new BN(unbondAmount).mul(INITIAL_STAKE_MULTIPLE));
            expect(event.args.valueUnderlying).to.be.bignumber.equal(new BN(unbondAmount));
        }
    })

    it('should allow users to withdraw their balance', async () => {
        const withdrawAmount = 2;
        const acc = userA;

        for (let i = 0; i < 20; i++) {
            await self.bonding.stepE({from: deployerAddress})
        }

        const withdrawResult = await this.bonding.withdraw(withdrawAmount, {from: acc});
        const event = await expectEvent.inTransaction(withdrawResult.tx, MockBonding, 'Withdraw', {
            account: acc
        });

        expect(event.args.value).to.be.bignumber.equal(new BN(withdrawAmount));
    })

    it('should not allow the deployer to unbond before the vesting deadline', async () => {
        await expectRevert(this.bonding.unbondUnderlying(3, {from: deployerAddress}), "Permission: Unlocked after 2021-06-01")
        await self.bonding.setBlockTimestamp(DEPLOYER_LOCKUP_END + (21600 * 2));

        const unbondResult = await this.bonding.unbondUnderlying(3, {from: deployerAddress});
        const event = await expectEvent.inTransaction(unbondResult.tx, MockBonding, 'Unbond', {
            account: deployerAddress
        });

        expect(event.args.value).to.be.bignumber.equal(new BN(3).mul(INITIAL_STAKE_MULTIPLE));
        expect(event.args.valueUnderlying).to.be.bignumber.equal(new BN(3));
    })
});
