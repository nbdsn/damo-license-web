// 授权签发：读取加密私钥 → 校验口令 → Ed25519 签名 → 输出 license.json。
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var encodeB64Url = function (bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  var utf8Bytes = function (text) {
    return new TextEncoder().encode(text);
  };
  var hexToBytes = function (hex) {
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) return null;
    var bytes = new Uint8Array(32);
    for (var i = 0; i < 32; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    return bytes;
  };
  var base64ToBytes = function (b64) {
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };
  var bytesToBase64 = function (bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  // PBKDF2-SHA256 派生 AES-GCM 密钥（与 license-tool webkey 参数一致）
  function deriveKey(password, salt) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
      .then(function (baseKey) {
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: 200000, hash: 'SHA-256' },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );
      });
  }

  // 用口令解密私钥，返回 tweetnacl secretKey（64 字节）
  function unlockSecretKey(password) {
    var key = window.LICENSE_KEY;
    if (!key || !key.salt || !key.iv || !key.data) {
      return Promise.reject(new Error('网站缺少加密私钥文件 license-key.js，请先运行 license-tool webkey 生成'));
    }
    var salt = base64ToBytes(key.salt);
    var iv = base64ToBytes(key.iv);
    var data = base64ToBytes(key.data);
    return deriveKey(password, salt).then(function (aesKey) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, aesKey, data);
    }).then(function (plain) {
      var secretKey = new Uint8Array(plain);
      if (secretKey.length !== 64) throw new Error('私钥长度无效');
      return secretKey;
    });
  }

  function buildPayload(input) {
    var now = new Date();
    var expires = new Date(input.expiresAt);
    var payload = {
      product: 'damo-clawbot-support',
      version: 1,
      fingerprint: input.machineCode.toLowerCase(),
      notBefore: now.toISOString(),
      expiresAt: expires.toISOString(),
      issuedAt: now.toISOString(),
      licensee: input.licensee || '',
      features: ['multi-staff', 'supervisor-audit', 'wechat-clawbot']
    };
    if (input.expectedIp) payload.expectedIp = input.expectedIp;
    return payload;
  }

  function signPayload(payload, secretKey) {
    var payloadBytes = utf8Bytes(JSON.stringify(payload));
    var signature = nacl.sign.detached(payloadBytes, secretKey);
    var envelope = {
      payload: encodeB64Url(payloadBytes),
      signature: encodeB64Url(signature)
    };
    return JSON.stringify(envelope, null, 2) + '\n';
  }

  function showError(message) {
    var box = $('errorBox');
    box.textContent = message;
    box.classList.add('show');
  }

  function clearError() {
    $('errorBox').classList.remove('show');
  }

  function validate(input) {
    if (!input.machineCode) return '请填写机器指纹';
    if (!/^[0-9a-fA-F]{64}$/.test(input.machineCode)) return '机器指纹应为 64 位十六进制';
    if (!input.expiresAt) return '请选择到期时间';
    var expires = new Date(input.expiresAt);
    if (isNaN(expires.getTime())) return '到期时间无效';
    if (expires.getTime() <= Date.now()) return '到期时间必须晚于当前时间';
    if (input.expectedIp && !/^(\d{1,3}\.){3}\d{1,3}$/.test(input.expectedIp)) return '公网 IP 格式无效';
    return '';
  }

  $('generateBtn').addEventListener('click', function () {
    clearError();
    var input = {
      machineCode: $('machineCode').value.trim(),
      expiresAt: $('expiresAt').value,
      licensee: $('licensee').value.trim(),
      expectedIp: $('expectedIp').value.trim(),
      password: $('password').value
    };
    var error = validate(input);
    if (error) { showError(error); return; }
    if (!input.password) { showError('请输入签发口令'); return; }

    var btn = $('generateBtn');
    btn.disabled = true;
    btn.textContent = '正在生成…';
    unlockSecretKey(input.password).then(function (secretKey) {
      var license = signPayload(buildPayload(input), secretKey);
      $('outText').value = license;
      $('outWrap').classList.add('show');
      $('outText').classList.add('show');
      btn.disabled = false;
      btn.textContent = '生成授权码';
    }).catch(function (err) {
      btn.disabled = false;
      btn.textContent = '生成授权码';
      showError('签发失败：' + (err && err.message ? err.message : err));
    });
  });

  $('copyBtn').addEventListener('click', function () {
    var text = $('outText');
    text.select();
    text.setSelectionRange(0, text.value.length);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text.value).then(function () {
        $('copyBtn').textContent = '已复制';
        setTimeout(function () { $('copyBtn').textContent = '复制授权码'; }, 1500);
      });
    } else {
      document.execCommand('copy');
      $('copyBtn').textContent = '已复制';
      setTimeout(function () { $('copyBtn').textContent = '复制授权码'; }, 1500);
    }
  });
})();
