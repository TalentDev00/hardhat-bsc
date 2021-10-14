pragma solidity =0.5.16;

import './libraries/SafeMathM.sol';
import './ZapMaster.sol';

contract Vault {
    using SafeMathM for uint256;

    address public zapToken;
    ZapMaster public zapMaster;
    mapping(address => uint256) private balances;

    uint256 constant private MAX_UINT = 2**256 - 1;

    constructor (address token, address master) public {
        zapToken = token;
        zapMaster = ZapMaster(address(uint160(master)));
        
        token.call(abi.encodeWithSignature("approve(address,uint256)", master, MAX_UINT));
    }

    function increaseApproval() public returns (bool) {
        (bool s, bytes memory balance) = zapToken.call(abi.encodeWithSignature("allowance(address,address)", address(this), zapMaster));
        uint256 amount = MAX_UINT.sub(toUint256(balance, 0));
        (bool success, bytes memory data) = zapToken.call(abi.encodeWithSignature("increaseApproval(address,uint256)", zapMaster, amount));
        return success;
    }

    function toUint256(bytes memory _bytes, uint256 _start) internal pure returns (uint256) {
        require(_bytes.length >= _start + 32, "toUint256_outOfBounds");
        uint256 tempUint;

        assembly {
            tempUint := mload(add(add(_bytes, 0x20), _start))
        }

        return tempUint;
    }

    function deposit(address userAddress, uint256 value) public {
        require(userAddress != address(0), "The zero address does not own a vault.");
        require(msg.sender == address(zapMaster), "Only Zap contract accessible");
        balances[userAddress] = balances[userAddress].add(value);
    }

    function withdraw(address userAddress, uint256 value) public {
        require(userAddress != address(0), "The zero address does not own a vault.");
        require(msg.sender == address(zapMaster), "Only Zap contract accessible");
        require(userBalance(userAddress) >= value, "Your balance is insufficient.");
        balances[userAddress] = balances[userAddress].sub(value);
    }

    function userBalance(address userAddress) public view returns (uint256 balance) {
        return balances[userAddress];
    }
}