/**
 * main.js - 全局脚本
 * 全站共用，纯 jQuery 实现
 * 依赖：jquery, bootstrap.bundle.min.js 必须在本文件之前加载
 */

$(function () {

  /* ============================================
     搜索框 - 移动端回车提交
     ============================================ */
  $('.site-search').on('submit', function (e) {
    var keyword = $(this).find('input[name="keyword"]').val().trim();
    if (!keyword) {
      e.preventDefault();
    }
  });

  // <!-- 仅前端依据 localStorage.isLogined 控制会员中心入口显隐，不做任何后端请求；真实登录以服务端校验为准 -->
  // 页面加载即同步一次会员中心
  window.syncMemberCenterLink = function () {
      var link = document.getElementById('memberCenterLink');
      if (!link) return;
      link.style.display = (localStorage.getItem('isLogined') === '1') ? '' : 'none';
  };
  window.syncMemberCenterLink();

  /* ============================================
     套餐购买（模板建站 order_type=4 / 下载系统 order_type=5）
     后端插件：/e/extend/pay_qf/index.php
     按钮约定：<a data-type="tpl|download" data-plan="website-1|down-1">立即购买</a>
     ============================================ */
  var PAY_API   = '/e/extend/pay_qf/index.php';
  var LOGIN_URL = '/e/member/login/';

  // ---- 动态注入所需弹窗（仅注入一次）----
  function ensureModals() {
    if (document.getElementById('qfPayModals')) return;
    var html =
      '<div id="qfPayModals">' +
      // 模板建站：联系信息表单
      '<div class="modal fade" id="qfTplModal" tabindex="-1" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">' +
        '<div class="modal-header"><h5 class="modal-title">模板建站 · 填写联系方式</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>' +
        '<div class="modal-body">' +
          '<p class="text-muted small mb-3">套餐：<b class="qf-plan-name"></b>　金额：<b class="qf-plan-amount text-danger"></b></p>' +
          '<div class="mb-2"><label class="form-label">联系人 <span class="text-danger">*</span></label><input type="text" class="form-control" id="qfName" maxlength="30" placeholder="您的称呼"></div>' +
          '<div class="mb-2"><label class="form-label">联系电话 <span class="text-danger">*</span></label><input type="text" class="form-control" id="qfPhone" maxlength="20" placeholder="手机号，方便客服联系"></div>' +
          '<div class="mb-2"><label class="form-label">QQ / 微信 <span class="text-danger">*</span><small class="text-muted">（至少填一项）</small></label>' +
            '<div class="row g-2">' +
              '<div class="col-6"><input type="text" class="form-control" id="qfQq" maxlength="20" placeholder="QQ"></div>' +
              '<div class="col-6"><input type="text" class="form-control" id="qfWechat" maxlength="20" placeholder="微信"></div>' +
            '</div>' +
          '</div>' +
          '<div class="mb-2"><label class="form-label">建站需求</label><textarea class="form-control" id="qfDemand" rows="3" maxlength="500" placeholder="选填，简单描述您的行业/参考站点等"></textarea></div>' +
          '<div class="qf-tip text-danger small"></div>' +
        '</div>' +
        '<div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">取消</button><button type="button" class="btn btn-primary" id="qfTplSubmit">去支付</button></div>' +
      '</div></div></div>' +
      // 下载系统：确认下单
      '<div class="modal fade" id="qfDownModal" tabindex="-1" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">' +
        '<div class="modal-header"><h5 class="modal-title">下载系统 · 确认下单</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>' +
        '<div class="modal-body">' +
          '<p class="mb-2">套餐：<b class="qf-plan-name"></b></p>' +
          '<p class="mb-2">金额：<b class="qf-plan-amount text-danger"></b>（永久授权）</p>' +
          '<p class="text-muted small mb-0">支付成功后，请到「会员中心 → 我的订单」绑定域名/IP 获取授权码。</p>' +
          '<div class="qf-tip text-danger small mt-2"></div>' +
        '</div>' +
        '<div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">取消</button><button type="button" class="btn btn-primary" id="qfDownSubmit">去支付</button></div>' +
      '</div></div></div>' +
      // 支付中：轮询状态
      '<div class="modal fade" id="qfPayingModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">' +
        '<div class="modal-header"><h5 class="modal-title">正在支付</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>' +
        '<div class="modal-body text-center">' +
          '<div id="qfQr" class="mb-3 d-none"></div>' +
          '<div class="qf-amount fs-5 fw-bold mb-2 d-none" id="qfAmount"></div>' +
          '<p class="mb-2" id="qfPayingTip">已为您打开支付页面，请在新窗口完成支付。</p>' +
          '<p class="text-muted small mb-3" id="qfPayingLinkWrap">若未弹出，请 <a href="#" id="qfPayLink" target="_blank">点此打开支付页面</a></p>' +
          '<div class="qf-pay-status text-primary">等待支付结果…</div>' +
        '</div>' +
        '<div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">关闭</button><button type="button" class="btn btn-primary" id="qfPaidCheck">我已支付</button></div>' +
      '</div></div></div>' +
      '</div>';
    $('body').append(html);
  }

  var qfState = { type: '', plan: '', name: '', amount: '', orderNo: '', pollTimer: null };

  function showTip($modal, msg) { $modal.find('.qf-tip').text(msg || ''); }

  // 显示支付金额（amt 为空或非法时隐藏）
  function showAmount($m, amt) {
    var $el = $m.find('#qfAmount');
    var n = parseFloat(amt);
    if (!isNaN(n) && n > 0) {
      $el.removeClass('d-none').text('支付金额：¥' + n.toFixed(2));
    } else {
      $el.addClass('d-none').text('');
    }
  }

  // 检查登录，回调 cb(isLogin)
  // 仅前端视觉：同步会员中心显隐缓存（localStorage），真实登录以服务端校验为准
  function checkLogin(cb) {
    $.ajax({ url: PAY_API + '?action=check_login', method: 'GET', dataType: 'json' })
      .done(function (res) {
        if (res && res.success) {
          if (res.login) {
            localStorage.setItem('isLogined', '1');   // 已登录 → 置 1
          } else {
            localStorage.removeItem('isLogined');      // 未登录 → 删除
          }
          // 立即刷新会员中心入口显隐，无需刷新页面
          if (typeof window.syncMemberCenterLink === 'function') {
            window.syncMemberCenterLink();
          }
        }
        cb(!!(res && res.login));
      })
      .fail(function () { cb(false); });
  }


  function gotoLogin() {
    Swal.fire({
      title: '请先登录',
      text: '购买需要先登录，是否前往登录？',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '前往登录',
      cancelButtonText: '取消'
    }).then(function (result) {
      if (result.isConfirmed) {
        window.location.href = LOGIN_URL;
      }
    });
  }

  // 发起下单（type=tpl/download），data 为附加表单字段
  function createOrder(type, data, $srcModal, $btn) {
    var action = (type === 'tpl') ? 'create_tpl' : 'create_download';
    var post = $.extend({ action: action, plan: qfState.plan }, data || {});
    $btn.prop('disabled', true).text('提交中…');
    $.ajax({ url: PAY_API, method: 'POST', data: post, dataType: 'json' })
      .done(function (res) {
        $btn.prop('disabled', false).text('去支付');
        if (res && res.success && res.payUrl) {
          qfState.orderNo = res.orderNo || '';
          if ($srcModal) bsModal($srcModal[0]).hide();
          if (res.qr) { openQrPaying(res.payUrl, qfState.amount, res.channel_name); } else { openPaying(res.payUrl, qfState.amount); }
          return;
        }
        if (res && res.action === 'login') { gotoLogin(); return; }
        showTip($srcModal, (res && res.msg) ? res.msg : '下单失败，请稍后再试');
      })
      .fail(function () {
        $btn.prop('disabled', false).text('去支付');
        showTip($srcModal, '网络错误，请稍后再试');
      });
  }

  function bsModal(el) { return bootstrap.Modal.getOrCreateInstance(el); }

  // 重置支付弹窗：清掉上次购买成功遗留的下载链接+解压密码，并复位状态文字
  function resetPayingModal($m) {
    $m.find('.qf-download-links').remove();
    $m.find('.qf-pay-status').removeClass('text-success text-danger').addClass('text-primary').text('等待支付结果…');
  }

  // 打开支付轮询弹窗（非二维码渠道：新窗口跳转）
  function openPaying(payUrl, amount) {
    var $m = $('#qfPayingModal');
    $m.find('#qfQr').addClass('d-none').removeClass('d-flex justify-content-center').empty();
    $m.find('#qfPayingLinkWrap').removeClass('d-none');
    $m.find('#qfPayingTip').text('已为您打开支付页面，请在新窗口完成支付。');
    showAmount($m, amount);
    $('#qfPayLink').attr('href', payUrl);
    resetPayingModal($m);
    window.open(payUrl, '_blank');
    bsModal($m[0]).show();
    startPoll();
  }

  // 打开支付轮询弹窗（微信 Native：弹窗内渲染二维码，不新开窗口）
  function openQrPaying(codeUrl, amount, channelName) {
    var $m = $('#qfPayingModal');
    var cn = channelName || '微信';
    $m.find('#qfQr').addClass('d-none').removeClass('d-flex justify-content-center').empty();
    $m.find('#qfPayingLinkWrap').addClass('d-none');
    $m.find('#qfPayingTip').text('请使用' + cn + '「扫一扫」扫描下方二维码完成支付。');
    showAmount($m, amount);
    resetPayingModal($m);
    bsModal($m[0]).show();
    loadQrcode(function () {
      var $qr = $m.find('#qfQr').removeClass('d-none').addClass('d-flex justify-content-center');
      $qr.empty();
      /* global QRCode */
      new QRCode($qr[0], { text: codeUrl, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.H });
    });
    startPoll();
  }

  // 懒加载二维码库（static/js/qrcode.min.js）
  function loadQrcode(cb) {
    if (window.QRCode) { cb(); return; }
    var s = document.createElement('script');
    s.src = '/static/js/qrcode.min.js';
    s.onload = cb;
    s.onerror = function () { alert('二维码组件加载失败，请刷新重试'); };
    document.head.appendChild(s);
  }

  function startPoll() {
    stopPoll();
    var tries = 0, max = 100; // 约 5 分钟（3s * 100）
    qfState.pollTimer = setInterval(function () {
      tries++;
      if (tries > max) { stopPoll(); return; }
      if (!qfState.orderNo) return;
      $.ajax({ url: PAY_API + '?action=query&orderNo=' + encodeURIComponent(qfState.orderNo), method: 'GET', dataType: 'json' })
        .done(function (res) {
          if (res && res.success && res.order && parseInt(res.order.status, 10) === 1) {
            stopPoll();
            onPaid();
            return;
          }
          if (res && res.expired) {
            stopPoll();
            var $st = $('#qfPayingModal').find('.qf-pay-status');
            $st.removeClass('text-primary text-success').addClass('text-danger')
               .text('支付超时，请确认是否已被扣款，或重新下单/联系客服。');
          }
        });
    }, 3000);
  }
  function stopPoll() { if (qfState.pollTimer) { clearInterval(qfState.pollTimer); qfState.pollTimer = null; } }

  function onPaid() {
    var $m = $('#qfPayingModal');
    localStorage.setItem('isLogined', '1');
    if (qfState.type === 'download') {
      $m.find('.qf-pay-status').removeClass('text-primary').addClass('text-success')
        .html('支付成功！请前往「会员中心 → 我的订单」绑定域名获取授权。');
      // 拉取下载系统源代码下载地址并展示
      $m.find('.qf-download-links').remove();
      $.ajax({ url: PAY_API + '?action=download_code', method: 'GET', dataType: 'json' })
        .done(function (res) {
          if (res && res.success && res.item && res.item.downpath) {
            var it   = res.item;
            var name = it.name ? it.name : '下载地址';
            var url  = it.downpath || '#';
            if (url.indexOf('http') !== 0) { url = '#'; } // 防 javascript: 钓鱼
            var html = '<div class="qf-download-links mt-3">' +
              '<p class="fw-bold mb-2">下载系统源代码（版本 ' + (it.version || '') + '）：</p>' +
              '<a href="' + url + '" target="_blank" rel="noopener" ' +
              'class="btn btn-danger btn-sm me-2 mb-2">' + name + '</a>' +
              (it.extract_password ? '<div class="mt-2 small text-muted">压缩包解压密码：<code class="user-select-all">' + it.extract_password + '</code></div>' : '') +
              '</div>';
            $m.find('.qf-pay-status').after(html);
          } else if (res && !res.success) {
            // 未购买/未支付成功：提示但不暴露下载地址
            $m.find('.qf-download-links').remove();
            $('<div class="qf-download-links mt-3 text-danger small"></div>')
              .text(res.msg || '未找到有效的下载系统订单')
              .insertAfter($m.find('.qf-pay-status'));
          }
        });
    } else {
      $m.find('.qf-pay-status').removeClass('text-primary').addClass('text-success')
        .html('支付成功！客服会尽快与您联系，请保持电话畅通。');
    }
  }

  // ---- 立即购买按钮点击 ----
  $(document).on('click', '[data-type][data-plan]', function (e) {
    var $btn = $(this);
    var type = $btn.data('type');
    var plan = $btn.data('plan');
    var name = $btn.data('name') || '';
    var amount = $btn.data('amount') || '';
    if (type !== 'tpl' && type !== 'download') return; // 非购买按钮不拦截
    e.preventDefault();

    ensureModals();
    qfState.type = type; qfState.plan = plan; qfState.name = name; qfState.amount = amount; qfState.orderNo = '';

    checkLogin(function (isLogin) {
      if (!isLogin) { gotoLogin(); return; }
      if (type === 'tpl') {
        var $m = $('#qfTplModal');
        $m.find('.qf-plan-name').text(name || plan);
        $m.find('.qf-plan-amount').text(amount ? ('¥' + amount) : '');
        showTip($m, '');
        bsModal($m[0]).show();
      } else {
        var $d = $('#qfDownModal');
        $d.find('.qf-plan-name').text(name || plan);
        $d.find('.qf-plan-amount').text(amount ? ('¥' + amount) : '');
        showTip($d, '');
        bsModal($d[0]).show();
      }
    });
  });

  // 模板建站提交
  $(document).on('click', '#qfTplSubmit', function () {
    var $m = $('#qfTplModal');
    var name = ($('#qfName').val() || '').trim();
    var phone = ($('#qfPhone').val() || '').trim();
    if (!name || !phone) { showTip($m, '请填写联系人与联系电话'); return; }
    var qq = ($('#qfQq').val() || '').trim();
    var wechat = ($('#qfWechat').val() || '').trim();
    if (!qq && !wechat) { showTip($m, 'QQ 与微信至少填写一项'); return; }
    createOrder('tpl', {
      contact_name: name,
      contact_phone: phone,
      contact_qq: qq,
      contact_wechat: wechat,
      contact_demand: ($('#qfDemand').val() || '').trim()
    }, $m, $(this));
  });

  // 下载系统提交
  $(document).on('click', '#qfDownSubmit', function () {
    createOrder('download', {}, $('#qfDownModal'), $(this));
  });

  // 已支付手动复查
  $(document).on('click', '#qfPaidCheck', function () {
    if (!qfState.orderNo) return;
    var $st = $('#qfPayingModal').find('.qf-pay-status');
    $st.text('正在核对支付结果…');
    $.ajax({ url: PAY_API + '?action=query&orderNo=' + encodeURIComponent(qfState.orderNo), method: 'GET', dataType: 'json' })
      .done(function (res) {
        if (res && res.success && res.order && parseInt(res.order.status, 10) === 1) { stopPoll(); onPaid(); }
        else if (res && res.expired) {
          stopPoll();
          $st.removeClass('text-success').addClass('text-danger').text('支付超时，请确认是否已被扣款，或重新下单/联系客服。');
        } else { $st.removeClass('text-success').addClass('text-primary').text('尚未查询到支付成功，若已支付请稍候…'); }
      })
      .fail(function () { $st.text('查询失败，请稍后重试'); });
  });

  // 关闭支付弹窗时停止轮询
  $(document).on('hidden.bs.modal', '#qfPayingModal', stopPoll);

  // 点击微信客服按钮，直接弹出微信客服二维码图片
  $(document).on('click', '.wechat-btn', function () {
    Swal.fire({
      title: '微信客服',
      text: '长按或扫描二维码添加微信客服',
      imageUrl: '/static/img/weixin.jpg',
      imageWidth: 240,
      imageHeight: 'auto',
      imageAlt: '微信客服二维码',
      showConfirmButton: false,
      showCloseButton: true
    });
  });

});
