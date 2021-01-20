const {expect} = require('chai')
const {BN} = require('@openzeppelin/test-helpers')
const {accounts, contract, web3} = require('@openzeppelin/test-environment')

const Gold = contract.fromArtifact('Gold')
const MockUniswapV2PairLiquidity = contract.fromArtifact('MockUniswapV2PairLiquidity')
const MockToken = contract.fromArtifact('MockToken')
const StubHybridOracle = contract.fromArtifact('StubHybridOracle')
const MockHybridPool = contract.fromArtifact('MockHybridPool')

describe('HybridPoolBase Implementation', () => {
    it('should calculate the USD value of the pool based on the last captured ratio of ESG/Asset in the oracle', async () => {
        await runTest({
            reserves: {gold: bn(1), asset: bn(1)},
            capture: {ratio: ratio(1.0), valid: true},
            assetPrice: bn(1),
            univ2Supply: bn(1),
            univ2Bonded: bn(1),
            expectedUsdValue: bn(2)
        })

        await runTest({
            reserves: {gold: bn(0.5), asset: bn(1)},
            capture: {ratio: ratio(2.0), valid: true},
            assetPrice: bn(1),
            univ2Supply: bn(1),
            univ2Bonded: bn(1),
            expectedUsdValue: bn(2)
        })

        await runTest({
            reserves: {gold: bn(2), asset: bn(1)},
            capture: {ratio: ratio(0.5), valid: true},
            assetPrice: bn(1),
            univ2Supply: bn(1),
            univ2Bonded: bn(1),
            expectedUsdValue: bn(2)
        })

        await runTest({
            reserves: {gold: bn(100), asset: bn(10)},
            capture: {ratio: ratio(0.1), valid: true},
            assetPrice: bn(1),
            univ2Supply: bn(1),
            univ2Bonded: bn(1),
            expectedUsdValue: bn(20)
        })
    })

    it('should calculate the USD value of the pool based on amount of backing asset + gold in the pool', async () => {
        await runTest({
            reserves: {gold: bn(0), asset: bn(0)},
            capture: {ratio: ratio(1.0), valid: true},
            assetPrice: bn(1),
            univ2Supply: bn(1),
            univ2Bonded: bn(1),
            expectedUsdValue: bn(0)
        })

        await runTest({
            reserves: {gold: bn(0.1), asset: bn(0.1)},
            capture: {ratio: ratio(1.0), valid: true},
            assetPrice: bn(1),
            univ2Supply: bn(1),
            univ2Bonded: bn(1),
            expectedUsdValue: bn(0.2)
        })

        await runTest({
            reserves: {gold: bn(0.2), asset: bn(0.2)},
            capture: {ratio: ratio(1.0), valid: true},
            assetPrice: bn(1),
            univ2Supply: bn(1),
            univ2Bonded: bn(1),
            expectedUsdValue: bn(0.4)
        })

        await runTest({
            reserves: {gold: bn(2), asset: bn(2)},
            capture: {ratio: ratio(1.0), valid: true},
            assetPrice: bn(1),
            univ2Supply: bn(1),
            univ2Bonded: bn(1),
            expectedUsdValue: bn(4)
        })

        await runTest({
            reserves: {gold: bn(99999999), asset: bn(99999999)},
            capture: {ratio: ratio(1.0), valid: true},
            assetPrice: bn(1),
            univ2Supply: bn(1),
            univ2Bonded: bn(1),
            expectedUsdValue: bn(99999999 * 2)
        })
    })

    it('should return a USD value of 0 if the last capture was invalid', async () => {
        await runTest({
            reserves: {gold: bn(1), asset: bn(1)},
            capture: {ratio: ratio(1.0), valid: false},
            assetPrice: bn(1),
            univ2Supply: bn(1),
            univ2Bonded: bn(1),
            expectedUsdValue: bn(0)
        })
    })

    it('should calculate the USD value of the pool based only on the percentage of UNIv2 tokens which are currently bonded to the Pool', async () => {
        await runTest({
            reserves: {gold: bn(1), asset: bn(1)},
            capture: {ratio: ratio(1.0), valid: true},
            assetPrice: bn(1),
            univ2Supply: bn(1),
            univ2Bonded: bn(1),
            expectedUsdValue: bn(2)
        })

        await runTest({
            reserves: {gold: bn(1), asset: bn(1)},
            capture: {ratio: ratio(1.0), valid: true},
            assetPrice: bn(1),
            univ2Supply: bn(1),
            univ2Bonded: bn(0.5),
            expectedUsdValue: bn(1)
        })

        await runTest({
            reserves: {gold: bn(1), asset: bn(1)},
            capture: {ratio: ratio(1.0), valid: true},
            assetPrice: bn(1),
            univ2Supply: bn(0),
            univ2Bonded: bn(0),
            expectedUsdValue: bn(0)
        })

        await runTest({
            reserves: {gold: bn(1), asset: bn(1)},
            capture: {ratio: ratio(1.0), valid: true},
            assetPrice: bn(1),
            univ2Supply: bn(0),
            univ2Bonded: bn(1),
            expectedUsdValue: bn(0)
        })

        await runTest({
            reserves: {gold: bn(1), asset: bn(1)},
            capture: {ratio: ratio(1.0), valid: true},
            assetPrice: bn(1),
            univ2Supply: bn(1),
            univ2Bonded: bn(0),
            expectedUsdValue: bn(0)
        })
    })

    it('should calculate the USD value of the pool when the balance does not change but the price of the backing asset does', async () => {
        await runTest({
            reserves: {gold: bn(1), asset: bn(1)},
            capture: {ratio: ratio(1.0), valid: true},
            assetPrice: bn(100),
            univ2Supply: bn(1),
            univ2Bonded: bn(1),
            expectedUsdValue: bn(200)
        })

        await runTest({
            reserves: {gold: bn(1), asset: bn(1)},
            capture: {ratio: ratio(1.0), valid: true},
            assetPrice: bn(0.01),
            univ2Supply: bn(1),
            univ2Bonded: bn(1),
            expectedUsdValue: bn(0.02)
        })

        await runTest({
            reserves: {gold: bn(1), asset: bn(1)},
            capture: {ratio: ratio(1.0), valid: true},
            assetPrice: bn(0), // Hopefully not :|
            univ2Supply: bn(1),
            univ2Bonded: bn(1),
            expectedUsdValue: bn(0)
        })
    })

    it('should not include staged balance in the USD value determination of the pool', async () => {
        await runTest({
            reserves: {gold: bn(1), asset: bn(1)},
            capture: {ratio: ratio(1.0), valid: true},
            assetPrice: bn(1),
            univ2Supply: bn(2),
            univ2Bonded: bn(1),
            univ2Staged: bn(1),
            expectedUsdValue: bn(1)
        })
    })

    it('should work as expected with backing assets of a differing number of decimals', async () => {
        await setup({decimals: 6})
        await runTest({
            reserves: {gold: bn(1), asset: new BN("1000000")},
            capture: {ratio: ratio(1.0), valid: true},
            assetPrice: bn(1),
            univ2Supply: bn(1),
            univ2Bonded: bn(1),
            expectedUsdValue: bn(2)
        })

        await setup({decimals: 0})
        await runTest({
            reserves: {gold: bn(1), asset: new BN("1")},
            capture: {ratio: ratio(1.0), valid: true},
            assetPrice: bn(1),
            univ2Supply: bn(1),
            univ2Bonded: bn(1),
            expectedUsdValue: bn(2)
        })

        await setup({decimals: 21})
        await runTest({
            reserves: {gold: bn(1), asset: new BN("1000000000000000000000")},
            capture: {ratio: ratio(1.0), valid: true},
            assetPrice: bn(1),
            univ2Supply: bn(1),
            univ2Bonded: bn(1),
            expectedUsdValue: bn(2)
        })
    }).timeout(10000);

    const [mockDaoAddress] = accounts

    const runTest = async ({reserves, capture, assetPrice, univ2Supply, univ2Bonded, expectedUsdValue, univ2Staged}) => {
        await setReserves(reserves)
        await setCapture(capture)
        await setBackingAssetPrice(assetPrice)
        await setUniV2TotalSupply(univ2Supply)
        await setBonded(univ2Bonded)
        await setStaged(univ2Staged || 0) // Not strictly related, but just in case.
        await expect(await usdValueBonded()).to.be.bignumber.equal(expectedUsdValue)
    }

    const bn = (n) =>
        new BN(n * 100000).mul(new BN(1e13.toString()))

    const ratio = (n) =>
        new BN(n * 1000).mul(new BN(1e15.toString()))

    const setCapture = ({ratio, valid}) =>
        this.backingAssetOracle.setCapture(ratio, valid)

    const setReserves = ({gold, asset}) =>
        this.pool.setReserves(gold, asset)

    const setBackingAssetPrice = (price) =>
        this.backingAssetOracle.setBackingAssetUsdPrice(price)

    const setUniV2TotalSupply = (supply) =>
        this.liquidity.setTotalSupply(supply)

    const setBonded = (bonded) =>
        this.pool.setBonded(bonded)

    const setStaged = (staged) =>
        this.pool.setStaged(staged)

    const usdValueBonded = async () =>
        (await this.pool.usdValueBonded.call())[0]

    const setup = async ({decimals}) => {
        this.gold = await Gold.new({from: mockDaoAddress})
        this.mockToken = await MockToken.new("USDC", "USDC", decimals, {from: mockDaoAddress, gas: 8000000})
        this.liquidity = await MockUniswapV2PairLiquidity.new(this.gold.address, this.mockToken.address, {from: mockDaoAddress})
        this.backingAssetOracle = await StubHybridOracle.new({from: mockDaoAddress})
        this.pool = await MockHybridPool.new(
            this.gold.address,
            this.liquidity.address,
            this.backingAssetOracle.address,
            {from: mockDaoAddress, gas: 8000000}
        )
    }

    beforeEach(async () => await setup({decimals: 18}))
});
