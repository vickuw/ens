### Problem

域名注册后，在`opensea`上面不显示图片. 原因: registrar的baseURI为空字符串

### Steps of repair

- 修改scripts/deploy-config.json中 proxy 为当前 registrar合约代理地址
- 执行`npx hardhat run scripts/upgrade-registrar.js --network polygon
- 执行`setBaseURL`函数

