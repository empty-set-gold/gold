const {expect} = require('chai');
const {BN, expectRevert} = require('@openzeppelin/test-helpers');
const {accounts, contract} = require('@openzeppelin/test-environment');

const Gold = contract.fromArtifact('Gold');
const MockHybridOraclePool = contract.fromArtifact('MockHybridOraclePool')
const StubHybridPool = contract.fromArtifact('StubHybridPool');
const StubHybridOracle = contract.fromArtifact('StubHybridOracle');
const DECIMAL_DIFF = new BN(10).pow(new BN(0));

const epsilon = (tolerance) => new BN(tolerance).mul(DECIMAL_DIFF);

describe('HybridOraclePool Implementation', () => {
    it('should only allow the DAO to call capture', async () => {
        expectRevert(capture({from: unauthorizedUser}), "HybridOraclePool: Not DAO")
        await capture({from: mockDaoAddress})
    })

    it('should only allow the DAO to call `distributeToPools`', async () => {
        expectRevert(distributeToPools({from: unauthorizedUser, amount: gold(100)}), "HybridOraclePool: Not DAO")
        await distributeToPools({from: mockDaoAddress, amount: gold(100)})
    })

    it('should only allow the DAO or Treasury to call addOraclePoolPair, removeOraclePoolPair', async () => {
        expectRevert(addOraclePoolPair({oracle: this.mockOracle0.address, pool: this.mockPool0.address, from: unauthorizedUser}),
            "HybridOraclePool: Not Treasury or DAO"
        )

        expectRevert(removeOraclePoolPair({index: 0, from: unauthorizedUser}),
            "HybridOraclePool: Not Treasury or DAO"
        )

        await addOraclePoolPair({oracle: this.mockOracle0.address, pool: this.mockPool0.address, from: mockDaoAddress})
        await removeOraclePoolPair({index: 0, from: mockTreasuryAddress})

        await addOraclePoolPair({oracle: this.mockOracle0.address, pool: this.mockPool0.address, from: mockTreasuryAddress})
        await removeOraclePoolPair({index: 0, from: mockDaoAddress})
    })

    it('should allow the addition of new oracle/pool pairs', async () => {
        const pair0 = {oracle: this.mockOracle0.address, pool: this.mockPool0.address};
        const pair1 = {oracle: this.mockOracle1.address, pool: this.mockPool1.address};
        await addOraclePoolPair(pair0)
        await addOraclePoolPair(pair1)
        expect(await oraclePoolPair(0)).to.be.deep.equal(pair0)
        expect(await oraclePoolPair(1)).to.be.deep.equal(pair1)
    })

    it('should not allow the addition of duplicate oracles', async () => {
        const pair0 = {oracle: this.mockOracle0.address, pool: this.mockPool0.address};
        const pairWithDuplicateOracle = {oracle: this.mockOracle0.address, pool: this.mockPool1.address};
        await addOraclePoolPair(pair0)
        expectRevert(addOraclePoolPair(pairWithDuplicateOracle),
            'HybridOraclePool: This oracle already exists'
        )
    })

    it('should not allow the addition of duplicate pools', async () => {
        const pair0 = {oracle: this.mockOracle0.address, pool: this.mockPool0.address};
        const pairWithDuplicatePool = {oracle: this.mockOracle1.address, pool: this.mockPool0.address};
        await addOraclePoolPair(pair0)
        expectRevert(addOraclePoolPair(pairWithDuplicatePool),
            'HybridOraclePool: This pool already exists'
        )
    })

    it('should allow the removal of oracle/pool pairs', async () => {
        const [pair0, pair1, pair2, pair3] = addresses(await preloadPairs());

        await removeOraclePoolPair({index: 0})
        expect(await getOraclePoolPairs()).to.be.deep.equal([pair3, pair1, pair2])

        await removeOraclePoolPair({index: 2})
        expect(await getOraclePoolPairs()).to.be.deep.equal([pair3, pair1])

        await addOraclePoolPair(pair2)
        await removeOraclePoolPair({index: 1})
        expect(await getOraclePoolPairs()).to.be.deep.equal([pair3, pair2])

        expectRevert(removeOraclePoolPair({index: 2}), 'HybridOraclePool: This pair does not exist')
        expect(await getOraclePoolPairs()).to.be.deep.equal([pair3, pair2])

        await removeOraclePoolPair({index: 1})
        expect(await getOraclePoolPairs()).to.be.deep.equal([pair3])

        await removeOraclePoolPair({index: 0})
        expect(await getOraclePoolPairs()).to.be.deep.equal([])

        expectRevert(removeOraclePoolPair({index: 0}), 'HybridOraclePool: This pair does not exist')
        expect(await getOraclePoolPairs()).to.be.deep.equal([])
    })

    it('should allow the lookup of oracle indexes (useful for knowing which index to use for removal)', async () => {
        const [pair0, pair1, pair2, pair3] = addresses(await preloadPairs());
        expect(await indexOfOracle(pair2.oracle)).to.be.bignumber.equal(new BN(2))
        expect(await indexOfOracle(pair2.pool)).to.be.bignumber.equal(MAX_UINT256)
    })

    it('should allow the lookup of pool indexes (useful for knowing which index to use for removal)', async () => {
        const [pair0, pair1, pair2, pair3] = addresses(await preloadPairs());
        expect(await indexOfPool(pair3.pool)).to.be.bignumber.equal(new BN(3))
        expect(await indexOfPool(pair3.oracle)).to.be.bignumber.equal(MAX_UINT256)
    })

    it('should return the default ratio and an invalid status when there are no oracles', async () => {
        const initialLastCaptureResult = await lastCapture()
        expect(initialLastCaptureResult.ratio).to.be.equal(ratio(1.0));
        expect(initialLastCaptureResult.valid).to.be.equal(false);

        const captureResult = await capture({})
        const lastCaptureResult = await lastCapture()

        expect(captureResult.ratio).to.be.equal(ratio(1.0));
        expect(captureResult.valid).to.be.equal(false);

        expect(lastCaptureResult.ratio).to.be.equal(ratio(1.0));
        expect(lastCaptureResult.valid).to.be.equal(false);
    })

    it('should capture and aggregate the price of each oracle weighted by the usd value of backing asset liquidity bonded', async () => {
        const pairs = await preloadPairs()
        const [pair0, pair1, pair2, pair3] = pairs

        for (const pair of pairs) {
            await setPoolUsdValueBonded(pair, 1000)
        }

        await setOracleTwap(pair0, ratio(1.0), true)
        await setOracleTwap(pair1, ratio(1.0), true)
        await setOracleTwap(pair2, ratio(1.0), true)
        await setOracleTwap(pair3, ratio(1.0), true)
        expect(await capture({})).to.deep.equal({ratio: ratio(1.0), valid: true})

        await setOracleTwap(pair0, ratio(1.0), true)
        await setOracleTwap(pair1, ratio(1.0), true)
        await setOracleTwap(pair2, ratio(0.5), true)
        await setOracleTwap(pair3, ratio(0.5), true)
        expect(await capture({})).to.deep.equal({ratio: ratio(0.75), valid: true})

        await setOracleTwap(pair0, ratio(1.0), true)
        await setOracleTwap(pair1, ratio(1.0), true)
        await setOracleTwap(pair2, ratio(0), true)
        await setOracleTwap(pair3, ratio(0.6), true)
        expect(await capture({})).to.deep.equal({ratio: ratio(0.65), valid: true})

        await setOracleTwap(pair0, ratio(2.5), true)
        await setOracleTwap(pair1, ratio(1.1), true)
        await setOracleTwap(pair2, ratio(1.5), true)
        await setOracleTwap(pair3, ratio(1.6), true)
        expect(await capture({})).to.deep.equal({ratio: ratio(1.675), valid: true})
    })

    it('should return a ratio within an acceptable accuracy given more complex inputs', async () => {
        const pairs = await preloadPairs()
        const [pair0, pair1, pair2, pair3] = pairs

        /*
        TVL == (2000 + 10 + 10000 + 1500) == 13510

            p0 weight (w0) == (2000/13510) == 0.14803849
            p1 weight (w1) == (10/13510) == 0.00074019245
            p2 weight (w2) == (10000/13510) == 0.74019245
            p3 weight (w3) == (1500/13510) == 0.1110288675

            Liquidity Weighted TWAP ==
                (2.5 * 0.14803849) + (10.1 * 0.00074019245) + (1.5 * 0.74019245) + (1.6 * 0.1110288675) ==
                    1.6655~
         */

        await setPoolUsdValueBonded(pair0, 2000)
        await setOracleTwap(pair0, ratio(2.5), true)

        await setPoolUsdValueBonded(pair1, 10)
        await setOracleTwap(pair1, ratio(10.1), true)

        await setPoolUsdValueBonded(pair2, 10000)
        await setOracleTwap(pair2, ratio(1.5), true)

        await setPoolUsdValueBonded(pair3, 1500)
        await setOracleTwap(pair3, ratio(1.6), true)

        const weightedCapture = await capture({})
        expect(weightedCapture.valid).to.be.true
        expect(weightedCapture.ratio).to.be.bignumber.closeTo(ratio(1.6655), epsilon(1e13))
    })

    it('should only aggregate price info from the oracles with a valid price capture', async () => {
        const pairs = await preloadPairs()
        const [pair0, pair1, pair2, pair3] = pairs

        for (const pair of pairs) {
            await setPoolUsdValueBonded(pair, 1000)
        }

        await setOracleTwap(pair0, ratio(1.0), true)
        await setOracleTwap(pair1, ratio(1.0), true)
        await setOracleTwap(pair2, ratio(0.5), false)
        await setOracleTwap(pair3, ratio(0.5), false)
        expect(await capture({})).to.deep.equal({ratio: ratio(1.0), valid: true})

        await setOracleTwap(pair0, ratio(100.0), false)
        await setOracleTwap(pair1, ratio(0.5), true)
        await setOracleTwap(pair2, ratio(0), false)
        await setOracleTwap(pair3, ratio(0.8), true)
        expect(await capture({})).to.deep.equal({ratio: ratio(0.65), valid: true})
    })

    it('should return an invalid reading, with the default ratio if all oracles are invalid', async () => {
        const pairs = await preloadPairs()
        const [pair0, pair1, pair2, pair3] = pairs

        for (const pair of pairs) {
            await setPoolUsdValueBonded(pair, 1000)
        }

        await setOracleTwap(pair0, ratio(1.0), false)
        await setOracleTwap(pair1, ratio(1.0), false)
        await setOracleTwap(pair2, ratio(1.0), false)
        await setOracleTwap(pair3, ratio(1.0), false)
        expect(await capture({})).to.deep.equal({ratio: ratio(1.0), valid: false})
    })

    it('should allow a read of the current pool weights based on current liquidity bonded', async () => {
        const [pair0, pair1, pair2, pair3] = await preloadPairs()

        await setPoolUsdValueBonded(pair0, 1000)
        await setPoolUsdValueBonded(pair1, 1000)
        await setPoolUsdValueBonded(pair2, 1000)
        await setPoolUsdValueBonded(pair3, 1000)
        expect((await getPoolWeights()).every(weight => weight.eq(share(0.25)))).to.be.true

        await setPoolUsdValueBonded(pair0, 0)
        await setPoolUsdValueBonded(pair1, 10)
        await setPoolUsdValueBonded(pair2, 5)
        await setPoolUsdValueBonded(pair3, 5)
        expect(await getPoolWeights()).to.deep.equal([0, 0.5, 0.25, 0.25].map(share))

        // Handle division by 0 if TVL drops to zero
        await setPoolUsdValueBonded(pair0, 0)
        await setPoolUsdValueBonded(pair1, 0)
        await setPoolUsdValueBonded(pair2, 0)
        await setPoolUsdValueBonded(pair3, 0)
        expect(await getPoolWeights()).to.deep.equal([0, 0, 0, 0].map(share))

        await setPoolUsdValueBonded(pair0, 999943223)
        await setPoolUsdValueBonded(pair1, 37284324)
        await setPoolUsdValueBonded(pair2, 543235543)
        await setPoolUsdValueBonded(pair3, 333479)
        const sumOfWeights = (await getPoolWeights()).reduce((acc, p) => acc.add(p))
        expect(sumOfWeights).to.be.bignumber.closeTo(share(1), epsilon(10))
    })

    it('should distribute rewards to pools proportionally based on their USD value bonded', async () => {
        const [pair0, pair1, pair2, pair3] = await preloadPairs()
        await setPoolUsdValueBonded(pair0, 1000)
        await setPoolUsdValueBonded(pair1, 1000)
        await setPoolUsdValueBonded(pair2, 1000)
        await setPoolUsdValueBonded(pair3, 1000)

        await distributeToPools({amount: gold(100)})
        expect(await balanceOf(pair0.pool.address)).to.be.bignumber.equal(gold(25))
        expect(await balanceOf(pair1.pool.address)).to.be.bignumber.equal(gold(25))
        expect(await balanceOf(pair2.pool.address)).to.be.bignumber.equal(gold(25))
        expect(await balanceOf(pair3.pool.address)).to.be.bignumber.equal(gold(25))
    })

    const [mockDaoAddress, mockTreasuryAddress, unauthorizedUser] = accounts

    const balanceOf = (address) =>
        this.gold.balanceOf(address, {from: mockDaoAddress})

    const lastCapture = async () => {
        const result = await this.hybridOraclePool.lastCapture();
        const ratio = result[0].value;
        const valid = result[1];
        return {ratio, valid};
    }

    const ratio = (n) =>
        new BN(n * 1000000000000).mul(new BN(1e6.toString())).toString()

    const capture = async ({from}) => {
        await this.hybridOraclePool.capture({from: from || mockDaoAddress})
        const result = await this.hybridOraclePool.lastCapture()
        const ratio = result[0].value
        const valid = result[1]
        return {ratio, valid}

    }

    const addOraclePoolPair = async ({oracle, pool, from}) => {
        await this.hybridOraclePool.addOraclePoolPair(oracle, pool, {from: from || mockDaoAddress})
    }

    const removeOraclePoolPair = async ({index, from}) =>
        await this.hybridOraclePool.removeOraclePoolPair(index, {from: from || mockDaoAddress})

    const oraclePoolPair = async (index) => {
        const pair = await this.hybridOraclePool.oraclePoolPairs(index, {from: mockDaoAddress})
        return {oracle: pair.oracle, pool: pair.pool};
    }

    const getOraclePoolPairs = async () => {
        const pairs = await this.hybridOraclePool.getOraclePoolPairs({from: mockDaoAddress})
        return pairs.map(pair => ({oracle: pair.oracle, pool: pair.pool}))
    }

    const setPoolUsdValueBonded = async ({pool, oracle}, value) => {
        await pool.setUsdValueBonded(new BN(value).mul(new BN(10e18.toString())))
    }

    const setOracleTwap = async ({pool, oracle}, ratio, valid) =>
        await oracle.setCapture(ratio, valid)

    const getPoolWeights = async () =>
        (await this.hybridOraclePool.getPoolWeights.call()).map(r => new BN(r.value))

    const share = (pc) => new BN((pc * 1e18).toString())

    const preloadPairs = async () => {
        const pairs = [{oracle: this.mockOracle0, pool: this.mockPool0},
            {oracle: this.mockOracle1, pool: this.mockPool1},
            {oracle: this.mockOracle2, pool: this.mockPool2},
            {oracle: this.mockOracle3, pool: this.mockPool3}]

        // pairs.forEach not compatible with async/await :(
        for (const {oracle, pool} of pairs) {
            await addOraclePoolPair({oracle: oracle.address, pool: pool.address})
        }
        expect(await getOraclePoolPairs()).to.be.deep.equal(addresses(pairs))
        return pairs
    }

    const indexOfOracle = async (oracleAddress) =>
        this.hybridOraclePool.indexOfOracle(oracleAddress, {from: mockDaoAddress})

    const addresses = (pairs) =>
        pairs.map(({oracle, pool}) => ({oracle: oracle.address, pool: pool.address}))


    const indexOfPool = async (poolAddress) =>
        this.hybridOraclePool.indexOfPool(poolAddress, {from: mockDaoAddress})

    const distributeToPools = ({from, amount}) =>
        this.hybridOraclePool.distributeToPools.sendTransaction(amount, {from: from || mockDaoAddress})

    const MAX_UINT256 = new BN(2).pow(new BN(256)).subn(1);

    const gold = (amount) => new BN(amount).mul(new BN(1e18.toString()))

    const initMocks = async () => {
        this.mockOracle0 = await StubHybridOracle.new({from: mockDaoAddress})
        this.mockOracle1 = await StubHybridOracle.new({from: mockDaoAddress})
        this.mockOracle2 = await StubHybridOracle.new({from: mockDaoAddress})
        this.mockOracle3 = await StubHybridOracle.new({from: mockDaoAddress})

        this.mockPool0 = await StubHybridPool.new({from: mockDaoAddress})
        this.mockPool1 = await StubHybridPool.new({from: mockDaoAddress})
        this.mockPool2 = await StubHybridPool.new({from: mockDaoAddress})
        this.mockPool3 = await StubHybridPool.new({from: mockDaoAddress})
    }

    beforeEach(async () => {
        await initMocks()
        this.gold = await Gold.new({from: mockDaoAddress})
        this.hybridOraclePool = await MockHybridOraclePool.new(
            this.gold.address,
            mockDaoAddress,
            mockTreasuryAddress,
            {from: mockDaoAddress, gas: 8000000}
        )

        await this.gold.addMinter(this.hybridOraclePool.address, {from: mockDaoAddress})
    })
});
