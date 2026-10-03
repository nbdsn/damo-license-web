# 授权签发网站

纯静态页面，可部署到 **GitHub Pages** 或 **Cloudflare Pages**。所有计算（解密私钥、Ed25519 签名）都在浏览器本地完成，网站自身不需要任何服务器端代码。

## 部署前的准备（只需要做一次）

在开发机（已有 Go 工具链）上：

```bash
# 1. 生成密钥对（如果还没有）
go run ./cmd/license-tool gen
#    输出里的「公钥 DER base64」需要回填到 internal/license/license.go 的 PublicKeyBase64

# 2. 用签发口令加密私钥，生成 license-key.js
go run ./cmd/license-tool webkey -password '你的签发口令'
#    签发口令自己定（≥16 位，不要与他人共享），不要写在任何文档或代码里
```

生成的 `license-key.js` 包含**加密后的私钥**，请不要把它提交进公开仓库（`.gitignore` 已排除）。

## 部署到 GitHub Pages

1. 把 `website/` 目录内容（index.html、app.js、vendor/）提交到仓库（建议私有仓库）；`license-key.js` 不要进 git，单独上传到托管平台（Cloudflare Pages 可直接上传，GitHub Pages 请用私有仓库或 Actions secret 注入）
2. 仓库 Settings → Pages → Source 选择该分支的根目录（或指定 website/ 目录）
3. 访问 Pages 地址即可使用

## 部署到 Cloudflare Pages

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git（或 Direct Upload）
2. 构建配置：Framework preset 选 None，构建输出目录填 `website`
3. 部署后访问分配到的域名

## 使用流程

1. 客户在服务器上执行 `./clawbot --machine-code`，把指纹发给你
2. 打开签发网站，粘贴指纹、选择到期时间、输入签发口令
3. 点击「生成授权码」，复制输出的 license.json
4. 把 license.json 发给客户，放到服务器 `license/license.json`

## 安全说明

- 私钥以 AES-256-GCM 加密（PBKDF2-SHA256，20 万次迭代）存放在 `license-key.js`，明文口令只存在于签发人输入时，**不写入任何代码**
- 客户即使拿到网站全部 JS，没有口令也解不开私钥、无法自行签发
- 拥有服务器 root 权限的客户理论上可以逆向 Go 二进制绕过校验——本方案目标是提高破解成本，不是数学上的不可破解
- 建议口令长度 ≥ 16 位，且不要与他人共享
