const { accounts, contract, privateKeys } = require('@openzeppelin/test-environment');

const { BN, expectRevert, time, expectEvent, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { signTypedData } = require('eth-sig-util');

const MockComptroller = contract.fromArtifact('MockComptroller');
const Gold = contract.fromArtifact('Gold');

const domain = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

const permit = [
  { name: "owner", type: "address" },
  { name: "spender", type: "address" },
  { name: "value", type: "uint256" },
  { name: "nonce", type: "uint256" },
  { name: "deadline", type: "uint256" },
];

async function signPermit(gold, privateKey, message) {
  const domainData = {
    name: "Empty Set Gold",
    version: "1",
    chainId: "1",
    verifyingContract: gold,
  };

  const data = {
    types: {
      EIP712Domain: domain,
      Permit: permit,
    },
    domain: domainData,
    primaryType: "Permit",
    message: message
  };
  const pk = Buffer.from(privateKey.substring(2), 'hex');
  const sig = signTypedData(pk, {data});

  return {
    v: parseInt(sig.substring(130, 132), 16),
    r: Buffer.from(sig.substring(2, 66), 'hex'),
    s: Buffer.from(sig.substring(66, 130), 'hex'),
  }
}

describe('Gold', function () {
  const [ ownerAddress, userAddress, poolAddress, notUsed ] = accounts;
  const [ _, userPrivateKey ] = privateKeys;

  beforeEach(async function () {
    this.dao = await MockComptroller.new(poolAddress, notUsed, {from: ownerAddress, gas: 8000000});
    this.gold = await Gold.at(await this.dao.gold());
  });

  describe('mint', function () {
    describe('not from dao', function () {
      it('reverts', async function () {
        await expectRevert(this.gold.mint(userAddress, 100, {from: ownerAddress}), "MinterRole: caller does not have the Minter role");
      });
    });

    describe('from dao', function () {
      beforeEach(async function () {
        await this.dao.mintToE(userAddress, 100);
      });

      it('mints new Gold tokens', async function () {
        expect(await this.gold.balanceOf(userAddress)).to.be.bignumber.equal(new BN(100));
      });
    });
  });

  describe('delegate', function () {
    describe('zero deadline', function () {
      beforeEach(async function () {
        this.signature = await signPermit(this.gold.address, userPrivateKey, {
          owner: userAddress,
          spender: ownerAddress,
          value: new BN(1234).toString(),
          nonce: 0,
          deadline: 0
        });
      });

      it('reverts', async function () {
        await expectRevert(
          this.gold.permit(userAddress, ownerAddress, 1234, 0, this.signature.v, this.signature.r, this.signature.s),
          "Permittable: Expired");
      });
    });

    describe('valid expiration', function () {
      beforeEach(async function () {
        const expiration = (await time.latest()) + 100;
        const signature = await signPermit(this.gold.address, userPrivateKey, {
          owner: userAddress,
          spender: ownerAddress,
          value: new BN(1234).toString(),
          nonce: 0,
          deadline: expiration
        });

        await this.gold.permit(userAddress, ownerAddress, 1234, expiration, signature.v, signature.r, signature.s);
      });

      it('approves', async function () {
        expect(await this.gold.allowance(userAddress, ownerAddress)).to.be.bignumber.equal(new BN(1234));
      });
    });

    describe('invalid nonce', function () {
      beforeEach(async function () {
        this.expiration = (await time.latest()) + 100;
        this.signature = await signPermit(this.gold.address, userPrivateKey, {
          owner: userAddress,
          spender: ownerAddress,
          value: new BN(1234).toString(),
          nonce: 10,
          deadline: this.expiration
        });
      });

      it('reverts', async function () {
        await expectRevert(
          this.gold.permit(userAddress, ownerAddress, 1234, this.expiration, this.signature.v, this.signature.r, this.signature.s),
          "Permittable: Invalid signature");
      });
    });

    describe('nonce reuse', function () {
      beforeEach(async function () {
        this.expiration = (await time.latest()) + 100;
        const signature = await signPermit(this.gold.address, userPrivateKey, {
          owner: userAddress,
          spender: ownerAddress,
          value: new BN(1234).toString(),
          nonce: 0,
          deadline: this.expiration
        });

        await this.gold.permit(userAddress, ownerAddress, 1234, this.expiration, signature.v, signature.r, signature.s);

        this.signature = await signPermit(this.gold.address, userPrivateKey, {
          owner: userAddress,
          spender: ownerAddress,
          value: new BN(5678).toString(),
          nonce: 0,
          deadline: this.expiration
        });
      });

      it('reverts', async function () {
        await expectRevert(
          this.gold.permit(userAddress, ownerAddress, 5678, this.expiration, this.signature.v, this.signature.r, this.signature.s),
          "Permittable: Invalid signature");
      });
    });

    describe('expired', function () {
      beforeEach(async function () {
        this.expiration = (await time.latest()) - 100;
        this.signature = await signPermit(this.gold.address, userPrivateKey, {
          owner: userAddress,
          spender: ownerAddress,
          value: new BN(1234).toString(),
          nonce: 0,
          deadline: this.expiration
        });
      });

      it('reverts', async function () {
        await expectRevert(
          this.gold.permit(userAddress, ownerAddress, 1234, this.expiration, this.signature.v, this.signature.r, this.signature.s),
          "Permittable: Expired");
      });
    });

    describe('signature mismatch', function () {
      beforeEach(async function () {
        this.expiration = (await time.latest()) + 100;
        this.signature = await signPermit(this.gold.address, userPrivateKey, {
          owner: userAddress,
          spender: ownerAddress,
          value: new BN(1234).toString(),
          nonce: 0,
          deadline: this.expiration
        });
      });

      it('reverts', async function () {
        await expectRevert(
          this.gold.permit(userAddress, ownerAddress, 1235, this.expiration, this.signature.v, this.signature.r, this.signature.s),
          "Permittable: Invalid signature");
      });
    });
  });

  describe('transferFrom', function () {
    beforeEach(async function () {
      await this.dao.mintToE(ownerAddress, 100);
    });

    describe('amount equals approved', function () {
      beforeEach('transferFrom', async function () {
        await this.gold.approve(userAddress, 100, {from: ownerAddress});
        this.tx = await this.gold.transferFrom(ownerAddress, userAddress, 100, {from: userAddress});
      });

      it('decrements allowance', async function () {
        const allowance = await this.gold.allowance(ownerAddress, userAddress);
        expect(allowance).to.be.bignumber.equal(new BN(0));
      });

      it('emits Transfer event', async function () {
        const event = expectEvent(this.tx, 'Transfer', {
          from: ownerAddress,
          to: userAddress,
        });
        expect(event.args.value).to.be.bignumber.equal(new BN(100));
      });
    });

    describe('amount greater than approved', function () {
      beforeEach('transferFrom', async function () {
        await this.gold.approve(userAddress, 100, {from: ownerAddress});
      });

      it('emits Transfer event', async function () {
        await expectRevert(
          this.gold.transferFrom(ownerAddress, userAddress, 101, {from: userAddress}),
          "ERC20: transfer amount exceeds balance");
      });
    });

    describe('approve unlimited', function () {
      beforeEach('transferFrom', async function () {
        await this.gold.approve(userAddress, constants.MAX_UINT256, {from: ownerAddress});
        this.tx = await this.gold.transferFrom(ownerAddress, userAddress, 100, {from: userAddress});
      });

      it('doesnt decrement allowance', async function () {
        const allowance = await this.gold.allowance(ownerAddress, userAddress);
        expect(allowance).to.be.bignumber.equal(constants.MAX_UINT256);
      });

      it('emits Transfer event', async function () {
        const event = expectEvent(this.tx, 'Transfer', {
          from: ownerAddress,
          to: userAddress,
        });
        expect(event.args.value).to.be.bignumber.equal(new BN(100));
      });
    });
  });
});
