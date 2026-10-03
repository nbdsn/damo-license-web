// 模板文件：复制为 license-key.js 并用 license-tool 生成真实内容。
// 正式的 license-key.js 包含 AES 加密后的签发私钥，切勿提交进仓库（尤其是公开仓库）。
// 生成命令（在开发机上执行）：
//   go run ./cmd/license-tool webkey -password '你的签发口令'
// 然后把生成的 license-key.js 单独上传到托管平台，不要进 git。
window.LICENSE_KEY = {"data":"<加密后的私钥>","iv":"<随机IV>","salt":"<随机盐>"};
